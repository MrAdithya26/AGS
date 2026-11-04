# Changelog

Every AGS change, newest first. Each entry says: what changed, the version, and the chat it came from (see `11_Chat-Records/`).

## 4 Nov 2026 – One project in 3 places, with versions

Chat: `11_Chat-Records/2026-11-04_three-place-sync-and-versioning.md`

- **New:** same numbered folder structure (`00`–`11`, `99`) on the computer, GitHub and Google Drive.
- **Moved (history kept):** `docs/` → `01_Plans-Docs/`, `apps/ags-core-plugin/` → `02_Website-WordPress/`, `apps/whatsapp-site/` → `03_WhatsApp-Site/`, `apps/platform/` → `04_Platform-Nextjs-Supabase/`.
- **New code:** AGS Core plugin **1.0.0** source (`02_Website-WordPress/ags-core/`, copied from ABD-Innovations repo `plugins/ags-core`, checked file-by-file against the Drive zip) + `releases/ags-core-1.0.0.zip`.
- **New code:** WhatsApp single-page site **1.0.0** (`03_WhatsApp-Site/index.html`, from Drive, 23 Oct). Contains only placeholder phone/email.
- **New docs:** `AGS-CORE-GUIDE.md`, `PROJECT-STATUS.md`, `PLANNER-TASKS.md` (26 tasks), `DECISIONS.md`, `VERSIONS.md`.
- **New:** `11_Chat-Records/` with a summary of every AGS chat so far (4 chats + this one).
- **Changed:** Go-Live Plan **v1.0 → v1.1** (new file locations only; steps and dates unchanged). v1.0 kept in `99_Archive/01_Plans-Docs/`.
- **Changed:** `README.md` (3 places, folders, version rules, update routine), `.gitignore` (blocks private folders), `CLAUDE.md` (sync routine).
- **Tags:** `ags-core-v1.0.0`, `whatsapp-site-v1.0.0`, `go-live-plan-v1.1`.
- **Removed:** nothing.

## 4 Nov 2026 – Local project folder created

Chat: `11_Chat-Records/2026-11-04_project-folder-setup.md`

- **New:** `D:\ABD Innovations\Adithya Group of Services` set as the master project folder, with folders `00`–`11`, `99`.

## 31 Oct 2026 – Go-live plan added

Chat: `11_Chat-Records/2026-10-31_website-implementation-plan.md`

- **New:** Go-Live Plan **v1.0** – launch 31 Dec 2026 (soft launch 14 Dec): WordPress + AGS Core as the main site, WhatsApp page as backup, Next.js hub moved to Phase 2.
- **Changed:** `README.md` and docs index link to the plan.

## 31 Oct 2026 – Repo set up

Chat: `11_Chat-Records/2026-10-31_github-repo-setup.md`

- **New:** repo structure, `README.md`, `.gitignore` (blocks secrets, `.env`, build files, personal data), `CLAUDE.md` (working rules).

## Before 31 Oct 2026 – builds made earlier (recorded here for history)

- 27 Oct 2026: AGS Core plugin **1.0.0** built (zip in Drive; source in ABD-Innovations repo).
- 23 Oct 2026: WhatsApp single-page site **1.0.0** built (Drive).
- Sep–Oct 2026: Next.js + Supabase platform built to staging (`ags-staging`, 14 migrations); release check NO-GO.
