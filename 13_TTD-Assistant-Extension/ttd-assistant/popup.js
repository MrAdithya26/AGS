/* Adithya TTD Booking Assistant - toolbar popup. */
const $ = s => document.querySelector(s);
let S = null;
let tab = null;

async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  S = await ATBA.load();
  const onTTD = tab && /^https:\/\/([^/]*\.)?(ttdevasthanams\.ap\.gov\.in|tirumala\.org|tirupatibalaji\.ap\.gov\.in)\//.test(tab.url || '');
  $('#tabInfo').textContent = onTTD ? '✓ TTD site' : 'not a TTD page';
  await renderLock();
  renderType();
  renderProfiles();
  renderPilgrims();
  renderReleases();
  setInterval(renderReleases, 1000);
}

async function renderLock() {
  const locked = await ATBA.isLocked();
  const pill = $('#lockPill');
  pill.hidden = !S.security.enabled;
  pill.textContent = locked ? '🔒 Locked' : '🔓 Unlocked';
  pill.className = 'pill ' + (locked ? 'warn' : 'ok');
  $('#unlockBox').hidden = !locked;
  pill.onclick = locked ? null : async () => { await ATBA.lock(); renderLock(); };
  pill.title = locked ? '' : 'Click to lock now';
  pill.style.cursor = locked ? '' : 'pointer';
}

function renderType() {
  const sel = $('#typeSel');
  sel.innerHTML = '';
  ATBA.BOOKING_TYPES.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = `${t.icon} ${t.label}`;
    sel.appendChild(o);
  });
  sel.value = ATBA.bookingType(S.bookingType).id;
  $('#typeNote').textContent = ATBA.needsGotram(sel.value) ? 'Homam asks each devotee\'s Gotram. ⚠ marks devotees without one.' : '';
}
$('#typeSel').addEventListener('change', async e => {
  S.bookingType = e.target.value;
  await ATBA.save({ bookingType: S.bookingType });
  renderType();
  renderPilgrims();
});

function renderProfiles() {
  const sel = $('#profileSel');
  sel.innerHTML = '';
  S.profiles.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = `${p.name} (${p.pilgrims.length})`;
    sel.appendChild(o);
  });
  sel.value = S.activeProfileId;
  sel.hidden = !S.profiles.length;
  const prof = ATBA.activeProfile(S);
  $('#profAddr').textContent = prof ? [prof.contact.mobile, prof.contact.city, prof.contact.state, prof.contact.pincode].filter(Boolean).join(' · ') : '';
}
$('#profileSel').addEventListener('change', async e => {
  const prof = S.profiles.find(p => p.id === e.target.value);
  S.activeProfileId = prof.id;
  S.selectedIds = prof.pilgrims.slice(0, 6).map(p => p.id);
  await ATBA.save({ activeProfileId: prof.id, selectedIds: S.selectedIds });
  renderProfiles();
  renderPilgrims();
});

function renderPilgrims() {
  const box = $('#pilgrimList');
  box.innerHTML = '';
  const prof = ATBA.activeProfile(S);
  const list = prof ? prof.pilgrims : [];
  if (!list.length) {
    box.innerHTML = '<small class="muted">No passengers in this profile. Open "Profiles & settings" to add them.</small>';
  }
  S.selectedIds = S.selectedIds.filter(id => list.some(p => p.id === id));
  const order = id => { const i = S.selectedIds.indexOf(id); return i < 0 ? 999 : i; };
  [...list].sort((a, b) => order(a.id) - order(b.id)).forEach(p => {
    const i = S.selectedIds.indexOf(p.id);
    const issues = ATBA.validatePilgrim(p, S.security.enabled, S.bookingType);
    const l = document.createElement('label');
    l.innerHTML = `<input type="checkbox" ${i >= 0 ? 'checked' : ''}><span class="ord">${i >= 0 ? '#' + (i + 1) : ''}</span><span class="grow"></span><small class="muted"></small>`;
    l.querySelector('.grow').textContent = p.name + (ATBA.needsGotram(S.bookingType) && p.gotram ? ` (${p.gotram})` : '');
    l.querySelector('small').textContent = `${ATBA.ageFrom(p.dob)} yrs · ${p.gender ? p.gender[0] : '?'}${p.photo ? ' · 📷' : ''}`;
    if (issues.length) {
      const w = document.createElement('span');
      w.className = 'warnDot'; w.textContent = '⚠'; w.title = issues.join('\n');
      l.appendChild(w);
    }
    l.querySelector('input').addEventListener('change', async e => {
      S.selectedIds = S.selectedIds.filter(x => x !== p.id);
      if (e.target.checked) S.selectedIds.push(p.id);
      await ATBA.save({ selectedIds: S.selectedIds });
      renderPilgrims();
    });
    box.appendChild(l);
  });
  $('#selCount').textContent = `${S.selectedIds.length} selected`;
}

function renderReleases() {
  const now = Date.now();
  const { y, m } = ATBA.istParts(now);
  const key = ATBA.monthKey(y, m);
  const edited = Object.keys(S.monthly[key] || {}).length;
  $('#monthNote').textContent = edited ? `${ATBA.monthName(key)}: dates updated by you` : `${ATBA.monthName(key)}: not updated yet - showing usual dates (tentative)`;
  const list = S.schedule.map(it => ({ it, r: ATBA.nextReleaseInfo(it, now, S.monthly) })).filter(x => x.r).sort((a, b) => a.r.t - b.r.t);
  const ul = $('#releases');
  ul.innerHTML = '';
  for (const { it, r } of list) {
    const li = document.createElement('li');
    li.innerHTML = `<b></b><span class="cd"></span><small class="muted"></small><a href="#">Open ↗</a>`;
    li.querySelector('b').textContent = (r.enabled ? '🔔 ' : '') + it.label;
    li.querySelector('.cd').textContent = ATBA.fmtCountdown(r.t - now);
    li.querySelector('small').innerHTML = `${it.category} · ${ATBA.fmtWhen(r.t)} ${r.edited ? '<span class="tag">✎ updated</span>' : ''}`;
    li.querySelector('a').addEventListener('click', e => { e.preventDefault(); chrome.tabs.create({ url: it.url || ATBA.TTD_HOME }); });
    ul.appendChild(li);
  }
}

document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
  const msg = $('#actMsg');
  const act = b.dataset.act;
  if (!tab || !/^https?:/.test(tab.url || '')) { msg.textContent = 'Open the TTD booking page in this tab first.'; return; }
  msg.textContent = 'Working…';
  try {
    // The popup click grants temporary access to this tab, so injection works on any site.
    try { await chrome.tabs.sendMessage(tab.id, { type: 'atba:ping' }); }
    catch (e) { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/core.js', 'content.js'] }); }
    const r = await chrome.tabs.sendMessage(tab.id, { type: act });
    msg.textContent = r && r.error ? r.error : 'Done - see the page for details.';
    if (act === 'atba:show' || act === 'atba:picker') window.close();
  } catch (e) {
    msg.textContent = 'Could not reach this page: ' + e.message;
  }
}));

$('#unlockForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#unlockMsg').textContent = 'Checking…';
  const ok = await ATBA.unlock($('#unlockPw').value);
  $('#unlockMsg').textContent = ok ? '' : 'Wrong password.';
  $('#unlockPw').value = '';
  if (ok) renderLock();
});
$('#openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('#editMonth').addEventListener('click', e => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL('options.html#schedule') }); });
$('#testReminder').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'testReminder' });
  $('#testReminder').textContent = '🔔 Sent';
});

init();
