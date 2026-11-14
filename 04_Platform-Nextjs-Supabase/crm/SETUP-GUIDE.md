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

## 2. Put the CRM online free (Netlify, one time, about 15 minutes)
Netlify runs this kind of app (Next.js) without extra settings and has a free plan. (Check its current free-plan terms when you sign up.)
1. Make a free account at **app.netlify.com** › **Sign up with GitHub**.
2. **Add new site** › **Import an existing project** › **GitHub** › allow access to `MrAdithya26/AGS`.
3. Settings:
   - Branch to deploy: `main` (after merging) or `ags-crm-phase-0` for now
   - **Base directory:** `04_Platform-Nextjs-Supabase/crm/web`
   - Build command: `npm run build` · Publish directory: `.next` (Netlify usually fills these itself)
   - **Environment variables** (from Supabase › Project Settings › API):
     - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the **anon / publishable** key (never the service_role key)
4. **Deploy**. You get a link like `ags-crm.netlify.app`. Later you can point `crm.agservices.in` to it for free.
5. Supabase › Authentication › **URL Configuration** › Site URL: paste that link › Save.

> If a build fails, copy the last 20 lines of the build log (there are no keys in it) and send them to Claude.

## 3. Keep the free database awake
Supabase free projects **pause after 7 days with no use**. Opening the CRM once a week keeps it awake. If it pauses: supabase.com › project › **Restore** (free, takes a few minutes).

## 4. Daily use
- Sign in with your email and password.
- **Staff & roles**: switch on staff and choose their role (owner, manager, counter, agent, accountant, viewer).
- **First time only (owner):** Bookings page › **Load the standard Telugu / English templates**. Then **Departments & services**: set your real fees and charges. Then **Import from Sheet** if you used the Sheet edition. Settings for shop phone/address come in a later update (for now they are in the database setting `shop`).
- Staff guide: `STAFF-GUIDE.md`.

## Paid features stay off
WhatsApp Business API auto-send, SMS, automatic calls and the AI voice agent are built as switches that stay **off**. Free alternatives are used instead (WhatsApp click-to-send, phone call links). Nothing paid is switched on without your written OK.
