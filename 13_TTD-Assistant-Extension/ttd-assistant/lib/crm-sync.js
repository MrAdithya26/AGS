/* AGS TTD Assistant v2.0 - link to the AGS Services Master CRM (Supabase).
 * Signs in with the staff member's own CRM login (email + password; only the session is stored, never the password).
 * When the CRM is connected, the popup's "pending bookings / save result / pull devotees" buttons use the CRM
 * instead of the old Google Sheet. Data goes only to the CRM address entered in Options. */
(function (g) {
  const SS = g.SheetSync; if (!SS) return;
  const sheetCall = SS.call, sheetIsOn = SS.isOn;
  const KEY = 'crm';
  const C = {};

  C.cfg = async () => Object.assign({ url: '', key: '', email: '', name: '', session: null }, (await chrome.storage.local.get(KEY))[KEY] || {});
  C.save = cfg => chrome.storage.local.set({ [KEY]: cfg });
  C.isOn = async () => { const c = await C.cfg(); return !!(c.url && c.key && c.session && c.session.refresh_token); };

  const base = u => String(u || '').replace(/\/+$/, '');
  async function auth(path, body, c) {
    let res;
    try { res = await fetch(`${base(c.url)}/auth/v1/${path}`, { method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw new Error('Could not reach the CRM database. Check the internet connection and the address.'); }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error_description || j.msg || j.error || 'Sign-in failed');
    return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 - 60000, user_id: j.user && j.user.id };
  }
  C.signIn = async function (url, key, email, password) {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim())) throw new Error('The CRM database address looks like https://xxxx.supabase.co');
    if (!/^(sb_publishable_|eyJ)/.test(key.trim())) throw new Error('Use the PUBLISHABLE (anon) key, never the secret key.');
    const c = { url: url.trim(), key: key.trim(), email: email.trim() };
    c.session = await auth('token?grant_type=password', { email: c.email, password }, c);
    await C.save(c);
    const me = await C.rest(`staff?id=eq.${c.session.user_id}&select=name,role,active`);
    if (!me[0] || !me[0].active) { await C.signOut(); throw new Error('Signed in, but the owner has not switched you on in the CRM (Staff & roles).'); }
    c.name = me[0].name; await C.save(c);
    return me[0];
  };
  C.signOut = async () => { const c = await C.cfg(); await C.save({ url: c.url, key: c.key, email: c.email, name: '', session: null }); };

  async function token() {
    const c = await C.cfg();
    if (!c.session) throw new Error('Sign in to the CRM first (Options › AGS CRM).');
    if (Date.now() > c.session.expires_at) { c.session = await auth('token?grant_type=refresh_token', { refresh_token: c.session.refresh_token }, c).catch(async e => { await C.signOut(); throw new Error('CRM session ended. Sign in again in Options. (' + e.message + ')'); }); await C.save(c); }
    return c;
  }
  /** REST call to the CRM's "crm" schema with the staff member's own permissions. */
  C.rest = async function (path, opt = {}) {
    const c = await token();
    let res;
    try {
      res = await fetch(`${base(c.url)}/rest/v1/${path}`, { method: opt.method || 'GET', body: opt.body ? JSON.stringify(opt.body) : undefined,
        headers: { apikey: c.key, Authorization: `Bearer ${c.session.access_token}`, 'Accept-Profile': 'crm', 'Content-Profile': 'crm', 'Content-Type': 'application/json', Prefer: 'return=representation' } });
    } catch (e) { throw new Error('Could not reach the CRM database. Check the internet connection.'); }
    const text = await res.text(); const j = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((j && (j.message || j.hint)) || `CRM error ${res.status}`);
    return j;
  };
  const inList = ids => `(${[...new Set(ids.filter(Boolean))].join(',')})`;
  const STATUS = { requested: 'Requested', attempting: 'Attempting', dip_registered: 'Lucky Dip - Registered', dip_selected: 'Lucky Dip - Selected', payment_failed: 'Payment Failed' };
  const STEP = { Booked: 'booked', 'Not Booked': 'not_booked', 'Lucky Dip - Registered': 'dip_registered', 'Lucky Dip - Selected': 'dip_selected', 'Payment Failed': 'payment_failed', Attempting: 'attempting' };
  const dmy = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '-'; };
  const amt = p => ((p || 0) / 100).toLocaleString('en-IN');
  function fill(body, j, cust, shop, svc) {
    const d = j.details || {};
    const v = { name: cust.name, service: svc, bookingId: j.number, ttdRef: j.ext_ref, serviceDate: dmy(j.service_date), checkIn: dmy(j.service_date), preferredDate: dmy(j.wanted_date),
      slot: d.slot, reportingPoint: d.reporting_point, room: d.room, persons: j.persons, devotees: d.people || cust.name, ticketAmount: amt(j.govt_fee), total: amt(j.total), received: amt(j.paid),
      refundAmount: amt(j.refunded || (j.paid - j.refunded)), balance: amt(Math.max(0, j.total - j.paid)), refundStatus: d.refund_status, nextRelease: d.next_release, remarks: d.remarks,
      shopName: shop.shopName, shopNameTe: shop.shopNameTe, groupName: shop.groupName, groupNameTe: shop.groupNameTe, shopPhone: shop.shopPhone, shopAddress: shop.shopAddress };
    return String(body).replace(/\{(\w+)\}/g, (m, k) => k in v ? (v[k] == null || v[k] === '' ? '-' : String(v[k])) : m).replace(/\n📞\s*-?\s*$/, '').trim();
  }

  async function crmCall(action, p = {}) {
    const c = await token();
    if (action === 'ping') { const s = await C.rest('settings?key=eq.shop&select=value'); return { ok: true, app: 'AGS Services Master CRM', shop: (s[0] && s[0].value.shopName) || '' }; }
    if (action === 'pending') {
      const jobs = await C.rest('job_view?kind=eq.ttd&outcome=eq.open&select=id,number,step_key,persons,wanted_date,service_date,ext_ref,details,govt_fee,customer_id,service_id&order=created_at');
      const [cs, ss, logins] = await Promise.all([
        jobs.length ? C.rest(`customers?id=in.${inList(jobs.map(j => j.customer_id))}&select=id,name,mobile,families(name)`) : [],
        jobs.length ? C.rest(`services?id=in.${inList(jobs.map(j => j.service_id))}&select=id,name,settings`) : [],
        C.rest("portal_accounts?portal=eq.TTD&active=eq.true&select=login_ref,holder")]);
      const bookings = jobs.map(j => { const cu = cs.find(x => x.id === j.customer_id) || {}; const sv = ss.find(x => x.id === j.service_id) || {}; const d = j.details || {};
        return { id: j.id, customerId: j.customer_id, bookingId: j.number, customerName: cu.name || '', mobile: cu.mobile || '', profile: (cu.families && cu.families.name) || cu.name || '',
          service: sv.name || '', category: (sv.settings && sv.settings.ttd_category) || 'Darshan', persons: j.persons, status: STATUS[j.step_key] || j.step_key,
          preferredDate: j.wanted_date, devotees: d.people || cu.name || '', ttdRef: j.ext_ref || '', serviceDate: j.service_date || '', slot: d.slot || '', ticketAmount: j.govt_fee ? j.govt_fee / 100 : '', ttdLogin: d.ttd_login || '' }; });
      return { ok: true, bookings, logins: logins.map(l => ({ loginId: l.login_ref || '', holder: l.holder || '', status: 'Active' })).filter(l => l.loginId) };
    }
    if (action === 'customers') { const r = await C.rest('rpc/ttd_devotees', { method: 'POST', body: { p_only_pending: !!p.onlyPending } }); return { ok: true, rows: r.rows, count: r.count }; }
    if (action === 'attempting' || action === 'result') {
      const [j] = await C.rest(`jobs?number=eq.${encodeURIComponent(p.bookingId)}&select=id,details,department_id`);
      if (!j) throw new Error('Booking not found in the CRM');
      const step = STEP[action === 'attempting' ? 'Attempting' : p.status]; if (!step) throw new Error('Unknown result ' + p.status);
      const details = Object.assign({}, j.details, p.ttdLogin ? { ttd_login: p.ttdLogin } : {}, p.slot ? { slot: p.slot } : {}, p.ttdPayment ? { ttd_payment: p.ttdPayment } : {});
      const patch = { step_key: step, details };
      if (p.ttdRef) patch.ext_ref = p.ttdRef; if (p.serviceDate) patch.service_date = p.serviceDate;
      if (p.ticketAmount !== undefined && p.ticketAmount !== '') patch.govt_fee = Math.round(Number(p.ticketAmount) * 100) || 0;
      const [u] = await C.rest(`jobs?id=eq.${j.id}`, { method: 'PATCH', body: patch });
      if (action === 'attempting') return { ok: true };
      const [cust] = await C.rest(`customers?id=eq.${u.customer_id}&select=id,name,mobile,preferred_lang`);
      const [svc] = u.service_id ? await C.rest(`services?id=eq.${u.service_id}&select=name`) : [{}];
      const [st] = await C.rest(`workflow_steps?department_id=eq.${u.department_id}&key=eq.${step}&select=template_key`);
      const shop = ((await C.rest('settings?key=eq.shop&select=value'))[0] || { value: {} }).value;
      let msg = '', sms = '';
      if (st && st.template_key) {
        const t = await C.rest(`message_templates?key=eq.${st.template_key}&lang=eq.${(cust && cust.preferred_lang) || 'te'}&select=channel,body`);
        const w = t.find(x => x.channel === 'whatsapp'), s = t.find(x => x.channel === 'sms');
        msg = w ? fill(w.body, u, cust || {}, shop, (svc && svc.name) || '') : ''; sms = s ? fill(s.body, u, cust || {}, shop, (svc && svc.name) || '') : msg;
      }
      const m = String((cust && cust.mobile) || '').replace(/\D/g, '').slice(-10);
      return { ok: true, message: msg, sms, whatsapp: m ? `https://wa.me/91${m}` : 'https://wa.me/', contactVia: 'WhatsApp', smsReady: false, jobId: u.id, customerId: u.customer_id, templateKey: st && st.template_key };
    }
    if (action === 'messageSent') {
      const [j] = await C.rest(`jobs?number=eq.${encodeURIComponent(p.bookingId)}&select=id,customer_id,step_key,department_id`);
      if (j) await C.rest('messages', { method: 'POST', body: { job_id: j.id, customer_id: j.customer_id, channel: 'whatsapp', direction: 'out', status: 'sent', handled_by: c.session.user_id, body: p.text || null } });
      return { ok: true };
    }
    if (action === 'sendSms') throw new Error('Automatic SMS is not switched on in the CRM (paid add-on). Use WhatsApp or the phone SMS app.');
    throw new Error('Unknown action ' + action);
  }

  // Route the popup / options buttons: CRM when signed in, otherwise the old Google Sheet link.
  SS.isOn = async () => (await C.isOn()) || sheetIsOn();
  SS.call = async (action, payload) => (await C.isOn()) ? crmCall(action, payload) : sheetCall(action, payload);
  g.CrmSync = C;
})(typeof self !== 'undefined' ? self : this);
