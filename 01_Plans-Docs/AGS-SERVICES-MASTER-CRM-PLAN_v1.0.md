# AGS Services Master – pro CRM plan v1.0

Date: 11 Nov 2026 · Status: **Phase 0 (design) done, Phase 1 not started** · Chat: `11_Chat-Records/2026-11-11_ags-services-master-crm.md`

> AGS is an independent private service, not a government service. Staff screens and every customer message must say so where relevant.

## 1. Goal

One complete software for Adithya Group of Services: every customer, every service and every rupee in one place, for many staff and later many branches, with automatic WhatsApp messages, calls and a voice agent. It grows day by day, so it is built on a real database from the start.

## 2. Products and how they fit

| Product | Folder | Role |
|---|---|---|
| **AGS Services Master – pro CRM** (new) | `04_Platform-Nextjs-Supabase/crm/` | Staff back-office: customers, jobs, accounts, messages, calls, reports |
| AGS hub (customer website / app) | `04_Platform-Nextjs-Supabase/` | Customer side; shares the same database (one master customer record) |
| AGS Services Master – Sheet edition v3.0 | `12_Services-Master-Sheet/` | Used **now** in the shop; its data is imported into the pro CRM later |
| AGS TTD Assistant (Chrome extension) v1.5.0 | `13_TTD-Assistant-Extension/` | Separate tool; in the CRM, TTD is one department that this extension helps |
| AGS Core WordPress plugin | `02_Website-WordPress/` | Public website; its enquiries become CRM leads |
| WhatsApp single-page site | `03_WhatsApp-Site/` | Backup site; enquiries become CRM leads |

## 3. Technology (decided 11 Nov 2026)

| Part | Choice | Why |
|---|---|---|
| App | Next.js (App Router, TypeScript), Tailwind + shadcn/ui, Telugu + English | Same stack as the AGS platform; fast, works on phone and PC |
| Database, logins, files | Supabase (Postgres, Auth, Row Level Security, Storage, Edge Functions, pg_cron, Realtime) | Unlimited users, real security, jobs that run on a timer, Mumbai region |
| Hosting | Cloudflare Pages (free, business use allowed) **or** Vercel Pro | Vercel's free plan does not allow business use |
| WhatsApp | Meta WhatsApp Cloud API (direct, no reseller) | Lowest cost; Telugu templates; webhooks for two-way inbox |
| SMS | A DLT-registered Indian provider (MSG91 / Fast2SMS DLT route) | Required by TRAI for business SMS |
| Calls / IVR | Exotel or Plivo (Indian numbers, click-to-call, IVR, recording) | Decided in Phase 3 |
| AI (message drafting, voice agent brain, summaries) | Claude API (`claude-haiku-5-5` for high-volume tasks, `claude-sonnet-5-5` where quality matters) | Decided in Phase 3; paid per use |

## 4. Modules

1. **Logins & roles** – unlimited staff; roles Owner, Manager, Counter staff, Agent, Accountant, Viewer; access per department and per branch; 2-step login; every action in the audit log.
2. **Customer 360 (one master record)** – one profile per person, grouped in families; mobile, WhatsApp / SMS / call consent with date; ID documents stored masked (last 4 digits) with the full number encrypted only when needed; document vault (private files); full history across all departments; tags and notes.
3. **Departments & service catalogue** – department → service → variant; govt fee, service charge, pricing unit; documents needed; usual days; its own **workflow steps** (e.g. Received → Applied → In process → Ready → Delivered); its own **form fields** (TTD devotees, travel PNR, application no …).
4. **Jobs engine** – one table for every booking, application and sale; department forms; assign to staff; due / expected dates with timers; checklist; attachments; timeline of every change.
5. **Accounts** – receipts and refunds, cash / UPI / bank, receipt numbering, daily cash closing per staff, portal wallets (IRCTC, AEPS, TTD logins) with top-ups and usage.
6. **Messaging hub** – WhatsApp two-way inbox, approved templates in Telugu and English, SMS fallback; **automation rules** ("when status becomes Ready → send *ready_to_collect*", "1 day before journey at 6 pm → send *journey_reminder*", "new website enquiry → auto-reply and assign"); auto-forward of incoming messages to the right staff; delivery / read status; cost per message.
7. **Voice** – click-to-call from the customer page; call log, recording, notes; Telugu IVR menu ("press 1 for booking status"); automatic reminder calls; later an **AI voice agent** that answers status questions and takes simple requests, always with hand-over to a person.
8. **Tasks & follow-ups** – call-back reminders, pending documents, overdue applications, refunds to give; staff work queue.
9. **Leads** – from website, WhatsApp, walk-in, phone; follow-up until converted to a job.
10. **Self-service** – customer checks status by WhatsApp ("STATUS AGS-2611-0002") or a website page with booking no + mobile OTP.
11. **Integrations** – TTD Assistant API, AGS Core website, WhatsApp site, Telegram alerts for the owner, Google Drive backups, Excel import/export; payment gateway later.
12. **Analytics** – dashboard like v3 (money by service line, work queue) plus staff performance, department funnel, customer value, message and call costs.

