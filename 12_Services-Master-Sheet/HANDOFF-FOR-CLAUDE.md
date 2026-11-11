# Handoff brief: AGS Services Master (was Adithya TTD Master)

## v3.0 notes (read first)
- Repo layout: see README.md. User package is built by `bash tools/make-release.sh` (numbered install files, demo, optional TTD extension, PDF guide).
- Theme: Styles.html is token-based (clean navy, light + dark). Inter font. Charts use the dataviz reference palette slots 1-4 (`SERIES` in App.html, validated with the dataviz validator). `declutter()` strips leading emoji from buttons/chips/headings; never from messages or receipts.
- Dashboard: `PAGES.dashboard` (KPIs with `delta()` vs `prevRange()`, stacked money-by-service-line chart, work queue, status split, coming up, releases, service lines, `deptCard`).
- Guide: `docs/guide/guide.html` -> PDF with `node docs/guide/make-pdf.js` (run in docs/guide; screenshots by `take-screenshots.js`, which serves Chart.js locally because the CDN may be blocked).

## Saving rule (standing instruction from the owner)
After every version or phase: (1) commit + tag in git; (2) build the release zip and `git bundle create ags-services-master-git-history.bundle --all`; (3) upload both to Google Drive folder **ABD Innovations › Adithya Group of Services › AGS Services Master (CRM)** (folder id `1TB0nydmAvH8EntW-0TSydcJ7S-O4MUME`). ABD Innovations is a Drive-for-desktop synced folder, so this also lands in the owner's local ABD Innovations folder. Keep the project note doc in that folder up to date.

Paste this file into a new Claude chat (or Claude Code session), together with `adithya-ttd-master-handoff.zip`, to continue the work.

---

**Please read this first, then unzip the attached file and continue from there.**

## Who and what

The client is **Adithya Internet & CSC Center (Adithya Group of Services)**, a CSC / internet centre in Srikakulam, Andhra Pradesh. It books TTD (Tirumala Tirupati Devasthanams) services for customers: Special Entry Darshan ₹300, SRIVANI, senior citizen darshan, Arjitha sevas and the lucky dip, Angapradakshinam, Srinivasa Divyanugraha Homam, accommodation, and donations. Customers are mostly Telugu-speaking.

The system has three parts, all built and working:

1. **Google Sheet = database.** It is bound to an Apps Script project. The tabs are Bookings, Customers, Services, Releases, TTD Logins, Messages, Users, Settings and Activity Log.
2. **Dashboard web app** (Apps Script HtmlService, vanilla JS, Chart.js 4.4.1 and SheetJS 0.18.5 from cdnjs).
   - **Pages:** Dashboard (KPIs, charts, "needs attention", upcoming darshans, release countdowns), Bookings, Release Day Board (kanban), Customers (families), Services & Prices, Release Calendar, TTD Logins, Message Templates, Reports, Activity Log, Settings.
   - **Login:** name + PIN (SHA-256 with a salt). The session token lives in CacheService for 6 hours. Roles are Admin and Staff.
3. **Chrome extension "Adithya TTD Booking Assistant" v1.5.0** (Manifest V3). It was the client's existing autofill extension (v1.4.0). We added a Google Sheet link:
   - Options › Google Sheet: web app URL, API key, user name, and "pull devotees" into extension profiles through the existing Excel-import preview.
   - Popup: pick a pending booking, tick its devotees for autofill, read the ticket no / date / slot / amount from the TTD page, and save Booked / Not booked / Lucky dip / Paid-no-ticket.
   - After saving, the Telugu message comes back for WhatsApp or SMS.

## Key behaviours already built

- **Booking IDs:** `TTD-yyMM-0001`. Customer IDs are `C00001`.
- **Customers tab:** uses the same 15 columns as the client's `TTD-Devotees-Template.xlsx`. Profile = family. Import/export uses that template.
- **Statuses:** Requested, Attempting, Booked, Not Booked, Lucky Dip - Registered / Selected / Not Selected, Payment Failed, Cancelled, Completed.
- **Automatic updates on save:**
  - Not booked with money received → Refund Pending (refund amount = received).
  - Booked → TTD payment "Paid to TTD", and the reporting point is filled from the service.
  - Any status change → message status reset to "Not Sent".
