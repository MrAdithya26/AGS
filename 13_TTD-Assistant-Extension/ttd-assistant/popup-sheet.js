/* Adithya TTD Booking Assistant - popup: pick a pending booking from the Google Sheet and save its result (v1.5).
 * Uses $, S, tab, renderProfiles, renderPilgrims, renderType from popup.js. */
(() => {
  let pending = [];
  let logins = [];
  let lastMsg = null;   // { text, whatsapp }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fD = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
  const say = (t, cls) => { const el = $('#resMsg'); el.textContent = t; el.className = 'resMsg ' + (cls || ''); };
  const current = () => pending.find(b => b.bookingId === $('#bkSel').value);

  async function start() {
    const on = await SheetSync.isOn();
    $('#sheetOff').hidden = on;
    $('#sheetOn').hidden = !on;
    if (on) load();
  }

  async function load() {
    $('#sheetInfo').textContent = 'loading…';
    try {
      const r = await SheetSync.call('pending');
      const rank = b => ({ Attempting: 0, Requested: 1 }[b.status] ?? 2);
      pending = r.bookings.sort((a, b) => rank(a) - rank(b) || String(a.preferredDate || '9').localeCompare(String(b.preferredDate || '9')));
      logins = r.logins || [];
      const sel = $('#bkSel');
      const keep = sel.value || (await chrome.storage.local.get('sheetLastBooking')).sheetLastBooking;
      sel.innerHTML = pending.length ? pending.map(b => `<option value="${esc(b.bookingId)}">${esc(b.customerName)} · ${esc(b.service)} · ${b.persons}👤 · ${esc(b.status)}</option>`).join('')
        : '<option value="">No pending bookings 🎉</option>';
      if (keep && pending.some(b => b.bookingId === keep)) sel.value = keep;
      $('#rLogin').innerHTML = '<option value="">TTD login…</option>' + logins.filter(l => l.status !== 'Closed').map(l => `<option value="${esc(l.loginId)}">${esc(l.loginId)}${l.holder ? ' · ' + esc(l.holder) : ''}</option>`).join('');
      $('#sheetInfo').textContent = `${pending.length} pending`;
      show();
    } catch (e) {
      $('#sheetInfo').textContent = '';
      say(e.message, 'err');
    }
  }

  function show() {
    const b = current();
    $('#msgOut').hidden = true;
    $('#bkUse').disabled = !b;
    document.querySelectorAll('[data-res]').forEach(x => { x.disabled = !b; });
    if (!b) { $('#bkInfo').textContent = ''; return; }
    chrome.storage.local.set({ sheetLastBooking: b.bookingId });
    $('#bkInfo').textContent = `${b.bookingId} · ${b.category}\n👥 ${b.devotees || b.customerName}\n📅 Preferred ${fD(b.preferredDate) || 'any'}${b.alternateDate ? ' / ' + fD(b.alternateDate) : ''} · 📞 ${b.mobile || '-'}`;
    $('#rRef').value = b.ttdRef || '';
    $('#rDate').value = b.serviceDate || b.preferredDate || '';
    $('#rSlot').value = b.slot || '';
    $('#rAmt').value = b.ticketAmount || '';
    $('#rLogin').value = b.ttdLogin || '';
  }

  // Picks the matching extension profile and ticks the booking's devotees, in the booking's order.
  async function useDevotees() {
    const b = current();
    if (!b) return;
    const s = await ATBA.load();
    const norm = v => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const names = String(b.devotees || b.customerName).split(',').map(norm).filter(Boolean);
    let prof = s.profiles.find(p => norm(p.name) === norm(b.profile));
    if (!prof) prof = s.profiles.find(p => names.every(n => p.pilgrims.some(x => norm(x.name) === n)));
    if (!prof) {
      say(`Profile "${b.profile || b.customerName}" is not in the extension yet. Options › Google Sheet › Pull devotees.`, 'err');
      return;
    }
    const ids = names.map(n => (prof.pilgrims.find(x => norm(x.name) === n) || {}).id).filter(Boolean);
    const patch = { activeProfileId: prof.id, selectedIds: ids.length ? ids : prof.pilgrims.slice(0, 6).map(p => p.id) };
    const type = SheetSync.typeFor(b.category);
    if (type) patch.bookingType = type;
    await ATBA.save(patch);
    Object.assign(S, patch);
    renderType(); renderProfiles(); renderPilgrims();
    const missing = names.length - ids.length;
    say(`✓ ${prof.name}: ${ids.length} devotee(s) ticked${missing ? `, ${missing} not found by name` : ''}. Now click Autofill on the TTD page.`, missing ? 'err' : 'ok');
  }

  async function scan() {
    if (!tab || !/^https?:/.test(tab.url || '')) return say('Open the TTD confirmation page in this tab first.', 'err');
    try {
      const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.body ? document.body.innerText.slice(0, 30000) : '' });
      const d = SheetSync.parsePage(r && r.result);
      if (d.ttdRef) $('#rRef').value = d.ttdRef;
      if (d.serviceDate) $('#rDate').value = d.serviceDate;
      if (d.slot) $('#rSlot').value = d.slot;
      if (d.ticketAmount) $('#rAmt').value = d.ticketAmount;
      const found = ['ttdRef', 'serviceDate', 'slot', 'ticketAmount'].filter(k => d[k]).length;
      say(found ? `Found ${found} detail(s)${d.looksBooked ? ' · page says booking successful' : d.looksFailed ? ' · page says failed' : ''}. Please check them before saving.` : 'Nothing recognised on this page. Type the details.', found ? 'ok' : 'err');
    } catch (e) { say('Could not read this page: ' + e.message, 'err'); }
  }

  async function save(status) {
    const b = current();
    if (!b) return;
    if (status === 'Booked' && !$('#rRef').value.trim()) { $('#rRef').focus(); return say('Enter the TTD booking / ticket number first.', 'err'); }
    say('Saving to Google Sheet…');
    try {
      if (status === 'Attempting') {
        await SheetSync.call('attempting', { bookingId: b.bookingId, ttdLogin: $('#rLogin').value });
        say('✓ Marked as trying now.', 'ok');
        return load();
      }
      const payload = { bookingId: b.bookingId, status, ttdLogin: $('#rLogin').value };
      if (status !== 'Not Booked') Object.assign(payload, { ttdRef: $('#rRef').value.trim(), serviceDate: $('#rDate').value, slot: $('#rSlot').value.trim(), ticketAmount: $('#rAmt').value });
      if (status === 'Payment Failed') payload.ttdPayment = 'Debited - No Ticket';
      const r = await SheetSync.call('result', payload);
      lastMsg = { wa: r.message, sms: r.sms || r.message, whatsapp: r.whatsapp, bookingId: b.bookingId, smsReady: !!r.smsReady, mobile: b.mobile };
      $('#msgText').value = '';
      $('#smsBtn').textContent = '📤 Send SMS';
      setMode(r.contactVia === 'SMS' ? 'sms' : 'wa');
      $('#msgOut').hidden = false;
      say(`✓ Saved: ${b.customerName} → ${status}. Send the message below.`, 'ok');
      pending = pending.filter(x => x.bookingId !== b.bookingId || ['Lucky Dip - Registered', 'Payment Failed'].includes(status));
    } catch (e) { say(e.message, 'err'); }
  }

  $('#bkSel').addEventListener('change', show);
  $('#bkReload').addEventListener('click', load);
  $('#bkUse').addEventListener('click', useDevotees);
  $('#rScan').addEventListener('click', scan);
  document.querySelectorAll('[data-res]').forEach(btn => btn.addEventListener('click', () => save(btn.dataset.res)));
  $('#sheetSetup').addEventListener('click', e => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL('options.html#sheet') }); });
  // WhatsApp / SMS switch for the result message. Edits are kept per channel.
  let mode = 'wa';
  const smsCount = t => { const uni = /[^\x00-\x7F]/.test(t); const n = t.length; return `${n} chars · ${uni ? (n <= 70 ? 1 : Math.ceil(n / 67)) : (n <= 160 ? 1 : Math.ceil(n / 153))} SMS`; };
  function setMode(m) {
    if (lastMsg && $('#msgText').value) lastMsg[mode] = $('#msgText').value;
    mode = m;
    $('#msgText').value = lastMsg[m];
    $('#chWa').classList.toggle('on', m === 'wa');
    $('#chSms').classList.toggle('on', m === 'sms');
    $('#waBtn').hidden = m !== 'wa';
    $('#smsBtn').hidden = m !== 'sms';
    $('#smsBtn').disabled = !lastMsg.smsReady;
    $('#smsHint').hidden = !(m === 'sms' && !lastMsg.smsReady);
    $('#smsLen').textContent = m === 'sms' ? smsCount($('#msgText').value) : '';
  }
  $('#chWa').addEventListener('click', () => setMode('wa'));
  $('#chSms').addEventListener('click', () => setMode('sms'));
  $('#msgText').addEventListener('input', () => { if (mode === 'sms') $('#smsLen').textContent = smsCount($('#msgText').value); });
  $('#waBtn').addEventListener('click', () => {
    if (!lastMsg) return;
    const url = lastMsg.whatsapp.split('?')[0] + '?text=' + encodeURIComponent($('#msgText').value);
    chrome.tabs.create({ url });
    if (lastMsg.bookingId) SheetSync.call('messageSent', { bookingId: lastMsg.bookingId, channel: 'WhatsApp' }).catch(() => {});
  });
  $('#smsBtn').addEventListener('click', async () => {
    if (!lastMsg) return;
    const btn = $('#smsBtn');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await SheetSync.call('sendSms', { bookingId: lastMsg.bookingId, text: $('#msgText').value });
      say(`✓ SMS sent to ${lastMsg.mobile} (${r.parts} SMS).`, 'ok');
      btn.textContent = '✓ SMS sent';
    } catch (e) { say(e.message, 'err'); btn.disabled = false; btn.textContent = '📤 Send SMS'; }
  });
  $('#copyBtn').addEventListener('click', async () => { await navigator.clipboard.writeText($('#msgText').value); $('#copyBtn').textContent = '✓ Copied'; });
  start();
})();
