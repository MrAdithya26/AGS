# 13 · AGS TTD Assistant (Chrome extension)

**Version 1.5.0** · separate product · used only on PCs where staff book on the TTD website.

- Fills TTD booking forms from saved devotee profiles (the staff still type the CAPTCHA and pay; the extension never submits or pays).
- Links to AGS Services Master: picks a pending TTD booking, ticks its devotees, reads ticket details from the confirmation page, and saves Booked / Not booked back, then shows the Telugu message.
- In the AGS CRM, **TTD is one department**; this extension is its helper tool.

| Path | What |
|---|---|
| `ttd-assistant/` | Source (Manifest V3). `test/` has mock TTD pages with fake data only |
| `releases/` | Packaged zips, one per version (never deleted) |

Install: unzip the release to a permanent folder → `chrome://extensions` → Developer mode → Load unpacked. Connect: dashboard Settings › Create API key → extension Options › Google Sheet.

Next: the pro CRM (`04_Platform-Nextjs-Supabase/crm/`) will get the same extension API (`pending`, `customers`, `result`, `messageSent`) so the extension works with both.
