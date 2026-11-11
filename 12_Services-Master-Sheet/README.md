# 12 · AGS Services Master – Sheet edition (v3.0)

> Current shop tool, in daily use until the pro CRM (Next.js + Supabase, `04_Platform-Nextjs-Supabase/crm/`) is ready. Its data will be imported into the pro CRM.

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
