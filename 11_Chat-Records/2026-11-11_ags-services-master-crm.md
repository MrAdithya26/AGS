# 2026-11-11 – AGS Services Master (Sheet v1 → v3.0) and pro CRM plan

**What was asked:** continue the "Adithya TTD Master" handoff; then extend it to all AGS services (travel, Aadhaar, PAN, voter ID, certificates…); clean professional theme and pro dashboard; organised package with guide; save in git, local ABD folder and Drive; keep the TTD extension separate; plan an advanced CRM (many logins, master customers, department services, voice agent, auto calls, auto-forward messages, all integrations).

**What was done**
- Sheet edition grew from TTD-only to **AGS Services Master 3.0.0**: 18 departments, quick sale, travel (PNR, passengers, journey reminder), application tracking (documents, expected date, Applied → Delivered), automatic reminder SMS, bilingual receipts, reports by department and day, clean navy theme with a pro dashboard, illustrated 12-page PDF guide (with Telugu summary). Tests pass; checked in a browser on desktop, dark mode and phone.
- Saved: Drive `ABD Innovations › Adithya Group of Services › AGS Services Master (CRM)` (zip, guide, git history), project note doc in the AGS folder; now also this repo (`12_…`, `13_…`).
- TTD Assistant extension 1.5.0 split into its own product folder.
- Pro CRM Phase 0: plan v1.0 and draft data model (Next.js + Supabase, shared AGS database).

**Decisions:** see `01_Plans-Docs/DECISIONS.md` (11 Nov 2026 rows).

**Not tested live yet:** SMS gateways, daily reminder trigger, shop printer, extension page reader.

**Open questions for the owner:** restore `ags-staging` or new Supabase project; Cloudflare Pages vs Vercel Pro; WhatsApp direct (Meta) vs reseller; one branch or several.

**12 Nov – Phase 1a done (free plan):** `ags-staging` restored; `crm` schema with 28 tables, 70 row-security rules, owner-first-login trigger, 19 departments + 75 services; Next.js CRM 0.1.0 (login, roles, dashboard, departments, staff). Supabase security checker: no CRM findings. Owner must expose the `crm` schema once (SETUP-GUIDE step 0).

**12 Nov – Phase 1b done (CRM 0.2.0):** Customer 360 – list/search, new/edit, profile with family, consent (date saved), encrypted IDs (last 4 shown; owner/manager reveal, logged), private documents (Supabase Storage), history; Aadhaar Verhoeff + PAN checks; duplicate warning. Database self-test passed (numbering, audit, encryption, bucket) and left no data.

**12 Nov – Phase 1c done (CRM 0.3.0):** department editor with services & prices, workflow steps (118 defaults) and form fields; owner/manager only.

**13 Nov – Phase 1d done (CRM 0.4.0):** jobs engine – list with filters, new booking for any department, booking page with steps, details, payments, timeline, Telugu/English message opening in WhatsApp/SMS (free). Database self-test passed (numbers, first step, timeline, payment totals) and left no data; message filler tested with a real template.

**14 Nov – Phase 1e done (CRM 0.5.0):** printable bilingual receipts with R-/RF- numbers (states AGS is not a government service), accounts day book, cash closing per staff, portal wallets with balances and monthly limits. Database self-test passed (receipt numbers, paid/refunded, wallet balance) and left no data.

**14 Nov – Phase 1f done (CRM 0.6.0), Phase 1 complete:** dashboard with period comparison and work queue, reports + CSV export, Sheet-edition import (customers, bookings with payments), staff guide, free hosting guide (Netlify). Found and fixed: imported booking numbers could clash with new ones (migration 0009). Database tests passed and left no data.

**Next:** owner does the setup (expose `crm`, owner login, Netlify) and a first live test → 1.0.0. Then Phase 2 – WhatsApp automation (free mode first).

**24 Nov – Focus back on the Sheet edition.** Owner: too many pieces; build the full CRM in Google Sheets + Apps Script first, pro CRM later. Include every online service (Adithya Internet & CSC, TTD, all online work), but no third-party home services (delivery, plumber, electrician). Plan: v4 in 4 steps.

**24 Nov – v4 Step 1 done (4.0.0):** 26 departments, ~156 online services + TTD; new "booking" type for Temples and Hotels & Stays with its own messages; Customer 360 (Telugu name, consent, language, tags, documents link, billed/paid/balance); roles Admin / Manager / Staff / Viewer; full ID numbers only for Admin / Manager. Server tests passed, demo checked in a browser. **Next: Step 2 – money** (receipt numbers, receipt print, cash closing per staff, portal wallets).

**24 Nov – Owner's new ideas, plan now 5 steps.** (1) every customer saved to Google Contacts – owner chose *all new customers*; (2) user ID + default password per staff, person changes it, one Manager login, Admin = full control; (3) enter services from phone / PC, new mobile → new customer, auto-assign – owner chose *least busy staff*, status updates, staff dashboard (done / failed / pending / earnings); (4) dashboards for Admin, Manager, Staff (received, earned, failed, refunds). Role split agreed as suggested (Admin all; Manager all work + money + team, no users/settings; Staff own jobs, masked IDs; Viewer read-only). No extra plugins needed.

**24 Nov – Step 2 done:** logins with forced password change, auto-assign, auto-customer, Google Contacts sync. Tests passed; demo checked in a browser. **Next: Step 3 – money** (receipt numbers R-/RF-, refunds, cash closing per staff, portal wallets).
