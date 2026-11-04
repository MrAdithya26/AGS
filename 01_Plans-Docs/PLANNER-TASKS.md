# AGS planner tasks (from ABCD Planner, export of 30 Oct 2026)

Source: ABD-Innovations repo `backup/planner-data/tasks/`. Status as of 4 Nov 2026.

| # | Task | Who | Hours | Status |
| --- | --- | --- | --- | --- |
| ags-01 | Family meeting: first 10 services and their prices | you | 2 | todo |
| ags-02 | AGS SIM and WhatsApp Business | you | 1.5 | todo |
| ags-03 | Install WordPress on agservices.in | you | 1 | todo |
| ags-04 | SSL, GeneratePress and basic WordPress settings | you | 1 | todo |
| ags-05 | Install the AGS Core and ABCD Network plugins | you | 1 | todo |
| ags-06 | Claude: build AGS Core 1.1 – CSV import for directory listings + data sheet | claude | 0.5 | todo |
| ags-07 | Paste the AGS pages Claude writes | you | 2 | todo |
| ags-08 | Menu, logo and homepage look | you | 3 | todo |
| ags-09 | Enter the service categories and services | you | 3 | todo |
| ags-10 | Show the team how to collect directory data | you | 1 | todo |
| ags-d1 | Collect directory data: Hospitals and clinics – Srikakulam town | team | 8 | todo |
| ags-d2 | Collect directory data: Hospitals and clinics – other mandals | team | 12 | todo |
| ags-d3 | Collect directory data: Hotels, restaurants and tiffin centres | team | 10 | todo |
| ags-d4 | Collect directory data: Supermarkets and kirana stores | team | 10 | todo |
| ags-d5 | Collect directory data: Mobile and electronics shops | team | 8 | todo |
| ags-d6 | Collect directory data: Service workers: plumbers, electricians, carpenters, AC repair | team | 12 | todo |
| ags-d7 | Collect directory data: Schools, colleges and coaching centres | team | 10 | todo |
| ags-11 | Import directory batch 1 (hospitals, hotels, shops) | you | 1.5 | todo |
| ags-12 | Invite the first 5 service workers as providers | you | 3 | todo |
| ags-13 | Test 5 service requests from start to end | you | 1.5 | todo |
| ags-14 | Google Business Profile for AGS | you | 1 | todo |
| ags-15 | Import directory batch 2 (the rest) | you | 1.5 | todo |
| ags-16 | Final check and open AGS to the public | you | 2 | todo |
| ags-17 | Posters with QR code near busy shops | you | 2 | todo |
| ags-18 | Request register and Google reviews | team | 1 | todo |
| ags-19 | First paid service request | you | 0.5 | todo |

## Steps for each task

### ags-01 – Family meeting: first 10 services and their prices
- Sit with the family for 1 hour. Use the table Claude gives (type: 'Give me the AGS services and price sheet').
- For each service write: name (Telugu + English), what we do, price or 'from ₹…', how long it takes, who does it.
- Only services we can really deliver in Srikakulam now. No government-office claims anywhere.
- Send the filled sheet to Claude.

### ags-02 – AGS SIM and WhatsApp Business
- Buy a new SIM in a family member's name for AGS.
- Install WhatsApp Business (green icon with B) on a phone with that SIM.
- Business name: AGS. Category: Local services. Description: the line Claude writes. Hours: when you will reply.
- Business tools › Catalogue › add each service from the price sheet (name, price, short description).
- Business tools › Greeting message: turn on, paste Claude's Telugu greeting.

### ags-03 – Install WordPress on agservices.in
- hPanel › Websites › Add website › WordPress › use existing domain agservices.in.
- Admin email: the AGS email. Admin username: not 'admin'. Password: 12+ characters, save it in your private note.
- Language: English (we add Telugu text on pages). Skip the AI builder and extra plugins Hostinger offers.
- Wait until it says the site is ready, then open agservices.in/wp-admin and log in.
- If any screen looks different from these steps, take a screenshot and send it to Claude. Do not guess.

### ags-04 – SSL, GeneratePress and basic WordPress settings
- hPanel › agservices.in › Security › SSL › install if needed › Force HTTPS on.
- wp-admin › Appearance › Themes › Add New › search GeneratePress › Install › Activate.
- Settings › General: Site Title = AGS, Tagline = the line Claude writes, Timezone = Kolkata.
- Settings › Permalinks › choose 'Post name' › Save Changes.
- Settings › Reading: keep 'Search engine visibility' UNTICKED only when we launch; tick it now (discourage) until the AGS launch task.

