# AGS Services Master — setup guide

**Adithya Internet & CSC Center · Adithya Group of Services**

This is one system for the whole centre: **TTD** (darshan, seva, lucky dip, rooms, SRIVANI), **travel** (train, bus, flight), **applications** (Aadhaar, PAN, voter ID, certificates, passport, RTO, schemes, tax…) and **counter work** (bill payments, recharge, AEPS, xerox):

| Part | What it does |
|---|---|
| **Google Sheet** (in your Google Drive) | The master register. Tabs: Bookings, Customers, Services, Releases, TTD Logins, Messages, Users, Settings, Activity Log |
| **Dashboard web app** | Opens in any browser, phone or PC. Shows KPIs, income by department, a TTD Release Day board, customers, refunds, reports, receipts, and Telugu/English WhatsApp / SMS messages |
| **Chrome extension v1.5** (TTD only) | Fills TTD forms (as before). Now it can also pick a pending booking from the sheet, tick its devotees, and save the result (Booked / Not booked, ticket no, date) to the sheet with one click |

Everything is free: it runs on your own Google account.

---

## 1. Create the Google Sheet + script (10 minutes, one time)

1. Open <https://sheets.new> (signed in with the shop's Google account). Name it **AGS Services Master**.
2. Menu **Extensions › Apps Script**. A code editor opens.
3. In the editor:
   - Click `Code.gs`, delete everything, paste the contents of `apps-script/Code.gs`.
   - Click **＋ › HTML**, name it `Index` → paste `apps-script/Index.html`.
   - **＋ › HTML** `Styles` → paste `apps-script/Styles.html`.
   - **＋ › HTML** `App` → paste `apps-script/App.html`.
   - (Optional) ⚙ Project Settings › tick "Show appsscript.json", then paste `apps-script/appsscript.json`.
   - Press **Ctrl+S**.
4. In the toolbar pick the function **`setup`** and click **▶ Run**. Google asks for permission → choose your account → *Advanced › Go to project (unsafe)* → **Allow**. (Google calls it "unsafe" only because you wrote the script yourself.)
5. Go back to the sheet: all tabs are created with headers, dropdowns, colours, 19 services, the month's release dates and 13 message templates (Telugu + English).

## 2. Publish the dashboard

1. In Apps Script: **Deploy › New deployment** → type **Web app**.
2. *Execute as*: **Me** · *Who has access*: **Anyone** → **Deploy**.
3. Copy the **Web app URL** (ends in `/exec`). Bookmark it on the shop PC and your phone. That is your dashboard.
4. Log in with **Admin / 1234**, then **Settings › My PIN** and change it right away.
5. **Settings › Shop details**: add your phone number (printed at the end of every message).
6. **Settings › Users**: add a staff login (own PIN) for each counter person.

> "Anyone" means anyone with the link sees the **login page**. Nothing loads without a name + PIN, and the extension needs the API key.
> After you change the code later: **Deploy › Manage deployments › ✎ › Version: New version › Deploy** (the URL stays the same).

## 3. Connect the Chrome extension (v1.5)

1. Replace the old extension folder with the new `adithya-ttd-assistant` folder (from `chrome-extension-TTD-only-v1.5.0.zip`), then click ↻ on the card in `chrome://extensions`. Your profiles and photos are kept.
2. Dashboard: **Settings › Chrome extension link › Create API key**.
3. Extension: **Options › Google Sheet** tab → paste the **Web app URL** and **API key**, type your name → **Save & test**. You should see "✓ Connected".
4. **Pull devotees with pending bookings**: this imports the sheet's customers into extension profiles (same preview as the Excel import).

## 4. Daily workflow

1. **Customer comes in** → Dashboard **＋ New Booking** → search the family (or ＋ New devotee) → tick devotees → choose service → the price, service charge and next release date fill in → enter the amount received → **Create**. The *request received* message opens in Telugu: **Send on WhatsApp**.
2. **Release day** → open **⚡ Release Day Board** (countdown at the top). In the extension popup choose the booking → **Select this booking's devotees for autofill** → book on TTD as usual (Autofill, CAPTCHA and payment by you).
3. **After booking** → in the popup click **🔍 Read details from this page** (picks up the ticket no, date, slot and amount where it can; check them) → **✅ Booked** or **❌ Not booked**. The sheet updates and the Telugu message appears → **Send on WhatsApp**.
   You can do the same from the dashboard: open the booking → ✅ Booked / ❌ Not booked.
