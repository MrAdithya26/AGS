# Working rules for AGS

- AGS lives in 3 places with the same numbered folders: computer `D:\ABD Innovations\Adithya Group of Services` (master), this GitHub repo, and Google Drive `03 AGS – agservices.in/AGS Project (synced)`.
- After every change: update the file, raise the version if needed (old version → `99_Archive/<same folder>/`), add a `CHANGELOG.md` entry, update `VERSIONS.md`, write/update the chat summary in `11_Chat-Records/`, commit + push (tag releases like `ags-core-v1.0.1`), then copy the same files to the computer folder and Drive.
- Never commit secrets (`.env`, API keys, tokens) or personal data (customers, providers, devotees). `00_Admin-Legal`, `09_Finance` and any `private/` folder stay off GitHub.
- Never delete old versions.
- Customer-facing pages must state AGS is an independent private service, not a government service.
- Audience: Telugu-speaking customers in AP and Telangana; Telugu + English text.
- The owner is a basic-level web user: explain simply, give copy-paste-ready steps.
