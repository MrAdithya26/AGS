# AGS Go-Live Plan – live by 31 December 2026

**Owner:** Adithya · **Written:** 31 Oct 2026 · **Launch day:** Thursday 31 Dec 2026
**Soft launch (friends and family):** Monday 14 Dec 2026

This is a step-by-step guide. Do one week at a time. Tick each box (☐ → ☑) when done.
If a step fails, stop and ask Claude with the step number (example: "W3 step 5 failed").

---

## 0. What we are launching (decided from earlier chats)

AGS already has three builds (all in the Drive "AGS" folder):

| Build | What it is | Use for 31 Dec? |
| --- | --- | --- |
| WhatsApp single page (`index.html`, 23 Oct) | Static page, every request goes to WhatsApp | **Yes** – as the backup front door and for ads/QR codes |
| **AGS Core WordPress plugin** (`ags-core-1.0.0.zip`, 27 Oct) | Request form, tracking, provider sign-up and dashboard, admin board, commission, directory, Telegram/email alerts | **Yes – this is the main website** |
| Next.js + Supabase platform | The big "future service hub" (20 categories, mandal → sachivalayam) | **No.** Its own release check says NO-GO (no login, payments, Telugu, deployment). It is Phase 2, after launch. |

**Why WordPress:** you already run Adithya Info Hub on WordPress, the plugin is finished, and it can be live in weeks. The Next.js hub needs months plus real prices and verified providers, which the pilot will give you.

**Launch scope (keep it small):**
- **Area:** Srikakulam district – start with Srikakulam town, Palasa and Tekkali.
- **Services at launch (pick 8–10):** electrician, plumber, AC/fridge repair, mobile repair, two-wheeler mechanic, house cleaning, painter, carpenter, tutor, document/online application help.
- **Payment:** customer pays the provider in cash/UPI after the job. AGS collects its commission from the provider weekly. **No payment gateway at launch** (a gateway needs a registered business and KYC – Phase 2).

**Rule on every page:** AGS is an independent private service, not a government service.

---

## Timeline at a glance

| Week | Dates | Goal |
| --- | --- | --- |
| W1 | 2–8 Nov | Decisions, domain, accounts |
| W2 | 9–15 Nov | WordPress installed, secure, backed up |
| W3 | 16–22 Nov | AGS Core plugin + all pages working |
| W4 | 23–29 Nov | Content: services, prices, policy pages, Telugu |
| W5 | 30 Nov–6 Dec | Providers: recruit and verify 25+, directory 50+ |
| W6 | 7–13 Dec | Full testing |
| W7 | 14–20 Dec | **Soft launch** to 20–30 known people |
| W8 | 21–27 Dec | Fixes + marketing ready |
| W9 | 28 Dec–3 Jan | **Public launch 31 Dec** + daily routine |

Time needed from you: about **1–1.5 hours on weekdays, 3–4 hours on Sat/Sun**.

---

## W1 (2–8 Nov) – Decisions, domain and accounts

☐ **1. Check your service rules (do this first).** You work in district election administration. Before running a business publicly, confirm with your office/HR whether your service conduct rules allow it, or whether it must be fully in another family member's name. Decide the owner name now – it goes on the domain, Udyam, bank, WhatsApp Business and policy pages, and changing it later is painful.

☐ **2. Domain.** The TTD roadmap mentions `agservices.in`. Check if you already own it (look in your domain account / email for "domain registration"). If not:
   - Search it at your hosting company's domain page. Buy it for 1 year (a `.in` usually costs a few hundred rupees in year one; check the renewal price too).
   - If taken, choose one: `agsservices.in`, `adithyagroupservices.in`, `ags-srikakulam.in`.
   - ☐ Turn ON domain privacy (WHOIS protection) and auto-renew.

☐ **3. Hosting.** Use the same hosting account as adithyainfohub.com if your plan allows more than one website ("add website" / "addon domain"). If your plan allows only one site, upgrade to the next plan. Do **not** install AGS inside the AIH WordPress – keep them separate.

