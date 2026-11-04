# 4 Nov 2026 – Three-place sync and versioning

**Asked:** everything (old and future chats, plans, documents, apps, repos) stored in 3 places – the computer project folder, Google Drive and GitHub – with every version and every change clearly recorded and easy to understand.

**Made:**
- Same numbered folders in all 3 places. Computer = master. GitHub = no private files. Drive = full copy in `03 AGS – agservices.in/AGS Project (synced)`.
- Version rules: apps `MAJOR.MINOR.PATCH`, docs `_v1.0/_v1.1`; old versions → `99_Archive/`; `CHANGELOG.md` + `VERSIONS.md`; every release zip kept in `releases/`. (GitHub version tags were tried but this session's GitHub access refused them, so versions are tracked by file names, the changelog and GitHub history.)
- Imported: AGS Core plugin 1.0.0 source + zip, WhatsApp site 1.0.0, AGS Core guide, project status, 26 planner tasks, decisions log, summaries of all earlier AGS chats.
- Go-Live Plan v1.0 → v1.1 (file locations only).

**Note:** 4 placeholder README files ("Code for this app will be added here." in `apps/*` and the old `docs/README.md` index) were replaced by new READMEs in the numbered folders. They remain in GitHub history (commit fa1fab0).

**Open:**
- Next.js + Supabase platform code is still only in Drive (hundreds of files). Needs a zip without `node_modules` and `.next`, or the folder on the computer.
- Launch date mismatch: Go-Live Plan says 31 Dec, ABCD Planner says 30 Nov – owner to confirm.