### ags-05 – Install the AGS Core and ABCD Network plugins
- Download ags-core-1.0.0.zip (or the newer version Claude gives) and abcd-network-1.0.0.zip from Drive › 07 › Plugins.
- wp-admin › Plugins › Add New › Upload Plugin › choose ags-core zip › Install Now › Activate. Repeat for abcd-network.
- AGS › Settings: team email, AGS WhatsApp number (with 91), Telegram alerts optional (Claude helps).
- Settings › Permalinks › Save Changes once more.
- Check the pages AGS Core made: Request a Service, Track Your Request, Srikakulam Directory. Open each on your phone.

### ags-06 – Claude: build AGS Core 1.1 – CSV import for directory listings + data sheet
- Claude adds a 'Bulk import (CSV)' screen to AGS Core so the team's sheet can be loaded in one click instead of typing hundreds of listings.
- Claude gives you: the new zip, a Google Sheet template with the exact columns, and a 1-page guide for the team.
- Your part (30 minutes): read the guide, open the sheet, tell Claude if a column is unclear.

### ags-07 – Paste the AGS pages Claude writes
- Type in Claude: 'Write the AGS pages: Home, Services, How it works, About, Contact, Privacy, Terms, Not a government office – mixed Telugu.'
- For each page: wp-admin › Pages › Add New (or open the existing one) › title › paste › Publish.
- Settings › Reading › Your homepage displays: A static page › Homepage = Home › Save.

### ags-08 – Menu, logo and homepage look
- Appearance › Customize › Site Identity › upload the AGS logo (from Drive › 09 › Logos) and site icon.
- Appearance › Menus › create 'Main menu': Home, Services, Request a Service, Track Your Request, Directory, Contact › assign to Primary › Save.
- Footer menu: About, Privacy, Terms, Not a government office.
- Appearance › Customize › Colors: use the AGS colours from the brand kit (Claude gives the codes).
- Check every page on your phone. Send screenshots of anything that looks wrong to Claude.

### ags-09 – Enter the service categories and services
- wp-admin › AGS › Services (or Service categories): add each service from the family price sheet.
- For each: name, short Telugu description, price text, the category.
- Open 'Request a Service' on your phone and check every service appears in the list.

### ags-10 – Show the team how to collect directory data
- Open the data sheet from Claude with the team (friend + 2 family members).
- Explain the 3 rules: (1) phone numbers only if the owner gave it or it is printed on their board, (2) take a photo only with permission, (3) anything unsure = 'To be verified'.
- Split the work: who does which category and which mandals.
- Each person fills the shared sheet; nobody types directly in WordPress.

### ags-d1 – Collect directory data: Hospitals and clinics – Srikakulam town
- Open the AGS data sheet. Use only your assigned mandals.
- Visit or call each place. Fill: name, category, mandal, village/area, address, phone (only if given/printed), timings, landmark, Google Maps link if they have one.
- Ask the owner: 'Can we list you free on AGS?' Write Yes in the 'Permission' column only if they agreed.
- Anything you could not confirm: write 'To be verified'.
- At the end of each day, tell Adithya how many rows you added.

### ags-d2 – Collect directory data: Hospitals and clinics – other mandals
- Open the AGS data sheet. Use only your assigned mandals.
- Visit or call each place. Fill: name, category, mandal, village/area, address, phone (only if given/printed), timings, landmark, Google Maps link if they have one.
- Ask the owner: 'Can we list you free on AGS?' Write Yes in the 'Permission' column only if they agreed.
- Anything you could not confirm: write 'To be verified'.
- At the end of each day, tell Adithya how many rows you added.

### ags-d3 – Collect directory data: Hotels, restaurants and tiffin centres
- Open the AGS data sheet. Use only your assigned mandals.
- Visit or call each place. Fill: name, category, mandal, village/area, address, phone (only if given/printed), timings, landmark, Google Maps link if they have one.
- Ask the owner: 'Can we list you free on AGS?' Write Yes in the 'Permission' column only if they agreed.
- Anything you could not confirm: write 'To be verified'.
- At the end of each day, tell Adithya how many rows you added.

