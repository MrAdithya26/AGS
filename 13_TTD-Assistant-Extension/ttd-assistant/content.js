/* Adithya TTD Booking Assistant - on-page helper.
 * Fills saved pilgrim details into the open form only when you click.
 * It never touches CAPTCHA, booking date, slot, amount, declarations, and never submits or pays. */
(() => {
  if (window.__ATBA_LOADED) return;
  window.__ATBA_LOADED = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const send = msg => new Promise((res, rej) => {
    try {
      chrome.runtime.sendMessage(msg, r => {
        if (chrome.runtime.lastError) rej(new Error(chrome.runtime.lastError.message)); else res(r);
      });
    } catch (e) { rej(e); }
  });
  const textOf = el => ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  const visible = el => !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  const norm = v => String(v == null ? '' : v).toLowerCase().replace(/[\s\-\/.]/g, '');

  // ---------------------------------------------------------------- field detection
  // Anything that matches BLOCK is never filled.
  const BLOCK = /captcha|otp|verification ?code|security ?code|slot|amount|price|fee|payment|donation|declar|terms|agree|consent|accept|undertak|booking ?date|darshan ?date|seva ?date|visit|journey|select ?date|from ?date|to ?date|check.?in|check.?out|coupon|password|search|quantity|no\.? ?of ?(persons|pilgrims|tickets)/i;

  function labelFor(el) {
    const parts = [];
    for (const a of ['aria-label', 'placeholder', 'name', 'id', 'formcontrolname', 'title', 'data-placeholder']) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && !/^(mat-|cdk-|ng-|input-?\d|select-?\d)/i.test(v)) parts.push(v.replace(/([a-z])([A-Z])/g, '$1 $2'));
    }
    if (el.labels) for (const l of el.labels) parts.push(textOf(l));
    const lb = el.getAttribute && el.getAttribute('aria-labelledby');
    if (lb) lb.split(/\s+/).forEach(id => { const n = document.getElementById(id); if (n && !n.matches('mat-select, [role=combobox]')) parts.push(textOf(n)); });
    const ff = el.closest('mat-form-field, .mat-form-field, .mat-mdc-form-field, .form-group, .form-field, .MuiFormControl-root, .ant-form-item, .input-group');
    if (ff) {
      const l = ff.querySelector('label, mat-label, .mat-form-field-label, .mdc-floating-label, .form-label');
      if (l) parts.push(textOf(l));
    }
    const td = el.closest('td');
    if (td) {
      const idx = [...td.parentElement.children].indexOf(td);
      const head = td.closest('table') && td.closest('table').querySelector('thead tr, tr:first-child');
      if (head && head !== td.parentElement && head.children[idx]) parts.push(textOf(head.children[idx]));
    }
    const prev = el.previousElementSibling;
    if (prev && /^(LABEL|SPAN|P|B|STRONG|DIV)$/.test(prev.tagName) && textOf(prev).length < 50) parts.push(textOf(prev));
    if (parts.join('').length < 3 && el.parentElement) {
      const pl = el.parentElement.querySelector('label');
      if (pl) parts.push(textOf(pl));
      else if (el.parentElement.previousElementSibling && textOf(el.parentElement.previousElementSibling).length < 50) parts.push(textOf(el.parentElement.previousElementSibling));
    }
    return parts.join(' | ').toLowerCase();
  }

  function classify(el, isChoice) {
    const L = labelFor(el);
    if (!L || BLOCK.test(L)) return null;
    if (el.type === 'date' && !/birth|dob/.test(L)) return null;
    // Gotram / Gothram / Gotra (Homam and some sevas). Checked before "name" so "Gothram Name" lands here.
    if (/goth?ra/.test(L)) return 'gotram';
    if (/e-?mail|\bmail\b/.test(L)) return 'email';
    if (/mobile|phone|contact ?(no|num)|cell/.test(L)) return 'mobile';
    if (/pin ?code|postal|zip/.test(L)) return 'pincode';
    if (/country|nationality/.test(L)) return 'country';
    if (/district/.test(L)) return 'district';
    if (/\bstate\b/.test(L)) return 'state';
    if (/\bcity\b|town|village/.test(L)) return 'city';
    if (/address|street|door ?no|house/.test(L)) return 'address';
    if (/gender|\bsex\b/.test(L)) return 'gender';
    if (/date ?of ?birth|\bdob\b|birth/.test(L)) return 'dob';
    if (/\bage\b|\(years\)|in ?years/.test(L)) return 'age';
    // "Photo Id Number" / "Aadhaar No" -> number; "Photo ID Proof" / "ID Type" -> the proof dropdown.
    if (/aadha?ar|\bid\b|proof|identity|\bepic\b|passport|document/.test(L)) {
      if (/\b(no|num|number)\b|no\./.test(L)) return 'idNumber';
      if (isChoice || /proof|type|photo ?id|identity|document/.test(L)) return 'idType';
      return 'idNumber';
    }
    if (/first ?name|given ?name/.test(L)) return 'firstName';
    if (/last ?name|sur ?name/.test(L)) return 'lastName';
    if (/name/.test(L) && !/user ?name|login|father|mother|guardian|nominee|spouse|holder|bank|account|gothram|gotra/.test(L)) return 'name';
    return null;
  }

  const PILGRIM_KINDS = ['name', 'firstName', 'lastName', 'age', 'dob', 'gender', 'idType', 'idNumber', 'gotram'];
  const CHOICE_KINDS = ['gender', 'idType', 'state', 'country', 'district'];
  const ADDRESS_ORDER = ['country', 'state', 'district', 'city', 'address', 'pincode', 'email', 'mobile'];

  // Is this <input> really a dropdown? "loose" also accepts an arrow/chevron icon next to it.
  function dropdownInput(el, loose) {
    if (el.tagName !== 'INPUT') return false;
    if (el.readOnly) return true;
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (role === 'combobox' || el.hasAttribute('aria-haspopup') || el.hasAttribute('aria-autocomplete') || el.hasAttribute('list')
      || /autocomplete-trigger|select/.test(el.className || '')) return true;
    if (!loose) return false;
    const box = el.closest('mat-form-field, .mat-mdc-form-field, .mat-form-field, .MuiFormControl-root, .form-group, .p-dropdown, .dropdown, .input-group') || el.parentElement;
    return !!(box && box.querySelector('.mat-select-arrow, .mat-mdc-select-arrow, [class*="arrow"], [class*="caret"], [class*="chevron"], [class*="dropdown"], mat-icon, svg'));
  }

  function scan() {
    const items = [];
    const seen = new Set();
    const radioGroups = new Set();
    const nodes = document.querySelectorAll('input, select, textarea, mat-select, ng-select, [role="combobox"], [role="radiogroup"], mat-radio-group');
    for (const raw of nodes) {
      if (raw.closest('#atba-host')) continue;
      let el = raw.closest('ng-select, mat-select, mat-radio-group, [role="radiogroup"]') || raw;
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.tagName === 'INPUT' && el.type === 'radio') {
        const key = el.name || (el.closest('fieldset, .radio-group, div') || el).outerHTML.length;
        if (radioGroups.has(key)) continue;
        radioGroups.add(key);
        const radios = el.name ? [...document.querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`)] : [el];
        const optText = radios.map(r => radioText(r)).join(' ').toLowerCase();
        if (/\bmale\b|female/.test(optText)) items.push({ el, kind: 'gender', mode: 'radio', radios });
        continue;
      }
      if (!visible(el)) continue;
      if (el.matches('mat-radio-group, [role="radiogroup"]')) {
        const radios = [...el.querySelectorAll('input[type=radio], mat-radio-button, [role=radio]')];
        if (/\bmale\b|female/i.test(textOf(el))) items.push({ el, kind: 'gender', mode: 'radio', radios });
        continue;
      }
      if (el.tagName === 'INPUT' && /^(hidden|submit|button|reset|image|file|password|checkbox|search|range|color)$/i.test(el.type)) continue;
      if (el.disabled) continue;
      let mode = el.tagName === 'SELECT' ? 'select'
        : (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') ? 'custom'
        : dropdownInput(el) ? 'custom' : 'input';
      const kind = classify(el, mode !== 'input');
      if (!kind) continue;
      // Text boxes with a dropdown arrow (TTD's Gender / Photo ID Proof) behave like dropdowns.
      if (mode === 'input' && CHOICE_KINDS.includes(kind) && dropdownInput(el, true)) mode = 'custom';
      items.push({ el, kind, mode });
    }
    // Group pilgrim fields into rows using the smallest container holding one name field.
    const nameItems = items.filter(i => i.kind === 'name' || i.kind === 'firstName');
    const rows = nameItems.map(ni => {
      let r = ni.el;
      while (r.parentElement && r.parentElement !== document.body) {
        const p = r.parentElement;
        if (nameItems.filter(o => p.contains(o.el)).length > 1) break;
        r = p;
      }
      return { root: r, used: {} };
    });
    const counters = {};
    for (const it of items) {
      if (!PILGRIM_KINDS.includes(it.kind)) continue;
      const row = rows.findIndex(r => r.root.contains(it.el) && !r.used[it.kind]);
      if (row >= 0 && rows.length > 1) {
        it.row = row; rows[row].used[it.kind] = true;
      } else {
        it.row = counters[it.kind] || 0;
        counters[it.kind] = it.row + 1;
      }
    }
    return { items, rowCount: Math.max(rows.length, ...Object.values(counters), 0) };
  }

  function radioText(r) {
    return textOf(r.labels && r.labels[0]) || r.value || textOf(r.closest('label, mat-radio-button')) || textOf(r.parentElement);
  }

  // ---------------------------------------------------------------- values
  const SYN = {
    'Male': ['male', 'm'], 'Female': ['female', 'f'], 'Transgender': ['transgender', 'third gender', 'others', 'other', 't', 'tg'],
    'Aadhaar Card': ['aadhaar', 'aadhar', 'adhar', 'uid'], 'Passport': ['passport'], 'PAN Card': ['pan card', 'pan'],
    'Voter ID': ['voter', 'epic', 'election'], 'Driving Licence': ['driving', 'licen']
  };
  function matches(text, want) {
    const t = String(text || '').toLowerCase().trim();
    if (!t || !want) return false;
    if (want === 'Male' && /female/.test(t)) return false;
    const syn = SYN[want] || [String(want).toLowerCase()];
    return syn.some(s => s.length <= 3 ? (t === s || new RegExp(`\\b${s}\\b`).test(t)) : t.includes(s));
  }

  function valueFor(it, p, self) {
    switch (it.kind) {
      case 'name': return p && p.name;
      case 'firstName': { const w = (p && p.name || '').trim().split(/\s+/); return w.length > 1 ? w.slice(0, -1).join(' ') : w[0]; }
      case 'lastName': { const w = (p && p.name || '').trim().split(/\s+/); return w[w.length - 1]; }
      case 'age': return p && String(ATBA.ageFrom(p.dob));
      case 'dob': {
        if (!p) return '';
        if (it.el.type === 'date') return ATBA.formatDob(p.dob, 'iso');
        const hint = (it.el.getAttribute('placeholder') || '').toLowerCase();
        if (/yyyy-mm-dd/.test(hint)) return ATBA.formatDob(p.dob, 'iso');
        if (/mm\/dd/.test(hint)) return ATBA.formatDob(p.dob, 'mdy');
        if (/dd-mm/.test(hint)) return ATBA.formatDob(p.dob, 'dmy-dash');
        return ATBA.formatDob(p.dob, 'dmy');
      }
      case 'gender': return p && p.gender;
      case 'idType': return p && p.idType;
      case 'idNumber': return p && ATBA.cleanId(p.idType, p.idNumber);
      case 'gotram': return p && p.gotram;
      case 'mobile': return String(self.mobile || '').replace(/\D/g, '').slice(-10);
      default: return self[it.kind];
    }
  }

  // ---------------------------------------------------------------- setters
  function setNative(el, val) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
  }
  function fire(el, ...types) { for (const t of types) el.dispatchEvent(new Event(t, { bubbles: true })); }

  // Puts text in as if typed, which forms that wipe script-set values (like TTD's) accept.
  function insertAsTyped(el, val) {
    el.focus();
    try { el.select(); } catch (e) { /* number inputs */ }
    try { document.execCommand('selectAll', false); } catch (e) { /* ignore */ }
    let ok = false;
    try { ok = document.execCommand('insertText', false, val); } catch (e) { ok = false; }
    return ok;
  }
  // Polls until fn() is truthy or the time runs out; returns the last value.
  async function waitFor(fn, ms) {
    const end = Date.now() + ms;
    let v = fn();
    while (!v && Date.now() < end) { await sleep(40); v = fn(); }
    return v;
  }
  async function fillInput(el, val) {
    if (el.readOnly) return false;
    const same = () => norm(el.value) === norm(val);
    // Typed-text insert first (accepted by TTD); plain value set as a fallback.
    insertAsTyped(el, val);
    if (!same()) {
      setNative(el, val);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: val, inputType: 'insertText' }));
    }
    fire(el, 'change');
    el.blur();
    await sleep(30);
    return same();
  }
  // Exact text match first ("India" must not pick "British Indian Ocean Territory").
  function bestMatch(list, getText, val) {
    const want = String(val).toLowerCase().trim();
    return list.find(x => getText(x).toLowerCase().trim() === want) || list.find(x => matches(getText(x), val)) || null;
  }
  function fillSelect(el, val) {
    const opts = [...el.options].filter(o => o.value !== '');
    const opt = bestMatch(opts, o => o.text, val) || bestMatch(opts, o => o.value, val);
    if (!opt) return false;
    setNative(el, opt.value);
    fire(el, 'input', 'change');
    return true;
  }
  async function fillCustom(el, val) {
    const trigger = el.querySelector('.mat-select-trigger, .mat-mdc-select-trigger, .ng-select-container') || el;
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    trigger.click();
    try { trigger.focus(); } catch (e) { /* ignore */ }
    let o = await waitFor(() => findOption(val), 350);
    // Searchable dropdowns (State / District / Country): type to filter the list, then pick.
    if (!o && el.tagName === 'INPUT' && !el.readOnly) {
      insertAsTyped(el, String(val));
      o = await waitFor(() => findOption(val), 700);
    }
    if (o) {
      o.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      o.click();
      await waitFor(() => !document.contains(o) || !visible(o), 300);
      return true;
    }
    const esc = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });
    (document.activeElement || el).dispatchEvent(esc);
    await sleep(100);
    return false;
  }
  // A visible dropdown option whose text matches the wanted value.
  function findOption(val) {
    const opts = [...document.querySelectorAll('mat-option, .mat-mdc-option, [role="option"], .ng-option, .dropdown-item, .p-dropdown-item, .cdk-overlay-container li, ul[role="listbox"] li')]
      .filter(x => visible(x) && !x.closest('#atba-host'));
    return bestMatch(opts, textOf, val);
  }
  function currentValue(it) {
    if (it.mode === 'select') return it.el.selectedOptions[0] ? it.el.selectedOptions[0].text : '';
    if (it.mode === 'radio') { const r = it.radios.find(x => x.checked || x.classList.contains('mat-radio-checked') || x.getAttribute('aria-checked') === 'true'); return r ? (radioText(r) || textOf(r)) : ''; }
    if (it.el.tagName === 'INPUT' || it.el.tagName === 'TEXTAREA') return it.el.value;
    return textOf(it.el);
  }
  const isChoice = it => it.mode !== 'input' || it.kind === 'gender' || it.kind === 'idType';
  function isCorrect(it, val) {
    const cur = currentValue(it);
    return isChoice(it) ? matches(cur, val) : (norm(cur) === norm(val) && norm(val) !== '');
  }
  function fillRadio(it, val) {
    const r = it.radios.find(x => matches(radioText(x) || textOf(x), val));
    if (!r) return false;
    const target = r.matches('input') ? r : (r.querySelector('input') || r);
    target.click();
    return true;
  }
  async function fillOne(it, val) {
    if (val === undefined || val === null || val === '') return 'skip';
    let ok;
    if (it.mode === 'select') ok = fillSelect(it.el, val);
    else if (it.mode === 'custom') ok = await fillCustom(it.el, val);
    else if (it.mode === 'radio') ok = fillRadio(it, val);
    else ok = await fillInput(it.el, String(val));
    if (ok) ok = await waitFor(() => isCorrect(it, val), 150);
    if (ok && state.highlight && it.el.style) {
      const old = it.el.style.outline;
      it.el.style.outline = '2px solid #2e9e5b';
      setTimeout(() => { it.el.style.outline = old; }, 2500);
    }
    return ok ? 'ok' : 'blocked';
  }

  // ---------------------------------------------------------------- actions
  const state = { data: null, highlight: true, pasteBtns: [], open: false };

  async function getData() {
    const d = await send({ type: 'getFillData' });
    if (!d || d.error) throw new Error(d && d.error || 'Extension not responding - reload the page');
    state.data = d;
    state.highlight = d.panel ? d.panel.highlight !== false : true;
    return d;
  }

  async function autofill(opts) {
    opts = opts || {};
    const d = await getData();
    if (!opts.contactOnly && !d.pilgrims.length) { openPicker(true); return; }
    if (!opts.contactOnly && gotramNeeded(d)) {
      const miss = d.pilgrims.filter(p => !String(p.gotram || '').trim());
      if (miss.length) {
        log(`Gotram needed for ${miss.map(p => p.name).join(', ')}. Enter it in the picker.`, 'warn');
        openPicker(true);
        return;
      }
    }
    if (d.locked) log('Locked: ID numbers will be left blank. Unlock from the toolbar popup.', 'warn');
    const { items, rowCount } = scan();
    if (!items.length) { log('No pilgrim fields found on this page. Open the pilgrim details step, or use Click & Paste.', 'warn'); return; }
    let ok = 0;
    // 1. Pilgrim rows.
    if (!opts.contactOnly) {
      for (const it of items) {
        if (!PILGRIM_KINDS.includes(it.kind)) continue;
        const p = d.pilgrims[it.row];
        if (!p) continue;
        const val = valueFor(it, p, d.self);
        if (val && !isCorrect(it, val) && await fillOne(it, val) === 'ok') ok++;
      }
      if (d.pilgrims.length > rowCount && rowCount) log(`The form has ${rowCount} pilgrim row(s); you selected ${d.pilgrims.length}. Only the first ${rowCount} were filled.`, 'warn');
      if (d.pilgrims.length < rowCount) log(`${rowCount - d.pilgrims.length} pilgrim row(s) left empty.`, 'info');
    }
    // 2. Address & contact of the profile: Country -> State -> District -> City -> rest.
    //    Re-scan a few times because District/City lists often load only after State is picked.
    const addr = await fillAddress(d);
    ok += addr.ok;
    if (addr.missing.length) log(`Not saved in profile "${d.profileName}": ${addr.missing.join(', ')}. Add them under Options › Profiles.`, 'warn');
    // 3. Whatever is still empty or wrong -> step-by-step guide.
    const left = guideList(d).filter(s => !isCorrect(s.it, s.val) && (!opts.contactOnly || !PILGRIM_KINDS.includes(s.it.kind)));
    log(`Profile "${d.profileName}": filled ${ok} box(es).${left.length ? ` ${left.length} box(es) need you.` : ''}`, 'ok');
    if (left.length) return startGuide(true);
    log('Now review every field, type the CAPTCHA yourself and submit.', 'info');
  }

  async function fillAddress(d) {
    let ok = 0;
    const missing = new Set();
    for (let pass = 0; pass < 4; pass++) {
      const contact = scan().items.filter(it => !PILGRIM_KINDS.includes(it.kind))
        .sort((a, b) => ADDRESS_ORDER.indexOf(a.kind) - ADDRESS_ORDER.indexOf(b.kind));
      let choiceChanged = false;
      for (const it of contact) {
        const val = valueFor(it, null, d.self);
        if (!val) { missing.add(FIELD_NAME[it.kind] || it.kind); continue; }
        if (isCorrect(it, val)) continue;
        if (await fillOne(it, val) === 'ok') { ok++; if (it.mode !== 'input') choiceChanged = true; }
      }
      if (!choiceChanged) break;
      // Let dependent lists (District after State) load, then go round again.
      const pending = () => scan().items.some(it => !PILGRIM_KINDS.includes(it.kind) && valueFor(it, null, d.self) && !isCorrect(it, valueFor(it, null, d.self)));
      if (!await waitFor(pending, 1500)) break;
    }
    return { ok, missing: [...missing] };
  }

  const pasteMode = () => startGuide(false);

  // ---------------------------------------------------------------- Click & Paste overlay
  function clearPaste() {
    state.pasteBtns.forEach(b => b.btn.remove());
    state.pasteBtns = [];
  }
  function showPasteButtons(list) {
    ensureUi();
    clearPaste();
    for (const { it, val } of list) {
      const btn = document.createElement('button');
      btn.className = 'paste';
      btn.textContent = it.mode === 'input' ? 'Click & Paste' : `Choose: ${val}`;
      btn.title = `${it.kind}: ${it.kind === 'idNumber' ? ATBA.maskId(val) : val}`;
      const entry = { btn, it, val };
      btn.addEventListener('click', async e => {
        e.preventDefault(); e.stopPropagation();
        if (it.mode !== 'input') {
          const r = await fillOne(it, val);
          if (r !== 'ok') { it.el.focus(); it.el.click(); btn.textContent = `Pick "${val}"`; }
          check(entry);
          return;
        }
        await copy(String(val));
        it.el.focus();
        try { it.el.select(); } catch (er) { /* ignore */ }
        btn.textContent = 'Now press Ctrl+V';
      });
      const onInput = () => setTimeout(() => check(entry), 50);
      it.el.addEventListener('input', onInput);
      it.el.addEventListener('change', onInput);
      overlay.appendChild(btn);
      state.pasteBtns.push(entry);
      check(entry);
    }
    position();
  }
  function check(entry) {
    const good = isCorrect(entry.it, entry.val);
    entry.btn.classList.toggle('done', !!good);
    if (good) entry.btn.textContent = '✓ Correct';
  }
  // Copies text to the clipboard without leaving the focus somewhere else.
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back */ }
    const back = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
    if (back && back.focus) back.focus();
    return ok;
  }
  function position() {
    for (const { btn, it } of state.pasteBtns) {
      const r = it.el.getBoundingClientRect();
      const hide = !r.width || r.bottom < 0 || r.top > innerHeight;
      btn.style.display = hide ? 'none' : '';
      btn.style.top = `${Math.max(0, r.top - 20)}px`;
      btn.style.left = `${Math.max(0, r.right - btn.offsetWidth)}px`;
    }
  }
  let raf = 0;
  const schedulePos = () => {
    if (!raf && (state.pasteBtns.length || guide.on)) raf = requestAnimationFrame(() => { raf = 0; position(); placeGuide(); });
  };
  addEventListener('scroll', schedulePos, true);
  addEventListener('resize', schedulePos);

  // ---------------------------------------------------------------- step-by-step guide
  // Highlights one box at a time and says exactly what to do: "Press Ctrl+V", "Type 34", "Choose Male".
  // Moves to the next box by itself as soon as the current one holds the right value.
  const guide = { on: false, cur: null, skip: new Set(), tried: new Set(), timer: 0, noTry: false, listening: false, lastHtml: '', copied: false };
  const FIELD_NAME = { name: 'Name', firstName: 'First name', lastName: 'Last name', age: 'Age', dob: 'Date of birth', gender: 'Gender',
    idType: 'Photo ID proof', idNumber: 'Photo ID number', mobile: 'Mobile number', email: 'Email ID', address: 'Address', city: 'City',
    district: 'District', state: 'State', pincode: 'Pincode', country: 'Country', gotram: 'Gotram' };

  function guideList(d) {
    const out = [];
    const seen = {};
    for (const it of scan().items) {
      const isP = PILGRIM_KINDS.includes(it.kind);
      const p = isP ? d.pilgrims[it.row] : null;
      if (isP && !p) continue;
      const val = valueFor(it, p, d.self);
      if (!val) continue;
      const base = `${it.kind}|${isP ? it.row : 'c'}`;
      seen[base] = (seen[base] || 0) + 1;
      out.push({ it, val, key: `${base}|${seen[base]}`, who: isP ? `Pilgrim ${it.row + 1} of ${d.pilgrims.length}` : `Contact (${d.profileName})` });
    }
    return out;
  }

  async function startGuide(afterAutofill) {
    const d = await getData();
    if (!d.pilgrims.length) { openPicker(false); return; }
    ensureUi();
    clearPaste();
    if (d.locked) log('Locked: ID numbers are not available. Unlock from the toolbar popup.', 'warn');
    Object.assign(guide, { on: true, cur: null, noTry: !!afterAutofill, lastHtml: '' });
    guide.skip.clear(); guide.tried.clear();
    if (!guide.listening) {
      ['input', 'change', 'click', 'keyup'].forEach(t => document.addEventListener(t, guideKick, true));
      guide.listening = true;
    }
    clearInterval(guide.timer);
    guide.timer = setInterval(guideTick, 500);
    closePanel();
    log(afterAutofill ? 'This form blocks autofill - step-by-step mode started. Follow the orange hint next to each box.'
      : 'Step-by-step mode: follow the orange hint next to each box.', 'ok');
    await guideNext();
  }
  function guideKick(e) {
    if (!guide.on || (e.target && e.target.closest && e.target.closest('#atba-host'))) return;
    setTimeout(guideTick, 80);
  }
  let ticking = false;
  async function guideTick() {
    if (!guide.on || ticking) return;
    ticking = true;
    try {
      const c = guide.cur;
      if (!c || !document.contains(c.it.el) || isCorrect(c.it, c.val)) {
        if (c && document.contains(c.it.el)) flashOk(c.it.el);
        await guideNext();
      } else {
        renderHint();
        placeGuide();
      }
    } catch (e) { log(String(e.message || e), 'err'); } finally { ticking = false; }
  }
  async function guideNext() {
    const list = guideList(state.data);
    const next = list.find(s => !guide.skip.has(s.key) && !isCorrect(s.it, s.val));
    if (!next) return finishGuide(list.length);
    const same = guide.cur && guide.cur.key === next.key && guide.cur.it.el === next.it.el;
    guide.cur = next;
    if (!same) await prepareStep(next);
    renderHint();
    placeGuide();
  }
  async function prepareStep(s) {
    const { it, val } = s;
    guide.copied = false;
    it.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // One quiet attempt to fill it ourselves (skipped right after a failed autofill).
    if (!guide.tried.has(s.key) && !(guide.noTry && isChoice(it))) {
      guide.tried.add(s.key);
      if (await fillOne(it, val) === 'ok') return;
    }
    if (!isChoice(it)) {
      guide.copied = await copy(String(val));
      try { it.el.focus({ preventScroll: true }); if (it.el.select) it.el.select(); } catch (e) { /* ignore */ }
    } else {
      try { it.el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  }
  const isShortNumber = v => /^\d{1,3}$/.test(String(v));
  function renderHint() {
    const s = guide.cur;
    if (!s) return;
    const { it, val } = s;
    const shown = it.kind === 'idNumber' ? ATBA.maskId(String(val)) : String(val);
    // Small tag: "P1 · Name   ⧉ ⏭ ✕" / "Ctrl+V  Adithya Kumar"
    let action, detail = '';
    if (isChoice(it)) action = `Choose ${val}`;
    else if (isShortNumber(val)) action = `Type ${val}`;
    else { action = guide.copied ? 'Ctrl+V' : 'Copy, then Ctrl+V'; detail = shown; }
    const who = PILGRIM_KINDS.includes(it.kind) ? `P${it.row + 1}` : 'Contact';
    const html = `<div class="hd"><small>${esc(who)} · ${esc(FIELD_NAME[it.kind] || it.kind)}</small>
        <span class="acts">${isChoice(it) ? '' : '<button data-g="copy" title="Copy again">⧉</button>'}<button data-g="skip" title="Skip this box">⏭</button><button data-g="stop" title="Stop">✕</button></span></div>
      <div class="ln"><b class="big">${esc(action)}</b>${detail ? `<span class="val">${esc(detail)}</span>` : ''}</div>`;
    if (html === guide.lastHtml) return;
    guide.lastHtml = html;
    const h = guideEl('hint');
    h.innerHTML = html;
    h.onclick = e => {
      const g = e.target.closest('[data-g]') && e.target.closest('[data-g]').dataset.g;
      if (g === 'copy') run(async () => { guide.copied = await copy(String(val)); it.el.focus(); if (it.el.select) it.el.select(); guide.lastHtml = ''; renderHint(); });
      else if (g === 'skip') { guide.skip.add(s.key); run(guideNext); }
      else if (g === 'stop') stopGuide('Step-by-step mode stopped.');
    };
  }
  function guideEl(cls) {
    let el = overlay.querySelector('.' + cls);
    if (!el) { el = document.createElement('div'); el.className = cls; overlay.appendChild(el); }
    return el;
  }
  function placeGuide() {
    if (!guide.on || !guide.cur) return;
    const r = guide.cur.it.el.getBoundingClientRect();
    const ring = guideEl('ring');
    Object.assign(ring.style, { top: `${r.top - 4}px`, left: `${r.left - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px`, display: r.width ? '' : 'none' });
    // Point at the right option while a dropdown list is open.
    const ring2 = guideEl('ring2');
    const opt = isChoice(guide.cur.it) ? findOption(guide.cur.val) : null;
    let list = null;
    if (opt) {
      const o = opt.getBoundingClientRect();
      Object.assign(ring2.style, { top: `${o.top - 3}px`, left: `${o.left - 3}px`, width: `${o.width + 6}px`, height: `${o.height + 6}px`, display: '' });
      ring2.dataset.tip = `Click “${guide.cur.val}”`;
      const box = opt.closest('[role="listbox"], .mat-autocomplete-panel, .mat-select-panel, .cdk-overlay-pane, .ng-dropdown-panel, ul') || opt.parentElement;
      list = box.getBoundingClientRect();
    } else ring2.style.display = 'none';
    // Small tag sits just ABOVE the box, so dropdown lists (which open below) stay visible.
    const h = guideEl('hint');
    const hh = h.offsetHeight, hw = h.offsetWidth;
    const above = list && list.bottom <= r.top + 2 ? list.top : r.top;   // list opened upwards: go above it
    let top = above - hh - 8;
    let left = Math.min(Math.max(6, r.left), innerWidth - hw - 6);
    let side = false;
    if (top < 4) {
      // No room above: put it beside the box (or beside the open list).
      const right = list ? Math.max(r.right, list.right) : r.right;
      side = true;
      top = Math.max(4, r.top);
      left = right + 10 + hw < innerWidth ? right + (list ? 90 : 10) : Math.max(6, r.left - hw - 10);
    }
    h.classList.toggle('side', side);
    h.style.top = `${top}px`;
    h.style.left = `${left}px`;
  }
  function flashOk(el) {
    if (!state.highlight || !el.style) return;
    const old = el.style.outline;
    el.style.outline = '2px solid #2e9e5b';
    setTimeout(() => { el.style.outline = old; }, 1500);
  }
  function clearGuide() {
    guide.on = false; guide.cur = null; guide.lastHtml = '';
    clearInterval(guide.timer);
    if (overlay) overlay.querySelectorAll('.hint, .ring, .ring2').forEach(n => n.remove());
  }
  function stopGuide(msg) { clearGuide(); if (msg) log(msg, 'info'); }
  function finishGuide(n) {
    clearGuide();
    const h = guideEl('hint');
    h.classList.add('side');
    h.innerHTML = '<div class="ln"><b class="big">✓ All boxes done</b></div><small>Check, type CAPTCHA, submit</small>';
    Object.assign(h.style, { top: '12px', left: `${Math.max(6, innerWidth / 2 - 90)}px` });
    setTimeout(() => h.remove(), 6000);
    log(`All ${n} box(es) filled ✓ Now check every field, type the CAPTCHA and submit.`, 'ok');
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------------------------------------------------------- photos
  function dataUrlToFile(dataUrl, name) {
    const [head, body] = dataUrl.split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const ext = mime.includes('png') ? 'png' : 'jpg';
    return new File([arr], `${(name || 'pilgrim').replace(/[^\w]+/g, '_')}.${ext}`, { type: mime, lastModified: Date.now() });
  }
  async function allStoredPilgrims() {
    const { profiles } = await chrome.storage.local.get('profiles');
    return (profiles || []).flatMap(p => p.pilgrims || []);
  }
  const fileInputs = () => [...document.querySelectorAll('input[type=file]')].filter(i => !i.disabled && !i.closest('#atba-host'));
  async function photoFor(id) {
    const p = (await allStoredPilgrims()).find(x => x.id === id);
    if (!p) return null;
    return { file: p.photo ? dataUrlToFile(p.photo, p.name) : null, name: p.name };
  }
  function putFile(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    fire(input, 'input', 'change');
  }
  async function attachPhotos(ids, startIndex) {
    const inputs = fileInputs();
    if (!inputs.length) { log('No photo upload box found on this page. Drag a photo from the panel onto the upload area instead.', 'warn'); return; }
    let n = 0, i = startIndex || 0;
    for (const id of ids) {
      const ph = await photoFor(id);
      if (!ph || !ph.file) { log(`No saved photo for ${ph ? ph.name : 'a pilgrim'} - add one in Options. Upload box ${i + 1} skipped.`, 'warn'); i++; continue; }
      if (!inputs[i]) break;
      putFile(inputs[i], ph.file);
      log(`Photo of ${ph.name} attached to upload box ${i + 1}.`, 'ok');
      n++; i++;
    }
    if (!n) log('No photos attached.', 'warn');
  }

  // ---------------------------------------------------------------- panel UI (shadow DOM)
  let hostEl, root, panel, overlay, logEl, picker;
  const CSS_TEXT = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
    .launcher { position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; background: #b4531a; color: #fff; border: 0;
      border-radius: 999px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
    .launcher:hover { background: #95420f; }
    .panel { position: fixed; right: 18px; bottom: 70px; width: min(340px, calc(100vw - 24px)); max-height: 76vh; overflow: auto; z-index: 2147483647;
      background: #fffaf3; color: #2b1d12; border: 1px solid #e3c9a8; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.25); font-size: 13px; display: none; }
    .panel.open { display: block; }
    header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: linear-gradient(90deg,#b4531a,#d98a1f); color: #fff; border-radius: 12px 12px 0 0; position: sticky; top: 0; z-index: 1; }
    header b { flex: 1; font-size: 14px; }
    header button { background: transparent; border: 0; color: #fff; font-size: 18px; cursor: pointer; line-height: 1; }
    section { padding: 10px 12px; border-bottom: 1px solid #f0dfc8; }
    h4 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #8a5a2b; }
    .profRow { display: flex; gap: 6px; align-items: center; }
    .profRow b { flex: 1; font-size: 14px; }
    label.p { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; }
    label.p span { flex: 1; }
    label.p small, small.m { color: #8a7563; }
    .btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    button.b { border: 1px solid #c98b4a; background: #fff; color: #6b3610; border-radius: 8px; padding: 7px 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    button.b.primary { background: #b4531a; color: #fff; border-color: #b4531a; }
    .btns .primary { grid-column: span 2; font-size: 14px; padding: 9px; }
    button.b:hover { filter: brightness(.95); }
    .ph { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .ph img { width: 36px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #e3c9a8; cursor: grab; }
    .ph span { flex: 1; }
    .ph .none { width: 36px; height: 44px; border: 1px dashed #c9b39b; border-radius: 4px; display: grid; place-items: center; color: #b49a80; font-size: 10px; text-align: center; }
    .log { list-style: none; margin: 0; padding: 0; max-height: 150px; overflow: auto; }
    .log li { padding: 4px 6px; margin: 3px 0; border-radius: 6px; background: #f6ece0; font-size: 12px; }
    .log li.ok { background: #e3f4e8; color: #1e5b33; }
    .log li.warn { background: #fff0d6; color: #7a4a00; }
    .log li.err { background: #fde3e1; color: #8a1f17; }
    .note { font-size: 11.5px; color: #7d6652; padding: 8px 12px 12px; }
    .lock { background: #fff0d6; color: #7a4a00; padding: 6px 12px; font-size: 12px; }
    .paste { position: fixed; z-index: 2147483645; background: #f08a00; color: #fff; border: 0; border-radius: 6px; padding: 3px 8px;
      font: 600 11px "Segoe UI", system-ui, sans-serif; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.25); white-space: nowrap; }
    .paste.done { background: #2e9e5b; }
    /* step-by-step hint */
    .hint { position: fixed; z-index: 2147483646; min-width: 130px; max-width: min(240px, calc(100vw - 12px)); background: #fff7ea; color: #3a2410;
      border: 1.5px solid #f08a00; border-radius: 8px; padding: 3px 6px 4px; box-shadow: 0 3px 10px rgba(0,0,0,.22); font-size: 12px; line-height: 1.25; }
    .hint::after { content: ""; position: absolute; left: 14px; bottom: -6px; width: 9px; height: 9px; background: #fff7ea;
      border-right: 1.5px solid #f08a00; border-bottom: 1.5px solid #f08a00; transform: rotate(45deg); }
    .hint.side::after { display: none; }
    .hint .hd { display: flex; align-items: center; gap: 6px; }
    .hint small { flex: 1; color: #8a5a2b; font-size: 10.5px; white-space: nowrap; }
    .hint .ln { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
    .hint .big { font-size: 13.5px; color: #b4531a; white-space: nowrap; }
    .hint .val { font: 600 11.5px Consolas, monospace; color: #3a2410; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .hint .acts { display: flex; gap: 2px; }
    .hint .acts button { border: 0; background: transparent; color: #8a5a2b; border-radius: 4px; padding: 0 3px; font: 12px "Segoe UI Symbol", system-ui, sans-serif; cursor: pointer; line-height: 1.4; }
    .hint .acts button:hover { background: #f6dcb8; color: #6b3610; }
    .ring, .ring2 { position: fixed; z-index: 2147483645; pointer-events: none; border-radius: 8px; }
    .ring { border: 3px solid #f08a00; box-shadow: 0 0 0 5px rgba(240,138,0,.25); animation: atbaPulse 1.2s ease-in-out infinite; }
    .ring2 { border: 3px solid #2e9e5b; box-shadow: 0 0 0 5px rgba(46,158,91,.25); }
    .ring2::after { content: attr(data-tip); position: absolute; left: 100%; top: 50%; transform: translate(8px,-50%); white-space: nowrap;
      background: #2e9e5b; color: #fff; font: 700 12px "Segoe UI", system-ui, sans-serif; padding: 3px 8px; border-radius: 6px; }
    @keyframes atbaPulse { 50% { box-shadow: 0 0 0 9px rgba(240,138,0,.12); } }
    @media (prefers-reduced-motion: reduce) { .ring { animation: none; } }
    /* profile picker pop-up */
    .backdrop { position: fixed; inset: 0; z-index: 2147483647; background: rgba(30,18,8,.45); display: none; align-items: center; justify-content: center; padding: 16px; }
    .backdrop.open { display: flex; }
    .modal { width: min(520px, 100%); max-height: 88vh; overflow: auto; background: #fffaf3; color: #2b1d12; border-radius: 14px; box-shadow: 0 18px 50px rgba(0,0,0,.35); font-size: 13.5px; }
    .modal .body { padding: 14px 16px; display: grid; gap: 10px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    .pcard { text-align: left; border: 1px solid #e3c9a8; background: #fff; border-radius: 10px; padding: 10px 12px; cursor: pointer; display: grid; gap: 2px; font-size: 13px; color: #2b1d12; }
    .pcard:hover { border-color: #d98a1f; }
    .pcard.on { border: 2px solid #b4531a; background: #fbe9d3; }
    .pcard b { font-size: 15px; }
    .pcard small { color: #8a7563; }
    .pax { display: grid; gap: 2px; border: 1px solid #f0dfc8; border-radius: 10px; padding: 6px 10px; background: #fff; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .row .grow { flex: 1; }
    .link { background: none; border: 0; color: #b4531a; text-decoration: underline; cursor: pointer; font-size: 12.5px; padding: 0; }
    label.p .ord { flex: none; min-width: 22px; color: #b4531a; font-weight: 700; font-size: 12px; }
    .modal h4 { margin: 0 0 6px; }
    .types { display: flex; flex-wrap: wrap; gap: 6px; }
    .tchip { border: 1px solid #e3c9a8; background: #fff; color: #6b3610; border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .tchip.on { background: #b4531a; color: #fff; border-color: #b4531a; }
    input.gi { flex: none; width: 120px; border: 1px solid #c98b4a; border-radius: 6px; padding: 4px 6px; font-size: 12.5px; background: #fff; color: #2b1d12; }
    input.gi.need { border-color: #d93b2b; background: #fff4f2; }
    .gAll { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #f0dfc8; }
    .typeTag { display: inline-block; font-size: 11.5px; font-weight: 700; color: #b4531a; }
    @media (prefers-color-scheme: dark) {
      .panel, .modal { background: #2a211a; color: #f3e6d6; border-color: #5a4330; }
      section { border-color: #4a3829; }
      h4 { color: #e0b07a; }
      button.b, .pcard, .pax { background: #3a2d22; color: #f6d2a8; border-color: #8a5a2b; }
      button.b.primary { background: #c8641f; color: #fff; }
      .pcard.on { background: #4a3220; border-color: #e07b33; }
      .pcard small, label.p small, small.m { color: #c9b39b; }
      .log li { background: #3a2d22; }
      .log li.ok { background: #1f3a29; color: #bfe8cc; }
      .log li.warn { background: #43321a; color: #ffd99a; }
      .log li.err { background: #4a1f1c; color: #ffc2bc; }
      .note { color: #c9b39b; }
      .link, label.p .ord, .typeTag { color: #e9a23b; }
      .tchip { background: #3a2d22; color: #f6d2a8; border-color: #8a5a2b; }
      .tchip.on { background: #c8641f; color: #fff; }
      input.gi { background: #2a211a; color: #f3e6d6; }
      input.gi.need { background: #4a1f1c; }
    }`;

  function ensureUi() {
    if (hostEl) return;
    hostEl = document.createElement('div');
    hostEl.id = 'atba-host';
    root = hostEl.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS_TEXT}</style>
      <button class="launcher" title="Adithya TTD Booking Assistant">🙏 Adithya TTD</button>
      <div class="panel" role="dialog" aria-label="Adithya TTD Booking Assistant">
        <header><b>Adithya TTD Booking Assistant</b><button class="x" title="Close">×</button></header>
        <div class="lock" hidden>🔒 Locked - ID numbers stay blank. Unlock from the toolbar popup.</div>
        <section><h4>Profile</h4><div class="profRow"><b class="profName">-</b><button class="b" data-a="pick">Change</button></div><span class="typeTag"></span><br><small class="m profMeta"></small></section>
        <section><h4>Passengers to fill (in order)</h4><div class="plist"></div></section>
        <section><div class="btns">
          <button class="b primary" data-a="fill">Autofill selected passengers</button>
          <button class="b" data-a="paste">Step-by-step (Ctrl+V)</button>
          <button class="b" data-a="contact">Fill address only</button>
          <button class="b" data-a="photos">Attach photos</button>
          <button class="b" data-a="clear">Stop / clear</button>
        </div></section>
        <section><h4>Photos <small>(drag onto an upload box, or Attach)</small></h4><div class="photos"></div></section>
        <section><h4>Status</h4><ul class="log"></ul></section>
        <div class="note">Never fills CAPTCHA, date, slot, amount or declarations. Review every field and submit on TTD yourself. Not affiliated with TTD.</div>
      </div>
      <div class="backdrop" role="dialog" aria-modal="true" aria-label="Choose profile">
        <div class="modal">
          <header><b>🙏 Choose profile for this booking</b><button class="x2" title="Close">×</button></header>
          <div class="body"></div>
        </div>
      </div>
      <div class="overlay"></div>`;
    (document.body || document.documentElement).appendChild(hostEl);
    panel = root.querySelector('.panel');
    picker = root.querySelector('.backdrop');
    overlay = root.querySelector('.overlay');
    logEl = root.querySelector('.log');
    root.querySelector('.launcher').addEventListener('click', () => (state.open ? closePanel() : openPanel()));
    root.querySelector('.x').addEventListener('click', closePanel);
    root.querySelector('.x2').addEventListener('click', closePicker);
    picker.addEventListener('click', e => { if (e.target === picker) closePicker(); });
    root.addEventListener('keydown', e => { if (e.key === 'Escape') closePicker(); });
    panel.addEventListener('click', e => {
      const a = e.target.closest('button') && e.target.closest('button').dataset.a;
      if (!a) return;
      run(() => a === 'fill' ? autofill() : a === 'paste' ? pasteMode() : a === 'contact' ? autofill({ contactOnly: true })
        : a === 'pick' ? openPicker(false)
        : a === 'photos' ? attachPhotos(state.data ? state.data.selectedIds : []) : (clearPaste(), stopGuide('Stopped and cleared.')));
    });
  }

  // ---------------------------------------------------------------- profile picker pop-up
  const formHasGotram = () => scan().items.some(i => i.kind === 'gotram');
  // Gotram is asked for Homam, and for any form that shows a Gotram box.
  const gotramNeeded = d => ATBA.needsGotram(d.bookingType) || formHasGotram();

  async function openPicker(fillAfter, profileId) {
    ensureUi();
    const d = await getData();
    const body = picker.querySelector('.body');
    const pid = profileId || d.activeProfileId;
    if (!d.profiles.length) {
      body.innerHTML = '<p>No profiles saved yet.</p><div class="row"><button class="b primary" data-go="opts">Create a profile</button></div>';
    } else {
      // Passengers of the chosen profile (switching first if needed).
      if (pid !== d.activeProfileId) {
        await send({ type: 'setProfile', profileId: pid });
        if (state.open) renderPanel();
        return openPicker(fillAfter, pid);
      }
      const needG = gotramNeeded(d);
      body.innerHTML = `
        <div><h4>Booking type</h4><div class="types"></div></div>
        <div><h4>Profile</h4><div class="cards"></div></div>
        <div class="pax"><div class="row"><b class="grow"></b><button class="link" data-go="all">Select all</button> <button class="link" data-go="none">Clear</button></div><div class="plistM"></div>
          ${needG ? `<div class="gAll row"><small class="m grow">Same Gotram for everyone ticked?</small><input class="gi gAllIn" placeholder="Gotram" maxlength="40"><button class="b" data-go="gall">Apply</button></div>` : ''}
        </div>
        <small class="m addr"></small>
        <div class="row">
          <button class="b primary grow" data-go="fill">Autofill now</button>
          <button class="b" data-go="ok">Select only</button>
        </div>
        <div class="row"><button class="link" data-go="opts">Add / edit profiles</button><small class="m grow" style="text-align:right">You can reopen this from the 🙏 button</small></div>`;
      let sel = d.selectedIds.slice();
      const types = body.querySelector('.types');
      ATBA.BOOKING_TYPES.forEach(t => {
        const c = document.createElement('button');
        c.className = 'tchip' + (t.id === d.bookingType ? ' on' : '');
        c.textContent = `${t.icon} ${t.short}`;
        c.title = t.label + (t.needsGotram ? ' (asks Gotram)' : '');
        c.addEventListener('click', () => run(async () => {
          await send({ type: 'setSelected', ids: sel });
          await send({ type: 'setBookingType', id: t.id });
          await openPicker(fillAfter, pid);
        }));
        types.appendChild(c);
      });
      const cards = body.querySelector('.cards');
      d.profiles.forEach(p => {
        const c = document.createElement('button');
        c.className = 'pcard' + (p.id === d.activeProfileId ? ' on' : '');
        c.innerHTML = '<b></b><small></small>';
        c.querySelector('b').textContent = p.name;
        c.querySelector('small').textContent = `${p.count} passenger${p.count === 1 ? '' : 's'}${p.city ? ' · ' + p.city : ''}`;
        c.addEventListener('click', () => run(() => openPicker(fillAfter, p.id)));
        cards.appendChild(c);
      });
      const prof = d.profiles.find(p => p.id === d.activeProfileId);
      body.querySelector('.pax b').textContent = `Passengers in "${prof ? prof.name : ''}"`;
      body.querySelector('.addr').textContent = [d.self.mobile, d.self.email, d.self.city, d.self.state, d.self.pincode, d.self.country].filter(Boolean).join(' · ') || 'No address saved for this profile';
      const list = body.querySelector('.plistM');
      const gotrams = {};
      d.all.forEach(p => { gotrams[p.id] = p.gotram || ''; });
      const savedG = Object.assign({}, gotrams);
      const missingG = () => needG ? sel.filter(id => !gotrams[id].trim()) : [];
      const updateBtn = () => {
        const fillBtn = body.querySelector('[data-go=fill]');
        const okBtn = body.querySelector('[data-go=ok]');
        const miss = missingG().length;
        fillBtn.textContent = !sel.length ? 'Tick passengers above'
          : miss ? `Enter Gotram for ${miss} devotee${miss === 1 ? '' : 's'}`
          : `Autofill ${sel.length} passenger${sel.length === 1 ? '' : 's'} now`;
        fillBtn.disabled = !sel.length || !!miss;
        okBtn.disabled = !!miss;
      };
      const draw = () => {
        list.innerHTML = '';
        if (!d.all.length) list.innerHTML = '<small class="m">No passengers in this profile yet.</small>';
        d.all.forEach(p => {
          const i = sel.indexOf(p.id);
          const l = document.createElement('label');
          l.className = 'p';
          l.innerHTML = `<input type="checkbox" ${i >= 0 ? 'checked' : ''}><span class="ord">${i >= 0 ? '#' + (i + 1) : ''}</span><span></span><small></small>`;
          l.querySelectorAll('span')[1].textContent = p.name;
          l.querySelector('small').textContent = `${p.age} yrs · ${p.gender ? p.gender[0] : '?'}${p.hasPhoto ? ' · 📷' : ''}`;
          l.querySelector('input').addEventListener('change', e => {
            sel = sel.filter(x => x !== p.id);
            if (e.target.checked) sel.push(p.id);
            draw();
          });
          // Homam: ask Gotram right here for every ticked devotee.
          if (needG && i >= 0) {
            const g = document.createElement('input');
            g.className = 'gi' + (gotrams[p.id].trim() ? '' : ' need');
            g.placeholder = 'Gotram';
            g.maxLength = 40;
            g.value = gotrams[p.id];
            g.setAttribute('aria-label', `Gotram of ${p.name}`);
            g.addEventListener('input', () => { gotrams[p.id] = g.value; g.classList.toggle('need', !g.value.trim()); updateBtn(); });
            l.appendChild(g);
          }
          list.appendChild(l);
        });
        updateBtn();
      };
      // Saves Gotram values that changed (grouped so one message covers a whole family).
      const saveGotrams = async () => {
        const byVal = {};
        for (const id of Object.keys(gotrams)) {
          const v = gotrams[id].trim().replace(/\s+/g, ' ');
          if (v !== (savedG[id] || '')) (byVal[v] = byVal[v] || []).push(id);
        }
        for (const v of Object.keys(byVal)) await send({ type: 'setGotram', ids: byVal[v], gotram: v });
      };
      draw();
      body.onclick = e => {
        const go = e.target.closest('[data-go]') && e.target.closest('[data-go]').dataset.go;
        if (!go) return;
        run(async () => {
          if (go === 'all') { sel = d.all.map(p => p.id); draw(); return; }
          if (go === 'none') { sel = []; draw(); return; }
          if (go === 'gall') {
            const v = body.querySelector('.gAllIn').value.trim();
            if (!v) return;
            sel.forEach(id => { gotrams[id] = v; });
            draw();
            return;
          }
          if (go === 'opts') { await send({ type: 'openOptions' }); return; }
          if (needG) await saveGotrams();
          await send({ type: 'setSelected', ids: sel });
          closePicker();
          if (state.open) renderPanel();
          if (go === 'fill') await autofill();
          else log(`${ATBA.bookingType(d.bookingType).label}: profile "${prof.name}" selected with ${sel.length} passenger(s).`, 'ok');
        });
      };
    }
    if (!d.profiles.length) body.onclick = e => { if (e.target.closest('[data-go=opts]')) send({ type: 'openOptions' }); };
    picker.classList.add('open');
    const first = picker.querySelector('.pcard.on, button');
    if (first) first.focus();
    return fillAfter;
  }
  function closePicker() { if (picker) picker.classList.remove('open'); }

  // ---------------------------------------------------------------- side panel
  async function renderPanel() {
    const d = await getData();
    root.querySelector('.lock').hidden = !d.locked;
    root.querySelector('.profName').textContent = d.profileName || 'No profile yet';
    root.querySelector('.profMeta').textContent = [d.self.city, d.self.state, d.self.pincode].filter(Boolean).join(' · ');
    const bt = ATBA.bookingType(d.bookingType);
    root.querySelector('.typeTag').textContent = `${bt.icon} Booking: ${bt.label}`;
    const needG = gotramNeeded(d);
    const pl = root.querySelector('.plist');
    pl.innerHTML = '';
    if (!d.all.length) pl.innerHTML = '<small class="m">No passengers in this profile. Add them in the extension Options.</small>';
    const order = id => { const i = d.selectedIds.indexOf(id); return i < 0 ? 999 : i; };
    [...d.all].sort((a, b) => order(a.id) - order(b.id)).forEach(p => {
      const l = document.createElement('label');
      l.className = 'p';
      const i = d.selectedIds.indexOf(p.id);
      l.innerHTML = `<input type="checkbox" ${i >= 0 ? 'checked' : ''}><span></span><small>${i >= 0 ? '#' + (i + 1) : ''}</small>`;
      l.querySelector('span').textContent = p.name + (needG ? ` · ${p.gotram ? p.gotram : '⚠ no Gotram'}` : '');
      l.querySelector('input').addEventListener('change', async e => {
        const ids = state.data.selectedIds.filter(x => x !== p.id);
        if (e.target.checked) ids.push(p.id);
        await send({ type: 'setSelected', ids });
        renderPanel();
      });
      pl.appendChild(l);
    });
    const ph = root.querySelector('.photos');
    ph.innerHTML = '';
    const stored = await allStoredPilgrims();
    const sel = d.selectedIds.map(id => stored.find(p => p.id === id)).filter(Boolean);
    if (!sel.length) ph.innerHTML = '<small class="m">Select passengers above.</small>';
    sel.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'ph';
      row.innerHTML = p.photo ? `<img draggable="true" alt="">` : `<div class="none">no photo</div>`;
      const span = document.createElement('span');
      span.textContent = `${idx + 1}. ${p.name}`;
      row.appendChild(span);
      if (p.photo) {
        const img = row.querySelector('img');
        img.src = p.photo;
        img.addEventListener('dragstart', e => {
          e.dataTransfer.items.add(dataUrlToFile(p.photo, p.name));
          e.dataTransfer.effectAllowed = 'copy';
        });
        const b = document.createElement('button');
        b.className = 'b';
        b.textContent = 'Attach';
        b.title = 'Attach to the next empty photo upload box';
        b.addEventListener('click', () => run(async () => {
          const inputs = fileInputs();
          const idx2 = inputs.findIndex(i => !i.files || !i.files.length);
          if (idx2 < 0) { log(inputs.length ? 'All upload boxes already have a file. Drag the photo instead.' : 'No upload box found on this page.', 'warn'); return; }
          putFile(inputs[idx2], dataUrlToFile(p.photo, p.name));
          log(`Photo of ${p.name} attached to upload box ${idx2 + 1}.`, 'ok');
        }));
        row.appendChild(b);
      }
      ph.appendChild(row);
    });
  }

  function openPanel() { ensureUi(); state.open = true; panel.classList.add('open'); run(renderPanel); }
  function closePanel() { state.open = false; if (panel) panel.classList.remove('open'); }
  function log(msg, kind) {
    ensureUi();
    const li = document.createElement('li');
    li.className = kind || 'info';
    li.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}  ${msg}`;
    logEl.prepend(li);
    while (logEl.children.length > 30) logEl.lastChild.remove();
    if (!state.open && (kind === 'warn' || kind === 'err')) openPanel();
  }
  async function run(fn) {
    try { await fn(); } catch (e) { log(String(e && e.message || e), 'err'); }
  }

  // ---------------------------------------------------------------- auto pop-up when a pilgrim form appears
  const pickedFor = new Set();
  let watchTimer = 0;
  function looksLikePilgrimForm() {
    const kinds = new Set(scan().items.map(i => i.kind));
    return (kinds.has('name') || kinds.has('firstName')) && (kinds.has('age') || kinds.has('gender') || kinds.has('idNumber') || kinds.has('idType'));
  }
  function watchForForm(pref) {
    if (!pref || pref.autoPicker === false) return;
    const check = () => {
      const key = location.pathname + location.hash;
      if (pickedFor.has(key) || (picker && picker.classList.contains('open'))) return;
      if (looksLikePilgrimForm()) { pickedFor.add(key); run(() => openPicker(false)); }
    };
    new MutationObserver(() => { clearTimeout(watchTimer); watchTimer = setTimeout(check, 700); })
      .observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(check, 800);
  }

  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    const t = msg && msg.type;
    if (t === 'atba:ping') { reply({ ok: true }); return; }
    const jobs = {
      'atba:autofill': () => autofill(),
      'atba:paste': () => pasteMode(),
      'atba:contact': () => autofill({ contactOnly: true }),
      'atba:photos': async () => attachPhotos((await getData()).selectedIds),
      'atba:show': async () => openPanel(),
      'atba:picker': async () => { await openPicker(false); },
      'atba:scan': async () => {
        const { items, rowCount } = scan();
        return { rowCount, fields: items.map(i => ({ kind: i.kind, row: i.row, mode: i.mode })), fileInputs: fileInputs().length };
      }
    };
    if (!jobs[t]) return;
    (async () => {
      ensureUi();
      try { const r = await jobs[t](); reply(r || { ok: true }); }
      catch (e) { log(String(e.message || e), 'err'); reply({ error: String(e.message || e) }); }
    })();
    return true;
  });

  // Show the launcher on supported pages and watch for pilgrim forms (both can be turned off in Options).
  chrome.storage.local.get('panel').then(({ panel: pref }) => {
    pref = pref || { autoShow: true, autoPicker: true };
    if (pref.autoShow !== false || window.__ATBA_FORCE) ensureUi();
    watchForForm(pref);
  }).catch(() => ensureUi());

  // Expose internals for the local test page only.
  if (window.__ATBA_TEST) window.__ATBA_INTERNALS = { scan, autofill, pasteMode, attachPhotos, openPanel, openPicker, guide, startGuide };
})();
