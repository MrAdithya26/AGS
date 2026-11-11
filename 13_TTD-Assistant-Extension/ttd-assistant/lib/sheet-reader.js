/* Adithya TTD Booking Assistant - small .xlsx / .csv reader (no external libraries).
 * An .xlsx file is a zip of XML files: this unzips it with the browser's own DecompressionStream
 * and reads the cell values. Returns { sheets: [{ name, rows: [[cell, ...], ...] }], date1904 }.
 * Text cells come back as strings, numbers as numbers (dates stay as Excel serial numbers). */
(function (g) {
  const SR = {};

  // ---------------------------------------------------------------- zip
  async function inflateRaw(bytes) {
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }
  async function unzip(buf) {
    const u8 = new Uint8Array(buf);
    const dv = new DataView(buf);
    // End of central directory: scan back from the end (a zip comment can follow it).
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('This is not a valid .xlsx file');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    const dec = new TextDecoder();
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged .xlsx file');
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      const lstart = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      files[name] = { method, data: u8.subarray(lstart, lstart + csize) };
      p += 46 + nlen + xlen + clen;
    }
    return {
      has: name => !!files[name],
      async text(name) {
        const f = files[name];
        if (!f) return null;
        const raw = f.method === 0 ? f.data : f.method === 8 ? await inflateRaw(f.data) : null;
        if (!raw) throw new Error('Unsupported compression in .xlsx');
        return dec.decode(raw);
      }
    };
  }

  // ---------------------------------------------------------------- xlsx
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const all = (node, tag) => [...node.getElementsByTagNameNS('*', tag)];
  const kids = (node, tag) => [...node.childNodes].filter(c => c.nodeType === 1 && c.localName === tag);
  const colIndex = ref => {
    const letters = (ref.match(/^[A-Z]+/i) || ['A'])[0].toUpperCase();
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };
  // Text of a shared/inline string, skipping phonetic runs.
  const stringText = si => all(si, 't').filter(t => !t.closest || !(t.parentNode && t.parentNode.localName === 'rPh')).map(t => t.textContent).join('');

  SR.readXlsx = async function (buf) {
    const z = await unzip(buf);
    const wbText = await z.text('xl/workbook.xml');
    if (!wbText) throw new Error('This .xlsx has no workbook inside');
    const wb = xml(wbText);
    const pr = all(wb, 'workbookPr')[0];
    const date1904 = !!(pr && /^(1|true)$/i.test(pr.getAttribute('date1904') || ''));
    const rels = {};
    const relText = await z.text('xl/_rels/workbook.xml.rels');
    if (relText) for (const r of all(xml(relText), 'Relationship')) rels[r.getAttribute('Id')] = r.getAttribute('Target');
    let shared = [];
    const ssText = await z.text('xl/sharedStrings.xml');
    if (ssText) shared = kids(xml(ssText).documentElement, 'si').map(stringText);

    const sheets = [];
    for (const sh of all(wb, 'sheet')) {
      const rid = sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sh.getAttribute('r:id');
      let target = rels[rid] || '';
      target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
      const t = await z.text(target);
      if (!t) continue;
      const doc = xml(t);
      const rows = [];
      let nextRow = 0;
      for (const r of all(doc, 'row')) {
        const ri = r.getAttribute('r') ? Number(r.getAttribute('r')) - 1 : nextRow;
        nextRow = ri + 1;
        const row = [];
        let nextCol = 0;
        for (const c of kids(r, 'c')) {
          const ci = c.getAttribute('r') ? colIndex(c.getAttribute('r')) : nextCol;
          nextCol = ci + 1;
          const type = c.getAttribute('t') || 'n';
          const v = kids(c, 'v')[0];
          const vt = v ? v.textContent : '';
          let val = '';
          if (type === 's') val = shared[Number(vt)] ?? '';
          else if (type === 'inlineStr') { const is = kids(c, 'is')[0]; val = is ? stringText(is) : ''; }
          else if (type === 'str' || type === 'e') val = vt;
          else if (type === 'b') val = vt === '1';
          else val = vt === '' ? '' : Number(vt);
          row[ci] = val;
        }
        rows[ri] = row;
      }
      for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
      sheets.push({ name: sh.getAttribute('name') || `Sheet${sheets.length + 1}`, state: sh.getAttribute('state') || 'visible', rows });
    }
    return { sheets, date1904 };
  };

  // ---------------------------------------------------------------- csv
  SR.readCsv = function (text) {
    text = text.replace(/^﻿/, '');
    // Excel in some regions saves ";"-separated CSV.
    const first = text.split(/\r?\n/, 1)[0];
    const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return { sheets: [{ name: 'CSV', state: 'visible', rows }], date1904: false };
  };

  SR.readFile = async function (file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.csv') || file.type === 'text/csv') return SR.readCsv(await file.text());
    if (name.endsWith('.xls')) throw new Error('Old .xls format: in Excel use File › Save As › "Excel Workbook (.xlsx)", then upload that.');
    return SR.readXlsx(await file.arrayBuffer());
  };

  // Excel serial number -> "YYYY-MM-DD".
  SR.serialToIso = function (n, date1904) {
    if (!Number.isFinite(n) || n <= 0) return '';
    const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    const d = new Date(base + Math.round(n) * 86400000);
    return d.toISOString().slice(0, 10);
  };

  g.SheetReader = SR;
})(typeof self !== 'undefined' ? self : window);