### ags-d4 – Collect directory data: Supermarkets and kirana stores
- Open the AGS data sheet. Use only your assigned mandals.
- Visit or call each place. Fill: name, category, mandal, village/area, address, phone (only if given/printed), timings, landmark, Google Maps link if they have one.
- Ask the owner: 'Can we list you free on AGS?' Write Yes in the 'Permission' column only if they agreed.
- Anything you could not confirm: write 'To be verified'.
- At the end of each day, tell Adithya how many rows you added.

### ags-d5 – Collect directory data: Mobile and electronics shops
- Open the AGS data sheet. Use only your assigned mandals.
- Visit or call each place. Fill: name, category, mandal, village/area, address, phone (only if given/printed), timings, landmark, Google Maps link if they have one.
- Ask the owner: 'Can we list you free on AGS?' Write Yes in the 'Permission' column only if they agreed.
- Anything you could not confirm: write 'To be verified'.
- At the end of each day, tell Adithya how many rows you added.

### ags-d6 – Collect directory data: Service workers: plumbers, electricians, carpenters, AC repair
- Open the AGS data sheet. Use only your assigned mandals.
- Visit or call each place. Fill: name, category, mandal, village/area, address, phone (only if given/printed), timings, landmark, Google Maps link if they have one.
- Ask the owner: 'Can we list you free on AGS?' Write Yes in the 'Permission' column only if they agreed.
- Anything you could not confirm: write 'To be verified'.
- At the end of each day, tell Adithya how many rows you added.

### ags-d7 – Collect directory data: Schools, colleges and coaching centres
- Open the AGS data sheet. Use only your assigned mandals.
- Visit or call each place. Fill: name, category, mandal, village/area, address, phone (only if given/printed), timings, landmark, Google Maps link if they have one.
- Ask the owner: 'Can we list you free on AGS?' Write Yes in the 'Permission' column only if they agreed.
- Anything you could not confirm: write 'To be verified'.
- At the end of each day, tell Adithya how many rows you added.

### ags-11 – Import directory batch 1 (hospitals, hotels, shops)
- Open the data sheet › File › Download › CSV.
- wp-admin › AGS › Bulk import › choose the CSV › Preview. Read the preview: rows with problems are marked in red.
- Fix red rows in the sheet (not in WordPress), download again, import.
- Click Import. Open the Directory page on your phone and check 5 random listings.

### ags-12 – Invite the first 5 service workers as providers
- From the service workers sheet, call 5 trusted workers.
- Explain AGS in Telugu (Claude gives a script): customers come through AGS, the worker does the job, AGS keeps a fixed share.
- Agree the share in writing (WhatsApp message is fine) before the first job.
- Send them the 'Join as a Provider' link; help them fill it. Approve them in wp-admin › AGS › Providers.

### ags-13 – Test 5 service requests from start to end
- Ask 5 family members to submit a request on 'Request a Service' from their phones.
- Check each arrives: WhatsApp alert / email, and in wp-admin › AGS › Requests with a reference number.
- Change the status step by step (New › Assigned › Done). The family member checks 'Track Your Request' shows it.
- Send Claude anything that did not work.

### ags-14 – Google Business Profile for AGS
- business.google.com › Add business › name AGS › category 'Service establishment' or the closest service.
- Choose 'I deliver goods and services to my customers' and hide your home address. Service area: Srikakulam district.
- Phone: the AGS number. Website: https://agservices.in . Verify as Google asks (video or postcard).

### ags-15 – Import directory batch 2 (the rest)
- Same steps as batch 1, with the remaining sheet rows.

### ags-16 – Final check and open AGS to the public
- Phone check: every menu link opens, Request a Service works, Directory search works, WhatsApp button opens chat.
- Settings › Reading › untick 'Discourage search engines' › Save.
- Search Console › add https://agservices.in (HTML tag method, Claude gives the place to paste) › submit sitemap_index.xml.
- Tell Claude 'AGS is live' so it is added to the ABCD network bar on AIH and Adyzio.
- Send the launch message to 50 people you know (Claude writes it in Telugu).

### ags-17 – Posters with QR code near busy shops
- Ask Claude for the AGS poster (A4, Telugu, QR to agservices.in).
- Print 10 copies (₹ from the travel & printing budget).
- Ask shop owners before putting one up.

### ags-18 – Request register and Google reviews
- Every request goes in the request list (wp-admin › AGS › Requests) with amount and status.
- After each finished job, send the customer the Google review link (Claude gives the message).

### ags-19 – First paid service request
- Mark this done the day a customer you do not know personally pays for a service.
