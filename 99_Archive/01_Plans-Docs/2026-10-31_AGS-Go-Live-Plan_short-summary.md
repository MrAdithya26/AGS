# AGS Go-Live Plan – live by 31 December 2026

**Owner:** Adithya · **Written:** 31 Oct 2026 · **Launch day:** Thursday 31 Dec 2026
**Soft launch (friends and family):** Monday 14 Dec 2026

> Full copy of this plan is also in the Claude project "1. ABD - AGS" (claude/AGS-GO-LIVE-PLAN.md) and GitHub MrAdithya26/AGS → docs/GO-LIVE-PLAN.md.

## What we are launching
- **Main website:** AGS Core WordPress plugin (ags-core-1.0.0.zip) → keep in `02_Website-WordPress`
- **Backup front door:** WhatsApp single page (index.html) → keep in `03_WhatsApp-Site`
- **Phase 2 (after launch):** Next.js + Supabase platform → `04_Platform-Nextjs-Supabase`
- **Area:** Srikakulam town, Palasa, Tekkali
- **Services (8–10):** electrician, plumber, AC/fridge repair, mobile repair, two-wheeler mechanic, house cleaning, painter, carpenter, tutor, document/online application help
- **Payment:** customer pays provider (cash/UPI); AGS collects commission weekly. No payment gateway at launch.
- **Rule:** AGS is an independent private service, not a government service.

## Timeline
| Week | Dates | Goal | Folder |
| --- | --- | --- | --- |
| W1 | 2–8 Nov | Owner decision, domain, Udyam, WhatsApp Business, Telegram bot, draft price list | 00_Admin-Legal, 09_Finance |
| W2 | 9–15 Nov | WordPress install, SSL, plugins, backups, 2FA | 02_Website-WordPress |
| W3 | 16–22 Nov | AGS Core plugin + all pages, WhatsApp button, first test | 02_Website-WordPress |
| W4 | 23–29 Nov | Disclaimer (EN+TE), home text, prices, policy pages, Telugu, logo | 05_Content-Pages, 10_Assets-Brand |
| W5 | 30 Nov–6 Dec | 25+ verified providers, 50+ directory listings, rules card | 06_Providers-Directory |
| W6 | 7–13 Dec | Full phone testing, test log | 08_Testing |
| W7 | 14–20 Dec | **Soft launch** to 20–30 people, 15+ real jobs | 08_Testing |
| W8 | 21–27 Dec | Google Business, social pages, QR posters, WhatsApp catalogue | 07_Marketing |
| W9 | 28 Dec–3 Jan | **Public launch 31 Dec** + daily routine | 01_Plans-Docs |

## Launch-day checklist (31 Dec morning)
- [ ] Fresh backup (UpdraftPlus → Backup Now)
- [ ] Untick "Discourage search engines"
- [ ] Submit sitemap in Google Search Console
- [ ] Post launch message (WhatsApp status, Facebook, Instagram, local groups)
- [ ] Tell every provider "We are live today"
- [ ] Test one request on phone

## Daily routine after launch (15–30 min)
1. Morning: assign all New requests
2. Reply to WhatsApp within 30 minutes
3. Evening: check completed jobs, call 1–2 customers
4. Monday: collect commission → `09_Finance`
5. Sunday: update plugins, check Wordfence

## Never store here or in GitHub
Passwords, bot tokens, API keys → Google Password Manager only.
Aadhaar/PAN/ID copies → `00_Admin-Legal` only (private, never upload).
