# Changelog

Every AGS change, newest first. Each entry says: what changed, the version, and the chat it came from (see `11_Chat-Records/`).

## 24 Nov 2026 – Sheet edition 4.0.0, Step 2 of 5 (logins, auto-assign, Google Contacts)

- **Staff logins:** each person has a login ID + password (6+ characters, stored hashed). The Admin sets a default password; the person must choose their own at first login (and after a reset). Login by ID or name. Last login shown. The Admin cannot remove their own Admin role.
- **Auto-assign:** a new job goes to the least busy active Staff member who works on that department (then Manager, then whoever entered it). "Works on" departments per staff. Manager / Admin can change the person ("change" link on the job). Jobs record who entered them.
- **New mobile → new customer** automatically when a job is saved.
- **Google Contacts:** every new customer mobile is saved to the shop's Google Contacts under the label "AGS Customers" (one contact per mobile; free Google People service; asks permission once). Settings has a button to add existing customers. Can be switched off (`contactsSync` = No).
- Tests: login ID, forced change, short password refused, auto-assign, auto-customer, contacts, Viewer read-only, Manager limits, masked IDs.

## 24 Nov 2026 – Sheet edition 4.0.0, Step 1 of 5 (services, customers, roles)

- **All online services:** 26 departments, about 156 online / CSC services plus TTD (new: Temples, Hotels & Stays, Land & Property, Farmers, Education, PF & Employment, Health; more in Train, Bus, Passport, Certificates, RTO, Tax, Banking, Bill Payments, Counter). No home / third-party services (delivery, plumber, electrician). Existing sheets get the new services once, automatically; nothing you deleted comes back twice.
- **New "booking" type** for Temples and Hotels & Stays: Booked / Not booked buttons, its own Telugu + English WhatsApp and SMS messages, reminder, receipt labels.
- **Customer 360:** name in Telugu, message language, WhatsApp / SMS / call consent (date saved), tags, Drive documents-folder link; profile shows total billed, paid and balance due.
- **Staff roles:** Admin, Manager (can delete and run reminders; cannot change users, settings or API key), Staff, Viewer (view only). Only Admin / Manager receive full ID numbers; others see the last 4 digits.
- Old 3.0.0 code kept in `99_Archive/12_Services-Master-Sheet/v3.0.0/`. 

## 24 Nov 2026 – Focus decision

- Pro CRM 0.6.1 **on hold** (`04_Platform-Nextjs-Supabase/crm/ON-HOLD.md`); everything stays in GitHub, Drive and Supabase.
- Next: **Sheet edition v4** – complete CRM in Google Sheets + Apps Script, built one part at a time.

## 21 Nov 2026 – AGS TTD Assistant 2.0.0 (works with the pro CRM)

- **Extension 2.0.0** (`13_TTD-Assistant-Extension/releases/ags-ttd-assistant-v2.0.0.zip`): sign in with your CRM staff login (password not stored), pending TTD bookings from the CRM, tick devotees for autofill, pull devotees, save Booked / Not booked / Lucky dip / Paid-no-ticket with ticket no, date, slot, amount, TTD login; Telugu / English WhatsApp message filled from the CRM templates; message logged in the booking timeline. Old Google Sheet link still works. Renamed "AGS TTD Assistant".
- **Database (migration 0010, applied):** `ttd_devotees` gives TTD autofill details including the full photo ID number – only to owner / manager / counter / agent, only customers with an open TTD booking (and family) unless owner/manager asks for all, every pull written to the change log.
- Simulated-CRM test for the extension connector (`ttd-assistant/test/crm-sync.test.js`).

## 18 Nov 2026 – CRM live; 0.6.1 fixes

- **Live:** CRM online (Netlify), owner login, `crm` schema exposed, 96 templates loaded, first bookings and payments made by the owner.
- **Fix:** Create booking, Add payment, Save customer and Close my day buttons lock while saving (two identical bookings were created by a double click).
- **Hosting:** `netlify.toml` with the Next.js runtime (fixed "page not found"); `main` now equals the CRM branch; SETUP-GUIDE has steps for running the CRM on the owner's Hostinger **Business Web Hosting** (Node.js Web App) at `crm.agservices.in`.

## 14 Nov 2026 – Pro CRM Phase 1f: dashboard, reports, import, guides (CRM 0.6.0) – Phase 1 complete

Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

