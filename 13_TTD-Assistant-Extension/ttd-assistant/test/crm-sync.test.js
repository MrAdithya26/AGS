// Simulated chrome.storage + CRM REST to test lib/crm-sync.js routing and mapping.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const store = {}; const calls = [];
global.chrome = { storage: { local: { get: async k => ({ [k]: store[k] }), set: async o => Object.assign(store, o) } } };
const T = { jobs: [{ id: 'j1', number: 'TTD-2611-0001', step_key: 'requested', persons: 2, wanted_date: '2026-12-01', service_date: null, ext_ref: null, details: { people: 'Ramesh, Lakshmi' }, govt_fee: 60000, customer_id: 'c1', service_id: 's1', department_id: 'd1', total: 80000, paid: 80000, refunded: 0 }] };
global.fetch = async (url, o = {}) => {
  calls.push([o.method || 'GET', url.replace('https://abc.supabase.co', ''), o.body]);
  const ok = b => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b) });
  if (url.includes('/auth/v1/token')) return ok({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'u1' } });
  if (url.includes('/staff?')) return ok([{ name: 'Owner', role: 'owner', active: true }]);
  if (url.includes('/job_view?')) return ok(T.jobs);
  if (url.includes('/customers?')) return ok([{ id: 'c1', name: 'Ramesh Kumar', mobile: '9876543210', preferred_lang: 'en', families: { name: 'Ramesh Family' } }]);
  if (url.includes('/services?')) return ok([{ id: 's1', name: 'Special Entry Darshan (₹300)', settings: { ttd_category: 'Darshan' } }]);
  if (url.includes('/portal_accounts?')) return ok([{ login_ref: '9000000001', holder: 'Adithya' }]);
  if (url.includes('/jobs?number=')) return ok([T.jobs[0]]);
  if (url.includes('/jobs?id=') && o.method === 'PATCH') { const p = JSON.parse(o.body); return ok([Object.assign({}, T.jobs[0], p)]); }
  if (url.includes('/workflow_steps?')) return ok([{ template_key: 'booked' }]);
  if (url.includes('/settings?')) return ok([{ value: { shopName: 'Adithya Internet & CSC Center', shopPhone: '9876500000' } }]);
  if (url.includes('/message_templates?')) return ok([{ channel: 'whatsapp', body: 'Namaskaram {name} garu, booked {bookingId} PNR {ttdRef} on {serviceDate} {slot} for {devotees}. -{shopName}' }, { channel: 'sms', body: '{name}: {ttdRef}' }]);
  if (url.includes('/rpc/ttd_devotees')) return ok({ count: 1, rows: [['Profile Name'], ['Ramesh Family', 'Ramesh Kumar']] });
  if (url.includes('/messages')) return ok([{}]);
  return { ok: false, status: 404, json: async () => ({ message: 'nope ' + url }), text: async () => JSON.stringify({ message: 'nope ' + url }) };
};
const ctx = global; ctx.self = global;
const dir = require('path').join(__dirname, '..'); vm.runInThisContext(fs.readFileSync(dir + '/lib/sheet-sync.js', 'utf8')); vm.runInThisContext(fs.readFileSync(dir + '/lib/crm-sync.js', 'utf8'));
(async () => {
  await assert.rejects(CrmSync.signIn('https://abc.supabase.co', 'sb_secret_x', 'a@b.c', 'pw'), /PUBLISHABLE/);
  const me = await CrmSync.signIn('https://abc.supabase.co', 'sb_publishable_x', 'a@b.c', 'pw');
  assert.equal(me.role, 'owner'); assert.ok(!JSON.stringify(store).includes('"pw"'), 'password not stored');
  assert.ok(await SheetSync.isOn());
  const p = await SheetSync.call('pending');
  assert.equal(p.bookings[0].bookingId, 'TTD-2611-0001'); assert.equal(p.bookings[0].profile, 'Ramesh Family'); assert.equal(p.bookings[0].category, 'Darshan'); assert.equal(p.bookings[0].status, 'Requested'); assert.equal(p.logins[0].loginId, '9000000001');
  const r = await SheetSync.call('result', { bookingId: 'TTD-2611-0001', status: 'Booked', ttdRef: 'SED123', serviceDate: '2026-12-01', slot: '10:00 - 11:00', ticketAmount: '600', ttdLogin: '9000000001' });
  const patch = JSON.parse(calls.find(c => c[0] === 'PATCH')[2]);
  assert.equal(patch.step_key, 'booked'); assert.equal(patch.ext_ref, 'SED123'); assert.equal(patch.govt_fee, 60000); assert.equal(patch.details.slot, '10:00 - 11:00');
  console.log('message:', r.message); assert.ok(!/\{\w+\}/.test(r.message)); assert.equal(r.whatsapp, 'https://wa.me/919876543210');
  const cu = await SheetSync.call('customers', { onlyPending: true }); assert.equal(cu.count, 1);
  await SheetSync.call('messageSent', { bookingId: 'TTD-2611-0001', text: 'hi' }); assert.ok(calls.some(c => c[0] === 'POST' && c[1].includes('/messages')));
  await assert.rejects(SheetSync.call('sendSms', {}), /paid add-on/);
  const hdr = calls.find(c => c[1].includes('/job_view')); assert.ok(hdr);
  console.log('ALL EXTENSION CRM TESTS PASSED (' + calls.length + ' simulated calls)');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
