# AGS Services Master (pro CRM) – setup guide (free plan)

Everything below is **free**. Nothing asks for a card.

## What you already have
- Database: Supabase project **ags-staging** (Mumbai). The CRM tables (own `crm` section), security rules, 19 departments and 75 services are already in it.
- Code: GitHub `MrAdithya26/AGS` › `04_Platform-Nextjs-Supabase/crm/web`.

## 0. Switch on the CRM section of the database (one time, 1 minute)
1. Open **supabase.com** › sign in › project **ags-staging**.
2. Left menu **Project Settings** (gear) › **Data API** (or **API**).
3. Under **Exposed schemas**, add **`crm`** next to `public` › **Save**.

## 1. Create your owner login (one time, 2 minutes)
1. Open **supabase.com** › sign in › project **ags-staging**.
2. Left menu **Authentication** › **Users** › **Add user** › **Create new user**.
3. Enter your email and a strong password › tick **Auto Confirm User** › **Create user**.
4. The first login created becomes the **owner** automatically. Everyone you add later starts switched off until you turn them on in the CRM (Staff & roles).

## 2. Put the CRM online free (Cloudflare Pages, one time, about 15 minutes)
1. Make a free account at **dash.cloudflare.com** (email only).
2. **Workers & Pages** › **Create** › **Pages** › **Connect to Git** › choose GitHub › allow the `MrAdithya26/AGS` repo.
3. Settings:
   - Production branch: `main`
   - Framework preset: **Next.js**
   - Root directory: `04_Platform-Nextjs-Supabase/crm/web`
   - Environment variables (from Supabase › Project Settings › API):
     - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the **anon / publishable** key (never the service_role key)
4. **Save and Deploy**. You get a link like `ags-crm.pages.dev`. Later you can point `crm.agservices.in` to it for free.

> Cloudflare's free Next.js support changes from time to time. If the deploy fails, send me the error text from the build log (no keys in it) and I'll fix the settings.

## 3. Keep the free database awake
Supabase free projects **pause after 7 days with no use**. Opening the CRM once a week keeps it awake. If it pauses: supabase.com › project › **Restore** (free, takes a few minutes).

## 4. Daily use
- Sign in with your email and password.
- **Staff & roles**: switch on staff and choose their role (owner, manager, counter, agent, accountant, viewer).
- **Departments & services**: all 19 departments and 75 starter services from the Sheet edition. Editing fees arrives in Phase 1c.

## Paid features stay off
WhatsApp Business API auto-send, SMS, automatic calls and the AI voice agent are built as switches that stay **off**. Free alternatives are used instead (WhatsApp click-to-send, phone call links). Nothing paid is switched on without your written OK.
