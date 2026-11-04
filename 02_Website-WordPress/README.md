# 02_Website-WordPress – AGS Core plugin

The main AGS website runs on WordPress with this plugin.

| What | Where |
| --- | --- |
| Source code (current: **1.0.0**) | `ags-core/` |
| Installable zips, one per version | `releases/ags-core-<version>.zip` |
| How it works | `../01_Plans-Docs/AGS-CORE-GUIDE.md` |

**Install:** WordPress → Plugins → Add New → Upload Plugin → choose `releases/ags-core-1.0.0.zip` → Install → Activate.

**New version:** Claude edits `ags-core/`, raises the version in `ags-core.php` and `readme.txt`, builds `releases/ags-core-<new>.zip` (old zips stay), logs it in `CHANGELOG.md`, tags `ags-core-v<new>`.