- **Dashboard:** Today / This month / Last month / 3 months with change vs the period before; money received (net), service income, new bookings, completed with success rate, open work, money due; money by service line (last 6 months, stacked bars); work queue (refunds to give, past expected date, money due, ready to collect, next 2 days); by department; staff (created, done, open, collected); "cash not closed today" warning.
- **Reports:** any date range – by service, daily income; CSV downloads of bookings, receipts & refunds, customers (customers: owner / manager only).
- **Import from Sheet edition:** Customers and Bookings tabs as CSV; same booking numbers kept, statuses become steps, money and refunds become payments on the original dates, ID numbers checked and encrypted; safe to run twice.
- **Database (migrations 0008–0009, applied):** dashboard and report summaries (row security still applies), booking numbers skip numbers already taken (imported).
- **Guides:** `crm/STAFF-GUIDE.md` (daily use) and `crm/SETUP-GUIDE.md` (free hosting now on Netlify, first-time steps).

## 14 Nov 2026 – Pro CRM Phase 1e: accounts (CRM 0.5.0)

Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

- **Receipts:** printable Telugu + English receipt for every payment and refund (A4 / A5 / 80 mm thermal, or Save as PDF): shop details, receipt no, booking, service, journey / PNR / application no, fee and our charge shown separately, paid now, total paid, balance, amount in words, receipt note, IRCTC agent ID on travel receipts, and the line "AGS is an independent private service, not a government service".
- **Accounts page:** day book for any date (every receipt and refund with links), totals by payment mode and by staff, **cash closing** per staff (system works out expected cash, staff enter what they counted, difference shown).
- **Portal wallets page:** IRCTC / TTD / AEPS / recharge accounts (no passwords stored), balance, top-ups, usage linked to bookings, monthly booking limit warning.
- **Database (migration 0007, applied):** receipt numbers R-2611-0001 and refunds RF-2611-0001, expected-cash function, wallet balance view, change log on cash closings and wallets, receipt wording setting.

## 13 Nov 2026 – Pro CRM Phase 1d: jobs engine (CRM 0.4.0)

Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

- **New screens:** bookings list (Open / Past expected date / Done / Not done / Cancelled / All, assigned to me, department filter, search by booking no, PNR or application no); new booking for any department (find customer by number or mobile, or add a new one; service with automatic fee and charge; department form fields; devotees / passengers; payment received; assign to staff); booking page (move to any workflow step, details and result fields, assignment, payments, timeline, message for the step in Telugu / English, WhatsApp / SMS).
- **Free messaging:** the step's message is filled in and opens in the staff member's WhatsApp or SMS app; "I sent it" records it. Automatic sending stays a paid add-on, switched off.
- **Database (migration 0006, applied):** booking numbers per department prefix and month (TTD-2611-0001, TRV-…, AGS-…, QS-…), first step set automatically, timeline of creation / step / assignment / payment, paid and refunded kept equal to the payments, change log on payments and deleted bookings, shop details setting.
- **Templates:** the 96 Telugu / English WhatsApp and SMS templates of Sheet edition 3.0 ship inside the app (`web/src/lib/default-templates.json`); the owner loads them once with a button on the Bookings page.

## 12 Nov 2026 – Pro CRM Phase 1c: departments, services, workflows, form fields (CRM 0.3.0)

Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

- **New screens:** departments overview (grouped by TTD / Travel / Applications / Counter, with "services without fee" warnings) and a department editor: department name / Telugu name / number prefix / on-off; services and prices (fee, our charge, per, usual days, documents, on-off, add new); workflow steps (order, name, Telugu, result, message to prepare; add / delete – blocked while bookings sit at a step); form fields (label, Telugu, type, list choices, asked at booking or when done, must-fill).
- **Database (migration 0005, applied):** 118 default workflow steps (same steps and messages as Sheet edition 3.0), default form fields for TTD, travel, applications and counter work, change log on departments, services and steps.
- Only the owner or a manager can change these (database rules + screen).

## 12 Nov 2026 – Pro CRM Phase 1b: Customer 360 (CRM 0.2.0)

Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

- **New screens:** customer list with search (name, mobile, customer no), new / edit customer, customer profile (details, consent, ID documents, family members, private documents, history, free WhatsApp and call buttons).
- **Database (migration 0004, applied):** automatic customer numbers C00001…; ID numbers encrypted with a key kept in Supabase Vault, only the last 4 digits shown; full number visible to owner / manager only, every reveal logged; change log for customers and families; private file store `crm-files` (10 MB per file, 5-minute links).
- **Checks:** Aadhaar check-digit (Verhoeff) and PAN format validation, 10-digit mobile check, duplicate warning (same name + mobile), consent date saved (DPDP Act).

## 12 Nov 2026 – Pro CRM Phase 1a: foundation (free plan)

Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

- **New app:** `04_Platform-Nextjs-Supabase/crm/web/` – Next.js 15 CRM **0.1.0**: staff login, role-aware layout (clean navy design), dashboard with live counts, departments & services, staff & roles (owner switches staff on and sets roles). Customers and jobs screens are placeholders for Phases 1b–1d.
- **Database:** Supabase `ags-staging` restored (free). Migrations `crm/supabase/migrations/0001–0003` applied: own `crm` schema (no clash with hub tables), 28 tables, row security on all of them (70 rules), first login becomes owner, encrypted ID column hidden from browsers, 19 departments and 75 starter services from Sheet edition 3.0.
- **New guide:** `crm/SETUP-GUIDE.md` – free setup: expose `crm` schema, owner login, free Cloudflare Pages hosting, keep-awake note.
- **Decision:** ₹0 budget – everything on free plans; paid features (WhatsApp API auto-send, SMS, auto-calls, AI voice) built as switches that stay off.