☐ **4. Udyam registration (free).** Go to `udyamregistration.gov.in` → "For New Entrepreneurs". You need the owner's Aadhaar (linked mobile) and PAN. Activity: Services. Save the PDF certificate in Drive → AGS → `Legal/`.
   > Never upload the certificate, Aadhaar or PAN to GitHub.

☐ **5. Business accounts (all free).** Create with one new Gmail, e.g. `ags.srikakulam@gmail.com`:
   - WhatsApp Business app on a **separate** SIM (not your personal number).
   - Telegram account + a bot for alerts: open Telegram → search **@BotFather** → send `/newbot` → name it `AGS Alerts` → copy the token into a private note (not GitHub).
   - Google Business Profile (set up in W8, after the site is live).

☐ **6. Write your price list (draft).** Make a Google Sheet "AGS Price List" in Drive → AGS with columns:
   `Service | Visit charge (₹) | Typical job price range (₹) | AGS commission % | Notes`
   Ask 2–3 local workers per service what they charge. You will fill exact numbers in W4.

**Done when:** owner decided, domain bought, Udyam applied, WhatsApp Business + Telegram bot ready.

---

## W2 (9–15 Nov) – WordPress installed, secure and backed up

☐ **1. Point the domain to hosting.** If the domain and hosting are with the same company, it's automatic. If not, change the domain's nameservers to the ones in your hosting dashboard. Wait up to 24 hours.

☐ **2. Install WordPress** using the hosting's one-click installer.
   - Site title: `AGS – Adithya Group of Services`
   - Admin username: **not** `admin`. Use something like `ags_owner_26`.
   - Admin email: the AGS Gmail.
   - Use a long password and save it in Google Password Manager.

