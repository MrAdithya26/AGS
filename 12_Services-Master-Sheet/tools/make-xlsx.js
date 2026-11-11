// Dumps the blank master sheet (after setup) to JSON for make-xlsx.py.
const fs = require('fs'), vm = require('vm'), path = require('path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'gas-shim.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'));
setup();
const out = SHEET_ORDER.map(n => ({ name: n, color: SCHEMA[n].color, cols: SCHEMA[n].cols, rows: __book.getSheetByName(n).data.map(r => r.map(v => v instanceof Date ? v.toISOString().slice(0, 10) : v)) }));
out.find(s => s.name === 'Users').rows = [out.find(s => s.name === 'Users').rows[0]];   // no PIN hash in the file
process.stdout.write(JSON.stringify({ sheets: out, lists: LISTS }));