## 5. Data model (draft)

Full draft SQL: `04_Platform-Nextjs-Supabase/crm/schema/0001_crm_core.draft.sql` (not applied anywhere yet). Main tables:

`branches` · `staff` (+ `staff_departments`) · `families` · `customers` · `customer_ids` · `customer_files` · `departments` · `services` · `workflow_steps` · `jobs` · `job_people` · `job_events` · `job_documents` · `payments` · `cash_closings` · `portal_accounts` · `wallet_txns` · `message_templates` · `automations` · `messages` · `calls` · `tasks` · `leads` · `api_keys` · `audit_log` · `settings`

Rules: every table has `created_at`, `created_by`; Row Level Security on every table (staff see only their branch + departments; Owner sees all); job numbers per department prefix and month (`TTD-2611-0001`, `TRV-…`, `AGS-…`, `QS-…`) like v3 so staff keep the same habits.

## 6. Roadmap (one phase at a time; each ends tested and saved to GitHub, Drive and D:)

| Phase | Work | Size |
|---|---|---|
| 0 | This plan, data model draft, product folders, decisions | done |
| 1a | App skeleton in `crm/`, Supabase project, login + roles, layout (v3 design: clean navy) | ~70k tokens |
| 1b | Customer 360: families, consent, ID masking, documents | ~60k |
| 1c | Departments, services, workflows, form fields (import v3 catalogue) | ~50k |
| 1d | Jobs engine: create, steps, timeline, assignment, work queue | ~80k |
| 1e | Accounts: receipts, refunds, cash closing, wallets, receipt print | ~60k |
| 1f | Dashboard + reports; **import v3 Sheet data**; staff guide | ~60k |
| 2 | WhatsApp Cloud API: templates, automation rules, inbox, auto-forward, SMS fallback | ~150k |
| 3 | Voice: click-to-call, IVR, reminder calls → AI voice agent pilot | ~150–200k |
| 4 | Integrations: TTD Assistant API, website leads, self-service status, Telegram, backups | ~100k |
| 5 | Multi-branch, home-service providers, payment gateway, mobile app (PWA) | later |

## 7. Costs (all estimates; check current prices before buying)

| Item | Cost | When |
|---|---|---|
| Supabase | Free to start (free projects **pause after 1 week unused** – `ags-staging` is paused now). **Pro ≈ US$25 (~₹2,100) / month** when live | Phase 1f / go-live |
| Hosting | Cloudflare Pages free; or **Vercel Pro ≈ US$20 / month** | Go-live |
| Domain `crm.agservices.in` | Included with agservices.in | – |
| **WhatsApp Cloud API** | **Paid per message** by Meta (India: utility ≈ ₹0.12–0.35, marketing ≈ ₹0.8; service replies inside 24 h free). Needs Meta Business verification | Phase 2 |
| **SMS (DLT)** | DLT registration ≈ ₹5,900 one time (Jio/Vi portals; some free) + ≈ ₹0.15–0.25 per SMS | Phase 2 (optional) |
| **Calls / IVR** | **Number ≈ ₹500–1,500 / month + ≈ ₹0.5–1.5 per minute** | Phase 3 |
| **AI voice agent** | **Speech + AI cost per minute** on top of call cost | Phase 3 pilot |

Nothing paid is switched on without the owner's written OK in the chat.

## 8. Legal and data safety (must follow)

- **DPDP Act 2023**: take customer consent (with date) for WhatsApp, SMS and calls; collect only what each service needs; let customers ask for deletion; record breaches.
- **Aadhaar**: store only the last 4 digits for display; store the full number encrypted only when a service needs it; never print it; delete document copies after the work is done unless the customer agrees to keep them.
- **TRAI (TCCCPR)**: business SMS and automatic calls need DLT registration, approved templates and consent; no promotional calls to DND numbers.
- **IRCTC**: train tickets only on the authorised agent ID. The CRM records bookings; it never logs in to or fills IRCTC, bus, airline or government sites.
- No secrets or customer data in GitHub (`.env`, keys, exports). Backups go to private storage.

## 9. Open decisions (owner)

1. Database: **restore `ags-staging`** and use it as the single AGS database for hub + CRM (recommended, "one master customer"), or create a separate `ags-crm` project.
2. Hosting: Cloudflare Pages (free) or Vercel Pro (paid).
3. WhatsApp: Meta Cloud API direct (cheaper, more setup) or a reseller such as Interakt / WATI (easier, ≈ ₹2,000–3,500 / month extra).
4. Branch plan: only Srikakulam centre now, or several centres soon (affects Phase 1a roles).
