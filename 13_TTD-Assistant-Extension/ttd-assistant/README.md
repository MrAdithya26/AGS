# Adithya TTD Booking Assistant (unpacked Chrome extension)

Saves your family's pilgrim details and photos on your own computer and fills them into TTD
(ttdevasthanams.ap.gov.in) booking forms when you click. Works for Special Entry Darshan (Rs 300),
Arjitha Seva (including the electronic lucky dip), Angapradakshinam, Srinivasa Divyanugraha Homam,
SRIVANI, senior citizen darshan and accommodation, wherever TTD shows a pilgrim-details form.

You pick the date and slot, check every field, type the CAPTCHA, and submit and pay yourself.

## Install (Chrome, Edge or Brave on Windows, Mac or Linux)

1. Copy the whole `adithya-ttd-assistant` folder to the PC (keep it in a permanent place, e.g. `C:\Tools\`).
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `adithya-ttd-assistant` folder (the one containing `manifest.json`).
5. Pin it: click the puzzle icon in the toolbar, then the pin next to **Adithya TTD Booking Assistant**.
6. The settings page opens automatically. Create your profiles and add passengers.

**Updating from 1.4:** replace the files and click ↻. New in 1.5: **Options › Google Sheet** links the extension to your *Adithya TTD Master* Google Sheet (see SETUP.md). Without it, the extension works exactly as before.

**Updating from 1.3:** replace the files and click ↻; profiles, photos and dates are kept. Gotram is empty until you add it.

**Updating from 1.0:** replace the files in the same folder, then click ↻ on the extension card in
`chrome://extensions`. Your saved family moves into a profile called "My Family" automatically.
Do not delete the folder, because Chrome runs the extension from it.

## Features

| Feature | Where |
|---|---|
| **Profiles**: any number of named groups ("My Family", "Parents"…). Each has **one address/contact block** (mobile, email, address, city, district, state, pincode, country) and **its own passengers** | Options › Profiles |
| Passengers: name, DOB (age auto-calculated), gender, photo ID type and number, photo. Reorder, move between profiles, duplicate a whole profile | Options › Profiles |
| **Booking types**: Special Entry Darshan, Angapradakshinam, Arjitha Seva, Homam. Pick one in the on-page picker or the toolbar popup. All use the same devotee fields; **Homam also asks each devotee's Gotram** (typed right in the picker, saved to the profile, then filled into the form's Gotram/Gothram boxes) | Picker, popup |
| **Gotram** per passenger, with "Set Gotram for all" for a family | Options › Profiles |
| **Import from Excel**: download the template, fill one row per devotee (profile name and address on the first row of each family), upload .xlsx or .csv, check the preview, import. Creates new profiles, adds devotees to existing ones, and updates (doesn't duplicate) a devotee with the same name and DOB | Options › Import from Excel |
| **On-screen profile picker**: pops up by itself when a TTD pilgrim-details form appears. Pick a profile, tick passengers, click Autofill. Reopen it from the 🙏 button or the toolbar popup | TTD page |
| One-click **Autofill** of the selected passengers into the form rows, in order, plus that profile's **address: Mail ID, Mobile, Country, State, District, City, Address, Pincode**. Text goes in as if typed, so TTD keeps it. Dropdowns are picked in order (Country → State → District) and it waits for District to load after State | Picker, page panel, popup, `Alt+Shift+F` |
| **Step-by-step mode** for TTD forms that block autofill (starts by itself when autofill is refused). It highlights one box at a time and says what to do: Name → "Press Ctrl+V" (already copied), Age → "Type 34", Gender → "Choose Male" (the right option glows green when the list opens), Photo ID Proof → "Choose Aadhaar Card", Photo Id Number → "Press Ctrl+V". It moves to the next box as soon as one is right, then on to the next pilgrim and the contact boxes | Page panel, popup, `Alt+Shift+P` |
| **Photo upload**: auto-crop (passport/square), resize and compress under a KB limit; attach to the form's upload boxes or drag from the panel | Options › Profiles and Photo & panel, page panel |
| **Monthly dates editor**: pick a month and set each booking type's announced date and time, turn its reminder on or off, or mark "no release this month". Copy last month's dates or reset to the usual pattern | Options › Monthly dates & reminders |
| Desktop reminders 30/15/5/0 minutes before each release, plus a monthly "update the dates" reminder (default 15th, 9 AM) | Options › Monthly dates & reminders |
| Live countdowns and quick links for every booking type | Toolbar popup |
| Checks ID formats: Aadhaar (with checksum), PAN, passport, voter ID, driving licence, mobile, pincode | Everywhere a ⚠ shows |
| Optional lock: ID numbers encrypted with AES-GCM 256 and a master password | Options › Security |
| Backup and restore to a JSON file | Options › Backup |
| **Google Sheet link (v1.5)**: pull devotees from the sheet into profiles; in the popup pick a pending booking, tick its devotees for autofill, read the ticket no / date / slot / amount from the TTD page, and save **Booked / Not booked / Lucky dip / Paid-no-ticket** to the sheet. The Telugu message comes back ready for WhatsApp, or switch to **📱 SMS** and send the short SMS through the sheet's SMS gateway | Options › Google Sheet, popup |

Never touched: CAPTCHA, booking date, slot, amount, declarations or terms checkboxes. The extension never
submits a form or makes a payment. It sends data only to your own Google Sheet web app, and only after you connect it.

## Release dates

TTD announces quota release dates every month. Each month (the extension reminds you), open
Options › Monthly dates & reminders, pick the month with ‹ ›, enter the announced dates and times,
and click **Save dates for this month**. Months you don't edit use the usual pattern (18th: seva dip,
21st: Arjitha sevas, 23rd: Angapradakshinam and Homam, 24th: Special Entry Darshan), which is only a guess.
You can change that pattern under "Default pattern" on the same tab.
If reminders don't pop up, allow notifications for Chrome in Windows Settings › System › Notifications.

## If autofill misses a field

TTD changes its pages from time to time. If a box isn't filled:
- Use **Click & Paste**. It works on any box the assistant recognises.
- If the page isn't a TTD domain (e.g. a new TTD URL), open the popup there and click a button.
  The popup click lets it run on that tab.

## Files

- `manifest.json`: extension definition (Manifest V3)
- `background.js`: reminders, notifications, keyboard shortcuts
- `content.js`: on-page panel, autofill, Click & Paste, photo attach
- `popup.*`, `options.*`, `ui.css`: interface
- `lib/core.js`: storage, validation, schedule maths, encryption, booking types
- `lib/sheet-reader.js`, `import.js`: Excel/CSV import (no outside libraries)
- `lib/sheet-sync.js`, `popup-sheet.js`, `options-sheet.js`: Google Sheet link (v1.5)
- `templates/TTD-Devotees-Template.xlsx`: the import template
- `test/mock-form.html`, `test/mock-homam.html`: fake pilgrim forms for testing (serve the folder over http to use them)

Independent helper. Not affiliated with or endorsed by Tirumala Tirupati Devasthanams.
