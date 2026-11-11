// Builds demo/index.html: the real dashboard + real Code.gs running on an in-memory sheet with made-up data.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const gas = f => fs.readFileSync(path.join(root, 'apps-script', f), 'utf8');
const tool = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

const bridge = `
window.google = { script: { get run() {
  let ok = null, bad = null;
  const r = {
    withSuccessHandler(f) { ok = f; return r; },
    withFailureHandler(f) { bad = f; return r; },
    api(...args) {
      setTimeout(() => {
        try {
          const out = api(...args);
          const json = JSON.stringify(out, (k, v) => { if (v instanceof Date) throw new Error('Date returned to client: ' + k); return v; });
          ok && ok(JSON.parse(json));
        } catch (e) { bad && bad(e); }
      }, 150);
      return r;
    }
  };
  return r;
} } };`;

const demoBanner = `<div style="position:fixed;left:50%;transform:translateX(-50%);bottom:10px;z-index:400;background:#2A1A12;color:#F6D77A;font:12px Poppins,sans-serif;padding:6px 14px;border-radius:99px;box-shadow:0 6px 20px rgba(0,0,0,.3)">DEMO · made-up data · login Admin / 1234 · changes reset on reload</div>`;

let html = gas('Index.html')
  .replace("<?!= include('Styles'); ?>", () => gas('Styles.html'))
  .replace("<?!= include('App'); ?>", () =>
    `<script>\n${tool('gas-shim.js')}\n</script>\n<script>\n${gas('Code.gs')}\n</script>\n<script>\n${tool('demo-seed.js')}\n${bridge}\n</script>\n${demoBanner}\n${gas('App.html')}`)
  .replace('<title>Adithya TTD Master</title>', '<title>Adithya TTD Master (Demo)</title>');
fs.mkdirSync(path.join(root, 'demo'), { recursive: true });
fs.writeFileSync(path.join(root, 'demo', 'index.html'), html);
console.log('demo/index.html', (html.length / 1024).toFixed(0) + ' KB');