4. **Not booked** → choose *Refund pending*, *Refunded now* or *Keep for next release*. The matching Telugu message is chosen for you. **Dashboard › Needs attention** lists refunds still to give, messages not yet sent, "TTD debited, no ticket" cases, and darshans in the next 2 days (send the reminder).
5. **Every day / month end** → **Dashboard › 🏢 By department** shows today's takings and income per department. **Reports**: by department, **daily income** (with quick sales), by service, by TTD login, by staff, refund register, Excel export.

Each month, update the TTD release dates in **Release Calendar** (button: *Add usual dates*, then correct them from the TTD announcement).

## 5. Message templates

**Message Templates** page: edit any message in Telugu or English, click a `{field}` to insert it, and check the live preview. `*text*` shows as **bold** on WhatsApp.

| Status | Template used |
|---|---|
| Requested / Attempting | Request received |
| Booked | Booked successfully (darshan/seva) or (accommodation) |
| Not booked | Refund will be given / Refund already given / Amount kept for next try (depends on the refund status) |
| Lucky dip | Registered / Selected (pay now) / Not selected |
| Payment failed | Amount debited but ticket not generated |
| Refund done, Reminder, Cancelled | their own templates |

## 6. SMS for customers without WhatsApp

Every booking has **Send messages by**: WhatsApp, SMS, or WhatsApp + SMS. The dashboard suggests it from the customer's last booking. In a booking's message box, switch between **🟢 WhatsApp** and **📱 SMS**. The SMS tab uses a short version of each message and shows how many SMS it will cost (Telugu: 70 characters per SMS, English: 160).

You can send an SMS in two ways:

| Way | Cost | What you need |
|---|---|---|
| **📱 Phone SMS app** | Your phone plan | Open the dashboard on a mobile phone. The message opens in the SMS app; you press send. No setup. |
| **📤 Send SMS** (from the dashboard or the extension, plus **Bulk SMS**) | Depends on the gateway | Pick a gateway in **Settings › SMS** (Admin), then click **Send test SMS** |

Gateways you can choose in Settings › SMS:
- **Android SMS Gateway (sms-gate.app)**: free. Install "SMS Gateway for Android" on a spare Android phone with a SIM that has an SMS pack. Turn on *Cloud server* in the app, then copy its username and password into Settings. SMS go out from that SIM as normal personal messages.
- **Fast2SMS**: paid per SMS. The "Quick SMS" route needs no DLT registration and supports Telugu. Paste the API key from fast2sms.com › Dev API.
- **Custom HTTP API**: any provider with an HTTP link (MSG91, Textlocal, BulkSMS…). Use `{mobile}`, `{mobile91}`, `{message}`, `{apiKey}` in the URL or body. Most of these routes need DLT-approved templates, so check with your provider.

**Bulk SMS** (Bookings page): sends one SMS to every booking in the current list, for example the "Darshan in next 2 days" reminders, or the **📱 SMS customers** filter. Up to 100 at a time.

Edit the short SMS texts under **Message Templates › 📱 SMS (short)**.

> **Updating from the first version:** paste the new `Code.gs` and `App.html`. Then run `setup` once from the editor. Google asks again for permission, now including "connect to an external service", which is needed for SMS gateways. Finally, **Deploy › Manage deployments › ✎ › New version**. The new sheet columns and SMS texts are added automatically and your data stays.

### Automatic reminder SMS (new in 1.2)

**Settings › ⏰ Automatic reminder SMS** (Admin):

1. **Send automatically to**: *Off* (default), *SMS customers only* (bookings set to SMS or WhatsApp + SMS), or *All customers*.
2. **Time**: when the reminders go out each day, India time (default 6:00 PM). Google runs it within about 15 minutes of that hour.
3. **How early**: 1, 2 or 3 days before the darshan / seva date (for rooms: the check-in date).
4. **💾 Save**. **👀 Who gets it next** lists the bookings that are due now and has a **📤 Send now** button.

The reminder goes only to **Booked** bookings, and only once per booking. The date is stored in the new Bookings column **Reminder SMS Sent On**. The text is the *Reminder* SMS under Message Templates, in the default language. If an SMS fails, it is tried again on the next day's run while the date is still ahead; the result of every run is written to the Activity Log. Bookings that got the reminder drop off *Needs attention › Darshan in next 2 days*.

