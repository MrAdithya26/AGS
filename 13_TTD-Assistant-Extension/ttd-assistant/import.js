/* Adithya TTD Booking Assistant - Excel / CSV import of profiles and devotees (options page).
 * Uses S, reload(), esc() and $ from options.js. */
(() => {
  // Header text (lower-case, letters and digits only, anything in brackets removed) -> field.
  const HEADERS = {
    profile: ['profile', 'profilename', 'group', 'groupname'],
    name: ['devoteename', 'name', 'fullname', 'pilgrimname', 'passengername', 'devotee', 'nameasonid', 'fullnameasonid'],
    dob: ['dateofbirth', 'dob', 'birthdate', 'dateofbirthddmmyyyy'],
    gender: ['gender', 'sex'],
    idType: ['photoidtype', 'idtype', 'idproof', 'photoidproof', 'idprooftype', 'proof', 'prooftype'],
    idNumber: ['photoidnumber', 'idnumber', 'idno', 'idproofnumber', 'photoidno', 'aadhaarnumber', 'aadhaar', 'aadhar', 'aadharnumber', 'aadhaarno'],
    gotram: ['gotram', 'gothram', 'gotra', 'gothra'],
    mobile: ['mobile', 'mobilenumber', 'mobileno', 'phone', 'phonenumber', 'contactnumber'],
    email: ['email', 'emailid', 'mail', 'mailid'],
    address: ['address', 'fulladdress', 'doorno', 'street'],
    city: ['city', 'citytown', 'town', 'village', 'citytownvillage'],
    district: ['district'],
    state: ['state'],
    pincode: ['pincode', 'pin', 'postalcode', 'zip'],
    country: ['country']
  };
  const CONTACT = ATBA.CONTACT_KEYS;
  const normH = h => String(h == null ? '' : h).replace(/\(.*?\)|\[.*?\]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const field = h => { const n = normH(h); return Object.keys(HEADERS).find(k => HEADERS[k].includes(n)) || null; };

  const GENDER = { m: 'Male', male: 'Male', man: 'Male', f: 'Female', female: 'Female', woman: 'Female', t: 'Transgender', tg: 'Transgender', transgender: 'Transgender', other: 'Transgender', others: 'Transgender', thirdgender: 'Transgender' };
  const ID_TYPE = [[/aadh?a+r|^uid/, 'Aadhaar Card'], [/passport/, 'Passport'], [/^pan/, 'PAN Card'], [/voter|epic|election/, 'Voter ID'], [/driv|licen|^dl$/, 'Driving Licence']];
  const STATE_ABBR = { ap: 'Andhra Pradesh', ts: 'Telangana', tg: 'Telangana', tn: 'Tamil Nadu', ka: 'Karnataka', kl: 'Kerala', mh: 'Maharashtra', od: 'Odisha', or: 'Odisha', orissa: 'Odisha', up: 'Uttar Pradesh', mp: 'Madhya Pradesh', wb: 'West Bengal', dl: 'Delhi', newdelhi: 'Delhi', pondicherry: 'Puducherry', py: 'Puducherry', jk: 'Jammu and Kashmir', uk: 'Uttarakhand', uttaranchal: 'Uttarakhand', hp: 'Himachal Pradesh', gj: 'Gujarat', rj: 'Rajasthan', pb: 'Punjab', hr: 'Haryana', br: 'Bihar', cg: 'Chhattisgarh', jh: 'Jharkhand', ga: 'Goa', as: 'Assam' };

  const str = v => (v === undefined || v === null || v === false) ? '' : String(v).trim();
  const cleanName = v => str(v).replace(/\s+/g, ' ');
  const key = v => cleanName(v).toLowerCase();

  // Number-like cells (Aadhaar, mobile, pincode) can arrive as numbers; never show 2.34E+11.
  const digitsOf = v => typeof v === 'number' ? (Number.isInteger(v) ? v.toFixed(0) : String(v)) : str(v);

  function parseDob(v, date1904) {
    if (typeof v === 'number') return SheetReader.serialToIso(v, date1904);
    const s = str(v);
    if (!s) return '';
    let y, m, d;
    let r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);           // 1990-05-14
    if (r) [, y, m, d] = r;
    else if ((r = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/))) [, d, m, y] = r;   // 14/05/1990 (Indian order)
    else if ((r = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ,]*(\d{4})$/))) {               // 14-May-1990
      const mi = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(r[2].slice(0, 3).toLowerCase());
      if (mi < 0) return null;
      [d, m, y] = [r[1], mi + 1, r[3]];
    } else if (/^\d{5}(\.\d+)?$/.test(s)) return SheetReader.serialToIso(Number(s), date1904);
    else return null;
    y = Number(y); m = Number(m); d = Number(d);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  }
  // Photo ID type left blank: tell it from the number's shape.
  function guessIdType(n) {
    if (/^\d{12}$/.test(n)) return 'Aadhaar Card';
    if (/^[A-Z][0-9]{7}$/.test(n)) return 'Passport';
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(n)) return 'PAN Card';
    if (/^[A-Z]{3}[0-9]{7}$/.test(n)) return 'Voter ID';
    if (/^[A-Z]{2}[0-9]{2}[0-9A-Z]{9,13}$/.test(n)) return 'Driving Licence';
    return '';
  }
  function parseState(v) {
    const s = str(v);
    if (!s) return '';
    const n = s.toLowerCase().replace(/[^a-z]/g, '');
    return ATBA.STATES.find(x => x.toLowerCase().replace(/[^a-z]/g, '') === n) || STATE_ABBR[n] || s;
  }

  // Picks the sheet holding devotees and turns its rows into records.
  function toRecords(book) {
    const visible = book.sheets.filter(s => s.state === 'visible');
    const ordered = [...visible.filter(s => /devotee|pilgrim|passenger/i.test(s.name)), ...visible, ...book.sheets];
    for (const sh of ordered) {
      // Header = first row (within the top 10) that has a name column.
      for (let h = 0; h < Math.min(10, sh.rows.length); h++) {
        const cols = (sh.rows[h] || []).map(field);
        if (!cols.includes('name')) continue;
        return { sheet: sh.name, cols, records: rowsToRecords(sh.rows.slice(h + 1), cols, h + 2, book.date1904) };
      }
    }
    throw new Error('Could not find a "Devotee Name" column. Use the template, or name the columns like it.');
  }

  function rowsToRecords(rows, cols, firstRowNo, date1904) {
    const out = [];
    let lastProfile = '';
    rows.forEach((row, i) => {
      const raw = {};
      cols.forEach((f, c) => { if (f && raw[f] === undefined) raw[f] = row[c]; });
      if (!Object.values(raw).some(v => str(v))) return;          // blank row
      const rowNo = firstRowNo + i;
      const profileTyped = cleanName(raw.profile);
      // Template example rows (and the rows under them with a blank profile) are ignored.
      if (/^example\b/i.test(profileTyped) || (!profileTyped && lastProfile === '\u0000example')) {
        lastProfile = '\u0000example';
        out.push({ rowNo, example: true });
        return;
      }
      const profile = profileTyped || lastProfile;
      lastProfile = profile;
      const rec = { rowNo, profile, errors: [], warnings: [] };
      rec.name = cleanName(raw.name);
      const dob = parseDob(raw.dob, date1904);
      rec.dob = dob || '';
      const g = str(raw.gender).toLowerCase().replace(/[^a-z]/g, '');
      rec.gender = GENDER[g] || '';
      const it = str(raw.idType).toLowerCase().replace(/[^a-z]/g, '');
      rec.idNumber = ATBA.cleanId('', digitsOf(raw.idNumber));
      rec.idType = (ID_TYPE.find(([re]) => re.test(it)) || [])[1] || (!it ? guessIdType(rec.idNumber) : '');
      rec.gotram = cleanName(raw.gotram);
      rec.contact = {};
      for (const k of CONTACT) {
        let v = k === 'mobile' || k === 'pincode' ? digitsOf(raw[k]) : str(raw[k]);
        if (k === 'mobile') v = v.replace(/\D/g, '').slice(-10);
        if (k === 'pincode') v = v.replace(/\D/g, '');
        if (k === 'state') v = parseState(v);
        if (k === 'address' || k === 'city' || k === 'district' || k === 'country') v = v.replace(/\s+/g, ' ');
        if (v) rec.contact[k] = v;
      }
      // Checks.
      if (!rec.name) rec.errors.push('Devotee name missing');
      if (!profile) rec.errors.push('Profile name missing (fill it on this row or a row above)');
      if (dob === null) rec.warnings.push(`Date of birth "${str(raw.dob)}" not understood - use DD/MM/YYYY`);
      if (str(raw.gender) && !rec.gender) rec.warnings.push(`Gender "${str(raw.gender)}" not understood`);
      if (str(raw.idType) && !rec.idType) rec.warnings.push(`Photo ID type "${str(raw.idType)}" not understood`);
      if (rec.contact.state && !ATBA.STATES.includes(rec.contact.state)) rec.warnings.push(`State "${rec.contact.state}" is not in the list`);
      for (const issue of ATBA.validatePilgrim(rec, false)) {
        if (/^ID number (missing|is empty)/.test(issue)) rec.warnings.push('Photo ID number missing');
        else if (/^Date of birth missing/.test(issue) && dob === null) continue;   // already explained above
        else if (/^Name:/.test(issue) && !rec.name) continue;
        else if (/^Gender missing/.test(issue) && str(raw.gender)) continue;
        else if (/^Photo ID type missing/.test(issue) && str(raw.idType)) continue;
        else rec.warnings.push(issue);
      }
      out.push(rec);
    });
    return out;
  }

  // Works out (and optionally applies) what each record does to the profiles.
  function merge(profiles, records, sealed) {
    const touched = new Map();          // profile id -> { name, isNew, contactFrom, contactChanged }
    for (const rec of records) {
      if (rec.example) { rec.action = 'example'; continue; }
      if (rec.errors.length) { rec.action = 'skip'; continue; }
      let prof = profiles.find(p => key(p.name) === key(rec.profile));
      if (!prof) {
        prof = ATBA.newProfile(rec.profile);
        profiles.push(prof);
        touched.set(prof.id, { name: prof.name, isNew: true, changed: [] });
        rec.createsProfile = true;
      } else if (!touched.has(prof.id)) touched.set(prof.id, { name: prof.name, isNew: false, changed: [] });
      const t = touched.get(prof.id);
      // Address & contact: first value given for this profile wins; existing values are replaced only by a different one.
      t.seen = t.seen || {};
      for (const k of Object.keys(rec.contact)) {
        if (t.seen[k]) continue;
        t.seen[k] = true;
        if (prof.contact[k] !== rec.contact[k]) { prof.contact[k] = rec.contact[k]; t.changed.push(k); }
      }
      // Same name (and same DOB when both are known) = the same devotee: update instead of duplicating.
      const ex = prof.pilgrims.find(p => key(p.name) === key(rec.name) && (!p.dob || !rec.dob || p.dob === rec.dob));
      const fields = { name: rec.name, dob: rec.dob, gender: rec.gender, idType: rec.idType, gotram: rec.gotram };
      if (ex) {
        rec.action = 'update';
        for (const [k, v] of Object.entries(fields)) if (v) ex[k] = v;
        if (rec.idNumber) ex.idNumber = sealed ? sealed.get(rec) : rec.idNumber;
      } else {
        rec.action = 'add';
        prof.pilgrims.push(Object.assign({ id: ATBA.uid(), photo: null, idType: 'Aadhaar Card' }, Object.fromEntries(Object.entries(fields).filter(([, v]) => v)),
          { idNumber: rec.idNumber ? (sealed ? sealed.get(rec) : rec.idNumber) : '' }));
      }
    }
    return touched;
  }

  // ---------------------------------------------------------------- UI
  let pending = null;   // { records, file }
  const msg = (t, ok) => { const el = $('#impMsg'); el.textContent = t; el.className = ok === false ? 'err-text' : ok ? 'ok-text' : 'muted'; };

  async function handleFile(file) {
    if (!file) return;
    $('#impPreview').hidden = true;
    msg(`Reading ${file.name}…`);
    try {
      useBook(await SheetReader.readFile(file), file.name);
    } catch (e) {
      msg('Could not read the file: ' + e.message, false);
    }
  }
  function useBook(book, label) {
    const { records, sheet } = toRecords(book);
    const real = records.filter(r => !r.example);
    if (!real.length) throw new Error(`No devotee rows found in sheet "${sheet}".`);
    pending = { records, file: label, sheet };
    preview();
    msg('');
  }
  // v1.5: rows pulled from the Google Sheet (first row = template headers) go through the same preview.
  window.__ATBA_IMPORT_ROWS = (rows, label) => {
    $('#impPreview').hidden = true;
    useBook({ sheets: [{ name: 'Devotees', state: 'visible', rows }], date1904: false }, label);
  };

  function preview() {
    const { records } = pending;
    const dry = JSON.parse(JSON.stringify(S.profiles));
    const touched = merge(dry, records, null);
    const tb = $('#impBody');
    tb.innerHTML = '';
    for (const r of records) {
      if (r.example) continue;
      const tr = document.createElement('tr');
      if (r.action === 'skip') tr.className = 'skipped';
      const act = r.action === 'skip' ? '<span class="act skip">✕ Skipped</span>'
        : r.action === 'update' ? '<span class="act upd">↻ Update</span>'
        : `<span class="act new">+ Add${r.createsProfile ? ' (new profile)' : ''}</span>`;
      const probs = r.action === 'skip' ? r.errors : [...r.errors, ...r.warnings];
      tr.innerHTML = `<td>${r.rowNo}</td><td>${esc(r.profile)}</td><td><b>${esc(r.name)}</b></td>
        <td>${r.dob ? `${esc(ATBA.formatDob(r.dob))} · ${ATBA.ageFrom(r.dob)}` : '-'}</td><td>${esc(r.gender || '-')}</td>
        <td>${r.idType ? esc(r.idType) + '<br>' : ''}<small>${esc(ATBA.maskId(r.idNumber))}</small></td><td>${esc(r.gotram || '-')}</td>
        <td>${act}</td><td class="chk">${probs.length ? `<ul>${probs.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '<span class="good">✓</span>'}</td>`;
      tb.appendChild(tr);
    }
    const n = a => records.filter(r => r.action === a).length;
    const ex = n('example');
    const warn = records.filter(r => r.action !== 'skip' && r.action !== 'example' && r.warnings.length).length;
    $('#impSummary').textContent = `${pending.file} · sheet "${pending.sheet}": ${n('add')} to add, ${n('update')} to update, ${n('skip')} skipped`
      + (warn ? `, ${warn} with something to check` : '') + (ex ? ` · ${ex} example row(s) ignored` : '');
    const lines = [...touched.values()].map(t => `<li><b>${esc(t.name)}</b>: ${t.isNew ? 'new profile' : 'existing profile'}${t.changed.length ? ` · address/contact ${t.isNew ? 'from Excel' : 'updated'}: ${t.changed.map(k => k).join(', ')}` : ''}</li>`);
    $('#impProfiles').innerHTML = lines.length ? `<b>Profiles</b><ul>${lines.join('')}</ul>` : '';
    $('#impGo').disabled = !(n('add') + n('update'));
    $('#impGo').textContent = `Import ${n('add') + n('update')} devotee(s)`;
    $('#impPreview').hidden = false;
    $('#impPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function doImport() {
    if (!pending) return;
    const s = await ATBA.load();
    const go = pending.records.filter(r => !r.example && !r.errors.length);
    // With the lock on, ID numbers are stored encrypted, which needs the lock open.
    const sealed = new Map();
    try {
      for (const r of go) if (r.idNumber) sealed.set(r, await ATBA.seal(r.idNumber));
    } catch (e) {
      msg('The security lock is on and locked. Unlock it on the Security tab (or the toolbar popup), then click Import again.', false);
      return;
    }
    const before = new Set(s.profiles.map(p => p.id));
    const touched = merge(s.profiles, pending.records, sealed);
    const patch = { profiles: s.profiles };
    // If the profile in use got new devotees, tick them (up to 6) so they're ready to fill.
    const active = ATBA.activeProfile(s);
    if (active && touched.has(active.id)) {
      const ids = s.selectedIds.filter(id => active.pilgrims.some(p => p.id === id));
      for (const p of active.pilgrims) if (ids.length < 6 && !ids.includes(p.id)) ids.push(p.id);
      patch.selectedIds = ids;
    }
    try {
      await ATBA.save(patch);
    } catch (e) {
      msg('Could not save: ' + e.message, false);
      return;
    }
    const added = pending.records.filter(r => r.action === 'add').length;
    const updated = pending.records.filter(r => r.action === 'update').length;
    const newProfiles = s.profiles.filter(p => !before.has(p.id)).length;
    pending = null;
    $('#impPreview').hidden = true;
    msg(`✓ Imported: ${added} added, ${updated} updated${newProfiles ? `, ${newProfiles} new profile(s)` : ''}. Add photos under Profiles if your seva form needs them.`, true);
    const first = [...touched.keys()][0];
    if (first) viewId = first;
    reload();
  }

  $('#impFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; handleFile(f); });
  $('#impCancel').addEventListener('click', () => { pending = null; $('#impPreview').hidden = true; msg(''); });
  $('#impGo').addEventListener('click', doImport);
  const drop = $('#impDrop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')));
  drop.addEventListener('drop', e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });

  // For tests.
  window.__ATBA_IMPORT = { toRecords, merge, parseDob };
})();
