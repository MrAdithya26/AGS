#!/usr/bin/env bash
# Builds the user-facing package: release/AGS-Services-Master-v<version>/ and a zip next to it.
set -euo pipefail
cd "$(dirname "$0")/.."
V=$(grep -oE "version: '[0-9.]+'" apps-script/Code.gs | head -1 | grep -oE "[0-9.]+")
OUT="release/AGS-Services-Master-v$V"
rm -rf "$OUT" "$OUT.zip"; mkdir -p "$OUT/1-Install (paste into Google Apps Script)" "$OUT/2-Try-the-demo" "$OUT/3-Optional-TTD-Chrome-Extension"
I="$OUT/1-Install (paste into Google Apps Script)"
cp apps-script/Code.gs "$I/1-Code.gs"; cp apps-script/Index.html "$I/2-Index.html"; cp apps-script/Styles.html "$I/3-Styles.html"
cp apps-script/App.html "$I/4-App.html"; cp apps-script/appsscript.json "$I/5-appsscript.json"
cp demo/index.html "$OUT/2-Try-the-demo/AGS-Demo (open in Chrome).html"
cp ../13_TTD-Assistant-Extension/releases/*.zip "$OUT/3-Optional-TTD-Chrome-Extension/"
cp docs/AGS-Services-Master-Guide.pdf "$OUT/"
cat > "$OUT/README-FIRST.txt" <<TXT
AGS SERVICES MASTER v$V  -  Adithya Group of Services
CRM for TTD, Train/Bus/Flight, Aadhaar, PAN, Voter ID, Certificates and all CSC services.

START HERE
  1. Open  AGS-Services-Master-Guide.pdf  (key features, install steps with pictures, daily use, Telugu summary).
  2. Want to look around first?  Open  2-Try-the-demo  in Chrome. Login: Admin / 1234 (made-up data).
  3. Install (one time, ~20 min): follow guide section 3 using the 5 files in  1-Install.
     In Apps Script the files are named  Code, Index, Styles, App  (the numbers only show the order).
  4. Optional: 3-Optional-TTD-Chrome-Extension  only for PCs where you book on the TTD website.

Everything is free. Your data stays in your own Google Sheet.
TXT
cat > "$I/README.txt" <<TXT
Paste in this order (guide section 3, step B):
  1-Code.gs          -> Code.gs (replace everything)
  2-Index.html       -> + HTML, name it  Index
  3-Styles.html      -> + HTML, name it  Styles
  4-App.html         -> + HTML, name it  App
  5-appsscript.json  -> Project Settings > Show "appsscript.json", replace everything
Then Ctrl+S, run "setup", then Deploy > New deployment > Web app (Me / Anyone).
TXT
cat > "$OUT/3-Optional-TTD-Chrome-Extension/README.txt" <<TXT
Only for PCs where you book on the TTD website. Not needed for other services.
Unzip to a permanent folder, then Chrome > chrome://extensions > Developer mode > Load unpacked.
Connect it: dashboard Settings > Create API key; extension Options > Google Sheet tab. (Guide section 5.)
TXT
(cd release && zip -qr "AGS-Services-Master-v$V.zip" "AGS-Services-Master-v$V")
echo "$OUT.zip"
