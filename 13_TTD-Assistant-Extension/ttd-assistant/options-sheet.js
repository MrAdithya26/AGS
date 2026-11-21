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
    note($('#shPullMsg'), 'Downloading…');
    try {
      const r = await SheetSync.call('customers', { onlyPending });
      if (!r.count) return note($('#shPullMsg'), onlyPending ? 'No devotees with pending bookings.' : 'The sheet has no devotees yet.', false);
      note($('#shPullMsg'), `${r.count} devotee(s) received. Check the preview, then click Import.`, true);
      document.querySelector('.tabs button[data-tab="import"]').click();
      window.__ATBA_IMPORT_ROWS(r.rows, (await CrmSync.isOn() ? 'AGS CRM' : 'Google Sheet') + (onlyPending ? ' (pending bookings)' : ' (all devotees)'));
    } catch (e) {
      note($('#shPullMsg'), '✕ ' + e.message, false);
    }
  }
  $('#shPullPending').addEventListener('click', () => pull(true));
  $('#shPullAll').addEventListener('click', () => pull(false));
  // AGS CRM sign-in (v2.0)
  (async () => { const c = await CrmSync.cfg(); $('#crmUrl').value = c.url; $('#crmKey').value = c.key; $('#crmEmail').value = c.email;
    if (await CrmSync.isOn()) note($('#crmMsg'), `✓ Signed in as ${c.name || c.email}.`, true); })();
  $('#crmIn').addEventListener('click', async () => {
    note($('#crmMsg'), 'Signing in…');
    try { const me = await CrmSync.signIn($('#crmUrl').value, $('#crmKey').value, $('#crmEmail').value, $('#crmPass').value);
      $('#crmPass').value = ''; note($('#crmMsg'), `✓ Signed in as ${me.name} (${me.role}). Open the toolbar popup to see pending TTD bookings.`, true);
    } catch (e) { note($('#crmMsg'), '✕ ' + e.message, false); }
  });
  $('#crmOut').addEventListener('click', async () => { await CrmSync.signOut(); note($('#crmMsg'), 'Signed out.'); });
  fill();
})();