> **Updating to 1.2:** paste the new `Code.gs` and `App.html`, run `setup` once from the editor and **Allow** the new permission ("allow this application to run when you are not present", needed for the daily timer), then **Deploy › Manage deployments › New version**. Then switch reminders on in Settings.
> Each reminder is one SMS through your gateway. On Fast2SMS that is a **paid SMS**; on the Android SMS Gateway it uses your SIM's SMS pack.

### Receipt (new in 1.3)

Open any booking → **🧾 Receipt**. It shows a Telugu + English receipt with the shop name, booking no. (used as the receipt no.), customer, service, devotees, darshan date and slot, TTD ticket no., the money (ticket amount, service charge, total, received, any balance due or refund), the amount in words and your receipt note. ID / Aadhaar numbers are **never** printed.

1. Choose the paper: **A4**, **A5** (half page) or **80mm thermal**.
2. **🖨 Print / Save as PDF** → pick your printer, or choose **Save as PDF** to send the file on WhatsApp. On a phone: Share › Print › Save as PDF.

Every print is written to the Activity Log. The receipt note (Telugu and English) and the default paper size are in **Settings › Shop details**. Staff can print receipts too.

> **Updating to 1.3:** paste the new `Code.gs`, `App.html` **and `Styles.html`**, run `setup` once, then **Deploy › Manage deployments › New version**.

## Departments and quick sale (new in 2.0)

One system now handles **TTD, travel (train, bus, flight) and CSC services** (Aadhaar, PAN, voter ID, certificates, ration and pension, schemes, passport, RTO, tax, insurance, exams, bill payments, banking, counter work).

- **＋ New Booking** → choose the **Department** first. The form changes: TTD shows devotees, release date and TTD login; other departments show the customer, the service and the **govt / portal fee**. Booking numbers: `TTD-…` for TTD, `TRV-…` for travel, `AGS-…` for applications, `QS-…` for quick sales.
- **⚡ Quick sale** (top bar): bill payment, recharge, xerox, AEPS and so on in one line: service, quantity, amount, payment mode. Tick *Print receipt* if the customer wants one. Quick sales count in income but never show as "not messaged".
- For non-TTD work the booking has a **✅ Completed** button. The Telugu/English message switches to "work received" or "work completed" by itself.
- **Services & Prices**: about 55 starter services are added, grouped by department, all with fee ₹0 and a sample service charge. **Set your real fee and charge for each one** (filter by department at the top).
- **Settings › Shop details**: a second receipt note for non-TTD services, and your **IRCTC agent ID** (printed on train receipts).
- The Chrome extension still works only with TTD bookings.

### Travel: train, bus, flight (new in 2.1)

1. **＋ New Booking** → Department **Train**, **Bus** or **Flight** → pick the family; the **passenger details** (name, gender, age) fill in by themselves. Add the berth wish if needed (e.g. `Sita, F, 30, LB`).
2. Fill **From**, **To**, class, quota (train) and the wanted journey date. The customer gets the "request received" message with the route.
3. After booking on the official site, open the booking → **✅ Booked** → enter **PNR**, journey date, departure time, train/bus/flight no., coach/seat and **CNF / RAC / WL**. The "ticket booked" message with all these details opens in Telugu or English.
4. **❌ Not booked** or **Cancelled** → choose the refund status; the matching travel message is picked automatically.
5. If automatic reminders are on, travellers get a **journey reminder SMS** (PNR, seat, boarding point) the day before.
6. Train receipts print your **IRCTC agent ID** (Settings › Shop details).

> Book train tickets only on your authorised IRCTC agent ID. This system records bookings; it does not log in to or fill IRCTC, bus or airline sites.

### Applications: Aadhaar, PAN, voter ID, certificates… (new in 2.2)

1. **＋ New Booking** → department (e.g. **Certificates**) → service. A **📎 documents checklist** appears: tick what the customer gave. The **expected date** fills in from the service's usual days.
2. Open the booking and move it step by step. Each step prepares its own Telugu / English message:
   - **📝 Applied**: enter the application / acknowledgement no.
   - **🔄 In process**
   - **📦 Ready**: the message asks the customer to come and collect, and shows any balance due.
   - **✅ Delivered**
   - **⛔ Rejected**: enter the reason and choose refund / keep.
3. The dashboard shows **📄 Applications past expected date** and **📦 Ready — call customer to collect**. Bookings › **📄 Overdue applications** lists them.
4. **Services & Prices**: each service has *Documents needed* (comma separated) and *Usual days to complete*. The starter values are only a guide: please check and edit them.