- **13 message templates** in Telugu and English, each with a short SMS version. They are signed "ఆదిత్య ఇంటర్నెట్ & CSC సెంటర్ (ఆదిత్య గ్రూప్ ఆఫ్ సర్వీసెస్)". The template is picked automatically from the status and refund status (`pickTemplate_` in Code.gs, mirrored by `pickTemplate` in App.html).
- **WhatsApp:** `wa.me/91…` links.
- **SMS:**
  - Each booking has "Send messages by" (WhatsApp / SMS / WhatsApp + SMS) and records "Message Sent Via".
  - Gateways: Fast2SMS (route "q"), Android SMS Gateway (sms-gate.app cloud API, basic auth), or a custom HTTP API with `{mobile} {mobile91} {message} {apiKey}` placeholders.
  - Also: phone SMS app (`sms:` link), Bulk SMS (up to 100), and a test SMS.
  - The gateway calls are written from memory of the providers' APIs and have **not been tested against the live providers yet**.
- **Extension API:** `doPost` with JSON `{key, action, ...}` sent as text/plain. Actions: ping, pending, customers, result, attempting, messageSent, sendSms.
- **Auto-repair:** `SCHEMA_VERSION` (currently '7') in script properties. When it changes, `ensureSchema_()` reruns `setup()`, which adds missing columns, settings and SMS texts without touching existing data.
- **Starting data:** service prices and the monthly release pattern (18th / 21st / 23rd / 24th) are only a starting point. The client must check them on the TTD site.

## Files in the zip

```
SETUP.md                          step-by-step install guide for the client (English + Telugu summary)
apps-script/Code.gs               server: schema, seeds, setup, dashboard api(), extension doPost, SMS
apps-script/App.html              dashboard client (single IIFE, data-act click delegation, PAGES/AFTER per page)
apps-script/Styles.html           CSS (maroon/saffron/gold theme, light + dark)
apps-script/Index.html            shell with include('Styles') / include('App')
apps-script/appsscript.json       Asia/Kolkata, V8, web app: execute as me, anyone
extension/                        Chrome extension v1.5.0 (new files: lib/sheet-sync.js, popup-sheet.js, options-sheet.js)
chrome-extension-TTD-only-v1.5.0.zip  the extension packaged for install
demo/index.html                   offline demo: real Code.gs on an in-memory fake sheet with made-up data (Admin / 1234)
AGS-Master-Sheet (offline copy).xlsx  same tab layout as an Excel file
tools/gas-shim.js                 fake SpreadsheetApp / Properties / Cache / Lock / Utilities / UrlFetchApp for Node + demo
tools/test-server.js              server tests:  TZ=Asia/Kolkata node tools/test-server.js
tools/build-demo.js, demo-seed.js rebuild demo:  node tools/build-demo.js
tools/make-xlsx.js + .py          rebuild xlsx:  TZ=Asia/Kolkata node tools/make-xlsx.js | python3 tools/make-xlsx.py "docs/AGS-Master-Sheet (offline copy).xlsx"
```

## How to work on it

- After changing Code.gs, run `TZ=Asia/Kolkata node tools/test-server.js`. All asserts must pass, and it fails if a Date object would be returned to the client, which Apps Script cannot do.
- After changing App.html or Styles.html, run `node tools/build-demo.js` and open `demo/index.html` in a browser.
- If you add a column, add it to `SCHEMA` and bump `SCHEMA_VERSION`. Existing sheets repair themselves on the next call.
- Keep the dashboard and server message logic in sync (`buildMessage_` / `buildMsg`, `pickTemplate_` / `pickTemplate`).
- The client deploys by pasting the 4 files into Extensions › Apps Script, running `setup`, then Deploy › Web app. After updates: run `setup` once more, then Manage deployments › New version.

