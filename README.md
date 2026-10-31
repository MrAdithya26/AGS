# AGS – Adithya Group of Services

One platform for many services in Andhra Pradesh, starting with Srikakulam district:
online services (applications, bookings), offline home services (plumber, electrician,
mechanic) and delivery. AGS is part of **ABD Innovations**.

> AGS is an independent private service. It is **not** a government service, and every
> customer-facing page must say so.

This repo holds **everything technical for AGS**: apps, code, database, docs and updates.

## Apps

| Folder | What it is | Stage |
| --- | --- | --- |
| [`apps/whatsapp-site`](apps/whatsapp-site) | Single-page website; requests go to WhatsApp | Ready to go live |
| [`apps/ags-core-plugin`](apps/ags-core-plugin) | AGS Core WordPress plugin: service requests, tracking, provider dashboard, admin board, Telegram/email alerts | Pilot |
| [`apps/platform`](apps/platform) | Next.js + Supabase "future service hub" (20 categories, district → mandal → sachivalayam) | In development (not launched) |

## Plan

**Go-live plan (live by 31 Dec 2026): [`docs/GO-LIVE-PLAN.md`](docs/GO-LIVE-PLAN.md)**

1. **Now – pilot:** WhatsApp site as the front door + AGS Core on WordPress in Srikakulam.
2. **Later – the hub:** move to the Next.js + Supabase platform once real prices,
   verified providers, registration and policies are ready.

## Repo rules

- Every change is logged in [`CHANGELOG.md`](CHANGELOG.md).
- **Never commit** passwords, API keys, `.env` files, or customer/provider personal data
  (phone numbers, Aadhaar, addresses, filled sheets). Use `.env.example` for settings.
- Old versions are kept, not deleted.
- Docs and planning notes go in [`docs/`](docs).
