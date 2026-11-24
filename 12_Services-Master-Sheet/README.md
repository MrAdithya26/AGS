# 12 · AGS Services Master – Sheet edition (v4.0)

> The main AGS CRM (decision 24 Nov 2026). The pro CRM (`04_Platform-Nextjs-Supabase/crm/`) is on hold; Sheet data can be imported into it later.

**v4.0:** 26 departments / ~230 online & CSC services (no third-party home services), business dashboard with slicers (today → year, custom range, department, staff, service line), Finance & P/L (expenses, purchases, investments, other income, receipts R-/RF-, wallets, cash closing), staff logins with passwords and 4 roles, auto-assign, My work page, Customer 360, Google Contacts sync.

CRM for **Adithya Internet & CSC Center (Adithya Group of Services)**: TTD, travel, CSC applications and counter services in one Google Sheet + dashboard. Free, runs on the shop's own Google account.

**Users:** read `docs/AGS-Services-Master-Guide.pdf`, or build the release package (below) and open `README-FIRST.txt` inside it.

## Repository layout
| Path | What |
|---|---|
| `apps-script/` | The system: `Code.gs` (server), `Index.html`, `Styles.html`, `App.html`, `appsscript.json` |
| `demo/index.html` | Offline demo (real Code.gs on a fake sheet). Rebuild: `node tools/build-demo.js` |
| `docs/` | User guide PDF and its sources (`docs/guide`), detailed setup notes, offline sheet layout |
| TTD extension | Separate product: `../13_TTD-Assistant-Extension/` |
| `tools/` | Tests, demo builder, xlsx builder, release builder |
| `releases/` | Every release zip (`AGS-Services-Master-v3.0.0.zip`) |
| `HANDOFF-FOR-CLAUDE.md` | Technical notes for continuing development |
| `CHANGELOG.md` | Version history |

## Commands
```bash
TZ=Asia/Kolkata node tools/test-server.js   # server tests (must pass)
node tools/build-demo.js                    # rebuild demo/index.html
bash tools/make-release.sh                  # build release/AGS-Services-Master-vX (+ zip)
```