- **Automatic reminder SMS (v1.2, Phase 1 done):** settings `autoReminder` (Off / SMS customers only / All customers), `reminderHour`, `reminderDaysBefore`; Bookings column `reminderSentOn`. `sendDailyReminders()` is the daily time-trigger handler; `syncReminderTrigger_()` keeps exactly one trigger and runs on setup and when those settings are saved. Admin action `runReminders {dryRun}`. Only status Booked, date = serviceDate or checkIn, once per booking, max 100 per run, does not touch messageStatus.
- **Receipt (v1.3, Phase 2 done):** client-side only (`receiptHtml` / `receiptModal` in App.html, `.rcpt` + `#printArea` print CSS in Styles.html). Printed with the browser's print dialog (Save as PDF), because Apps Script's HTML-to-PDF converter shapes Telugu badly. Paper A4 / A5 / 80mm via a dynamic `@page` style. Settings `receiptNote`, `receiptNoteTe`, `receiptSize`; server action `receiptPrinted` only logs. Never prints ID numbers.
- **Departments (v2.0, Phase A done):** `DEPARTMENTS` in Code.gs = [name, icon, kind, ID prefix]; kind ttd | travel | app | quick. Column `department` on Bookings and Services (blank rows repaired to TTD in `seed_`). `DEFAULT_AGS_SERVICES` seeded once per department (script property SEEDED_DEPTS). IDs: TTD- / TRV- / AGS- / QS-. Action `quickSale` (status Completed, messageStatus 'Not Needed' when no mobile). Templates `order_received` / `order_completed` for app+quick kinds (pickTemplate_ and pickTemplate mirror). Client: `DI(b)` gives dept info; booking form toggles `.dk .dk-<kind>` fields. Extension `pending` returns TTD only. User has an IRCTC agent ID (setting `irctcAgentId`).

## Next phases (agreed)
- **Phase B, travel: DONE (v2.1).** Bookings columns fromPlace, toPlace, operator, vehicleNo, travelClass, quota, boardingPoint, seatInfo, ticketStatus, passengerDetails. PNR = ttdRef, journey date = serviceDate, departure time = slot (so the reminder job works for travel and uses `travel_reminder`). Templates travel_received / travel_booked / travel_not_booked / travel_cancelled / travel_reminder (+ SMS); `{route}` placeholder. Client: `TRAVEL` constant (operators, classes per dept), travel fields toggled by `.dk-travel`, passenger details auto-filled from picked customers, travel variant of markBooked, Journey section in the drawer, travel rows on the receipt (A5 still one page).
- **Phase C, applications: DONE (v2.2).** Statuses Applied / In Process / Ready to Collect / Rejected (Completed = delivered). Application no = ttdRef. Bookings columns expectedDate, documents; Services columns documents, daysToComplete (`DEFAULT_DOCS` fills starter values once). Server sets expectedDate on Applied from daysToComplete; Rejected with money received -> Refund Pending. Templates app_applied / app_in_process / app_ready / app_rejected (+ SMS); `{balance}` and `{expectedDate}` placeholders (server and client). Client: `overdue()` + `APP_OPEN`, documents checklist chips in the booking form, markApplied modal, setStatus / markRejected actions, Application section in the drawer, dashboard alerts and 'overdue' filter chip.
- **Phase D: DONE (v2.3).** Release Day Board and Upcoming darshans are TTD-only. Dashboard card '🏢 By department' (`deptCard`, `deptRows`) with today's takings and quick sales; click a row → Bookings filtered by department (`deptGo`). Reports: By department + Daily income (`dailyTable`). Excel export has department, travel and application columns. Demo seed adds train, bus, PAN, certificate, Aadhaar and quick-sale entries. SETUP has a go-live checklist.
- **All agreed phases are done.** Possible next work: per-TTD-login monthly limits, customer status page, more departments when the shop sends them, live tests of SMS gateways and the extension's page reader.

## Open items / ideas not yet done

- Test the SMS gateways and the "read details from this page" parser on the real TTD confirmation page and real providers.
- Later ideas: per-TTD-login monthly booking limits, customer-facing status page.
- Test the reminder trigger on the live script (Apps Script › Triggers should show one `sendDailyReminders` daily trigger once reminders are on).
