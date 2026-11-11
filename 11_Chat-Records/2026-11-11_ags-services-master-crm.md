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

**Next:** Pro CRM Phase 1a – app skeleton, Supabase project, login and roles.
