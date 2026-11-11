/* Adithya TTD Booking Assistant - shared helpers.
 * Loaded by the background worker, popup, options page and content script.
 * Everything is stored locally in chrome.storage. Only the optional Google Sheet link (v1.5) sends data, to your own web app. */
(function (g) {
  if (g.ATBA) return;
  const ATBA = {};
  ATBA.VERSION = '1.5.0';
  ATBA.TTD_HOME = 'https://ttdevasthanams.ap.gov.in/home/dashboard';

  // Booking types. All use the same devotee fields; Homam also needs each devotee's Gotram.
  ATBA.BOOKING_TYPES = [
    { id: 'sed', label: 'Special Entry Darshan', short: 'Special Entry', icon: '🛕' },
    { id: 'angapradakshinam', label: 'Angapradakshinam', short: 'Angapradakshinam', icon: '🙇' },
    { id: 'arjitha', label: 'Arjitha Seva', short: 'Arjitha Seva', icon: '🪔' },
    { id: 'homam', label: 'Homam (Srinivasa Divyanugraha)', short: 'Homam', icon: '🔥', needsGotram: true }
  ];
  ATBA.bookingType = id => ATBA.BOOKING_TYPES.find(b => b.id === id) || ATBA.BOOKING_TYPES[0];
  ATBA.needsGotram = id => !!ATBA.bookingType(id).needsGotram;

  ATBA.GENDERS = ['Male', 'Female', 'Transgender'];
  ATBA.ID_TYPES = ['Aadhaar Card', 'Passport', 'PAN Card', 'Voter ID', 'Driving Licence'];
  ATBA.STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];

  // TTD usually releases next-quota tickets on fixed days each month (IST).
  // These are TENTATIVE defaults - TTD announces exact dates every month. All are editable in Options.
  ATBA.DEFAULT_SCHEDULE = [
    { id: 'seva-dip', category: 'Arjitha Seva', label: 'Arjitha Seva - Electronic Lucky Dip registration', day: 18, time: '10:00', enabled: true },
    { id: 'seva-arjitha', category: 'Arjitha Seva', label: 'Arjitha Sevas (Kalyanotsavam, Unjal, Arjitha Brahmotsavam, Sahasra Deepalankara)', day: 21, time: '10:00', enabled: true },
    { id: 'seva-virtual', category: 'Arjitha Seva', label: 'Virtual Seva & linked darshan', day: 21, time: '15:00', enabled: false },
    { id: 'angapradakshinam', category: 'Angapradakshinam', label: 'Angapradakshinam tokens', day: 23, time: '10:00', enabled: true },
    { id: 'srivani', category: 'Darshan', label: 'SRIVANI Trust darshan', day: 23, time: '11:00', enabled: false },
    { id: 'homam', category: 'Homam', label: 'Srinivasa Divyanugraha Homam (Alipiri)', day: 23, time: '15:00', enabled: true },
    { id: 'senior', category: 'Darshan', label: 'Senior citizens & differently-abled darshan', day: 23, time: '15:00', enabled: false },
    { id: 'sed300', category: 'Special Entry Darshan', label: 'Special Entry Darshan (Rs 300)', day: 24, time: '10:00', enabled: true },
    { id: 'rooms', category: 'Accommodation', label: 'Tirumala & Tirupati accommodation', day: 24, time: '15:00', enabled: false }
  ].map(s => Object.assign({ url: ATBA.TTD_HOME }, s));

  ATBA.CONTACT_KEYS = ['mobile', 'email', 'address', 'city', 'district', 'state', 'pincode', 'country'];
  ATBA.emptyContact = () => ({ mobile: '', email: '', address: '', city: '', district: '', state: 'Andhra Pradesh', pincode: '', country: 'India' });

  ATBA.DEFAULTS = {
    // Each profile = a named group (family, friends…) with ONE contact/address block and its own passengers.
    profiles: [],
    activeProfileId: '',
    selectedIds: [],          // passenger ids of the active profile, in fill order
    bookingType: 'sed',       // one of ATBA.BOOKING_TYPES ids
    schedule: ATBA.DEFAULT_SCHEDULE,  // default monthly pattern
    monthly: {},              // per-month edits: { "2026-11": { itemId: { day, time, off } } }
    reminders: { enabled: true, offsets: [30, 15, 5, 0], reviewDay: 15, reviewTime: '09:00' },
    photo: { maxKB: 100, maxSide: 600, crop: 'passport', quality: 0.9 },
    security: { enabled: false, salt: '', verifier: null },
    panel: { autoShow: true, highlight: true, autoPicker: true }
  };

  const clone = o => JSON.parse(JSON.stringify(o));

  ATBA.newProfile = name => ({ id: ATBA.uid(), name: name || 'New profile', contact: ATBA.emptyContact(), pilgrims: [] });

  ATBA.load = async function () {
    const d = await chrome.storage.local.get(null);
    const out = clone(ATBA.DEFAULTS);
    for (const k of Object.keys(d)) {
      if (out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) && d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) {
        out[k] = Object.assign(out[k], d[k]);
      } else {
        out[k] = d[k];
      }
    }
    // Move data from version 1.0 (one family list + one contact) into a profile.
    if ((!out.profiles || !out.profiles.length) && (Array.isArray(d.pilgrims) && d.pilgrims.length || d.self)) {
      const p = ATBA.newProfile('My Family');
      p.contact = Object.assign(ATBA.emptyContact(), d.self || {});
      p.pilgrims = d.pilgrims || [];
      out.profiles = [p];
      out.activeProfileId = p.id;
      await chrome.storage.local.set({ profiles: out.profiles, activeProfileId: p.id });
      await chrome.storage.local.remove(['pilgrims', 'self']);
    }
    delete out.pilgrims; delete out.self;
    if (!out.profiles.find(p => p.id === out.activeProfileId)) out.activeProfileId = out.profiles[0] ? out.profiles[0].id : '';
    return out;
  };
  ATBA.activeProfile = s => s.profiles.find(p => p.id === s.activeProfileId) || s.profiles[0] || null;
  ATBA.allPilgrims = s => s.profiles.flatMap(p => p.pilgrims);
  ATBA.save = patch => chrome.storage.local.set(patch);
  ATBA.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // ---------- dates ----------
  ATBA.ageFrom = function (dob, on) {
    if (!dob) return '';
    const b = new Date(dob + 'T00:00:00');
    if (isNaN(b)) return '';
    const n = on ? new Date(on) : new Date();
    let a = n.getFullYear() - b.getFullYear();
    const m = n.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    return a < 0 ? '' : a;
  };
  ATBA.formatDob = function (dob, style) {
    if (!dob) return '';
    const [y, m, d] = dob.split('-');
    if (style === 'iso') return dob;
    if (style === 'mdy') return `${m}/${d}/${y}`;
    if (style === 'dmy-dash') return `${d}-${m}-${y}`;
    return `${d}/${m}/${y}`;
  };

  const IST = 330 * 60000;
  ATBA.monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
  ATBA.monthName = key => { const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 15)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  ATBA.istParts = (now) => { const d = new Date((now || Date.now()) + IST); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
  ATBA.addMonths = (key, n) => { let [y, m] = key.split('-').map(Number); m = m - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return ATBA.monthKey(y, m); };

  // Release of one booking type in one month: the month's edit if there is one, else the default pattern.
  ATBA.releaseIn = function (item, key, monthly) {
    const ov = monthly && monthly[key] && monthly[key][item.id];
    const [y, m] = key.split('-').map(Number);
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const day = Math.min(Math.max(1, Number(ov && ov.day || item.day) || 1), dim);
    const time = (ov && ov.time) || item.time || '10:00';
    const [hh, mm] = time.split(':').map(Number);
    const enabled = ov && typeof ov.on === 'boolean' ? ov.on : !!item.enabled;
    return { t: Date.UTC(y, m - 1, day, hh, mm) - IST, day, time, edited: !!ov, off: !!(ov && ov.off), enabled };
  };
  ATBA.nextRelease = function (item, now, monthly) {
    now = now || Date.now();
    const { y, m } = ATBA.istParts(now);
    let key = ATBA.monthKey(y, m);
    for (let i = 0; i < 3; i++) {
      const r = ATBA.releaseIn(item, key, monthly);
      if (!r.off && r.t > now) return r.t;
      key = ATBA.addMonths(key, 1);
    }
    return null;
  };
  // Full info for the next release (used for the "edited for this month" tag and per-month reminder switch).
  ATBA.nextReleaseInfo = function (item, now, monthly) {
    now = now || Date.now();
    const { y, m } = ATBA.istParts(now);
    let key = ATBA.monthKey(y, m);
    for (let i = 0; i < 3; i++) {
      const r = ATBA.releaseIn(item, key, monthly);
      if (!r.off && r.t > now) return Object.assign(r, { key });
      key = ATBA.addMonths(key, 1);
    }
    return null;
  };
  ATBA.fmtWhen = ts => new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true
  }) + ' IST';
  ATBA.fmtCountdown = function (ms) {
    if (ms <= 0) return 'now';
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    if (d) return `${d}d ${h}h ${m}m`;
    if (h) return `${h}h ${m}m`;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
  };

  // ---------- validation (formats TTD commonly accepts) ----------
  const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  ATBA.verhoeffOk = function (num) {
    let c = 0;
    const a = String(num).split('').reverse().map(Number);
    for (let i = 0; i < a.length; i++) c = VD[c][VP[i % 8][a[i]]];
    return c === 0;
  };
  ATBA.cleanId = (type, v) => String(v || '').toUpperCase().replace(/[\s-]/g, '');
  ATBA.validateId = function (type, raw) {
    const v = ATBA.cleanId(type, raw);
    if (!v) return 'ID number is empty';
    switch (type) {
      case 'Aadhaar Card':
        if (!/^[2-9]\d{11}$/.test(v)) return 'Aadhaar must be 12 digits and not start with 0 or 1';
        if (!ATBA.verhoeffOk(v)) return 'Aadhaar checksum fails - check for a typo';
        return '';
      case 'Passport': return /^[A-Z][0-9]{7}$/.test(v) ? '' : 'Passport should be 1 letter + 7 digits (e.g. K1234567)';
      case 'PAN Card': return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v) ? '' : 'PAN should look like ABCDE1234F';
      case 'Voter ID': return /^[A-Z]{3}[0-9]{7}$/.test(v) ? '' : 'Voter ID (EPIC) should be 3 letters + 7 digits';
      case 'Driving Licence': return /^[A-Z]{2}[0-9]{2}[0-9A-Z]{9,13}$/.test(v) ? '' : 'Driving licence should look like AP0920150001234';
      default: return '';
    }
  };
  ATBA.validGotram = g => /^[A-Za-z][A-Za-z .'-]{1,39}$/.test(String(g || '').trim());
  ATBA.validatePilgrim = function (p, locked, bookingType) {
    const issues = [];
    if (bookingType && ATBA.needsGotram(bookingType) && !String(p.gotram || '').trim()) issues.push('Gotram missing (needed for Homam)');
    else if (p.gotram && !ATBA.validGotram(p.gotram)) issues.push('Gotram: letters and spaces only');
    if (!/^[A-Za-z][A-Za-z .]{1,49}$/.test(p.name || '')) issues.push('Name: letters, spaces and dots only (as on ID)');
    const age = ATBA.ageFrom(p.dob);
    if (age === '') issues.push('Date of birth missing');
    else if (age > 120) issues.push('Date of birth looks wrong');
    if (!ATBA.GENDERS.includes(p.gender)) issues.push('Gender missing');
    if (!p.idType) issues.push('Photo ID type missing');
    if (typeof p.idNumber === 'string') {
      const e = ATBA.validateId(p.idType, p.idNumber);
      if (e) issues.push(e);
    } else if (!p.idNumber && !locked) issues.push('ID number missing');
    return issues;
  };
  ATBA.validateSelf = function (s) {
    const issues = [];
    if (!/^[6-9]\d{9}$/.test(String(s.mobile || '').replace(/\D/g, '').slice(-10))) issues.push('Mobile must be a 10-digit Indian number');
    if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email)) issues.push('Email looks wrong');
    if (s.pincode && !/^[1-9]\d{5}$/.test(s.pincode)) issues.push('Pincode must be 6 digits');
    return issues;
  };

  // ---------- optional encryption of ID numbers (AES-GCM 256, PBKDF2) ----------
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  ATBA.deriveKey = async function (password, saltB64) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 250000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  };
  ATBA.encrypt = async (key, text) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    return { iv: b64(iv), ct: b64(ct) };
  };
  ATBA.decrypt = async (key, o) => dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.ct)));
  ATBA.getSessionKey = async function () {
    if (!chrome.storage.session) return null;
    const { atbaKey } = await chrome.storage.session.get('atbaKey');
    if (!atbaKey) return null;
    return crypto.subtle.importKey('jwk', atbaKey, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  };
  ATBA.setSessionKey = async key => chrome.storage.session.set({ atbaKey: await crypto.subtle.exportKey('jwk', key) });
  ATBA.lock = () => chrome.storage.session.remove('atbaKey');
  ATBA.isLocked = async function () {
    const { security } = await ATBA.load();
    return !!security.enabled && !(await ATBA.getSessionKey());
  };
  ATBA.checkPassword = async function (password) {
    const { security } = await ATBA.load();
    const key = await ATBA.deriveKey(password, security.salt);
    try { if (await ATBA.decrypt(key, security.verifier) !== 'ATBA-OK') return null; } catch (e) { return null; }
    return key;
  };
  ATBA.unlock = async function (password) {
    const key = await ATBA.checkPassword(password);
    if (!key) return false;
    await ATBA.setSessionKey(key);
    return true;
  };
  ATBA.enableSecurity = async function (password) {
    const s = await ATBA.load();
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const key = await ATBA.deriveKey(password, salt);
    for (const p of ATBA.allPilgrims(s)) {
      if (typeof p.idNumber === 'string' && p.idNumber) p.idNumber = await ATBA.encrypt(key, p.idNumber);
    }
    await ATBA.save({ profiles: s.profiles, security: { enabled: true, salt, verifier: await ATBA.encrypt(key, 'ATBA-OK') } });
    await ATBA.setSessionKey(key);
  };
  ATBA.disableSecurity = async function (password) {
    const key = await ATBA.checkPassword(password);
    if (!key) return false;
    const s = await ATBA.load();
    for (const p of ATBA.allPilgrims(s)) {
      if (p.idNumber && typeof p.idNumber === 'object') p.idNumber = await ATBA.decrypt(key, p.idNumber);
    }
    await ATBA.save({ profiles: s.profiles, security: { enabled: false, salt: '', verifier: null } });
    await ATBA.lock();
    return true;
  };
  // Turns stored ID numbers into plain text when unlocked; blank when locked.
  ATBA.reveal = async function (pilgrims) {
    const key = await ATBA.getSessionKey();
    const out = [];
    for (const p of pilgrims) {
      const c = Object.assign({}, p);
      if (c.idNumber && typeof c.idNumber === 'object') {
        try { c.idNumber = key ? await ATBA.decrypt(key, c.idNumber) : ''; } catch (e) { c.idNumber = ''; }
      }
      out.push(c);
    }
    return out;
  };
  // Prepares an ID number for storage (encrypts when the lock is on).
  ATBA.seal = async function (plain) {
    const { security } = await ATBA.load();
    if (!security.enabled || !plain) return plain;
    const key = await ATBA.getSessionKey();
    if (!key) throw new Error('Unlock first to save ID numbers');
    return ATBA.encrypt(key, plain);
  };

  ATBA.maskId = v => (v && v.length > 4) ? '•'.repeat(Math.min(8, v.length - 4)) + v.slice(-4) : (v || '');

  g.ATBA = ATBA;
})(typeof self !== 'undefined' ? self : window);
