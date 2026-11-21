# 13 · AGS TTD Assistant (Chrome extension)

**Version 2.0.0** · separate product · used only on PCs where staff book on the TTD website.

- Fills TTD booking forms from saved devotee profiles (the staff still type the CAPTCHA and pay; the extension never submits or pays).
- Links to AGS Services Master: picks a pending TTD booking, ticks its devotees, reads ticket details from the confirmation page, and saves Booked / Not booked back, then shows the Telugu message.
- In the AGS CRM, **TTD is one department**; this extension is its helper tool.

| Path | What |
|---|---|
| `ttd-assistant/` | Source (Manifest V3). `test/` has mock TTD pages with fake data only |
| `releases/` | Packaged zips, one per version (never deleted) |

**Update from 1.5:** unzip `releases/ags-ttd-assistant-v2.0.0.zip` over the old folder (or into a new permanent folder) › `chrome://extensions` › click ↻ on the card (or Load unpacked the new folder). Saved profiles stay. Then Options › **AGS CRM / Sheet** › enter the CRM database address, publishable key, your email and password › Sign in.

Install: unzip the release to a permanent folder → `chrome://extensions` → Developer mode → Load unpacked. Connect: dashboard Settings › Create API key → extension Options › Google Sheet.

Test: `node ttd-assistant/test/crm-sync.test.js` (simulated CRM).
