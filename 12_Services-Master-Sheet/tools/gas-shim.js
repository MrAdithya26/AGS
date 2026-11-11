/* Minimal in-memory stand-in for the Google Apps Script services used by Code.gs.
 * Used only for testing in Node and for the offline demo page. Not needed in production. */
(function (G) {
  // ---------------------------------------------------------------- sha256 (sync, returns signed bytes like Apps Script)
  function sha256Bytes(str) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const bytes = Array.from(new TextEncoder().encode(str));
    const l = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 0xff);
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = [];
      for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = h.map((v, i) => (v + [a, b, c, d, e, f, g, hh][i]) | 0);
    }
    const out = [];
    h.forEach(v => { for (let i = 3; i >= 0; i--) { const x = (v >>> (i * 8)) & 0xff; out.push(x > 127 ? x - 256 : x); } });
    return out;
  }

  // ---------------------------------------------------------------- chainable no-op for formatting calls
  const chain = () => new Proxy(function () {}, { get: (t, k) => k === 'build' ? () => ({}) : () => chain() });

  function Sheet(name, book) {
    this.name = name; this.book = book; this.data = [];
  }
  Sheet.prototype = {
    getName() { return this.name; },
    getLastRow() { for (let i = this.data.length - 1; i >= 0; i--) if (this.data[i].some(v => v !== '' && v !== null && v !== undefined)) return i + 1; return 0; },
    getLastColumn() { let m = 0; this.data.forEach(r => { for (let i = r.length - 1; i >= 0; i--) if (r[i] !== '' && r[i] != null) { m = Math.max(m, i + 1); break; } }); return m; },
    getMaxRows() { return Math.max(1000, this.data.length); },
    getRange(r, c, nr, nc) {
      if (typeof r === 'string') { const m = r.match(/^([A-Z]+)(\d+)/); c = m[1].charCodeAt(0) - 64; r = Number(m[2]); nr = 1; nc = 1; }
      return new Range(this, r, c, nr || 1, nc || 1);
    },
    deleteRow(r) { this.data.splice(r - 1, 1); },
    getConditionalFormatRules() { return []; },
    setConditionalFormatRules() {}, setFrozenRows() {}, setRowHeight() {}, setTabColor() {}, setColumnWidth() {}
  };
  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype = {
    getColumn() { return this.c; },
    getValues() {
      const out = [];
      for (let i = 0; i < this.nr; i++) {
        const row = this.sh.data[this.r - 1 + i] || [];
        const o = [];
        for (let j = 0; j < this.nc; j++) { const v = row[this.c - 1 + j]; o.push(v === undefined || v === null ? '' : v instanceof Date ? new Date(v.getTime()) : v); }
        out.push(o);
      }
      return out;
    },
    setValues(v) {
      if (v.length !== this.nr || v[0].length !== this.nc) throw new Error(`setValues size mismatch: data ${v.length}x${v[0].length}, range ${this.nr}x${this.nc}`);
      for (let i = 0; i < this.nr; i++) {
        while (this.sh.data.length < this.r + i) this.sh.data.push([]);
        const row = this.sh.data[this.r - 1 + i];
        for (let j = 0; j < this.nc; j++) {
          let x = v[i][j];
          // Sheets turns numeric-looking strings into numbers unless the column is plain text; Code.gs sets '@' so keep strings.
          row[this.c - 1 + j] = x instanceof Date ? new Date(x.getTime()) : x;
        }
      }
      return this;
    }
  };
  ['setNumberFormat', 'setDataValidation', 'setFontWeight', 'setFontColor', 'setBackground', 'setVerticalAlignment', 'setWrap'].forEach(k => { Range.prototype[k] = function () { return this; }; });

  function Book() { this.sheets = []; this.id = 'DEMO_SHEET'; }
  Book.prototype = {
    getId() { return this.id; },
    setSpreadsheetTimeZone() {},
    getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; },
    insertSheet(n, i) { const s = new Sheet(n, this); this.sheets.splice(i == null ? this.sheets.length : i, 0, s); return s; },
    getSheets() { return this.sheets.slice(); },
    deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); },
    setActiveSheet() {}, toast() {}
  };
  const book = new Book();
  const props = {}, cache = {};

  G.__book = book;
  G.SpreadsheetApp = {
    getActive: () => book, getActiveSpreadsheet: () => book, openById: () => book,
    getUi: () => chain(), newDataValidation: () => chain(), newConditionalFormatRule: () => chain()
  };
  G.PropertiesService = { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) };
  G.CacheService = { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; } }) };
  G.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  // Time triggers are kept in G.__triggers so tests can check them.
  G.__triggers = [];
  G.ScriptApp = { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/DEMO-DEPLOYMENT-ID/exec' }),
    getProjectTriggers: () => G.__triggers.slice(),
    deleteTrigger: t => { G.__triggers = G.__triggers.filter(x => x !== t); },
    newTrigger: fn => { const t = { fn, getHandlerFunction: () => fn }; const b = {
      timeBased: () => b, everyDays: n => { t.everyDays = n; return b; }, atHour: h => { t.hour = h; return b; },
      inTimezone: z => { t.tz = z; return b; }, create: () => { G.__triggers.push(t); return t; } }; return b; } };
  G.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: (alg, s) => sha256Bytes(s),
    getUuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }),
    sleep() {},
    base64Encode: str => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str).toString('base64')),
    formatDate(d, tz, f) {
      const p = n => String(n).padStart(2, '0');
      return f.replace(/'([^']*)'|yyyy|yy|MM|dd|HH|mm|ss/g, (m, lit) => lit !== undefined ? lit : m === 'yyyy' ? d.getFullYear() : m === 'yy' ? p(d.getFullYear() % 100)
        : m === 'MM' ? p(d.getMonth() + 1) : m === 'dd' ? p(d.getDate()) : m === 'HH' ? p(d.getHours()) : m === 'mm' ? p(d.getMinutes()) : p(d.getSeconds()));
    }
  };
  // Records SMS gateway calls; G.__fetchReply can be set by tests to simulate a gateway answer.
  G.__fetchLog = [];
  G.UrlFetchApp = { fetch(url, opts) {
    G.__fetchLog.push({ url, opts: opts || {} });
    const r = (G.__fetchReply && G.__fetchReply(url, opts)) || { code: 200, body: url.includes('fast2sms') ? '{"return":true,"request_id":"demo"}' : '{"id":"demo","state":"Pending"}' };
    return { getResponseCode: () => r.code, getContentText: () => r.body };
  } };
  G.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: s => ({ content: s, setMimeType() { return this; }, getContent() { return s; } }) };
  G.HtmlService = { createHtmlOutput: () => chain(), createTemplateFromFile: () => chain(), createHtmlOutputFromFile: () => chain(), XFrameOptionsMode: {} };
})(typeof globalThis !== 'undefined' ? globalThis : this);