## Before you go live (checklist)

- [ ] Settings › My PIN changed from 1234; a login with its own PIN for each staff member.
- [ ] Settings › Shop details: phone, address, receipt notes, **IRCTC agent ID**, paper size.
- [ ] **Services & Prices**: set the real fee, service charge, documents and days for every service you offer; set *Active = No* for the ones you don't.
- [ ] Release Calendar: this month's TTD dates checked.
- [ ] Optional: SMS gateway + **Send test SMS**, then automatic reminders.
- [ ] 2-Step Verification on the shop's Google account.

## 7. Good to know

- **Prices** in *Services & Prices* are a starting point. Check them on the TTD site and edit them.
- **Release dates** follow the usual monthly pattern until you correct them.
- **Privacy**: the sheet holds Aadhaar numbers. Share it only with trusted staff. The dashboard masks ID numbers unless you tick "Show ID numbers".
- **Backups**: Google Sheets keeps version history (File › Version history). You can also export bookings to Excel from Bookings or Reports.
- The extension never submits TTD forms or pays. You still type the CAPTCHA and pay yourself.
- `AGS-Master-Sheet (offline copy).xlsx` shows the same tab layout, for viewing or printing. The live system is the Google Sheet created in step 1.
- `demo/index.html` is the full dashboard with made-up data, running offline in your browser (login Admin / 1234). Use it to explore or train staff.

---

### తెలుగులో సంక్షిప్తంగా

1. కొత్త Google Sheet తెరిచి **Extensions › Apps Script** లో 4 ఫైళ్లు పేస్ట్ చేయండి → `setup` రన్ చేయండి.
2. **Deploy › Web app** (Me / Anyone) → వచ్చిన లింక్ మీ డాష్‌బోర్డ్. Admin / 1234 తో లాగిన్ అయి PIN మార్చండి.
3. Settings లో API key తయారు చేసి, ఎక్స్‌టెన్షన్ **Options › Google Sheet** లో URL + key పేస్ట్ చేయండి.
4. కస్టమర్ వస్తే **New Booking** → విడుదల రోజు **Release Day Board** → బుకింగ్ అయ్యాక ✅ / ❌ నొక్కండి → తెలుగు మెసేజ్ WhatsApp లో పంపండి.
5. రీఫండ్‌లు, పంపని మెసేజ్‌లు, దర్శనం రిమైండర్లు అన్నీ డాష్‌బోర్డ్‌లో **Needs attention** లో కనిపిస్తాయి.
6. **Settings › ⏰ Automatic reminder SMS** ఆన్ చేస్తే, దర్శనానికి ముందు రోజు సాయంత్రం బుక్ అయిన కస్టమర్లకు రిమైండర్ SMS ఆటోమేటిక్‌గా వెళ్తుంది (ఒక్కో బుకింగ్‌కు ఒక్కసారి మాత్రమే).
8. **New Booking** లో ముందు **Department** (TTD / Train / Bus / Aadhaar / PAN …) ఎంచుకోండి. బిల్లులు, రీఛార్జ్, జిరాక్స్ వంటివి **⚡ Quick sale** తో ఒక్క లైన్‌లో నమోదు చేయండి.
9. రైలు / బస్సు / ఫ్లైట్: New Booking లో Department ఎంచుకుని From, To, ప్రయాణికుల వివరాలు ఇవ్వండి. బుక్ అయ్యాక **✅ Booked** లో PNR, సీటు, CNF/WL నమోదు చేస్తే తెలుగు మెసేజ్ సిద్ధమవుతుంది.
10. ఆధార్ / పాన్ / సర్టిఫికెట్లు: పత్రాల జాబితాలో కస్టమర్ ఇచ్చినవి టిక్ చేయండి → **📝 Applied** (దరఖాస్తు నం.) → **🔄 In process** → **📦 Ready** → **✅ Delivered**. ప్రతి దశకు తెలుగు మెసేజ్ సిద్ధమవుతుంది.
7. బుకింగ్ తెరిచి **🧾 Receipt** నొక్కితే తెలుగు + ఇంగ్లీష్ రసీదు వస్తుంది → **Print / Save as PDF** తో ప్రింట్ చేయండి లేదా PDF గా సేవ్ చేసి WhatsApp లో పంపండి.
