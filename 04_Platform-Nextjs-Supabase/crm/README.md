# AGS Services Master – pro CRM (staff back-office)

Status: **Phase 1a – foundation built** (login, roles, layout, database, catalogue). Plan: `../../01_Plans-Docs/AGS-SERVICES-MASTER-CRM-PLAN_v1.0.md`.

| Path | What |
|---|---|
| `web/` | Next.js 15 app (TypeScript). `npm install`, copy `.env.example` → `.env.local`, `npm run dev` |
| `supabase/migrations/` | Database migrations, applied in order to the Supabase project `ags-staging` |
| `schema/0001_crm_core.draft.sql` | Original design draft (kept for history) |

Free mode: everything runs on free plans. Paid features (WhatsApp Business API auto-send, SMS, automatic calls, AI voice agent) are switches that stay off until the owner approves the cost.