## 11 Nov 2026 – AGS Services Master: Sheet v3.0, TTD Assistant split, pro CRM plan

Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

- **New product folder:** `12_Services-Master-Sheet/` – AGS Services Master **3.0.0** (Google Sheet + Apps Script CRM for all departments: TTD, travel, applications, quick sale, receipts, reports, Telugu/English messages, clean navy dashboard) with source, demo, tests, illustrated PDF guide and `releases/AGS-Services-Master-v3.0.0.zip`.
- **New product folder:** `13_TTD-Assistant-Extension/` – AGS TTD Assistant Chrome extension **1.5.0** kept as its own product (source + `releases/`).
- **New plan:** `01_Plans-Docs/AGS-SERVICES-MASTER-CRM-PLAN_v1.0.md` – pro CRM on Next.js + Supabase: modules, roadmap, costs, legal rules, open decisions.
- **New draft:** `04_Platform-Nextjs-Supabase/crm/schema/0001_crm_core.draft.sql` (not applied) and `crm/README.md`.
- **Changed:** test data in the Sheet edition uses clearly fake ID numbers.

## 4 Nov 2026 – One project in 3 places, with versions

Chat: `11_Chat-Records/2026-11-04_three-place-sync-and-versioning.md`

- **New:** same numbered folder structure (`00`–`11`, `99`) on the computer, GitHub and Google Drive.
- **Moved (history kept):** `docs/` → `01_Plans-Docs/`, `apps/ags-core-plugin/` → `02_Website-WordPress/`, `apps/whatsapp-site/` → `03_WhatsApp-Site/`, `apps/platform/` → `04_Platform-Nextjs-Supabase/`.
- **New code:** AGS Core plugin **1.0.0** source (`02_Website-WordPress/ags-core/`, copied from ABD-Innovations repo `plugins/ags-core`, checked file-by-file against the Drive zip) + `releases/ags-core-1.0.0.zip`.
- **New code:** WhatsApp single-page site **1.0.0** (`03_WhatsApp-Site/index.html`, from Drive, 23 Oct). Contains only placeholder phone/email.
- **New docs:** `AGS-CORE-GUIDE.md`, `PROJECT-STATUS.md`, `PLANNER-TASKS.md` (26 tasks), `DECISIONS.md`, `VERSIONS.md`.
- **New:** `11_Chat-Records/` with a summary of every AGS chat so far (4 chats + this one).
- **Changed:** Go-Live Plan **v1.0 → v1.1** (new file locations only; steps and dates unchanged). v1.0 kept in `99_Archive/01_Plans-Docs/`.
- **Changed:** `README.md` (3 places, folders, version rules, update routine), `.gitignore` (blocks private folders), `CLAUDE.md` (sync routine).
- **Replaced:** 4 placeholder READMEs (`apps/*/README.md` saying "Code for this app will be added here." and the old `docs/README.md` index) by new READMEs in the numbered folders. Old copies stay in GitHub history (commit `fa1fab0`). Nothing else removed.

## 4 Nov 2026 – Local project folder created

Chat: `11_Chat-Records/2026-11-04_project-folder-setup.md`

- **New:** `D:\ABD Innovations\Adithya Group of Services` set as the master project folder, with folders `00`–`11`, `99`.

## 31 Oct 2026 – Go-live plan added

Chat: `11_Chat-Records/2026-10-31_website-implementation-plan.md`

- **New:** Go-Live Plan **v1.0** – launch 31 Dec 2026 (soft launch 14 Dec): WordPress + AGS Core as the main site, WhatsApp page as backup, Next.js hub moved to Phase 2.
- **Changed:** `README.md` and docs index link to the plan.

## 31 Oct 2026 – Repo set up

Chat: `11_Chat-Records/2026-10-31_github-repo-setup.md`

- **New:** repo structure, `README.md`, `.gitignore` (blocks secrets, `.env`, build files, personal data), `CLAUDE.md` (working rules).

## Before 31 Oct 2026 – builds made earlier (recorded here for history)

- 27 Oct 2026: AGS Core plugin **1.0.0** built (zip in Drive; source in ABD-Innovations repo).
- 23 Oct 2026: WhatsApp single-page site **1.0.0** built (Drive).
- Sep–Oct 2026: Next.js + Supabase platform built to staging (`ags-staging`, 14 migrations); release check NO-GO.
