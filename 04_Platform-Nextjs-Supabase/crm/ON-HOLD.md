# Pro CRM (Next.js + Supabase) – ON HOLD since 24 Nov 2026

Decision (owner, 24 Nov 2026): too many parts at once. Focus first on **one complete CRM in Google Sheets + Apps Script** (`12_Services-Master-Sheet/`, version 4). This pro CRM comes back later as the "advanced setup".

## Where it stopped
- Version **0.6.1** – Phase 1 complete (login & roles, Customer 360, departments / services / workflows / form fields, jobs engine, receipts, cash closing, wallets, dashboard, reports, Sheet import). Was live on Netlify; owner signed in and made test bookings.
- Database: Supabase project **ags-staging** (Mumbai), schema `crm`, migrations `supabase/migrations/0001–0010` applied.
- AGS TTD Assistant **2.0.0** can talk to this CRM (and to the Sheet edition).

## To restart later
1. Supabase free projects **pause after 7 days unused** – data is kept; open supabase.com › ags-staging › **Restore** (free). Paused projects should be restored within ~90 days.
2. Netlify project can stay; it rebuilds from GitHub `main`.
3. Read `../../01_Plans-Docs/AGS-SERVICES-MASTER-CRM-PLAN_v1.0.md`, `SETUP-GUIDE.md`, `STAFF-GUIDE.md`, then continue with Phase 2 (WhatsApp automation).