☐ **3. Turn on free SSL** (Let's Encrypt) in hosting. Open `https://yourdomain` – the lock icon must show.

☐ **4. WordPress basic settings** (Dashboard → Settings):
   - General → Timezone: **Kolkata**. Date format: `d/m/Y`.
   - Permalinks → **Post name** → Save.
   - Reading → tick "Discourage search engines" **for now** (untick on launch day, W9).
   - Discussion → untick "Allow people to submit comments".

☐ **5. Install only these plugins** (Plugins → Add New):

| Plugin | Why |
| --- | --- |
| A lightweight theme: **Astra** or **GeneratePress** (Appearance → Themes) | Fast on mobile |
| **WP Mail SMTP** | So request emails actually arrive (connect with the AGS Gmail) |
| **UpdraftPlus** | Daily backup to Google Drive |
| **Wordfence Security** (free) | Firewall + login protection |
| **LiteSpeed Cache** (if your host uses LiteSpeed) or **WP Super Cache** | Speed |
| **Rank Math** or **Yoast SEO** | Google listing basics |

   Don't add page builders or extra plugins. Fewer plugins = fewer problems.

☐ **6. Backups.** UpdraftPlus → Settings → Files: weekly, Database: **daily**, keep 14 → Remote storage: Google Drive → connect the AGS Gmail → Save. Click "Backup Now" once and check a folder appeared in Drive.

☐ **7. Security quick wins.** Hosting file manager → open `wp-config.php` → just **above** the line `/* That's all, stop editing! */` paste:
```php
define( 'DISALLOW_FILE_EDIT', true );
define( 'WP_AUTO_UPDATE_CORE', 'minor' );
```
   Save. Then Wordfence → Login Security → turn on 2-factor for your admin user.

**Done when:** `https://yourdomain` opens with the lock, backup exists in Drive, 2FA on.

---

## W3 (16–22 Nov) – AGS Core plugin and pages

☐ **1. Install the plugin.** Download `ags-core-1.0.0.zip` from Drive → AGS. WordPress → Plugins → Add New → Upload Plugin → choose the zip → Install → Activate. An **AGS** menu appears on the left.

☐ **2. AGS → Settings.** Fill:
   - Commission % (from your price sheet; start with one simple number, e.g. 10%).
   - Team alert email: the AGS Gmail.
   - Telegram bot token + your chat ID (to get the chat ID: send any message to your bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the number after `"chat":{"id":`).
   - Lead API key: click generate (keep it private).

☐ **3. Create these pages** (Pages → Add New → add a "Shortcode" block → paste → Publish):

| Page title | Slug | Paste this |
| --- | --- | --- |
| Home | `home` | `[ags_service_grid]` (plus the welcome text from W4) |
| Request a Service | `request` | `[ags_request_form]` |
| Track Your Request | `track` | `[ags_track_request]` |
| My Requests | `my-requests` | `[ags_customer_dashboard]` |
| Srikakulam Directory | `directory` | `[ags_directory]` |
| Join as a Provider | `join` | `[ags_provider_signup]` |
| Provider Dashboard | `provider` | `[ags_provider_dashboard]` |
| About AGS | `about` | text (W4) |
| Contact | `contact` | text (W4) |
| Privacy Policy / Terms / Refund Policy / Disclaimer | `privacy`, `terms`, `refund`, `disclaimer` | text (W4) |

☐ **4. Settings → Reading → "Your homepage displays" → A static page → Home.**

☐ **5. Menu** (Appearance → Menus): Home · Request a Service · Track · Directory · Join as Provider · Contact. Footer menu: About · Privacy · Terms · Refund · Disclaimer.

☐ **6. Pre-select links** for each service button / WhatsApp message / poster QR:
```
https://yourdomain/request/?service=electrician&mandal=palasa
```

☐ **7. WhatsApp button on every page.** Appearance → Widgets (or theme footer) → Custom HTML → paste (replace the number):
```html
<a href="https://wa.me/91XXXXXXXXXX?text=Hello%20AGS%2C%20I%20need%20a%20service"
   style="position:fixed;right:16px;bottom:16px;background:#25D366;color:#fff;padding:12px 16px;border-radius:30px;font-weight:600;text-decoration:none;z-index:999">
  WhatsApp us
</a>
```

☐ **8. Test once yourself:** submit a request → you get an email + Telegram alert → it shows in AGS → Requests board.

☐ **9. Send the plugin zip and the WhatsApp `index.html` to Claude** (attach in chat) so they go into GitHub `apps/ags-core-plugin/` and `apps/whatsapp-site/`, and any small changes (Telugu labels, disclaimer on forms) are made there first.

**Done when:** every page in the table opens and one test request reaches Email + Telegram.

---

## W4 (23–29 Nov) – Content, prices, policies, Telugu

☐ **1. Disclaimer – paste at the top of Request, Directory and Join pages, and in the footer:**
> **English:** AGS (Adithya Group of Services) is an independent private service. It is **not** a government office or government service. Government fees, if any, are paid only on the official government portal and are shown separately from AGS service charges.
>
> **తెలుగు:** AGS (ఆదిత్య గ్రూప్ ఆఫ్ సర్వీసెస్) ఒక స్వతంత్ర ప్రైవేట్ సేవా సంస్థ. ఇది ప్రభుత్వ కార్యాలయం లేదా ప్రభుత్వ సేవ **కాదు**. ప్రభుత్వ ఫీజులు ఏమైనా ఉంటే అవి అధికారిక ప్రభుత్వ పోర్టల్‌లో మాత్రమే చెల్లించాలి; AGS సేవా ఛార్జీలు వేరుగా చూపబడతాయి.

☐ **2. Home page text** (above the service grid):
> **Any service in Srikakulam – one call, one WhatsApp.**
> Electricians, plumbers, repairs, cleaning, tutors and online application help, from verified local providers. Book in 1 minute, track with your reference number.
> **శ్రీకాకుళంలో ఏ సేవ అయినా – ఒక్క కాల్, ఒక్క వాట్సాప్.**

☐ **3. Price list final.** Finish the Google Sheet. On the site, show **visit charge + "price confirmed before work starts"**. Never promise exact job prices you can't control.

☐ **4. Policy pages.** Ask Claude: "write AGS privacy, terms, refund and disclaimer pages" – they will cover the **DPDP Act 2023** (what data you collect: name, phone, address; why; how long; how to delete), provider responsibility for work, cancellation and refund rules, and the not-government disclaimer. Put the owner name and Udyam number (when you have it) on Terms and Contact.

☐ **5. Contact page:** WhatsApp number, AGS email, service hours (e.g. 8 AM–8 PM), area served. Do not put your home address.

☐ **6. Telugu.** Keep headings bilingual (English + Telugu). Ask Claude to add Telugu labels to the plugin forms (change made in GitHub, then you upload the new zip).

☐ **7. Logo + colours.** Use the existing AGS style from the Phase 1 page. Set site icon: Appearance → Customize → Site Identity.

**Done when:** all pages have real text, disclaimer visible, policies published.

---

## W5 (30 Nov–6 Dec) – Providers and directory

The website is useless without providers. This week is mostly offline work.

☐ **1. Recruit at least 25 providers** (2–3 per launch service, across Srikakulam, Palasa, Tekkali). Sources: people you already trust, hardware/electrical shops (ask whom they recommend), local WhatsApp groups.

☐ **2. Onboarding script (say this):** "AGS sends you customers near you. You do the work and take payment directly. You pay AGS __% commission weekly. You get jobs on your phone and can accept or decline."

☐ **3. They sign up** at `yourdomain/join` (help them on their phone). Then in WordPress → AGS → **Providers**: open each → check ID and phone (call them) → **Verified = Yes** → "Verified by" = your name → Publish.
   > Keep ID copies **only** in a private Drive folder, never in GitHub or on the website.

☐ **4. Directory: add 50+ listings** (AGS → Listings): hospitals, medical shops, supermarkets, mobile shops, petrol bunks, banks/ATMs in the 3 towns. **Only verified data** (visit or call to confirm). Use the same mandal names everywhere.

☐ **5. Provider rules card** (one page, WhatsApp it to every provider): reach on time, show AGS reference number, price confirmed before work, no extra charges, respectful behaviour, commission day = Monday.

**Done when:** 25+ verified providers, 50+ listings, every launch service has at least 2 providers.

---

## W6 (7–13 Dec) – Full testing

Do every test on a **phone** (most customers will use phones). Write failures in a Google Sheet "AGS Test Log".

☐ **Customer:** request without login → reference number shown → track with reference + phone → status timeline correct.
☐ **Pre-select link** `?service=…&mandal=…` fills the form.
☐ **Provider:** gets email on assignment → accepts → customer phone/address appear only after accepting → On the way → Started → Completed.
☐ **Decline** → request goes back to New.
☐ **Admin:** assign, change status, enter job amount → commission calculated correctly.
☐ **Alerts:** Email + Telegram arrive for new request, provider application, completion, cancellation.
☐ **Spam:** submit the form 6 times fast → the 6th is blocked.
☐ **Speed:** test the homepage at `pagespeed.web.dev` → aim for mobile score 70+.
☐ **Backup restore:** in UpdraftPlus, confirm the latest backup exists in Drive.
☐ **Security:** log out, try `yourdomain/wp-admin` → login page with 2FA.
☐ **Links:** every menu and footer link opens; no "page not found".

**Done when:** everything passes or the failure has been fixed by Claude and retested.

---

## W7 (14–20 Dec) – Soft launch (Monday 14 Dec)

☐ **1.** Share the site with 20–30 people you know (family, friends, colleagues' families). Ask each to book **one real small job**.
☐ **2.** Handle every request within **30 minutes** during service hours.
☐ **3.** After each job, call the customer: "Was the provider on time? Price as told? Rate 1–5." Note it in the Test Log.
☐ **4.** Fix the top 5 problems with Claude (all code changes go to GitHub first, then you upload the new plugin zip).
☐ **5.** Remove any provider with a complaint until checked.

**Done when:** 15+ real jobs completed, no open serious complaint.

---

## W8 (21–27 Dec) – Fixes and marketing

☐ **Google Business Profile:** `business.google.com` → "AGS – Home Services Srikakulam" → service-area business (no home address shown) → add website + WhatsApp → verify.
☐ **Social pages:** Facebook page + Instagram `@ags.srikakulam` (or similar). Ask Claude for the launch posts (the social-distribution skill can write them).
☐ **WhatsApp Business:** catalogue with your launch services, greeting message, away message, quick replies.
☐ **Printed QR posters/pamphlets** (A5): QR to `yourdomain/request` + WhatsApp number + disclaimer line. Put at hardware shops and apartments in the 3 towns.
☐ **Adithya Info Hub cross-promotion:** a small "Need a local service? Try AGS" banner on AIH (only if it fits AIH's rules; keep AIH and AGS clearly separate).
☐ **Search engines:** Settings → Reading → **untick** "Discourage search engines" on **31 Dec morning**, not before.

---

## W9 (28 Dec–3 Jan) – Public launch on Thursday 31 Dec

**Launch-day checklist (31 Dec, morning):**
☐ Fresh backup (UpdraftPlus → Backup Now).
☐ Untick "Discourage search engines".
☐ SEO plugin → submit sitemap in Google Search Console (`search.google.com/search-console`).
☐ Post the launch message on WhatsApp status, Facebook, Instagram, local groups.
☐ Tell every provider: "We are live today."
☐ Test one request on your phone after posting.

**Daily routine after launch (15–30 min):**
1. Morning: AGS → Dashboard → assign all New requests.
2. Reply to WhatsApp within 30 minutes during hours.
3. Evening: check completed jobs, call 1–2 customers for feedback.
4. Monday: collect commission, mark it in the "AGS Commission" sheet.
5. Sunday: update plugins (after the automatic backup), check Wordfence alerts.

---

## Budget (approximate, first year)

| Item | Cost |
| --- | --- |
| Domain (.in) | low hundreds of rupees year one – check renewal price |
| Hosting | ₹0 extra if your current plan allows another site; otherwise the next plan's difference |
| Udyam, WhatsApp Business, Telegram, Google Business, plugins (free versions) | ₹0 |
| Posters/pamphlets (500 A5) | about ₹1,000–2,000 locally |
| Separate SIM | recharge cost |

Check current prices before paying; these are estimates, not quotes.

---

## Risks and how to avoid them

| Risk | What to do |
| --- | --- |
| Not enough providers | W5 is non-negotiable; launch fewer services rather than empty ones |
| People think AGS is a government office | Disclaimer on every form + footer; never use government logos or "sachivalayam" branding |
| Personal data leak | Customer phone/address shown only after provider accepts (plugin does this); no data in GitHub; IDs only in private Drive |
| Bad provider behaviour | Rules card, call-back after every job, remove on first serious complaint |
| Site down / hacked | Daily backups, Wordfence, 2FA, few plugins |
| Your day job gets busy (SIR work) | Keep scope small; a family member can handle WhatsApp replies with the quick-reply templates |

---

## After launch – Phase 2 (Jan 2027 onwards, not part of this plan)

- Online payments (Razorpay/UPI gateway) once business registration and bank account are ready.
- Move to the Next.js + Supabase "future service hub" when real prices, 100+ verified providers and policies are in place.
- More mandals, then other districts.
- TTD booking help as an AGS service (see `ABD-Innovations` repo `apps/ttd-assistant/ROADMAP.md`).

---

## Where everything is kept

| What | Where |
| --- | --- |
| This plan + all code + changelog | GitHub `MrAdithya26/AGS` → `docs/GO-LIVE-PLAN.md` |
| Same plan (easy to read on phone) | Google Drive → AGS folder → "AGS Go-Live Plan" |
| Passwords, bot tokens, API keys | Google Password Manager / private note – **never** GitHub |
| ID copies, Udyam certificate, price sheets, test log | Google Drive → AGS (private) |
