# AGS – Adithya Group of Services

One platform for many services in Andhra Pradesh, starting with Srikakulam district: online services (applications, bookings), offline home services (plumber, electrician, mechanic) and delivery. AGS is part of **ABD Innovations**.

> AGS is an independent private service. It is **not** a government service, and every customer-facing page must say so.

**Launch target:** soft launch Mon 14 Dec 2026 · public launch Thu 31 Dec 2026 → see [`01_Plans-Docs/GO-LIVE-PLAN_v1.1.md`](01_Plans-Docs/GO-LIVE-PLAN_v1.1.md)

---

## Where AGS is kept: 3 places, same folders

| Place | Location | What it holds |
| --- | --- | --- |
| **Computer (master copy)** | `D:\ABD Innovations\Adithya Group of Services` | Everything, including private files |
| **GitHub** | [MrAdithya26/AGS](https://github.com/MrAdithya26/AGS) | Code, docs, plans, chat records, full version history. **No private files.** |
| **Google Drive** | `03 AGS – agservices.in` → `AGS Project (synced)` | Same as the computer copy, easy to open on the phone |

All three use the **same numbered folders**:

| Folder | What goes here | On GitHub? |
| --- | --- | --- |
| `00_Admin-Legal` | Owner, Udyam, registrations, agreements | **No** (private: computer + Drive only) |
| `01_Plans-Docs` | Go-Live Plan, guides, project status, planner tasks, decisions | Yes |
| `02_Website-WordPress` | AGS Core plugin source + release zips | Yes |
| `03_WhatsApp-Site` | Single-page WhatsApp website (`index.html`) | Yes |
| `04_Platform-Nextjs-Supabase` | Phase 2 platform (future service hub) | Yes (code only, no `.env`) |
| `05_Content-Pages` | Page text, policies, Telugu labels | Yes |
| `06_Providers-Directory` | Provider rules, onboarding script, listing templates | Templates only. Filled sheets with names/phones are **private** |
| `07_Marketing` | Posters, QR, social posts | Yes |
| `08_Testing` | Test checklists and results | Yes (no customer details) |
| `09_Finance` | Price list, commission, budget | **No** (private) |
| `10_Assets-Brand` | Logo, colours, images | Yes |
| `11_Chat-Records` | One summary file per Claude chat | Yes |
| `12_Services-Master-Sheet` | AGS Services Master – Sheet edition (current shop CRM) + releases | Yes (demo data only) |
| `13_TTD-Assistant-Extension` | AGS TTD Assistant Chrome extension + releases | Yes |
| `99_Archive` | Old versions (never deleted) | Yes |

---

## How versions work

1. **Apps get a version number** `MAJOR.MINOR.PATCH` (example `ags-core 1.0.0`).
   - PATCH (1.0.**1**) = small fix · MINOR (1.**1**.0) = new feature · MAJOR (**2**.0.0) = big change.
2. **Documents get v1.0, v1.1, v2.0** in the file name (example `GO-LIVE-PLAN_v1.1.md`).
3. **The newest version sits in its folder. Older versions move to `99_Archive/` with the same folder name.** Nothing is deleted.
4. **Every change is written in [`CHANGELOG.md`](CHANGELOG.md)**: date, what changed, version, and the chat it came from.
5. **[`VERSIONS.md`](VERSIONS.md)** shows the current version of every app and document in one table.
6. **GitHub keeps every earlier state** in its history (Commits), and release zips are kept side by side (`releases/ags-core-1.0.0.zip`, `…1.0.1.zip`), so any old version can be downloaded again.

## How every update is saved (the routine)

Each time Claude changes anything for AGS:

1. Change the file on the computer folder (master copy).
2. Raise the version if needed, move the old version to `99_Archive/`.
3. Add a line to `CHANGELOG.md` and update `VERSIONS.md`.
4. Add or update the chat summary in `11_Chat-Records/`.
5. Push to GitHub (one commit per change, message says what changed).
6. Upload the same files to Google Drive `AGS Project (synced)`.

## Never stored on GitHub

Passwords, bot tokens, API keys, `.env` files (→ Google Password Manager only) · Aadhaar, PAN, ID copies, Udyam certificate · customer or provider names, phones, addresses · prices and commission sheets. The `.gitignore` file blocks these automatically.
