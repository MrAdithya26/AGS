/* Adithya TTD Booking Assistant - options: Google Sheet link and "pull devotees" (v1.5). Uses $ from options.js. */
(() => {
  const note = (el, t, ok) => { el.textContent = t; el.className = ok === false ? 'err-text' : ok ? 'ok-text' : 'muted'; };

  async function fill() {
    const c = await SheetSync.cfg();
    $('#shUrl').value = c.url;
    $('#shKey').value = c.key;
    $('#shUser').value = c.user;
  }

  $('#shSave').addEventListener('click', async () => {
    const cfg = { url: $('#shUrl').value.trim(), key: $('#shKey').value.trim(), user: $('#shUser').value.trim() };
    await SheetSync.saveCfg(cfg);
    note($('#shMsg'), 'Testing…');
    try {
      const r = await SheetSync.call('ping');
      note($('#shMsg'), `✓ Connected to ${r.app} (${r.shop || 'your sheet'}).`, true);
    } catch (e) {
      note($('#shMsg'), '✕ ' + e.message, false);
    }
  });
  $('#shClear').addEventListener('click', async () => {
    await SheetSync.saveCfg({ url: '', key: '', user: $('#shUser').value.trim() });
    await fill();
    note($('#shMsg'), 'Disconnected.');
  });

  async function pull(onlyPending) {
    note($('#shPullMsg'), 'Downloading from Google Sheet…');
    try {
      const r = await SheetSync.call('customers', { onlyPending });
      if (!r.count) return note($('#shPullMsg'), onlyPending ? 'No devotees with pending bookings.' : 'The sheet has no devotees yet.', false);
      note($('#shPullMsg'), `${r.count} devotee(s) received. Check the preview, then click Import.`, true);
      document.querySelector('.tabs button[data-tab="import"]').click();
      window.__ATBA_IMPORT_ROWS(r.rows, onlyPending ? 'Google Sheet (pending bookings)' : 'Google Sheet (all devotees)');
    } catch (e) {
      note($('#shPullMsg'), '✕ ' + e.message, false);
    }
  }
  $('#shPullPending').addEventListener('click', () => pull(true));
  $('#shPullAll').addEventListener('click', () => pull(false));
  fill();
})();
