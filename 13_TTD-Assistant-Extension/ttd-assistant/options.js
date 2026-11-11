/* Adithya TTD Booking Assistant - options page. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let S = null;
let viewId = null;       // profile shown on the Profiles tab
let editing = null;      // passenger being edited (copy)
let editPhoto = null;    // data URL or null
let monthKey = null;     // month shown on the Monthly dates tab

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fillSelect = (sel, items, blank) => {
  sel.innerHTML = (blank ? `<option value="">${blank}</option>` : '') + items.map(v => `<option>${esc(v)}</option>`).join('');
};
const flash = (el, text, ok = true) => { el.textContent = text; el.className = ok ? 'ok-text' : 'muted'; setTimeout(() => { el.textContent = ''; }, 4000); };
const issuesHtml = list => list.length ? `<ul>${list.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
const viewProfile = () => S.profiles.find(p => p.id === viewId) || S.profiles[0];
const saveProfiles = () => ATBA.save({ profiles: S.profiles });

// ---------------------------------------------------------------- tabs
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
  history.replaceState(null, '', '#' + b.dataset.tab);
}));
if (location.hash) { const b = $(`.tabs button[data-tab="${location.hash.slice(1)}"]`); if (b) b.click(); }

// ---------------------------------------------------------------- load
async function reload() {
  S = await ATBA.load();
  if (!S.profiles.length) {
    const p = ATBA.newProfile('My Family');
    S.profiles = [p];
    S.activeProfileId = p.id;
    await ATBA.save({ profiles: S.profiles, activeProfileId: p.id });
  }
  if (!viewId || !S.profiles.find(p => p.id === viewId)) viewId = S.activeProfileId;
  await renderLock();
  renderProfileList();
  renderProfile();
  renderMonth();
  renderPattern();
  renderReminders();
  renderPhotoSettings();
}

async function renderLock() {
  const locked = await ATBA.isLocked();
  const pill = $('#lockPill');
  pill.hidden = !S.security.enabled;
  pill.textContent = locked ? '🔒 Locked' : '🔓 Unlocked';
  pill.className = 'pill ' + (locked ? 'warn' : 'ok');
  $('#secOff').hidden = S.security.enabled;
  $('#secOn').hidden = !S.security.enabled;
  $('#secState').textContent = locked ? '🔒 Locked - ID numbers hidden' : '🔓 Unlocked for this browser session';
  $('#secState').className = 'pill ' + (locked ? 'warn' : 'ok');
}

// ---------------------------------------------------------------- profiles
function renderProfileList() {
  const box = $('#profileList');
  box.innerHTML = '';
  S.profiles.forEach(p => {
    const b = document.createElement('button');
    b.className = 'profItem' + (p.id === viewId ? ' on' : '');
    b.innerHTML = `<b></b><small class="muted"></small>${p.id === S.activeProfileId ? '<span class="star">★ In use for next booking</span>' : ''}`;
    b.querySelector('b').textContent = p.name;
    b.querySelector('small').textContent = `${p.pilgrims.length} passenger${p.pilgrims.length === 1 ? '' : 's'}${p.contact.city ? ' · ' + p.contact.city : ''}`;
    b.addEventListener('click', () => { viewId = p.id; $('#pilgrimForm').hidden = true; renderProfileList(); renderProfile(); });
    box.appendChild(b);
  });
}

function renderProfile() {
  const p = viewProfile();
  $('#profName').value = p.name;
  $('#useProfile').disabled = p.id === S.activeProfileId;
  $('#useProfile').textContent = p.id === S.activeProfileId ? '★ In use for next booking' : '★ Use for next booking';
  $('#delProfile').disabled = S.profiles.length < 2;
  const f = $('#contactForm');
  for (const k of ATBA.CONTACT_KEYS) f.elements[k].value = p.contact[k] || '';
  $('#contactIssues').innerHTML = issuesHtml(ATBA.validateSelf(p.contact));
  $('#paxTitle').textContent = `Passengers in "${p.name}" (${p.pilgrims.length})`;
  renderPilgrims();
}

$('#addProfile').addEventListener('click', async () => {
  const name = prompt('Profile name (e.g. My Family, Parents, Friends):', `Profile ${S.profiles.length + 1}`);
  if (!name || !name.trim()) return;
  const p = ATBA.newProfile(name.trim());
  // Start with the same address as the profile on screen; easy to change.
  const cur = viewProfile();
  if (cur) p.contact = Object.assign({}, cur.contact);
  S.profiles.push(p);
  await saveProfiles();
  viewId = p.id;
  reload();
});
$('#profName').addEventListener('change', async e => {
  const p = viewProfile();
  p.name = e.target.value.trim() || p.name;
  await saveProfiles();
  renderProfileList(); renderProfile();
});
$('#useProfile').addEventListener('click', async () => {
  const p = viewProfile();
  await ATBA.save({ activeProfileId: p.id, selectedIds: p.pilgrims.slice(0, 6).map(x => x.id) });
  reload();
});
$('#dupProfile').addEventListener('click', async () => {
  const src = viewProfile();
  const p = JSON.parse(JSON.stringify(src));
  p.id = ATBA.uid();
  p.name = src.name + ' (copy)';
  p.pilgrims.forEach(x => { x.id = ATBA.uid(); });
  S.profiles.push(p);
  await saveProfiles();
  viewId = p.id;
  reload();
});
$('#delProfile').addEventListener('click', async () => {
  const p = viewProfile();
  if (S.profiles.length < 2) return;
  if (!confirm(`Delete profile "${p.name}" and its ${p.pilgrims.length} passenger(s)? This cannot be undone (export a backup first if unsure).`)) return;
  S.profiles = S.profiles.filter(x => x.id !== p.id);
  const patch = { profiles: S.profiles };
  if (S.activeProfileId === p.id) { patch.activeProfileId = S.profiles[0].id; patch.selectedIds = S.profiles[0].pilgrims.slice(0, 6).map(x => x.id); }
  await ATBA.save(patch);
  viewId = null;
  reload();
});

// ---------------------------------------------------------------- contact (per profile)
const cform = $('#contactForm');
fillSelect(cform.elements.state, ATBA.STATES, 'Select…');
cform.addEventListener('submit', async e => {
  e.preventDefault();
  const p = viewProfile();
  const c = {};
  for (const k of ATBA.CONTACT_KEYS) c[k] = cform.elements[k].value.trim();
  c.mobile = c.mobile.replace(/\D/g, '').slice(-10);
  p.contact = c;
  await saveProfiles();
  renderProfile(); renderProfileList();
  flash($('#contactMsg'), '✓ Address saved');
});

// ---------------------------------------------------------------- passengers
async function renderPilgrims() {
  const prof = viewProfile();
  const isActive = prof.id === S.activeProfileId;
  const box = $('#pilgrimCards');
  box.innerHTML = '';
  const locked = await ATBA.isLocked();
  const shown = await ATBA.reveal(prof.pilgrims);
  if (!shown.length) box.innerHTML = '<div class="card muted">No passengers yet. Click "+ Add passenger".</div>';
  shown.forEach((p, idx) => {
    const issues = ATBA.validatePilgrim(p, locked);
    const sel = isActive ? S.selectedIds.indexOf(p.id) : -1;
    const c = document.createElement('div');
    c.className = 'card pcard';
    c.innerHTML = `
      ${p.photo ? `<img class="ph" alt="">` : `<div class="ph">No photo</div>`}
      <div>
        <h4>${esc(p.name)} ${sel >= 0 ? `<span class="pill ok">#${sel + 1} selected</span>` : ''}</h4>
        <div class="meta">${esc(p.gender)} · ${ATBA.ageFrom(p.dob)} yrs · DOB ${esc(ATBA.formatDob(p.dob))}</div>
        <div class="meta">${esc(p.idType)}: ${locked && p.idNumber === '' && prof.pilgrims[idx].idNumber ? '🔒 locked' : esc(ATBA.maskId(p.idNumber))}</div>
        <div class="meta">Gotram: ${p.gotram ? esc(p.gotram) : '<i>not added (needed only for Homam)</i>'}</div>
        ${issues.length ? `<div class="issues" style="margin-top:6px">${issuesHtml(issues)}</div>` : '<div class="ok-text">✓ Details look valid</div>'}
        <div class="acts">
          <button class="btn" data-a="edit">Edit</button>
          ${isActive ? `<button class="btn" data-a="sel">${sel >= 0 ? 'Unselect' : 'Select'}</button>` : ''}
          <button class="btn ghost" data-a="up" ${idx === 0 ? 'disabled' : ''} title="Move up">↑</button>
          <button class="btn ghost" data-a="down" ${idx === shown.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
          ${S.profiles.length > 1 ? '<button class="btn ghost" data-a="move">Move to…</button>' : ''}
          <button class="btn danger" data-a="del">Delete</button>
        </div>
      </div>`;
    if (p.photo) c.querySelector('img').src = p.photo;
    c.querySelector('.acts').addEventListener('click', e => {
      const a = e.target.closest('button') && e.target.closest('button').dataset.a;
      if (a) pilgrimAction(a, idx, p);
    });
    box.appendChild(c);
  });
}

async function pilgrimAction(a, idx, p) {
  const prof = viewProfile();
  const list = prof.pilgrims;
  if (a === 'edit') return openEditor(p);
  if (a === 'del') {
    if (!confirm(`Delete ${p.name}? This removes the saved details and photo.`)) return;
    list.splice(idx, 1);
    await ATBA.save({ profiles: S.profiles, selectedIds: S.selectedIds.filter(x => x !== p.id) });
  } else if (a === 'sel') {
    const ids = S.selectedIds.filter(x => x !== p.id);
    if (!S.selectedIds.includes(p.id)) ids.push(p.id);
    await ATBA.save({ selectedIds: ids });
  } else if (a === 'up' || a === 'down') {
    const j = a === 'up' ? idx - 1 : idx + 1;
    [list[idx], list[j]] = [list[j], list[idx]];
    await saveProfiles();
  } else if (a === 'move') {
    const others = S.profiles.filter(x => x.id !== prof.id);
    const pick = prompt(`Move ${p.name} to which profile? Type the number:\n\n${others.map((x, i) => `${i + 1}. ${x.name}`).join('\n')}`);
    const target = others[Number(pick) - 1];
    if (!target) return;
    const [moved] = list.splice(idx, 1);
    target.pilgrims.push(moved);
    await ATBA.save({ profiles: S.profiles, selectedIds: S.selectedIds.filter(x => x !== p.id) });
  }
  reload();
}

const form = $('#pilgrimForm');
fillSelect(form.elements.gender, ATBA.GENDERS, 'Select…');
fillSelect(form.elements.idType, ATBA.ID_TYPES);

async function openEditor(p) {
  const prof = viewProfile();
  const locked = await ATBA.isLocked();
  editing = p ? Object.assign({}, p) : { id: ATBA.uid(), name: '', dob: '', gender: '', idType: 'Aadhaar Card', idNumber: '', gotram: '', photo: null };
  // Suggest Gotrams already used in this profile.
  $('#gotramList').innerHTML = [...new Set(prof.pilgrims.map(x => x.gotram).filter(Boolean))].map(g => `<option value="${esc(g)}">`).join('');
  editPhoto = editing.photo || null;
  $('#formTitle').textContent = p ? `Edit ${p.name}` : `Add passenger to "${prof.name}"`;
  const F = form.elements;
  F.name.value = editing.name;
  F.dob.value = editing.dob;
  F.dob.max = new Date().toISOString().slice(0, 10);
  F.gender.value = editing.gender;
  F.idType.value = editing.idType;
  F.gotram.value = editing.gotram || '';
  const stored = p && prof.pilgrims.find(x => x.id === p.id);
  const encLocked = locked && stored && stored.idNumber && typeof stored.idNumber === 'object';
  F.idNumber.value = encLocked ? '' : (editing.idNumber || '');
  F.idNumber.placeholder = encLocked ? '🔒 Locked - leave blank to keep, or unlock to change' : 'e.g. 12-digit Aadhaar';
  showPhoto();
  $('#formIssues').innerHTML = '';
  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  F.name.focus();
}
function showPhoto(info) {
  $('#photoPreview').hidden = !editPhoto;
  $('#photoEmpty').hidden = !!editPhoto;
  if (editPhoto) $('#photoPreview').src = editPhoto;
  const kb = editPhoto ? Math.round(editPhoto.length * 0.75 / 1024) : 0;
  $('#photoInfo').textContent = info || (editPhoto ? `Saved photo: about ${kb} KB` : '');
}
$('#addPilgrim').addEventListener('click', () => openEditor(null));
$('#gotramAll').addEventListener('click', async () => {
  const prof = viewProfile();
  if (!prof.pilgrims.length) return;
  const common = prof.pilgrims.map(x => x.gotram).find(Boolean) || '';
  const g = prompt(`Gotram for all ${prof.pilgrims.length} passenger(s) in "${prof.name}":\n(Edit a passenger later if someone's Gotram differs.)`, common);
  if (g === null) return;
  prof.pilgrims.forEach(x => { x.gotram = g.trim().replace(/\s+/g, ' '); });
  await saveProfiles();
  reload();
});
$('#goImport').addEventListener('click', () => $('.tabs button[data-tab="import"]').click());
$('#cancelEdit').addEventListener('click', () => { form.hidden = true; editing = null; });
$('#photoRemove').addEventListener('click', () => { editPhoto = null; showPhoto(); });
$('#photoFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  $('#photoInfo').textContent = 'Processing…';
  try {
    const r = await processPhoto(f, S.photo);
    editPhoto = r.dataUrl;
    showPhoto(`Ready: ${r.width}×${r.height}px, ${r.kb} KB (original ${Math.round(f.size / 1024)} KB)${r.kb > S.photo.maxKB ? ' - still above the size limit, try a smaller photo' : ''}`);
  } catch (err) {
    $('#photoInfo').textContent = 'Could not read that image: ' + err.message;
  }
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const prof = viewProfile();
  const F = form.elements;
  const stored = prof.pilgrims.find(x => x.id === editing.id);
  const p = Object.assign({}, editing, {
    name: F.name.value.trim().replace(/\s+/g, ' '),
    dob: F.dob.value,
    gender: F.gender.value,
    idType: F.idType.value,
    gotram: F.gotram.value.trim().replace(/\s+/g, ' '),
    photo: editPhoto
  });
  const typedId = ATBA.cleanId(p.idType, F.idNumber.value);
  const keepEncrypted = !typedId && stored && stored.idNumber && typeof stored.idNumber === 'object';
  const issues = ATBA.validatePilgrim(Object.assign({}, p, { idNumber: keepEncrypted ? null : typedId }), keepEncrypted);
  if (issues.length && !confirm(`Please check:\n\n• ${issues.join('\n• ')}\n\nSave anyway?`)) {
    $('#formIssues').innerHTML = issuesHtml(issues);
    return;
  }
  try {
    p.idNumber = keepEncrypted ? stored.idNumber : await ATBA.seal(typedId);
  } catch (err) {
    $('#formIssues').innerHTML = issuesHtml([err.message]);
    return;
  }
  const i = prof.pilgrims.findIndex(x => x.id === p.id);
  if (i >= 0) prof.pilgrims[i] = p; else prof.pilgrims.push(p);
  const patch = { profiles: S.profiles };
  if (i < 0 && prof.id === S.activeProfileId && S.selectedIds.length < 6) patch.selectedIds = [...S.selectedIds, p.id];
  try {
    await ATBA.save(patch);
  } catch (err) {
    $('#formIssues').innerHTML = issuesHtml(['Could not save: ' + err.message]);
    return;
  }
  form.hidden = true;
  editing = null;
  reload();
});

// Crops, resizes and compresses a photo to a JPEG under the size limit.
async function processPhoto(file, opt) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  const ratio = opt.crop === 'passport' ? 3.5 / 4.5 : opt.crop === 'square' ? 1 : null;
  if (ratio) {
    if (sw / sh > ratio) { const nw = sh * ratio; sx = (sw - nw) / 2; sw = nw; }
    else { const nh = sw / ratio; sy = Math.max(0, (sh - nh) * 0.35); sh = nh; }
  }
  let scale = Math.min(1, (opt.maxSide || 600) / Math.max(sw, sh));
  const limit = (opt.maxKB || 100) * 1024;
  let best = null;
  for (let round = 0; round < 8; round++) {
    const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    for (let q = opt.quality || 0.9; q >= 0.45; q -= 0.1) {
      const url = cv.toDataURL('image/jpeg', q);
      const bytes = Math.round((url.length - 23) * 0.75);
      best = { dataUrl: url, width: w, height: h, kb: Math.round(bytes / 1024) };
      if (bytes <= limit) return best;
    }
    scale *= 0.8;
  }
  return best;
}

// ---------------------------------------------------------------- monthly dates
function currentKey() { const { y, m } = ATBA.istParts(); return ATBA.monthKey(y, m); }
function renderMonth() {
  if (!monthKey) monthKey = currentKey();
  const [y, m] = monthKey.split('-').map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const edits = S.monthly[monthKey] || {};
  $('#mName').textContent = ATBA.monthName(monthKey) + (monthKey === currentKey() ? ' (this month)' : '');
  const nEdited = S.schedule.filter(it => edits[it.id]).length;
  $('#mSummary').textContent = nEdited ? `${nEdited} of ${S.schedule.length} booking types updated for this month` : 'Not updated yet - showing the default pattern';
  const tb = $('#monthBody');
  tb.innerHTML = '';
  const now = Date.now();
  for (const it of S.schedule) {
    const r = ATBA.releaseIn(it, monthKey, S.monthly);
    const tr = document.createElement('tr');
    tr.dataset.id = it.id;
    tr.className = r.off ? 'skip' : '';
    tr.innerHTML = `
      <td><input type="checkbox" class="on" ${r.enabled ? 'checked' : ''} aria-label="Remind"></td>
      <td class="bk"><b></b><small class="muted"></small></td>
      <td><input type="date" class="date" min="${monthKey}-01" max="${monthKey}-${String(dim).padStart(2, '0')}" value="${monthKey}-${String(r.day).padStart(2, '0')}"></td>
      <td><input type="time" class="time" value="${esc(r.time)}"></td>
      <td><input type="checkbox" class="off" ${r.off ? 'checked' : ''} aria-label="No release this month"></td>
      <td>${r.edited ? '<span class="edited">✎ Updated</span>' : '<span class="def">Default</span>'}</td>
      <td class="next">${r.off ? '-' : r.t < now ? 'Done' : ATBA.fmtCountdown(r.t - now)}</td>`;
    tr.querySelector('b').textContent = it.label;
    tr.querySelector('small').textContent = it.category;
    tr.querySelector('.off').addEventListener('change', e => tr.classList.toggle('skip', e.target.checked));
    tb.appendChild(tr);
  }
}
$('#mPrev').addEventListener('click', () => { monthKey = ATBA.addMonths(monthKey, -1); renderMonth(); });
$('#mNext').addEventListener('click', () => { monthKey = ATBA.addMonths(monthKey, 1); renderMonth(); });
$('#saveMonth').addEventListener('click', async () => {
  const edits = {};
  for (const tr of $$('#monthBody tr')) {
    const d = tr.querySelector('.date').value;
    if (!d || d.slice(0, 7) !== monthKey) { flash($('#monthMsg'), `Dates must be inside ${ATBA.monthName(monthKey)}.`, false); return; }
    edits[tr.dataset.id] = {
      day: Number(d.slice(8, 10)),
      time: tr.querySelector('.time').value || '10:00',
      on: tr.querySelector('.on').checked,
      off: tr.querySelector('.off').checked
    };
  }
  const monthly = Object.assign({}, S.monthly, { [monthKey]: edits });
  // Keep only recent months.
  const keep = ATBA.addMonths(currentKey(), -3);
  for (const k of Object.keys(monthly)) if (k < keep) delete monthly[k];
  await ATBA.save({ monthly });
  S.monthly = monthly;
  renderMonth();
  flash($('#monthMsg'), `✓ Saved ${ATBA.monthName(monthKey)} - reminders updated`);
});
$('#copyPrev').addEventListener('click', () => {
  const prev = S.monthly[ATBA.addMonths(monthKey, -1)];
  if (!prev) return flash($('#monthMsg'), 'The previous month has no saved dates to copy.', false);
  const [y, m] = monthKey.split('-').map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (const tr of $$('#monthBody tr')) {
    const e = prev[tr.dataset.id];
    if (!e) continue;
    tr.querySelector('.date').value = `${monthKey}-${String(Math.min(e.day, dim)).padStart(2, '0')}`;
    tr.querySelector('.time').value = e.time;
    tr.querySelector('.on').checked = e.on !== false;
    tr.querySelector('.off').checked = !!e.off;
  }
  flash($('#monthMsg'), 'Copied - check, then click Save.', true);
});
$('#resetMonth').addEventListener('click', async () => {
  if (!S.monthly[monthKey]) return renderMonth();
  if (!confirm(`Remove your edits for ${ATBA.monthName(monthKey)} and use the default pattern?`)) return;
  const monthly = Object.assign({}, S.monthly);
  delete monthly[monthKey];
  await ATBA.save({ monthly });
  S.monthly = monthly;
  renderMonth();
});

// ---------------------------------------------------------------- reminders
function renderReminders() {
  $('#remEnabled').checked = S.reminders.enabled;
  $('#remOffsets').value = S.reminders.offsets.join(',');
  $('#reviewDay').value = S.reminders.reviewDay || 0;
  $('#reviewTime').value = S.reminders.reviewTime || '09:00';
}
$('#saveRem').addEventListener('click', async () => {
  const offsets = $('#remOffsets').value.split(/[,\s]+/).map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 1440);
  const reminders = {
    enabled: $('#remEnabled').checked,
    offsets: offsets.length ? [...new Set(offsets)].sort((a, b) => b - a) : [30, 15, 5],
    reviewDay: Math.min(28, Math.max(0, parseInt($('#reviewDay').value, 10) || 0)),
    reviewTime: $('#reviewTime').value || '09:00'
  };
  await ATBA.save({ reminders });
  S.reminders = reminders;
  renderReminders();
  flash($('#remMsg'), '✓ Saved - reminders rescheduled');
});
$('#testReminder').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'testReminder' });
  flash($('#remMsg'), '🔔 Test sent. If nothing popped up, allow Chrome notifications in Windows Settings › System › Notifications.');
});

// ---------------------------------------------------------------- default pattern
function renderPattern() {
  const tb = $('#schedBody');
  tb.innerHTML = '';
  S.schedule.forEach(it => tb.appendChild(patternRow(it)));
}
function patternRow(it) {
  const tr = document.createElement('tr');
  tr.dataset.id = it.id;
  tr.innerHTML = `
    <td><input type="checkbox" class="en" ${it.enabled ? 'checked' : ''} aria-label="Remind by default"></td>
    <td><input class="label" value="${esc(it.label)}"></td>
    <td><input class="cat" value="${esc(it.category)}" list="cats"></td>
    <td><input class="day" type="number" min="1" max="31" value="${esc(it.day)}"></td>
    <td><input class="time" type="time" value="${esc(it.time)}"></td>
    <td><input class="url" value="${esc(it.url)}"></td>
    <td><button class="btn ghost del" title="Remove">✕</button></td>`;
  tr.querySelector('.del').addEventListener('click', () => tr.remove());
  return tr;
}
const dl = document.createElement('datalist');
dl.id = 'cats';
dl.innerHTML = ['Special Entry Darshan', 'Arjitha Seva', 'Angapradakshinam', 'Homam', 'Darshan', 'Accommodation', 'Other'].map(c => `<option value="${c}">`).join('');
document.body.appendChild(dl);

$('#addSched').addEventListener('click', () => {
  $('#schedBody').appendChild(patternRow({ id: ATBA.uid(), label: 'New booking type', category: 'Other', day: 25, time: '10:00', enabled: true, url: ATBA.TTD_HOME }));
});
$('#saveSched').addEventListener('click', async () => {
  const schedule = $$('#schedBody tr').map(tr => ({
    id: tr.dataset.id,
    enabled: tr.querySelector('.en').checked,
    label: tr.querySelector('.label').value.trim() || 'Release',
    category: tr.querySelector('.cat').value.trim() || 'Other',
    day: Math.min(31, Math.max(1, parseInt(tr.querySelector('.day').value, 10) || 1)),
    time: tr.querySelector('.time').value || '10:00',
    url: /^https:\/\//.test(tr.querySelector('.url').value.trim()) ? tr.querySelector('.url').value.trim() : ATBA.TTD_HOME
  }));
  await ATBA.save({ schedule });
  S.schedule = schedule;
  renderPattern(); renderMonth();
  flash($('#schedMsg'), '✓ Pattern saved');
});
$('#resetSched').addEventListener('click', async () => {
  if (!confirm('Replace the default pattern with the built-in TTD release days?')) return;
  await ATBA.save({ schedule: ATBA.DEFAULT_SCHEDULE });
  S.schedule = ATBA.DEFAULT_SCHEDULE;
  renderPattern(); renderMonth();
});

// ---------------------------------------------------------------- photo & panel settings
const pform = $('#photoForm');
const panelForm = $('#panelForm');
function renderPhotoSettings() {
  pform.elements.maxKB.value = S.photo.maxKB;
  pform.elements.maxSide.value = S.photo.maxSide;
  pform.elements.crop.value = S.photo.crop;
  panelForm.elements.autoShow.checked = S.panel.autoShow !== false;
  panelForm.elements.autoPicker.checked = S.panel.autoPicker !== false;
  panelForm.elements.highlight.checked = S.panel.highlight !== false;
}
pform.addEventListener('submit', async e => {
  e.preventDefault();
  const photo = Object.assign({}, S.photo, {
    maxKB: Math.max(10, Number(pform.elements.maxKB.value) || 100),
    maxSide: Math.max(100, Number(pform.elements.maxSide.value) || 600),
    crop: pform.elements.crop.value
  });
  await ATBA.save({ photo });
  S.photo = photo;
  flash($('#photoMsg'), '✓ Saved. Applies to photos you add from now on.');
});
panelForm.addEventListener('change', async () => {
  S.panel = { autoShow: panelForm.elements.autoShow.checked, autoPicker: panelForm.elements.autoPicker.checked, highlight: panelForm.elements.highlight.checked };
  await ATBA.save({ panel: S.panel });
});

// ---------------------------------------------------------------- security
$('#enableSec').addEventListener('click', async () => {
  const a = $('#pw1').value, b = $('#pw2').value;
  if (a.length < 6) return flash($('#secMsg1'), 'Use at least 6 characters.', false);
  if (a !== b) return flash($('#secMsg1'), 'Passwords do not match.', false);
  $('#secMsg1').textContent = 'Encrypting…';
  await ATBA.enableSecurity(a);
  $('#pw1').value = $('#pw2').value = '';
  reload();
});
$('#unlockBtn').addEventListener('click', async () => {
  const ok = await ATBA.unlock($('#pw3').value);
  $('#pw3').value = '';
  flash($('#secMsg2'), ok ? '✓ Unlocked' : 'Wrong password.', ok);
  reload();
});
$('#lockBtn').addEventListener('click', async () => { await ATBA.lock(); reload(); });
$('#disableSec').addEventListener('click', async () => {
  if (!confirm('Turn off the lock? ID numbers will be stored unencrypted on this computer.')) return;
  const ok = await ATBA.disableSecurity($('#pw3').value);
  $('#pw3').value = '';
  if (!ok) return flash($('#secMsg2'), 'Type the master password in the box first.', false);
  reload();
});

// ---------------------------------------------------------------- backup
$('#exportBtn').addEventListener('click', async () => {
  const data = await chrome.storage.local.get(null);
  const blob = new Blob([JSON.stringify({ app: 'adithya-ttd-assistant', version: ATBA.VERSION, exported: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `adithya-ttd-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  flash($('#backupMsg'), '✓ Backup saved to your Downloads folder.');
});
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const d = j && j.data;
    if (j.app !== 'adithya-ttd-assistant' || !d || !(Array.isArray(d.profiles) || Array.isArray(d.pilgrims))) throw new Error('Not an Adithya TTD backup file');
    const count = Array.isArray(d.profiles) ? `${d.profiles.length} profile(s)` : `${d.pilgrims.length} pilgrim(s)`;
    if (!confirm(`Replace current data with this backup (${count}, from ${j.exported || 'unknown date'})?`)) return;
    await chrome.storage.local.clear();
    await ATBA.save(d);
    await ATBA.lock();
    viewId = null;
    flash($('#backupMsg'), '✓ Restored.');
    reload();
  } catch (err) {
    flash($('#backupMsg'), 'Import failed: ' + err.message, false);
  }
});

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && (ch.selectedIds || ch.activeProfileId || ch.security) && form.hidden) reload();
});

reload();
