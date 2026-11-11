/**
 * AGS Services Master (TTD · Travel · CSC services) — server side (Google Apps Script, bound to the master Google Sheet).
 * Adithya Internet & CSC Center · Adithya Group of Services
 *
 * The Google Sheet is the database. This file:
 *   - creates / repairs all tabs (menu: TTD Master > Set up / repair sheet)
 *   - serves the dashboard web app (doGet)
 *   - answers the dashboard (api) and the Chrome extension (doPost, with an API key)
 */
var APP = { name: 'AGS Services Master', version: '3.0.0', tz: 'Asia/Kolkata' };
var SCHEMA_VERSION = '7';   // bump when columns change: sheets are repaired automatically on next use

// ------------------------------------------------------------------ dropdown lists
/** Departments: [name, icon, kind, booking-ID prefix]. kind decides the form: ttd | travel | app (tracked work) | quick (counter sale). */
var DEPARTMENTS = [
  ['TTD', '🛕', 'ttd', ''], ['Train', '🚆', 'travel', 'TRV'], ['Bus', '🚌', 'travel', 'TRV'], ['Flight', '✈️', 'travel', 'TRV'],
  ['Aadhaar', '🆔', 'app', 'AGS'], ['PAN', '💳', 'app', 'AGS'], ['Voter ID', '🗳️', 'app', 'AGS'], ['Certificates', '📜', 'app', 'AGS'],
  ['Ration & Pension', '🍚', 'app', 'AGS'], ['Govt Schemes', '🌾', 'app', 'AGS'], ['Passport', '🛂', 'app', 'AGS'], ['Transport (RTO)', '🚗', 'app', 'AGS'],
  ['Tax & Business', '🧾', 'app', 'AGS'], ['Insurance', '🛡️', 'app', 'AGS'], ['Exams & Jobs', '🎓', 'app', 'AGS'],
  ['Bill Payments', '💡', 'quick', 'QS'], ['Banking', '🏦', 'quick', 'QS'], ['Counter', '🖨️', 'quick', 'QS'], ['Other', '📌', 'app', 'AGS']
];
function deptInfo_(name) {
  for (var i = 0; i < DEPARTMENTS.length; i++) if (DEPARTMENTS[i][0] === name) return { name: name, icon: DEPARTMENTS[i][1], kind: DEPARTMENTS[i][2], prefix: DEPARTMENTS[i][3] };
  return { name: 'TTD', icon: '🛕', kind: 'ttd', prefix: '' };
}
var LISTS = {
  departments: DEPARTMENTS.map(function (d) { return d[0]; }),
  genders: ['Male', 'Female', 'Transgender'],
  idTypes: ['Aadhaar Card', 'Passport', 'PAN Card', 'Voter ID', 'Driving Licence'],
  states: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'],
  categories: ['Darshan', 'Arjitha Seva', 'Angapradakshinam', 'Homam', 'Accommodation', 'Virtual Seva', 'Donation', 'Other'],
  statuses: ['Requested', 'Attempting', 'Booked', 'Not Booked', 'Lucky Dip - Registered', 'Lucky Dip - Selected',
    'Lucky Dip - Not Selected', 'Payment Failed', 'Cancelled', 'Completed', 'Applied', 'In Process', 'Ready to Collect', 'Rejected'],
  paymentStatuses: ['Unpaid', 'Advance Paid', 'Fully Paid'],
  paymentModes: ['Cash', 'UPI / PhonePe / GPay', 'Bank Transfer', 'Card', 'Other'],
  ttdPayments: ['Not Paid', 'Paid to TTD', 'Debited - No Ticket', 'TTD Refunded'],
  refundStatuses: ['Not Applicable', 'Refund Pending', 'Refunded', 'Adjusted to Next Booking'],
  messageStatuses: ['Not Sent', 'Sent', 'Not Needed'],
  quotas: ['General', 'Tatkal', 'Premium Tatkal', 'Ladies', 'Senior Citizen', 'Lower Berth', 'Divyang'],
  ticketStatuses: ['CNF', 'RAC', 'WL', 'RLWL / PQWL', 'Partly CNF'],
  bookingModes: ['Online Quota', 'Lucky Dip', 'Current Booking', 'Offline', 'Online', 'Counter'],
  roles: ['Admin', 'Staff'],
  yesNo: ['Yes', 'No'],
  loginStatuses: ['Active', 'Blocked', 'Closed'],
  contactVias: ['WhatsApp', 'SMS', 'WhatsApp + SMS'],
  reminderModes: ['Off', 'SMS customers only', 'All customers'],
  smsProviders: ['None (phone SMS app only)', 'Fast2SMS', 'Android SMS Gateway (sms-gate.app)', 'Custom HTTP API']
};

// ------------------------------------------------------------------ sheet layout
// c(key, header, type, width, list) — type: text | date | datetime | number | money
function c(key, header, type, width, list) { return { key: key, header: header, type: type || 'text', width: width || 120, list: list || '' }; }

var SCHEMA = {
  Bookings: { color: '#7B1E1E', id: 'bookingId', cols: [
    c('bookingId', 'Booking ID', 'text', 120),
    c('department', 'Department', 'text', 120, 'departments'),
    c('requestDate', 'Request Date', 'datetime', 130),
    c('profile', 'Profile / Family', 'text', 130),
    c('customerName', 'Customer Name', 'text', 170),
    c('mobile', 'Mobile', 'text', 110),
    c('contactVia', 'Send Messages By', 'text', 120, 'contactVias'),
    c('devotees', 'Devotees', 'text', 260),
    c('customerIds', 'Customer IDs', 'text', 160),
    c('persons', 'No. of Persons', 'number', 80),
    c('category', 'Category', 'text', 120, 'categories'),
    c('service', 'Service', 'text', 220),
    c('preferredDate', 'Preferred Date', 'date', 110),
    c('alternateDate', 'Alternate Date', 'date', 110),
    c('releaseDate', 'Quota Release Date', 'date', 110),
    c('ttdLogin', 'TTD Login (Mobile)', 'text', 120),
    c('status', 'Booking Status', 'text', 150, 'statuses'),
    c('ttdRef', 'TTD Booking / Ticket No', 'text', 160),
    c('serviceDate', 'Darshan / Seva Date', 'date', 110),
    c('slot', 'Slot / Reporting Time', 'text', 120),
    c('reportingPoint', 'Reporting Point', 'text', 160),
    c('checkIn', 'Check-in (Rooms)', 'date', 110),
    c('checkOut', 'Check-out (Rooms)', 'date', 110),
    c('room', 'Room / Cottage', 'text', 120),
    c('fromPlace', 'From (Travel)', 'text', 120),
    c('toPlace', 'To (Travel)', 'text', 120),
    c('operator', 'Operator / Airline', 'text', 120),
    c('vehicleNo', 'Train / Bus / Flight No', 'text', 110),
    c('travelClass', 'Class', 'text', 80),
    c('quota', 'Quota', 'text', 100, 'quotas'),
    c('boardingPoint', 'Boarding Point', 'text', 150),
    c('seatInfo', 'Coach / Seat / Berth', 'text', 140),
    c('ticketStatus', 'Ticket Status (CNF/RAC/WL)', 'text', 110, 'ticketStatuses'),
    c('passengerDetails', 'Passenger Details (name, gender, age, berth)', 'text', 260),
    c('expectedDate', 'Expected Date (Applications)', 'date', 110),
    c('documents', 'Documents Received', 'text', 220),
    c('ticketAmount', 'Ticket Amount (₹)', 'money', 100),
    c('serviceCharge', 'Service Charge (₹)', 'money', 100),
    c('total', 'Total (₹)', 'money', 100),
    c('received', 'Amount Received (₹)', 'money', 110),
    c('paymentMode', 'Payment Mode', 'text', 130, 'paymentModes'),
    c('paymentStatus', 'Payment Status', 'text', 110, 'paymentStatuses'),
    c('ttdPayment', 'TTD Payment', 'text', 140, 'ttdPayments'),
    c('refundStatus', 'Refund Status', 'text', 150, 'refundStatuses'),
    c('refundAmount', 'Refund Amount (₹)', 'money', 100),
    c('refundDate', 'Refund Date', 'date', 110),
    c('refundMode', 'Refund Mode', 'text', 120, 'paymentModes'),
    c('ticketLink', 'Ticket PDF / Link', 'text', 160),
    c('messageStatus', 'Message Status', 'text', 100, 'messageStatuses'),
    c('messageSentOn', 'Message Sent On', 'datetime', 130),
    c('messageVia', 'Message Sent Via', 'text', 110),
    c('reminderSentOn', 'Reminder SMS Sent On', 'datetime', 130),
    c('handledBy', 'Handled By', 'text', 110),
    c('remarks', 'Remarks', 'text', 220),
    c('createdOn', 'Created On', 'datetime', 130),
    c('updatedOn', 'Updated On', 'datetime', 130)
  ]},
  Customers: { color: '#B45309', id: 'customerId', cols: [
    c('customerId', 'Customer ID', 'text', 100),
    c('profile', 'Profile Name', 'text', 140),
    c('name', 'Devotee Name (as on ID)', 'text', 200),
    c('dob', 'Date of Birth (DD/MM/YYYY)', 'text', 120),
    c('gender', 'Gender', 'text', 90, 'genders'),
    c('idType', 'Photo ID Type', 'text', 120, 'idTypes'),
    c('idNumber', 'Photo ID Number', 'text', 150),
    c('gotram', 'Gotram (for Homam)', 'text', 120),
    c('mobile', 'Mobile', 'text', 110),
    c('email', 'Email ID', 'text', 190),
    c('address', 'Address', 'text', 200),
    c('city', 'City / Town', 'text', 120),
    c('district', 'District', 'text', 120),
    c('state', 'State', 'text', 130, 'states'),
    c('pincode', 'Pincode', 'text', 80),
    c('country', 'Country', 'text', 80),
    c('notes', 'Notes', 'text', 180),
    c('createdOn', 'Added On', 'datetime', 130),
    c('updatedOn', 'Updated On', 'datetime', 130)
  ]},
  Services: { color: '#1E40AF', id: 'serviceId', cols: [
    c('serviceId', 'Service ID', 'text', 90),
    c('department', 'Department', 'text', 120, 'departments'),
    c('category', 'Category (TTD)', 'text', 130, 'categories'),
    c('name', 'Service Name', 'text', 260),
    c('price', 'Ticket Price / Govt Fee (₹)', 'money', 110),
    c('per', 'Price Per', 'text', 90),
    c('maxPersons', 'Max Persons / Booking', 'number', 100),
    c('serviceCharge', 'Default Service Charge (₹)', 'money', 120),
    c('mode', 'Booking Mode', 'text', 120, 'bookingModes'),
    c('releaseDay', 'Usual Release Day', 'number', 90),
    c('releaseTime', 'Release Time', 'text', 90),
    c('reportingPoint', 'Reporting Point', 'text', 180),
    c('documents', 'Documents Needed (comma separated)', 'text', 260),
    c('daysToComplete', 'Usual Days to Complete', 'number', 90),
    c('active', 'Active', 'text', 70, 'yesNo'),
    c('notes', 'Notes', 'text', 260)
  ]},
  Releases: { color: '#047857', id: 'releaseId', cols: [
    c('releaseId', 'Release ID', 'text', 90),
    c('label', 'Release', 'text', 300),
    c('category', 'Category', 'text', 130, 'categories'),
    c('releaseDate', 'Release Date', 'date', 110),
    c('releaseTime', 'Release Time', 'text', 90),
    c('quotaMonth', 'Quota For Month', 'text', 110),
    c('notes', 'Notes', 'text', 260)
  ]},
  'TTD Logins': { color: '#6D28D9', id: 'loginId', cols: [
    c('loginId', 'Login Mobile', 'text', 120),
    c('holder', 'Account Holder', 'text', 160),
    c('email', 'Email', 'text', 180),
    c('status', 'Status', 'text', 90, 'loginStatuses'),
    c('notes', 'Notes', 'text', 260),
    c('createdOn', 'Added On', 'datetime', 130)
  ]},
  Messages: { color: '#BE185D', id: 'key', cols: [
    c('key', 'Template Key', 'text', 170),
    c('name', 'Used For', 'text', 220),
    c('telugu', 'Telugu Message', 'text', 520),
    c('english', 'English Message', 'text', 420),
    c('smsTelugu', 'SMS Telugu (short)', 'text', 360),
    c('smsEnglish', 'SMS English (short)', 'text', 320)
  ]},
  Users: { color: '#334155', id: 'name', cols: [
    c('name', 'User Name', 'text', 140),
    c('role', 'Role', 'text', 90, 'roles'),
    c('pinHash', 'PIN (hashed - set from dashboard)', 'text', 260),
    c('active', 'Active', 'text', 70, 'yesNo')
  ]},
  Settings: { color: '#334155', id: 'key', cols: [
    c('key', 'Setting', 'text', 180),
    c('value', 'Value', 'text', 360),
    c('about', 'What it is', 'text', 380)
  ]},
  'Activity Log': { color: '#334155', id: '', cols: [
    c('time', 'Time', 'datetime', 140),
    c('user', 'User', 'text', 110),
    c('ref', 'Record', 'text', 120),
    c('action', 'Action', 'text', 160),
    c('details', 'Details', 'text', 520)
  ]}
};
var SHEET_ORDER = ['Bookings', 'Customers', 'Services', 'Releases', 'TTD Logins', 'Messages', 'Users', 'Settings', 'Activity Log'];

var DEFAULT_SETTINGS = [
  ['shopName', 'Adithya Internet & CSC Center', 'Shop name (English) used in messages'],
  ['shopNameTe', 'ఆదిత్య ఇంటర్నెట్ & CSC సెంటర్', 'Shop name in Telugu used in messages'],
  ['groupName', 'Adithya Group of Services', 'Group name (English)'],
  ['groupNameTe', 'ఆదిత్య గ్రూప్ ఆఫ్ సర్వీసెస్', 'Group name in Telugu'],
  ['shopPhone', '', 'Phone number printed at the end of every message'],
  ['shopAddress', '', 'Shop address (optional, used in messages as {shopAddress})'],
  ['defaultLanguage', 'Telugu', 'Telugu or English - which message opens first'],
  ['defaultServiceCharge', '100', 'Service charge per booking (₹) when the service has none'],
  ['bookingPrefix', 'TTD', 'Booking IDs look like TTD-2611-0001'],
  ['apiKey', '', 'Key the Chrome extension uses to read/update this sheet (create it in Settings on the dashboard)'],
  ['smsProvider', 'None (phone SMS app only)', 'SMS gateway: None / Fast2SMS / Android SMS Gateway (sms-gate.app) / Custom HTTP API'],
  ['smsApiKey', '', 'Fast2SMS API key, or the Android gateway password (secret - only Admins see it)'],
  ['smsUser', '', 'Android SMS Gateway username'],
  ['smsGatewayUrl', 'https://api.sms-gate.app/3rdparty/v1', 'Android SMS Gateway API address (cloud mode)'],
  ['smsCustomUrl', '', 'Custom HTTP API URL. Use {mobile} {mobile91} {message} {apiKey} placeholders'],
  ['smsCustomMethod', 'GET', 'Custom HTTP API: GET or POST'],
  ['smsCustomBody', '', 'Custom HTTP API: POST body with the same placeholders (JSON or form)'],
  ['smsCustomContentType', 'application/json', 'Custom HTTP API: POST content type'],
  ['autoReminder', 'Off', 'Automatic reminder SMS before the darshan / check-in date: Off / SMS customers only / All customers'],
  ['reminderHour', '18', 'Hour of the day (0-23, India time) when the automatic reminder SMS go out'],
  ['reminderDaysBefore', '1', 'How many days before the darshan / check-in date to send the reminder (1 = the day before)'],
  ['receiptNote', 'The ticket amount is paid to TTD on your behalf. Bookings depend on TTD quota and TTD rules. Please keep this receipt.', 'Note printed at the bottom of every receipt (English)'],
  ['receiptNoteTe', 'టికెట్ మొత్తం మీ తరఫున TTD కి చెల్లించబడుతుంది. బుకింగ్ TTD కోటా మరియు నియమాలపై ఆధారపడి ఉంటుంది. ఈ రసీదును భద్రపరచుకోండి.', 'Note printed at the bottom of every receipt (Telugu)'],
  ['receiptNoteOther', 'Government / portal fees are paid on your behalf. Our service charge is shown separately. Please keep this receipt.', 'Receipt note for non-TTD services (English)'],
  ['receiptNoteOtherTe', 'ప్రభుత్వ / పోర్టల్ రుసుము మీ తరఫున చెల్లించబడుతుంది. మా సేవా రుసుము విడిగా చూపబడింది. ఈ రసీదును భద్రపరచుకోండి.', 'Receipt note for non-TTD services (Telugu)'],
  ['irctcAgentId', '', 'Your authorised IRCTC agent ID (printed on train receipts)'],
  ['receiptSize', 'A5', 'Default receipt paper size: A4 / A5 / 80mm (thermal printer)']
];
var SECRET_SETTINGS = ['apiKey', 'smsApiKey'];

// ------------------------------------------------------------------ message templates
var SIGN_TE = '\n\n— {shopNameTe}\n   ({groupNameTe})\n📞 {shopPhone}';
var SIGN_EN = '\n\n— {shopName}\n   ({groupName})\n📞 {shopPhone}';
var DEFAULT_MESSAGES = [
  ['request_received', 'Request received (new booking)',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nమీ తిరుమల *{service}* బుకింగ్ అభ్యర్థన మాకు అందింది. ✅\n\n🆔 రిఫరెన్స్ నంబర్: {bookingId}\n📅 కోరిన తేదీ: {preferredDate}\n👥 భక్తుల సంఖ్య: {persons}\n💰 చెల్లించిన మొత్తం: ₹{received}\n\nTTD కోటా విడుదల రోజున ({releaseDate}) మేము మీ కోసం బుకింగ్ ప్రయత్నిస్తాము. ఫలితం వెంటనే తెలియజేస్తాము.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nWe have received your Tirumala *{service}* booking request. ✅\n\n🆔 Reference: {bookingId}\n📅 Preferred date: {preferredDate}\n👥 Devotees: {persons}\n💰 Amount received: ₹{received}\n\nWe will try the booking when TTD releases the quota ({releaseDate}) and inform you immediately.' + SIGN_EN],
  ['booked', 'Booked successfully (darshan / seva)',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nశుభవార్త! మీ తిరుమల *{service}* బుకింగ్ విజయవంతంగా పూర్తయింది. ✅\n\n🎫 TTD బుకింగ్ నంబర్: *{ttdRef}*\n📅 దర్శనం / సేవ తేదీ: *{serviceDate}*\n⏰ సమయం (స్లాట్): {slot}\n📍 రిపోర్టింగ్ ప్రదేశం: {reportingPoint}\n👥 భక్తులు ({persons}): {devotees}\n💰 టికెట్ మొత్తం: ₹{ticketAmount}\n\n📌 ముఖ్య సూచనలు:\n• బుకింగ్‌లో ఇచ్చిన *ఒరిజినల్ ఫోటో ID (ఆధార్)* తప్పనిసరిగా తీసుకురండి.\n• సాంప్రదాయ దుస్తులు మాత్రమే — పురుషులు: ధోతి / కుర్తా-పైజామా, స్త్రీలు: చీర / చుడీదార్ & దుపట్టా.\n• నిర్ణీత సమయానికి కనీసం 30 నిమిషాల ముందు రిపోర్టింగ్ ప్రదేశానికి చేరుకోండి.\n• టికెట్ ప్రింట్ కాపీ లేదా మొబైల్‌లో టికెట్ వెంట ఉంచుకోండి.\n\nశ్రీవారి కృపాకటాక్షాలు మీ కుటుంబంపై ఉండాలని కోరుకుంటున్నాము. 🙏' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nGood news! Your Tirumala *{service}* booking is confirmed. ✅\n\n🎫 TTD booking no: *{ttdRef}*\n📅 Date: *{serviceDate}*\n⏰ Slot: {slot}\n📍 Reporting point: {reportingPoint}\n👥 Devotees ({persons}): {devotees}\n💰 Ticket amount: ₹{ticketAmount}\n\n📌 Please note:\n• Carry the *original photo ID (Aadhaar)* given at booking.\n• Traditional dress only — Men: dhoti / kurta-pyjama, Women: saree / churidar with dupatta.\n• Reach the reporting point at least 30 minutes early.\n• Keep the ticket printout or the ticket on your mobile.\n\nMay Lord Venkateswara bless your family. 🙏' + SIGN_EN],
  ['booked_room', 'Booked successfully (accommodation)',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nమీ *{service}* వసతి (రూమ్) బుకింగ్ విజయవంతంగా పూర్తయింది. ✅\n\n🎫 TTD బుకింగ్ నంబర్: *{ttdRef}*\n🏨 రూమ్ / కాటేజ్: {room}\n📅 చెక్-ఇన్: {checkIn}\n📅 చెక్-అవుట్: {checkOut}\n💰 మొత్తం: ₹{ticketAmount}\n\n📌 చెక్-ఇన్ సమయంలో బుకింగ్‌లో ఇచ్చిన ఒరిజినల్ ఫోటో ID చూపించాలి. కాషన్ డిపాజిట్ రూమ్ ఖాళీ చేసిన తర్వాత TTD తిరిగి చెల్లిస్తుంది.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nYour *{service}* accommodation is booked. ✅\n\n🎫 TTD booking no: *{ttdRef}*\n🏨 Room / cottage: {room}\n📅 Check-in: {checkIn}\n📅 Check-out: {checkOut}\n💰 Amount: ₹{ticketAmount}\n\n📌 Show the original photo ID used for booking at check-in. TTD refunds the caution deposit after you vacate.' + SIGN_EN],
  ['not_booked_refund_pending', 'Not booked - refund will be given',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nక్షమించండి 🙏 TTD కోటా నిమిషాల్లోనే పూర్తవడం వల్ల మీ *{service}* ({preferredDate}) బుకింగ్ ఈసారి లభించలేదు. ❌\n\n🆔 రిఫరెన్స్: {bookingId}\n💰 మీరు చెల్లించిన ₹{refundAmount} త్వరలో (1-2 రోజుల్లో) పూర్తిగా తిరిగి చెల్లిస్తాము.\n\n📅 తదుపరి కోటా విడుదల: {nextRelease}\nమళ్లీ ప్రయత్నించమంటే దయచేసి మాకు తెలియజేయండి.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nSorry 🙏 the TTD quota sold out within minutes, so your *{service}* ({preferredDate}) booking could not be done this time. ❌\n\n🆔 Reference: {bookingId}\n💰 Your ₹{refundAmount} will be refunded in full within 1-2 days.\n\n📅 Next quota release: {nextRelease}\nTell us if you want us to try again.' + SIGN_EN],
  ['not_booked_refunded', 'Not booked - refund already given',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nక్షమించండి 🙏 TTD కోటా త్వరగా పూర్తవడం వల్ల మీ *{service}* ({preferredDate}) బుకింగ్ లభించలేదు. ❌\n\n✅ మీరు చెల్లించిన ₹{refundAmount} తిరిగి చెల్లించాము.\n💳 విధానం: {refundMode}\n📅 రీఫండ్ తేదీ: {refundDate}\n\n📅 తదుపరి కోటా విడుదల: {nextRelease} — మళ్లీ ప్రయత్నించమంటే తెలియజేయండి.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nSorry 🙏 the TTD quota sold out, so your *{service}* ({preferredDate}) booking could not be done. ❌\n\n✅ Your ₹{refundAmount} has been refunded.\n💳 Mode: {refundMode}\n📅 Refund date: {refundDate}\n\n📅 Next quota release: {nextRelease} — tell us if you want us to try again.' + SIGN_EN],
  ['not_booked_adjusted', 'Not booked - amount kept for next try',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nక్షమించండి 🙏 ఈసారి మీ *{service}* ({preferredDate}) బుకింగ్ లభించలేదు. ❌\n\n💰 మీరు చెల్లించిన ₹{received} మా వద్ద సురక్షితంగా ఉంది. తదుపరి కోటా విడుదల ({nextRelease}) రోజున మీ కోసం మళ్లీ ప్రయత్నిస్తాము. వద్దనుకుంటే ఎప్పుడైనా పూర్తి రీఫండ్ తీసుకోవచ్చు.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nSorry 🙏 your *{service}* ({preferredDate}) booking could not be done this time. ❌\n\n💰 Your ₹{received} is safe with us. We will try again on the next quota release ({nextRelease}). You can take a full refund at any time.' + SIGN_EN],
  ['dip_registered', 'Lucky Dip - registered',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nమీ *{service}* ఎలక్ట్రానిక్ లక్కీ డిప్ రిజిస్ట్రేషన్ పూర్తయింది. ✅\n\n🆔 రిజిస్ట్రేషన్ నంబర్: {ttdRef}\n📅 కోరిన తేదీ: {preferredDate}\n\nలక్కీ డిప్ ఫలితాలు TTD ప్రకటించగానే మీకు తెలియజేస్తాము. ఎంపికైతే నిర్ణీత గడువులోగా టికెట్ మొత్తం చెల్లించాలి.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nYour *{service}* electronic lucky dip registration is done. ✅\n\n🆔 Registration no: {ttdRef}\n📅 Preferred date: {preferredDate}\n\nWe will tell you the result as soon as TTD announces it. If selected, the ticket must be paid before the deadline.' + SIGN_EN],
  ['dip_selected', 'Lucky Dip - selected (pay now)',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nశుభవార్త! 🎉 మీరు *{service}* లక్కీ డిప్‌లో ఎంపికయ్యారు.\n\n📅 సేవ తేదీ: {serviceDate}\n💰 టికెట్ మొత్తం: ₹{ticketAmount}\n\n⚠️ TTD ఇచ్చిన గడువులోగా చెల్లింపు చేయాలి — లేకపోతే టికెట్ రద్దవుతుంది. దయచేసి వెంటనే మా సెంటర్‌ను సంప్రదించండి.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nGood news! 🎉 You are selected in the *{service}* lucky dip.\n\n📅 Seva date: {serviceDate}\n💰 Ticket amount: ₹{ticketAmount}\n\n⚠️ Payment must be made before the TTD deadline or the ticket lapses. Please contact our center right away.' + SIGN_EN],
  ['dip_not_selected', 'Lucky Dip - not selected',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nఈసారి *{service}* లక్కీ డిప్‌లో మీ పేరు ఎంపిక కాలేదు. 🙏\n\nతదుపరి నెల లక్కీ డిప్ రిజిస్ట్రేషన్ ({nextRelease}) కోసం మళ్లీ నమోదు చేయమంటే తెలియజేయండి. ఇతర దర్శన టికెట్ల కోసం కూడా మేము సహాయం చేస్తాము.' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nYour name was not selected in the *{service}* lucky dip this time. 🙏\n\nTell us if you want to register again for the next lucky dip ({nextRelease}). We can also help with other darshan tickets.' + SIGN_EN],
  ['payment_failed', 'Amount debited but ticket not generated',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nమీ *{service}* బుకింగ్ సమయంలో చెల్లింపు జరిగినా TTD టికెట్ జారీ కాలేదు. ⚠️\n\nఇలాంటి సందర్భాల్లో TTD సాధారణంగా 7-10 పని దినాల్లో మొత్తాన్ని తిరిగి జమ చేస్తుంది. మేము దీనిని ఫాలో-అప్ చేస్తున్నాము. రీఫండ్ రాగానే మీకు తెలియజేస్తాము.\n\n🆔 రిఫరెన్స్: {bookingId}' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nThe payment for your *{service}* booking went through but TTD did not issue the ticket. ⚠️\n\nTTD usually reverses such payments in 7-10 working days. We are following it up and will inform you when the refund arrives.\n\n🆔 Reference: {bookingId}' + SIGN_EN],
  ['refund_done', 'Refund given',
    '🙏 నమస్కారం {name} గారు,\n\n✅ మీ బుకింగ్ ({bookingId}) కు సంబంధించిన ₹{refundAmount} రీఫండ్ పూర్తయింది.\n💳 విధానం: {refundMode}\n📅 తేదీ: {refundDate}\n\nమాపై నమ్మకం ఉంచినందుకు ధన్యవాదాలు. 🙏' + SIGN_TE,
    '🙏 Namaskaram {name} garu,\n\n✅ The refund of ₹{refundAmount} for booking {bookingId} is done.\n💳 Mode: {refundMode}\n📅 Date: {refundDate}\n\nThank you for trusting us. 🙏' + SIGN_EN],
  ['reminder', 'Reminder before the darshan date',
    '🙏 ఓం నమో వేంకటేశాయ 🙏\n\nనమస్కారం {name} గారు,\nగుర్తు చేస్తున్నాము: మీ *{service}* *{serviceDate}* న ఉంది. ⏰ {slot}\n🎫 TTD బుకింగ్ నంబర్: {ttdRef}\n📍 {reportingPoint}\n\n✔ ఒరిజినల్ ఫోటో ID ✔ టికెట్ కాపీ ✔ సాంప్రదాయ దుస్తులు\n\nశుభ యాత్ర! గోవిందా గోవిందా! 🙏' + SIGN_TE,
    '🙏 Om Namo Venkatesaya 🙏\n\nNamaskaram {name} garu,\nReminder: your *{service}* is on *{serviceDate}*. ⏰ {slot}\n🎫 TTD booking no: {ttdRef}\n📍 {reportingPoint}\n\n✔ Original photo ID ✔ Ticket copy ✔ Traditional dress\n\nHappy journey! Govinda Govinda! 🙏' + SIGN_EN],
  ['cancelled', 'Booking cancelled',
    '🙏 నమస్కారం {name} గారు,\n\nమీ *{service}* బుకింగ్ అభ్యర్థన ({bookingId}) రద్దు చేయబడింది. చెల్లించిన మొత్తం ఏదైనా ఉంటే తిరిగి చెల్లిస్తాము. ఏవైనా సందేహాలుంటే మమ్మల్ని సంప్రదించండి.' + SIGN_TE,
    '🙏 Namaskaram {name} garu,\n\nYour *{service}* booking request ({bookingId}) has been cancelled. Any amount paid will be refunded. Contact us for any questions.' + SIGN_EN]
];

// Short SMS versions (Telugu SMS is billed per 70 characters, so these are kept brief).
DEFAULT_MESSAGES.push(
  ['order_received', 'Work received (non-TTD services)',
    'నమస్కారం {name} గారు 🙏\n\nమీ *{service}* పని మా వద్ద నమోదైంది.\n🧾 నంబర్: *{bookingId}*\n💰 మొత్తం: ₹{total} · చెల్లించినది: ₹{received}\n\nపని పూర్తవగానే మీకు తెలియజేస్తాము. ఏదైనా సందేహం ఉంటే ఈ నంబర్‌కు కాల్ చేయండి.' + SIGN_TE,
    'Namaskaram {name} garu 🙏\n\nWe have received your *{service}* request.\n🧾 Number: *{bookingId}*\n💰 Total: ₹{total} · Received: ₹{received}\n\nWe will inform you as soon as it is done. Call us for any doubt.' + SIGN_EN],
  ['order_completed', 'Work completed (non-TTD services)',
    'నమస్కారం {name} గారు 🙏\n\nమీ *{service}* పని పూర్తయింది ✅\n🧾 నంబర్: *{bookingId}*\n💰 మొత్తం: ₹{total} · చెల్లించినది: ₹{received}\n\nమా సేవను ఉపయోగించుకున్నందుకు ధన్యవాదాలు.' + SIGN_TE,
    'Namaskaram {name} garu 🙏\n\nYour *{service}* work is completed ✅\n🧾 Number: *{bookingId}*\n💰 Total: ₹{total} · Received: ₹{received}\n\nThank you for choosing us.' + SIGN_EN]
);
var SMS_TE_SIGN = ' -{shopNameTe} {shopPhone}';
var SMS_EN_SIGN = ' -{shopName} {shopPhone}';
var DEFAULT_SMS = {
  request_received: ['ఓం నమో వేంకటేశాయ. {name} గారు, మీ {service} అభ్యర్థన అందింది. రెఫ్: {bookingId}, తేదీ: {preferredDate}, చెల్లింపు ₹{received}. ఫలితం తెలియజేస్తాము.' + SMS_TE_SIGN,
    'Om Namo Venkatesaya. {name} garu, your {service} request is received. Ref {bookingId}, date {preferredDate}, paid Rs.{received}. We will inform the result.' + SMS_EN_SIGN],
  booked: ['ఓం నమో వేంకటేశాయ. {name} గారు, మీ {service} బుకింగ్ విజయవంతం. టికెట్: {ttdRef}, తేదీ: {serviceDate}, సమయం: {slot}, భక్తులు: {persons}. ఒరిజినల్ ఆధార్, సాంప్రదాయ దుస్తులతో రండి.' + SMS_TE_SIGN,
    'Om Namo Venkatesaya. {name} garu, your {service} is BOOKED. Ticket {ttdRef}, date {serviceDate}, slot {slot}, persons {persons}. Bring original Aadhaar, traditional dress.' + SMS_EN_SIGN],
  booked_room: ['{name} గారు, మీ {service} రూమ్ బుకింగ్ విజయవంతం. టికెట్: {ttdRef}, చెక్-ఇన్: {checkIn}, రూమ్: {room}. ఒరిజినల్ ఫోటో ID తీసుకురండి.' + SMS_TE_SIGN,
    '{name} garu, your {service} room is BOOKED. Ticket {ttdRef}, check-in {checkIn}, room {room}. Bring original photo ID.' + SMS_EN_SIGN],
  not_booked_refund_pending: ['{name} గారు, క్షమించండి. కోటా పూర్తవడంతో మీ {service} బుకింగ్ లభించలేదు. ₹{refundAmount} 1-2 రోజుల్లో తిరిగి ఇస్తాము. తదుపరి విడుదల: {nextRelease}.' + SMS_TE_SIGN,
    'Sorry {name} garu, the TTD quota sold out and your {service} could not be booked. Rs.{refundAmount} will be refunded in 1-2 days. Next release {nextRelease}.' + SMS_EN_SIGN],
  not_booked_refunded: ['{name} గారు, క్షమించండి. మీ {service} బుకింగ్ లభించలేదు. ₹{refundAmount} రీఫండ్ పూర్తయింది ({refundMode}, {refundDate}).' + SMS_TE_SIGN,
    'Sorry {name} garu, your {service} could not be booked. Rs.{refundAmount} refunded ({refundMode}, {refundDate}).' + SMS_EN_SIGN],
  not_booked_adjusted: ['{name} గారు, ఈసారి మీ {service} బుకింగ్ లభించలేదు. మీ ₹{received} మా వద్ద ఉంది, {nextRelease} న మళ్లీ ప్రయత్నిస్తాము.' + SMS_TE_SIGN,
    'Sorry {name} garu, your {service} could not be booked this time. Your Rs.{received} is kept; we will try again on {nextRelease}.' + SMS_EN_SIGN],
  dip_registered: ['{name} గారు, మీ {service} లక్కీ డిప్ రిజిస్ట్రేషన్ పూర్తయింది. నం: {ttdRef}. ఫలితం తెలియజేస్తాము.' + SMS_TE_SIGN,
    '{name} garu, your {service} lucky dip registration is done. No {ttdRef}. We will inform the result.' + SMS_EN_SIGN],
  dip_selected: ['శుభవార్త! {name} గారు, {service} లక్కీ డిప్‌లో ఎంపికయ్యారు. తేదీ: {serviceDate}, మొత్తం ₹{ticketAmount}. గడువులోగా చెల్లించాలి, వెంటనే సంప్రదించండి.' + SMS_TE_SIGN,
    'Good news {name} garu! Selected in {service} lucky dip for {serviceDate}. Pay Rs.{ticketAmount} before the TTD deadline - contact us now.' + SMS_EN_SIGN],
  dip_not_selected: ['{name} గారు, ఈసారి {service} లక్కీ డిప్‌లో ఎంపిక కాలేదు. తదుపరి రిజిస్ట్రేషన్: {nextRelease}.' + SMS_TE_SIGN,
    '{name} garu, not selected in the {service} lucky dip this time. Next registration {nextRelease}.' + SMS_EN_SIGN],
  payment_failed: ['{name} గారు, మీ {service} చెల్లింపు జరిగినా TTD టికెట్ రాలేదు. TTD 7-10 రోజుల్లో తిరిగి జమ చేస్తుంది, మేము ఫాలో-అప్ చేస్తున్నాము. రెఫ్: {bookingId}.' + SMS_TE_SIGN,
    '{name} garu, payment for your {service} went through but TTD did not issue the ticket. TTD reverses it in 7-10 working days; we are following up. Ref {bookingId}.' + SMS_EN_SIGN],
  refund_done: ['{name} గారు, బుకింగ్ {bookingId} కు ₹{refundAmount} రీఫండ్ పూర్తయింది ({refundMode}, {refundDate}). ధన్యవాదాలు.' + SMS_TE_SIGN,
    '{name} garu, refund of Rs.{refundAmount} for {bookingId} is done ({refundMode}, {refundDate}). Thank you.' + SMS_EN_SIGN],
  reminder: ['గుర్తు: {name} గారు, మీ {service} {serviceDate} న, సమయం {slot}. టికెట్ {ttdRef}. ఆధార్, టికెట్, సాంప్రదాయ దుస్తులు మర్చిపోవద్దు. గోవిందా!' + SMS_TE_SIGN,
    'Reminder: {name} garu, your {service} is on {serviceDate}, slot {slot}. Ticket {ttdRef}. Carry Aadhaar, ticket, traditional dress. Govinda!' + SMS_EN_SIGN],
  cancelled: ['{name} గారు, మీ {service} అభ్యర్థన ({bookingId}) రద్దయింది. చెల్లించిన మొత్తం తిరిగి ఇస్తాము.' + SMS_TE_SIGN,
    '{name} garu, your {service} request ({bookingId}) is cancelled. Any amount paid will be refunded.' + SMS_EN_SIGN]
};

// Services seeded on first setup. Prices are a starting point — check the TTD site and edit them in the Services tab.
DEFAULT_MESSAGES.push(
  ['travel_received', 'Travel - request received',
    'నమస్కారం {name} గారు 🙏\n\nమీ *{service}* అభ్యర్థన మా వద్ద నమోదైంది.\n🧾 నంబర్: *{bookingId}*\n🛣️ ప్రయాణం: {route}\n📅 కోరిన తేదీ: {preferredDate}\n👥 ప్రయాణికులు ({persons}): {devotees}\n💰 చెల్లించినది: ₹{received}\n\nటికెట్ బుక్ అవగానే PNR వివరాలు పంపిస్తాము.' + SIGN_TE,
    'Namaskaram {name} garu 🙏\n\nWe have received your *{service}* request.\n🧾 Number: *{bookingId}*\n🛣️ Journey: {route}\n📅 Wanted date: {preferredDate}\n👥 Passengers ({persons}): {devotees}\n💰 Received: ₹{received}\n\nWe will send the PNR details once the ticket is booked.' + SIGN_EN],
  ['travel_booked', 'Travel - ticket booked',
    'నమస్కారం {name} గారు 🙏\n\nమీ టికెట్ బుక్ అయింది ✅\n\n🎫 PNR / టికెట్: *{ttdRef}*\n🛣️ {route}\n🚆 {operator} {vehicleNo}\n📅 ప్రయాణ తేదీ: *{serviceDate}*  ⏰ {slot}\n📍 బోర్డింగ్: {boardingPoint}\n💺 తరగతి: {travelClass} · సీటు: {seatInfo}\n📌 స్థితి: *{ticketStatus}*\n👥 ప్రయాణికులు ({persons}): {devotees}\n💰 టికెట్ ఛార్జీ: ₹{ticketAmount}\n\n📌 ప్రయాణంలో ఒరిజినల్ ఫోటో ID (ఆధార్), టికెట్ వెంట ఉంచుకోండి. బయలుదేరే సమయానికి కనీసం 30 నిమిషాల ముందే చేరుకోండి.\n\nశుభ ప్రయాణం! 🙏' + SIGN_TE,
    'Namaskaram {name} garu 🙏\n\nYour ticket is booked ✅\n\n🎫 PNR / ticket: *{ttdRef}*\n🛣️ {route}\n🚆 {operator} {vehicleNo}\n📅 Journey date: *{serviceDate}*  ⏰ {slot}\n📍 Boarding: {boardingPoint}\n💺 Class: {travelClass} · Seat: {seatInfo}\n📌 Status: *{ticketStatus}*\n👥 Passengers ({persons}): {devotees}\n💰 Fare: ₹{ticketAmount}\n\n📌 Carry the original photo ID (Aadhaar) and the ticket. Reach at least 30 minutes before departure.\n\nHappy journey! 🙏' + SIGN_EN],
  ['travel_not_booked', 'Travel - ticket not booked',
    'నమస్కారం {name} గారు,\n\nక్షమించండి 🙏 మీ *{service}* ({route}, {preferredDate}) టికెట్ బుక్ కాలేదు.\n💰 మొత్తం: ₹{refundAmount}\n📌 రీఫండ్ స్థితి: {refundStatus}\n\nవేరే తేదీ లేదా వేరే రైలు / బస్సు / ఫ్లైట్ కోసం మమ్మల్ని సంప్రదించండి.' + SIGN_TE,
    'Namaskaram {name} garu,\n\nSorry 🙏 your *{service}* ({route}, {preferredDate}) could not be booked.\n💰 Amount: ₹{refundAmount}\n📌 Refund status: {refundStatus}\n\nContact us for another date or another train / bus / flight.' + SIGN_EN],
  ['travel_cancelled', 'Travel - ticket cancelled',
    'నమస్కారం {name} గారు,\n\nమీ టికెట్ (PNR *{ttdRef}*, {route}, {serviceDate}) రద్దు చేయబడింది.\n💰 రీఫండ్: ₹{refundAmount} ({refundStatus})\n\nరైల్వే / ఆపరేటర్ / ఎయిర్‌లైన్ నిబంధనల ప్రకారం రద్దు ఛార్జీలు మినహాయించబడతాయి.' + SIGN_TE,
    'Namaskaram {name} garu,\n\nYour ticket (PNR *{ttdRef}*, {route}, {serviceDate}) has been cancelled.\n💰 Refund: ₹{refundAmount} ({refundStatus})\n\nCancellation charges are deducted as per railway / operator / airline rules.' + SIGN_EN],
  ['travel_reminder', 'Travel - journey reminder',
    'శుభ ప్రయాణం {name} గారు 🙏\n\nగుర్తు: మీ ప్రయాణం *{serviceDate}* న, ⏰ {slot}.\n🎫 PNR: *{ttdRef}* · 🛣️ {route}\n🚆 {operator} {vehicleNo} · 💺 {seatInfo}\n📍 బోర్డింగ్: {boardingPoint}\n\n✔ ఒరిజినల్ ఫోటో ID ✔ టికెట్ ✔ 30 నిమిషాల ముందే చేరుకోండి' + SIGN_TE,
    'Happy journey {name} garu 🙏\n\nReminder: your journey is on *{serviceDate}*, ⏰ {slot}.\n🎫 PNR: *{ttdRef}* · 🛣️ {route}\n🚆 {operator} {vehicleNo} · 💺 {seatInfo}\n📍 Boarding: {boardingPoint}\n\n✔ Original photo ID ✔ Ticket ✔ Reach 30 minutes early' + SIGN_EN]
);
DEFAULT_SMS.travel_received = ['{name} గారు, మీ {service} ({route}) అభ్యర్థన నమోదైంది. నం. {bookingId}. బుక్ అవగానే PNR పంపిస్తాము.' + SMS_TE_SIGN,
  '{name} garu, your {service} request ({route}) is received. No. {bookingId}. We will send the PNR once booked.' + SMS_EN_SIGN];
DEFAULT_SMS.travel_booked = ['{name} గారు, టికెట్ బుక్ అయింది. PNR {ttdRef}, {route}, {serviceDate} {slot}, సీటు {seatInfo}, {ticketStatus}. శుభ ప్రయాణం!' + SMS_TE_SIGN,
  '{name} garu, ticket booked. PNR {ttdRef}, {route}, {serviceDate} {slot}, seat {seatInfo}, {ticketStatus}. Happy journey!' + SMS_EN_SIGN];
DEFAULT_SMS.travel_not_booked = ['{name} గారు, క్షమించండి. {service} ({route}) టికెట్ బుక్ కాలేదు. ₹{refundAmount}: {refundStatus}.' + SMS_TE_SIGN,
  '{name} garu, sorry, {service} ({route}) could not be booked. Rs.{refundAmount}: {refundStatus}.' + SMS_EN_SIGN];
DEFAULT_SMS.travel_cancelled = ['{name} గారు, PNR {ttdRef} టికెట్ రద్దు అయింది. రీఫండ్ ₹{refundAmount} ({refundStatus}).' + SMS_TE_SIGN,
  '{name} garu, ticket PNR {ttdRef} is cancelled. Refund Rs.{refundAmount} ({refundStatus}).' + SMS_EN_SIGN];
DEFAULT_SMS.travel_reminder = ['గుర్తు: {name} గారు, మీ ప్రయాణం {serviceDate} {slot}. PNR {ttdRef}, {route}, సీటు {seatInfo}. ఫోటో ID, టికెట్ వెంట ఉంచుకోండి.' + SMS_TE_SIGN,
  'Reminder: {name} garu, your journey is on {serviceDate} {slot}. PNR {ttdRef}, {route}, seat {seatInfo}. Carry photo ID and ticket.' + SMS_EN_SIGN];
DEFAULT_MESSAGES.push(
  ['app_applied', 'Application submitted',
    'నమస్కారం {name} గారు 🙏\n\nమీ *{service}* దరఖాస్తు సమర్పించబడింది ✅\n📄 దరఖాస్తు నం.: *{ttdRef}*\n🧾 మా నంబర్: {bookingId}\n📅 అంచనా తేదీ: {expectedDate}\n\nస్థితి మారగానే మీకు తెలియజేస్తాము.' + SIGN_TE,
    'Namaskaram {name} garu 🙏\n\nYour *{service}* application is submitted ✅\n📄 Application no: *{ttdRef}*\n🧾 Our number: {bookingId}\n📅 Expected by: {expectedDate}\n\nWe will inform you when the status changes.' + SIGN_EN],
  ['app_in_process', 'Application in process',
    'నమస్కారం {name} గారు 🙏\n\nమీ *{service}* దరఖాస్తు (నం. {ttdRef}) ప్రాసెస్‌లో ఉంది ⏳\n📅 అంచనా తేదీ: {expectedDate}\n\nపూర్తవగానే తెలియజేస్తాము.' + SIGN_TE,
    'Namaskaram {name} garu 🙏\n\nYour *{service}* application (no. {ttdRef}) is in process ⏳\n📅 Expected by: {expectedDate}\n\nWe will inform you as soon as it is done.' + SIGN_EN],
  ['app_ready', 'Ready to collect',
    'నమస్కారం {name} గారు 🙏\n\nమీ *{service}* సిద్ధంగా ఉంది ✅\n📄 దరఖాస్తు నం.: {ttdRef}\n💰 బాకీ: ₹{balance}\n\n🏪 మా సెంటర్‌కు వచ్చి తీసుకోండి. ఈ మెసేజ్ / రసీదు, మీ ఫోటో ID వెంట తీసుకురండి.' + SIGN_TE,
    'Namaskaram {name} garu 🙏\n\nYour *{service}* is ready ✅\n📄 Application no: {ttdRef}\n💰 Balance: ₹{balance}\n\n🏪 Please collect it at our centre. Bring this message / receipt and your photo ID.' + SIGN_EN],
  ['app_rejected', 'Application rejected',
    'నమస్కారం {name} గారు,\n\nక్షమించండి 🙏 మీ *{service}* దరఖాస్తు (నం. {ttdRef}) తిరస్కరించబడింది.\n📌 కారణం: {remarks}\n💰 రీఫండ్: ₹{refundAmount} ({refundStatus})\n\nసరైన పత్రాలతో మళ్లీ దరఖాస్తు చేయడానికి మమ్మల్ని సంప్రదించండి.' + SIGN_TE,
    'Namaskaram {name} garu,\n\nSorry 🙏 your *{service}* application (no. {ttdRef}) was rejected.\n📌 Reason: {remarks}\n💰 Refund: ₹{refundAmount} ({refundStatus})\n\nContact us to apply again with the right documents.' + SIGN_EN]
);
DEFAULT_SMS.app_applied = ['{name} గారు, మీ {service} దరఖాస్తు సమర్పించబడింది. నం. {ttdRef}. అంచనా తేదీ {expectedDate}.' + SMS_TE_SIGN,
  '{name} garu, your {service} application is submitted. No. {ttdRef}. Expected by {expectedDate}.' + SMS_EN_SIGN];
DEFAULT_SMS.app_in_process = ['{name} గారు, మీ {service} దరఖాస్తు ({ttdRef}) ప్రాసెస్‌లో ఉంది. అంచనా {expectedDate}.' + SMS_TE_SIGN,
  '{name} garu, your {service} application ({ttdRef}) is in process. Expected by {expectedDate}.' + SMS_EN_SIGN];
DEFAULT_SMS.app_ready = ['{name} గారు, మీ {service} సిద్ధంగా ఉంది. సెంటర్‌కు వచ్చి తీసుకోండి. బాకీ ₹{balance}.' + SMS_TE_SIGN,
  '{name} garu, your {service} is ready. Please collect at our centre. Balance Rs.{balance}.' + SMS_EN_SIGN];
DEFAULT_SMS.app_rejected = ['{name} గారు, మీ {service} దరఖాస్తు తిరస్కరించబడింది. కారణం: {remarks}. మమ్మల్ని సంప్రదించండి.' + SMS_TE_SIGN,
  '{name} garu, your {service} application was rejected. Reason: {remarks}. Please contact us.' + SMS_EN_SIGN];
DEFAULT_SMS.order_received = ['{name} గారు, మీ {service} పని నమోదైంది. నం. {bookingId}. మొత్తం ₹{total}, చెల్లించినది ₹{received}. పూర్తవగానే తెలియజేస్తాము.' + SMS_TE_SIGN,
  '{name} garu, your {service} request is received. No. {bookingId}. Total Rs.{total}, received Rs.{received}. We will inform you when done.' + SMS_EN_SIGN];
DEFAULT_SMS.order_completed = ['{name} గారు, మీ {service} పని పూర్తయింది. నం. {bookingId}. ధన్యవాదాలు.' + SMS_TE_SIGN,
  '{name} garu, your {service} work is completed. No. {bookingId}. Thank you.' + SMS_EN_SIGN];
/** Starter list for the other departments: [department, name, fee, per, serviceCharge]. Fees change: the shop must check them. */
var DEFAULT_AGS_SERVICES = [
  ['Train', 'Train ticket (General)', 0, 'Person', 50], ['Train', 'Train ticket (Tatkal)', 0, 'Person', 100], ['Train', 'Train ticket cancellation', 0, 'Booking', 30],
  ['Bus', 'APSRTC bus ticket', 0, 'Person', 30], ['Bus', 'Private bus ticket', 0, 'Person', 50],
  ['Flight', 'Domestic flight ticket', 0, 'Person', 200], ['Flight', 'International flight ticket', 0, 'Person', 500],
  ['Aadhaar', 'Aadhaar demographic update (mobile / address / name / DOB)', 0, 'Person', 50], ['Aadhaar', 'Aadhaar biometric update', 0, 'Person', 50],
  ['Aadhaar', 'PVC Aadhaar card order', 0, 'Person', 30], ['Aadhaar', 'e-Aadhaar download & print', 0, 'Person', 20],
  ['PAN', 'New PAN card', 0, 'Person', 100], ['PAN', 'PAN correction / reprint', 0, 'Person', 100], ['PAN', 'PAN - Aadhaar link', 0, 'Person', 50], ['PAN', 'e-PAN download', 0, 'Person', 20],
  ['Voter ID', 'New voter registration (Form 6)', 0, 'Person', 50], ['Voter ID', 'Voter correction / shifting (Form 8)', 0, 'Person', 50],
  ['Voter ID', 'e-EPIC download & print', 0, 'Person', 20], ['Voter ID', 'Voter ID - Aadhaar link (Form 6B)', 0, 'Person', 30],
  ['Certificates', 'Income certificate', 0, 'Person', 50], ['Certificates', 'Caste certificate', 0, 'Person', 50], ['Certificates', 'Residence certificate', 0, 'Person', 50],
  ['Certificates', 'EWS certificate', 0, 'Person', 50], ['Certificates', 'Birth / death certificate', 0, 'Person', 50], ['Certificates', 'Family member certificate', 0, 'Person', 50],
  ['Ration & Pension', 'Rice card - new / add / remove member', 0, 'Booking', 50], ['Ration & Pension', 'Pension application', 0, 'Person', 50],
  ['Govt Schemes', 'PM-Kisan registration / eKYC', 0, 'Person', 30], ['Govt Schemes', 'Scholarship application', 0, 'Person', 50],
  ['Govt Schemes', 'Health card (Aarogyasri / Ayushman)', 0, 'Person', 30], ['Govt Schemes', 'e-Shram / labour card', 0, 'Person', 30],
  ['Passport', 'Passport application & appointment', 0, 'Person', 200],
  ['Transport (RTO)', 'Learner licence (LLR)', 0, 'Person', 100], ['Transport (RTO)', 'Driving licence / renewal', 0, 'Person', 100], ['Transport (RTO)', 'RC services (transfer / duplicate)', 0, 'Booking', 100],
  ['Tax & Business', 'Income tax return (ITR) filing', 0, 'Person', 300], ['Tax & Business', 'GST registration', 0, 'Booking', 500], ['Tax & Business', 'GST return filing', 0, 'Booking', 300],
  ['Tax & Business', 'Udyam registration', 0, 'Booking', 200], ['Tax & Business', 'FSSAI registration', 0, 'Booking', 300],
  ['Insurance', 'Vehicle insurance', 0, 'Booking', 100], ['Insurance', 'Health / life insurance', 0, 'Booking', 100], ['Insurance', 'PMJJBY / PMSBY enrolment', 0, 'Person', 20],
  ['Exams & Jobs', 'Online job / exam application', 0, 'Person', 50], ['Exams & Jobs', 'Hall ticket / result print', 0, 'Person', 20],
  ['Bill Payments', 'Electricity bill', 0, 'Booking', 10], ['Bill Payments', 'Mobile / DTH recharge', 0, 'Booking', 0], ['Bill Payments', 'FASTag recharge', 0, 'Booking', 10], ['Bill Payments', 'Gas booking', 0, 'Booking', 10],
  ['Banking', 'Money transfer (DMT)', 0, 'Booking', 20], ['Banking', 'AEPS cash withdrawal', 0, 'Booking', 0], ['Banking', 'Bank account opening', 0, 'Person', 50],
  ['Counter', 'Xerox (per page)', 2, 'Person', 0], ['Counter', 'Print (per page)', 5, 'Person', 0], ['Counter', 'Lamination', 20, 'Person', 0], ['Counter', 'Passport photos (set)', 50, 'Booking', 0]
];
/** Starter document checklists and usual days: service name -> [documents, days]. The shop can edit them in Services. */
var DEFAULT_DOCS = {
  'Aadhaar demographic update (mobile / address / name / DOB)': ['Aadhaar card, Proof of address / DOB (as needed), Mobile', 15],
  'Aadhaar biometric update': ['Aadhaar card', 15], 'PVC Aadhaar card order': ['Aadhaar number, Mobile with OTP', 10],
  'New PAN card': ['Aadhaar card, Passport photo, Signature, Mobile', 15], 'PAN correction / reprint': ['PAN card copy, Aadhaar card, Proof of correction', 15],
  'PAN - Aadhaar link': ['PAN card, Aadhaar card, Mobile', 3],
  'New voter registration (Form 6)': ['Aadhaar card, Passport photo, Age proof, Address proof, Family member voter ID', 30],
  'Voter correction / shifting (Form 8)': ['Voter ID (EPIC), Aadhaar card, Proof of correction / new address', 30],
  'Voter ID - Aadhaar link (Form 6B)': ['Voter ID (EPIC), Aadhaar card', 7],
  'Income certificate': ['Aadhaar card, Rice card, Passport photo, Self declaration', 7], 'Caste certificate': ['Aadhaar card, Rice card, Passport photo, Parent caste certificate', 30],
  'Residence certificate': ['Aadhaar card, Rice card, Address proof', 7], 'EWS certificate': ['Aadhaar card, Income certificate, Land / property details', 15],
  'Birth / death certificate': ['Hospital / panchayat record, Aadhaar of parent / applicant', 15], 'Family member certificate': ['Aadhaar of all members, Death certificate (if any), Rice card', 30],
  'Rice card - new / add / remove member': ['Aadhaar of all members, Passport photo, Rice card (for changes)', 30], 'Pension application': ['Aadhaar card, Bank passbook, Age / disability proof, Passport photo', 30],
  'PM-Kisan registration / eKYC': ['Aadhaar card, Land passbook, Bank passbook, Mobile', 15], 'Scholarship application': ['Aadhaar card, Income & caste certificate, Marks memo, Bank passbook, College ID', 30],
  'Health card (Aarogyasri / Ayushman)': ['Aadhaar card, Rice card, Mobile', 15], 'e-Shram / labour card': ['Aadhaar card, Bank passbook, Mobile', 3],
  'Passport application & appointment': ['Aadhaar card, Birth proof / 10th memo, Address proof, Old passport (renewal)', 30],
  'Learner licence (LLR)': ['Aadhaar card, Age proof, Passport photo, Signature', 7], 'Driving licence / renewal': ['LLR / old licence, Aadhaar card, Passport photo', 30],
  'RC services (transfer / duplicate)': ['RC copy, Insurance, PUC, Aadhaar card, Form 29 / 30', 30],
  'Income tax return (ITR) filing': ['PAN card, Aadhaar card, Form 16 / income details, Bank statement', 7], 'GST registration': ['PAN, Aadhaar, Business address proof, Bank details, Photo', 15],
  'Udyam registration': ['Aadhaar card, PAN, Bank details, Business details', 3], 'FSSAI registration': ['Aadhaar card, Passport photo, Business address proof', 30],
  'Bank account opening': ['Aadhaar card, PAN card, Passport photo', 7]
};
var DEFAULT_SERVICES = [
  ['Darshan', 'Special Entry Darshan (₹300)', 300, 'Person', 6, 100, 'Online Quota', 24, '10:00', 'As printed on ticket'],
  ['Darshan', 'SRIVANI Trust Darshan', 10500, 'Person', 1, 200, 'Online Quota', 23, '11:00', 'As printed on ticket'],
  ['Darshan', 'Senior Citizens / Differently-abled Darshan', 0, 'Person', 2, 100, 'Online Quota', 23, '15:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Suprabhatam', 120, 'Person', 6, 100, 'Lucky Dip', 18, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Thomala Seva', 220, 'Person', 6, 100, 'Lucky Dip', 18, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Archana', 220, 'Person', 6, 100, 'Lucky Dip', 18, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Astadala Pada Padmaradhana', 1250, 'Person', 6, 100, 'Lucky Dip', 18, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Nijapada Darshanam', 200, 'Person', 6, 100, 'Lucky Dip', 18, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Kalyanotsavam', 1000, 'Couple', 2, 150, 'Online Quota', 21, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Unjal Seva', 200, 'Person', 6, 100, 'Online Quota', 21, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Arjitha Brahmotsavam', 200, 'Person', 6, 100, 'Online Quota', 21, '10:00', 'As printed on ticket'],
  ['Arjitha Seva', 'Sahasra Deepalankara Seva', 200, 'Person', 6, 100, 'Online Quota', 21, '10:00', 'As printed on ticket'],
  ['Virtual Seva', 'Virtual Kalyanotsavam (with darshan)', 1000, 'Couple', 2, 150, 'Online Quota', 21, '15:00', 'As printed on ticket'],
  ['Angapradakshinam', 'Angapradakshinam Token', 0, 'Person', 1, 100, 'Online Quota', 23, '10:00', 'As printed on ticket'],
  ['Homam', 'Srinivasa Divyanugraha Homam (Alipiri)', 1600, 'Couple', 2, 150, 'Online Quota', 23, '15:00', 'Alipiri Saptha Go Pradakshina Mandiram'],
  ['Accommodation', 'Tirumala Rooms (₹50 - ₹100)', 100, 'Room', 1, 100, 'Online Quota', 24, '15:00', 'CRO / sub-enquiry office, Tirumala'],
  ['Accommodation', 'Tirumala Rooms (₹500 - ₹1,000)', 1000, 'Room', 1, 150, 'Online Quota', 24, '15:00', 'CRO / sub-enquiry office, Tirumala'],
  ['Accommodation', 'Tirupati Rooms (Srinivasam / Vishnu Nivasam / Madhavam)', 800, 'Room', 1, 150, 'Online Quota', 24, '15:00', 'Respective complex, Tirupati'],
  ['Donation', 'e-Hundi / Donation', 0, 'Booking', 1, 50, 'Current Booking', '', '', '']
];

// Usual monthly TTD release pattern (TTD announces exact dates every month - edit in the Releases tab).
var RELEASE_PATTERN = [
  ['Arjitha Seva - Electronic Lucky Dip registration (opens)', 'Arjitha Seva', 18, '10:00'],
  ['Arjitha Sevas (Kalyanotsavam, Unjal, Brahmotsavam, Sahasra Deepalankara)', 'Arjitha Seva', 21, '10:00'],
  ['Virtual Sevas & linked darshan', 'Virtual Seva', 21, '15:00'],
  ['Angapradakshinam tokens', 'Angapradakshinam', 23, '10:00'],
  ['SRIVANI Trust darshan', 'Darshan', 23, '11:00'],
  ['Senior citizens & differently-abled darshan', 'Darshan', 23, '15:00'],
  ['Srinivasa Divyanugraha Homam', 'Homam', 23, '15:00'],
  ['Special Entry Darshan (₹300)', 'Darshan', 24, '10:00'],
  ['Tirumala & Tirupati accommodation', 'Accommodation', 24, '15:00']
];

// ================================================================== menu & setup
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🙏 AGS Master')
    .addItem('Set up / repair sheet', 'setup')
    .addItem('Add next month\'s release dates', 'menuAddReleases')
    .addItem('Show dashboard link', 'menuShowLink')
    .addToUi();
}

function menuShowLink() {
  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) { url = ''; }
  var html = url
    ? '<p style="font-family:sans-serif">Open your dashboard:<br><a href="' + url + '" target="_blank">' + url + '</a></p>'
    : '<p style="font-family:sans-serif">Not deployed yet. In the Apps Script editor click <b>Deploy &gt; New deployment &gt; Web app</b> (Execute as: Me, Who has access: Anyone).</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(460).setHeight(140), 'TTD Master dashboard');
}

function menuAddReleases() {
  var n = addReleasesForMonth_(monthKey_(addMonths_(new Date(), 1)));
  SpreadsheetApp.getActive().toast(n + ' release dates added for next month. Check them against the TTD announcement.', 'TTD Master', 8);
}

/** Creates every tab with headers, dropdowns, colours and starter data. Safe to run again (repairs). */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = props.getProperty('SHEET_ID') ? SpreadsheetApp.openById(props.getProperty('SHEET_ID')) : SpreadsheetApp.getActive();
  props.setProperty('SHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone(APP.tz);
  SHEET_ORDER.forEach(function (name, i) {
    var def = SCHEMA[name];
    var sh = ss.getSheetByName(name) || ss.insertSheet(name, i);
    var headers = def.cols.map(function (col) { return col.header; });
    var existing = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    // Add any missing header at the end (keeps user columns and order).
    var missing = headers.filter(function (h) { return existing.indexOf(h) < 0; });
    if (!existing.filter(String).length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (missing.length) {
      sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    }
    var all = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, all.length).setFontWeight('bold').setFontColor('#ffffff').setBackground(def.color)
      .setVerticalAlignment('middle').setWrap(true);
    sh.setRowHeight(1, 40);
    sh.setTabColor(def.color);
    var maxRows = Math.max(sh.getMaxRows(), 1000);
    def.cols.forEach(function (col) {
      var ci = all.indexOf(col.header) + 1;
      if (!ci) return;
      sh.setColumnWidth(ci, col.width);
      var rng = sh.getRange(2, ci, maxRows - 1, 1);
      if (col.type === 'text') rng.setNumberFormat('@');
      if (col.type === 'date') rng.setNumberFormat('dd/MM/yyyy');
      if (col.type === 'datetime') rng.setNumberFormat('dd/MM/yyyy HH:mm');
      if (col.type === 'money') rng.setNumberFormat('₹#,##0');
      if (col.type === 'number') rng.setNumberFormat('0');
      if (col.list) {
        rng.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(LISTS[col.list], true).setAllowInvalid(true).build());
      }
    });
    if (name === 'Bookings') colourStatuses_(sh, all.indexOf('Booking Status') + 1, maxRows);
  });
  // Services dropdown on Bookings comes from the Services tab.
  var bk = ss.getSheetByName('Bookings');
  var bh = bk.getRange(1, 1, 1, bk.getLastColumn()).getValues()[0];
  var svc = ss.getSheetByName('Services');
  bk.getRange(2, bh.indexOf('Service') + 1, bk.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(svc.getRange('C2:C'), true).setAllowInvalid(true).build());

  seed_();
  var def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
  try { syncReminderTrigger_(); } catch (e) { /* trigger permission not granted yet: saving Settings retries */ }
  try { ss.setActiveSheet(bk); } catch (e) { /* not available from the web app */ }
  try { ss.toast('Sheet is ready. Next: Deploy > New deployment > Web app.', 'TTD Master', 10); } catch (e) { /* run from editor */ }
  return 'ok';
}

/** Repairs the sheet once after an update that added columns (cheap check on every call). */
function ensureSchema_() {
  if (PropertiesService.getScriptProperties().getProperty('SCHEMA_VERSION') !== SCHEMA_VERSION) setup();
}

function colourStatuses_(sh, col, maxRows) {
  if (col < 1) return;
  var rng = sh.getRange(2, col, maxRows - 1, 1);
  var colours = {
    'Requested': ['#FEF3C7', '#92400E'], 'Attempting': ['#DBEAFE', '#1E40AF'], 'Booked': ['#D1FAE5', '#065F46'],
    'Not Booked': ['#FEE2E2', '#991B1B'], 'Lucky Dip - Registered': ['#EDE9FE', '#5B21B6'], 'Lucky Dip - Selected': ['#D1FAE5', '#065F46'],
    'Lucky Dip - Not Selected': ['#FCE7F3', '#9D174D'], 'Payment Failed': ['#FFEDD5', '#9A3412'], 'Cancelled': ['#E5E7EB', '#374151'],
    'Completed': ['#CCFBF1', '#115E59'], 'Applied': ['#E0E7FF', '#3730A3'], 'In Process': ['#DBEAFE', '#1E40AF'],
    'Ready to Collect': ['#D1FAE5', '#065F46'], 'Rejected': ['#FEE2E2', '#991B1B']
  };
  var rules = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (x) { return x.getColumn() === col; });
  });
  Object.keys(colours).forEach(function (k) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k).setBackground(colours[k][0]).setFontColor(colours[k][1])
      .setBold(true).setRanges([rng]).build());
  });
  sh.setConditionalFormatRules(rules);
}

function seed_() {
  var now = new Date();
  if (!readAll_('Settings').length) appendRows_('Settings', DEFAULT_SETTINGS.map(function (r) { return { key: r[0], value: r[1], about: r[2] }; }));
  else {
    var have = readAll_('Settings').map(function (s) { return s.key; });
    appendRows_('Settings', DEFAULT_SETTINGS.filter(function (r) { return have.indexOf(r[0]) < 0; })
      .map(function (r) { return { key: r[0], value: r[1], about: r[2] }; }));
  }
  var msgRows = readAll_('Messages');
  var msgs = msgRows.map(function (m) { return m.key; });
  appendRows_('Messages', DEFAULT_MESSAGES.filter(function (m) { return msgs.indexOf(m[0]) < 0; })
    .map(function (m) { var sm = DEFAULT_SMS[m[0]] || ['', '']; return { key: m[0], name: m[1], telugu: m[2], english: m[3], smsTelugu: sm[0], smsEnglish: sm[1] }; }));
  msgRows.forEach(function (m, i) {
    var sm = DEFAULT_SMS[m.key];
    if (sm && !m.smsTelugu && !m.smsEnglish) writeFields_('Messages', i + 2, { smsTelugu: sm[0], smsEnglish: sm[1] });
  });
  if (!readAll_('Services').length) {
    appendRows_('Services', DEFAULT_SERVICES.map(function (s, i) {
      return { serviceId: 'S' + pad_(i + 1, 3), category: s[0], name: s[1], price: s[2], per: s[3], maxPersons: s[4], serviceCharge: s[5],
        department: 'TTD', mode: s[6], releaseDay: s[7], releaseTime: s[8], reportingPoint: s[9], active: 'Yes', notes: 'Check the current price on the TTD site' };
    }));
  }
  // Every row from before departments existed is TTD.
  ['Services', 'Bookings'].forEach(function (tab) {
    readAll_(tab).forEach(function (r, i) { if (!r.department) writeFields_(tab, i + 2, { department: 'TTD' }); });
  });
  // Starter services for each new department, once (a department the shop emptied is not refilled).
  var props = PropertiesService.getScriptProperties();
  var seeded = String(props.getProperty('SEEDED_DEPTS') || '').split('|');
  var svcAll = readAll_('Services');
  var nextS = nextSeq_(svcAll.map(function (x) { return x.serviceId; }), 'S');
  var add = DEFAULT_AGS_SERVICES.filter(function (r) {
    return seeded.indexOf(r[0]) < 0 && !svcAll.some(function (x) { return x.department === r[0]; });
  }).map(function (r) {
    return { serviceId: 'S' + pad_(nextS++, 3), department: r[0], category: r[0], name: r[1], price: r[2], per: r[3], maxPersons: r[3] === 'Person' ? 10 : 1,
      serviceCharge: r[4], mode: deptInfo_(r[0]).kind === 'quick' ? 'Counter' : 'Online', active: 'Yes', notes: 'Starter entry: set your fee and charge' };
  });
  appendRows_('Services', add);
  readAll_('Services').forEach(function (r, i) {
    var dd = DEFAULT_DOCS[r.name];
    if (dd && !r.documents && !r.daysToComplete) writeFields_('Services', i + 2, { documents: dd[0], daysToComplete: dd[1] });
  });
  props.setProperty('SEEDED_DEPTS', LISTS.departments.join('|'));
  if (!readAll_('Users').length) appendRows_('Users', [{ name: 'Admin', role: 'Admin', pinHash: hashPin_('1234'), active: 'Yes' }]);
  if (!readAll_('Releases').length) { addReleasesForMonth_(monthKey_(now)); addReleasesForMonth_(monthKey_(addMonths_(now, 1))); }
}

function addReleasesForMonth_(mk) {
  var have = readAll_('Releases');
  var y = Number(mk.slice(0, 4)), m = Number(mk.slice(5, 7));
  var rows = [];
  var next = nextSeq_(have.map(function (r) { return r.releaseId; }), 'R');
  RELEASE_PATTERN.forEach(function (p) {
    var d = new Date(y, m - 1, p[2]);
    var dup = have.some(function (r) { return r.label === p[0] && r.releaseDate && sameDay_(r.releaseDate, d); });
    if (dup) return;
    rows.push({ releaseId: 'R' + pad_(next++, 4), label: p[0], category: p[1], releaseDate: d, releaseTime: p[3],
      quotaMonth: monthName_(addMonths_(d, 3)), notes: 'Usual pattern - confirm with TTD announcement' });
  });
  appendRows_('Releases', rows);
  return rows.length;
}

// ================================================================== web app
function doGet(e) {
  if (e && e.parameter && e.parameter.api) return json_(extApi_(e.parameter));
  var t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate().setTitle('Adithya TTD Master')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://cdn.jsdelivr.net/npm/twemoji@11.3.0/2/72x72/1f64f.png')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

/** Chrome extension endpoint: POST JSON { key, action, ... } as text/plain. */
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'Bad JSON' }); }
  return json_(extApi_(body));
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ================================================================== dashboard API
/** Single entry point for the dashboard: google.script.run.api(token, action, payload). */
function api(token, action, payload) {
  try {
    ensureSchema_();
    if (action === 'login') return { ok: true, data: login_(payload) };
    var user = userFromToken_(token);
    if (!user) return { ok: false, error: 'SESSION', message: 'Please log in again.' };
    var fn = ACTIONS[action];
    if (!fn) return { ok: false, error: 'Unknown action ' + action };
    if (ADMIN_ONLY.indexOf(action) >= 0 && user.role !== 'Admin') return { ok: false, error: 'Only an Admin can do this.' };
    return { ok: true, data: fn(payload || {}, user) };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

var ADMIN_ONLY = ['deleteBooking', 'deleteCustomer', 'saveUser', 'deleteUser', 'saveSettings', 'newApiKey', 'deleteService', 'testSms', 'runReminders'];

var ACTIONS = {
  bootstrap: function (p, user) { return bootstrap_(user); },
  saveBooking: function (p, user) { return saveBooking_(p, user); },
  deleteBooking: function (p, user) { deleteRecord_('Bookings', p.bookingId, user); return true; },
  markMessage: function (p, user) { return markSent_(p.bookingId, p.channel || 'WhatsApp', user); },
  sendSms: function (p, user) {
    var bk = findRow_('Bookings', 'bookingId', p.bookingId);
    if (!bk) throw new Error('Booking not found');
    var text = p.text || buildMessage_(clean_(bk.obj), p.lang || settings_(true).defaultLanguage, 'sms', p.key).text;
    var r = sendSms_(bk.obj.mobile, text);
    var saved = markSent_(p.bookingId, 'SMS', user, r.parts);
    return { booking: saved, response: r.response, parts: r.parts };
  },
  bulkSms: function (p, user) {
    var ids = (p.bookingIds || []).slice(0, 100);
    var sent = [], failed = [];
    ids.forEach(function (id) {
      try {
        var bk = findRow_('Bookings', 'bookingId', id);
        if (!bk) throw new Error('not found');
        var b = clean_(bk.obj);
        var text = buildMessage_(b, p.lang || settings_(true).defaultLanguage, 'sms', p.key || '').text;
        var r = sendSms_(b.mobile, text);
        sent.push(markSent_(id, 'SMS', user, r.parts));
      } catch (e) { failed.push({ bookingId: id, error: String(e && e.message || e) }); }
    });
    log_(user, 'Bulk SMS', 'Bulk SMS', sent.length + ' sent, ' + failed.length + ' failed' + (p.key ? ' (' + p.key + ')' : ''));
    return { sent: sent, failed: failed };
  },
  testSms: function (p, user) {
    var r = sendSms_(p.mobile, p.text || ('Test SMS from ' + (settings_(true).shopName || APP.name) + '. ఓం నమో వేంకటేశాయ.'));
    log_(user, 'Settings', 'Test SMS', digits_(p.mobile) + ' · ' + r.response);
    return r;
  },
  saveCustomer: function (p, user) { return saveCustomer_(p, user); },
  deleteCustomer: function (p, user) { deleteRecord_('Customers', p.customerId, user); return true; },
  importCustomers: function (p, user) { return importCustomers_(p.rows || [], user); },
  saveService: function (p, user) { return saveSimple_('Services', 'serviceId', 'S', 3, p, user); },
  deleteService: function (p, user) { deleteRecord_('Services', p.serviceId, user); return true; },
  saveRelease: function (p, user) { return saveSimple_('Releases', 'releaseId', 'R', 4, p, user); },
  deleteRelease: function (p, user) { deleteRecord_('Releases', p.releaseId, user); return true; },
  addReleases: function (p) { addReleasesForMonth_(p.month); return readAll_('Releases').map(clean_); },
  saveLogin: function (p, user) {
    p.loginId = digits_(p.loginId).slice(-10);
    if (!p.loginId) throw new Error('Login mobile is required');
    var ex = findRow_('TTD Logins', 'loginId', p.loginId);
    if (!ex) p.createdOn = new Date();
    upsert_('TTD Logins', 'loginId', p);
    log_(user, p.loginId, ex ? 'Login updated' : 'Login added', p.holder || '');
    return clean_(findRow_('TTD Logins', 'loginId', p.loginId).obj);
  },
  deleteLogin: function (p, user) { deleteRecord_('TTD Logins', p.loginId, user); return true; },
  saveMessage: function (p, user) { upsert_('Messages', 'key', p); log_(user, p.key, 'Message template edited', ''); return true; },
  saveSettings: function (p, user) {
    Object.keys(p).forEach(function (k) {
      if (k === 'apiKey' || (SECRET_SETTINGS.indexOf(k) >= 0 && /^•+$/.test(String(p[k])))) return;
      upsert_('Settings', 'key', { key: k, value: p[k] });
    });
    log_(user, 'Settings', 'Settings saved', Object.keys(p).join(', '));
    if ('autoReminder' in p || 'reminderHour' in p) {
      try { syncReminderTrigger_(); } catch (e) {
        throw new Error('Settings saved, but the daily reminder timer could not be set. Open Extensions › Apps Script, run "setup" once and allow the new permission, then save again. (' + (e && e.message || e) + ')');
      }
    }
    return settings_(true);
  },
  newApiKey: function (p, user) {
    var key = 'ttd_' + Utilities.getUuid().replace(/-/g, '');
    upsert_('Settings', 'key', { key: 'apiKey', value: key });
    log_(user, 'Settings', 'New extension API key', '');
    return key;
  },
  saveUser: function (p, user) {
    if (!p.name) throw new Error('Name is required');
    var row = { name: p.name, role: p.role || 'Staff', active: p.active || 'Yes' };
    if (p.pin) {
      if (!/^\d{4,8}$/.test(p.pin)) throw new Error('PIN must be 4 to 8 digits');
      row.pinHash = hashPin_(p.pin);
    } else if (!findRow_('Users', 'name', p.name)) throw new Error('Set a PIN for the new user');
    upsert_('Users', 'name', row);
    log_(user, p.name, 'User saved', row.role);
    return users_();
  },
  deleteUser: function (p, user) {
    if (p.name === user.name) throw new Error('You cannot delete yourself');
    deleteRecord_('Users', p.name, user);
    return users_();
  },
  changePin: function (p, user) {
    var u = findRow_('Users', 'name', user.name);
    if (!u || u.obj.pinHash !== hashPin_(p.oldPin)) throw new Error('Current PIN is wrong');
    if (!/^\d{4,8}$/.test(p.newPin)) throw new Error('PIN must be 4 to 8 digits');
    upsert_('Users', 'name', { name: user.name, pinHash: hashPin_(p.newPin) });
    log_(user, user.name, 'PIN changed', '');
    return true;
  },
  activity: function (p) { return activity_(p.limit || 300); },
  runReminders: function (p, user) { return runReminders_(user, !!p.dryRun); },
  quickSale: function (p, user) {
    var svc = findRow_('Services', 'name', p.service);
    var qty = Math.max(1, Number(p.qty) || 1);
    var fee = p.amount !== '' && p.amount != null ? Number(p.amount) || 0 : (svc ? Number(svc.obj.price) || 0 : 0) * qty;
    var chg = p.serviceCharge !== '' && p.serviceCharge != null ? Number(p.serviceCharge) || 0 : (svc ? Number(svc.obj.serviceCharge) || 0 : 0) * qty;
    return saveBooking_({ department: p.department || (svc && svc.obj.department) || 'Counter', service: p.service, customerName: p.customerName || 'Walk-in',
      mobile: p.mobile || '', persons: qty, ticketAmount: fee, serviceCharge: chg, received: fee + chg, paymentMode: p.paymentMode || 'Cash',
      status: 'Completed', messageStatus: p.mobile ? 'Not Sent' : 'Not Needed', remarks: p.remarks || '' }, user, 'Quick sale');
  },
  receiptPrinted: function (p, user) {
    if (!findRow_('Bookings', 'bookingId', p.bookingId)) throw new Error('Booking not found');
    log_(user, p.bookingId, 'Receipt printed', String(p.size || '') + (p.lang ? ', ' + p.lang : ''));
    return true;
  }
};

function bootstrap_(user) {
  var users = readAll_('Users');
  var me = users.filter(function (u) { return u.name === user.name; })[0] || {};
  return {
    app: APP, user: user, lists: LISTS, depts: DEPARTMENTS,
    defaultPin: me.pinHash === hashPin_('1234'),
    settings: settings_(user.role === 'Admin'),
    bookings: readAll_('Bookings').map(clean_),
    customers: readAll_('Customers').map(clean_),
    services: readAll_('Services').map(clean_),
    releases: readAll_('Releases').map(clean_),
    logins: readAll_('TTD Logins').map(clean_),
    messages: readAll_('Messages').map(clean_),
    users: user.role === 'Admin' ? users_() : [],
    activity: activity_(200),
    webAppUrl: webAppUrl_(),
    serverTime: fmt_(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
  };
}

function webAppUrl_() { try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; } }

function settings_(withKey) {
  var o = {};
  readAll_('Settings').forEach(function (s) { o[s.key] = s.value == null ? '' : String(s.value); });
  if (!withKey) SECRET_SETTINGS.forEach(function (k) { o[k] = o[k] ? '••••' : ''; });
  return o;
}
function users_() { return readAll_('Users').map(function (u) { return { name: u.name, role: u.role, active: u.active }; }); }
function activity_(limit) {
  var rows = readAll_('Activity Log').map(clean_);
  return rows.slice(Math.max(0, rows.length - limit)).reverse();
}

// ------------------------------------------------------------------ auth
function hashPin_(pin) {
  var salt = PropertiesService.getScriptProperties().getProperty('PIN_SALT');
  if (!salt) { salt = Utilities.getUuid(); PropertiesService.getScriptProperties().setProperty('PIN_SALT', salt); }
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + String(pin));
  return raw.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function login_(p) {
  if (!readAll_('Users').length) setup();
  var name = String(p.name || '').trim();
  var row = readAll_('Users').filter(function (u) { return String(u.name).toLowerCase() === name.toLowerCase() && u.active !== 'No'; })[0];
  // Small delay against PIN guessing.
  Utilities.sleep(400);
  if (!row || row.pinHash !== hashPin_(p.pin)) throw new Error('Wrong name or PIN');
  var token = Utilities.getUuid();
  var user = { name: row.name, role: row.role || 'Staff' };
  CacheService.getScriptCache().put('tok_' + token, JSON.stringify(user), 21600);
  log_(user, row.name, 'Logged in', '');
  return { token: token, user: user };
}

function userFromToken_(token) {
  if (!token) return null;
  var c = CacheService.getScriptCache();
  var v = c.get('tok_' + token);
  if (!v) return null;
  c.put('tok_' + token, v, 21600);  // sliding 6-hour session
  return JSON.parse(v);
}

// ------------------------------------------------------------------ bookings
var MONEY = ['ticketAmount', 'serviceCharge', 'total', 'received', 'refundAmount', 'persons'];

function saveBooking_(p, user, why) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = new Date();
    var ex = p.bookingId ? findRow_('Bookings', 'bookingId', p.bookingId) : null;
    if (p.bookingId && !ex) throw new Error('Booking ' + p.bookingId + ' not found');
    var before = ex ? ex.obj : {};
    var rec = {};
    Object.keys(p).forEach(function (k) { rec[k] = p[k]; });
    MONEY.forEach(function (k) { if (k in rec) rec[k] = rec[k] === '' || rec[k] == null ? '' : Number(rec[k]) || 0; });
    if (rec.mobile) rec.mobile = digits_(rec.mobile).slice(-10);
    if (rec.ttdLogin) rec.ttdLogin = digits_(rec.ttdLogin).slice(-10);
    var merged = {};
    Object.keys(before).forEach(function (k) { merged[k] = before[k]; });
    Object.keys(rec).forEach(function (k) { merged[k] = rec[k]; });
    // Totals and sensible defaults.
    if ('ticketAmount' in rec || 'serviceCharge' in rec || !ex) {
      merged.total = (Number(merged.ticketAmount) || 0) + (Number(merged.serviceCharge) || 0);
      rec.total = merged.total;
    }
    if (!ex) {
      rec.department = deptInfo_(rec.department || (findRow_('Services', 'name', rec.service) || { obj: {} }).obj.department || 'TTD').name;
      if (deptInfo_(rec.department).kind !== 'ttd' && !rec.category) rec.category = rec.department;
      rec.bookingId = nextBookingId_(now, rec.department);
      rec.requestDate = rec.requestDate || now;
      rec.createdOn = now;
      rec.status = rec.status || 'Requested';
      if (!rec.persons) rec.persons = 1;
      rec.messageStatus = rec.messageStatus || 'Not Sent';
      rec.ttdPayment = rec.ttdPayment || 'Not Paid';
      rec.refundStatus = rec.refundStatus || 'Not Applicable';
      rec.handledBy = rec.handledBy || user.name;
      merged.received = Number(merged.received) || 0;
    }
    if (!rec.paymentStatus && ('received' in rec || !ex)) {
      var recv = Number(merged.received) || 0, tot = Number(merged.total) || 0;
      rec.paymentStatus = recv <= 0 ? 'Unpaid' : recv >= tot ? 'Fully Paid' : 'Advance Paid';
    }
    // A status change means the customer needs a fresh message.
    if (ex && rec.status && rec.status !== before.status && !('messageStatus' in p)) { rec.messageStatus = 'Not Sent'; rec.messageVia = ''; }
    if (!ex && !rec.contactVia) rec.contactVia = 'WhatsApp';
    if ((rec.status === 'Booked' || rec.status === 'Lucky Dip - Selected') && !merged.reportingPoint) {
      var svcRow = findRow_('Services', 'name', merged.service);
      if (svcRow && svcRow.obj.reportingPoint) rec.reportingPoint = svcRow.obj.reportingPoint;
    }
    if (rec.status === 'Applied' && !merged.expectedDate) {
      var sv = findRow_('Services', 'name', merged.service);
      var days = sv ? Number(sv.obj.daysToComplete) || 0 : 0;
      if (days) { var ed = new Date(now); ed.setHours(0, 0, 0, 0); ed.setDate(ed.getDate() + days); rec.expectedDate = ed; }
    }
    if (rec.status === 'Booked' || rec.status === 'Lucky Dip - Selected') {
      if (!rec.ttdPayment && (!before.ttdPayment || before.ttdPayment === 'Not Paid')) rec.ttdPayment = 'Paid to TTD';
      if (!rec.refundStatus) rec.refundStatus = 'Not Applicable';
    }
    if ((rec.status === 'Not Booked' || rec.status === 'Lucky Dip - Not Selected' || rec.status === 'Cancelled' || rec.status === 'Rejected') &&
        !rec.refundStatus && (!before.refundStatus || before.refundStatus === 'Not Applicable') && (Number(merged.received) || 0) > 0) {
      rec.refundStatus = 'Refund Pending';
      if (!('refundAmount' in rec)) rec.refundAmount = Number(merged.received) || 0;
    }
    if (rec.status === 'Payment Failed' && !rec.ttdPayment) rec.ttdPayment = 'Debited - No Ticket';
    if (rec.refundStatus === 'Refunded' && !rec.refundDate && !before.refundDate) rec.refundDate = now;
    rec.updatedOn = now;
    if (ex) {
      writeFields_('Bookings', ex.row, rec);
    } else {
      appendRows_('Bookings', [rec]);
    }
    var saved = clean_(findRow_('Bookings', 'bookingId', rec.bookingId || p.bookingId).obj);
    log_(user, saved.bookingId, why || (ex ? (rec.status && rec.status !== before.status ? 'Status: ' + before.status + ' → ' + rec.status : 'Booking edited') : 'Booking created'),
      ex ? diffText_(before, saved) : (saved.customerName + ' · ' + saved.service + ' · ' + saved.persons + ' person(s)'));
    return saved;
  } finally {
    lock.releaseLock();
  }
}

function nextBookingId_(now, department) {
  var prefix = (deptInfo_(department).prefix || settings_(true).bookingPrefix || 'TTD') + '-' + fmt_(now, 'yyMM') + '-';
  var ids = readColumn_('Bookings', 'bookingId').filter(function (id) { return String(id).indexOf(prefix) === 0; });
  var max = 0;
  ids.forEach(function (id) { var n = Number(String(id).slice(prefix.length)); if (n > max) max = n; });
  return prefix + pad_(max + 1, 4);
}

function diffText_(a, b) {
  var skip = ['updatedOn', 'createdOn', 'messageSentOn', 'reminderSentOn'];
  var out = [];
  Object.keys(b).forEach(function (k) {
    if (skip.indexOf(k) >= 0) return;
    var x = a[k] instanceof Date ? fmt_(a[k], 'yyyy-MM-dd') : (a[k] == null ? '' : String(a[k]));
    var y = b[k] == null ? '' : String(b[k]);
    if (x !== y && !(x === '' && y === '0')) out.push(k + ': ' + (x || '-') + ' → ' + (y || '-'));
  });
  return out.slice(0, 12).join('; ');
}

// ------------------------------------------------------------------ customers
function saveCustomer_(p, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = new Date();
    if (!String(p.name || '').trim()) throw new Error('Devotee name is required');
    p.mobile = digits_(p.mobile).slice(-10);
    p.pincode = digits_(p.pincode);
    p.idNumber = String(p.idNumber || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (p.idType === 'Aadhaar Card' && p.idNumber.length === 12) p.idNumber = p.idNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    var ex = p.customerId ? findRow_('Customers', 'customerId', p.customerId) : null;
    if (!ex) {
      p.customerId = 'C' + pad_(nextSeq_(readColumn_('Customers', 'customerId'), 'C'), 5);
      p.createdOn = now;
    }
    p.updatedOn = now;
    upsert_('Customers', 'customerId', p);
    log_(user, p.customerId, ex ? 'Customer edited' : 'Customer added', p.name + (p.profile ? ' (' + p.profile + ')' : ''));
    return clean_(findRow_('Customers', 'customerId', p.customerId).obj);
  } finally {
    lock.releaseLock();
  }
}

/** rows = objects with the template's fields (profile, name, dob, gender, idType, idNumber, gotram, mobile, ...). */
function importCustomers_(rows, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var now = new Date();
    var existing = readAll_('Customers');
    var next = nextSeq_(existing.map(function (r) { return r.customerId; }), 'C');
    var added = 0, updated = 0;
    var adds = [];
    var keyOf = function (r) { return [String(r.profile || '').trim().toLowerCase(), String(r.name || '').trim().toLowerCase(), String(r.dob || '')].join('|'); };
    var byKey = {};
    existing.forEach(function (r, i) { byKey[keyOf(r)] = i; });
    rows.forEach(function (r) {
      if (!r.name) return;
      r.mobile = digits_(r.mobile).slice(-10);
      r.pincode = digits_(r.pincode);
      r.updatedOn = now;
      var k = keyOf(r);
      if (k in byKey) {
        var row = byKey[k] + 2;
        var patch = {};
        Object.keys(r).forEach(function (f) { if (r[f] !== '' && r[f] != null) patch[f] = r[f]; });
        writeFields_('Customers', row, patch);
        updated++;
      } else {
        r.customerId = 'C' + pad_(next++, 5);
        r.createdOn = now;
        adds.push(r);
        byKey[k] = -1;
        added++;
      }
    });
    appendRows_('Customers', adds);
    log_(user, 'Customers', 'Excel import', added + ' added, ' + updated + ' updated');
    return { added: added, updated: updated, customers: readAll_('Customers').map(clean_) };
  } finally {
    lock.releaseLock();
  }
}

function saveSimple_(sheet, idKey, prefix, width, p, user) {
  var ex = p[idKey] ? findRow_(sheet, idKey, p[idKey]) : null;
  if (!ex) p[idKey] = prefix + pad_(nextSeq_(readColumn_(sheet, idKey), prefix), width);
  upsert_(sheet, idKey, p);
  log_(user, p[idKey], (ex ? 'Edited ' : 'Added ') + sheet.replace(/s$/, '').toLowerCase(), p.name || p.label || '');
  return clean_(findRow_(sheet, idKey, p[idKey]).obj);
}

function deleteRecord_(sheet, id, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var key = SCHEMA[sheet].id;
    var ex = findRow_(sheet, key, id);
    if (!ex) throw new Error('Not found: ' + id);
    sheetOf_(sheet).deleteRow(ex.row);
    log_(user, id, 'Deleted from ' + sheet, JSON.stringify(clean_(ex.obj)).slice(0, 400));
  } finally {
    lock.releaseLock();
  }
}

// ================================================================== extension API
function extApi_(b) {
  try {
    ensureSchema_();
    var key = settings_(true).apiKey;
    if (!key || String(b.key || '') !== key) return { ok: false, error: 'Wrong or missing API key. Copy it from Dashboard > Settings > Chrome extension.' };
    var user = { name: String(b.user || 'Extension'), role: 'Staff' };
    switch (b.action) {
      case 'ping':
        return { ok: true, app: APP.name, version: APP.version, shop: settings_(false).shopName, smsReady: smsReady_() };
      case 'pending': {
        var list = readAll_('Bookings').map(clean_).filter(function (x) { return OPEN_STATUSES.indexOf(x.status) >= 0 && (x.department || 'TTD') === 'TTD'; });
        return { ok: true, bookings: list, services: readAll_('Services').map(clean_), logins: readAll_('TTD Logins').map(clean_) };
      }
      case 'customers': {
        // Rows in the extension's template format, ready for its importer.
        var only = b.onlyPending ? pendingCustomerIds_() : null;
        var cust = readAll_('Customers').map(clean_).filter(function (x) { return !only || only[x.customerId]; });
        var head = ['Profile Name', 'Devotee Name (as on ID)', 'Date of Birth (DD/MM/YYYY)', 'Gender', 'Photo ID Type', 'Photo ID Number',
          'Gotram (for Homam)', 'Mobile', 'Email ID', 'Address', 'City / Town', 'District', 'State', 'Pincode', 'Country'];
        var rows = cust.map(function (x) {
          return [x.profile || x.name, x.name, x.dob, x.gender, x.idType, x.idNumber, x.gotram, x.mobile, x.email, x.address, x.city, x.district, x.state, x.pincode, x.country || 'India'];
        });
        return { ok: true, rows: [head].concat(rows), count: rows.length };
      }
      case 'result': {
        if (!b.bookingId) return { ok: false, error: 'bookingId is required' };
        var patch = { bookingId: b.bookingId };
        ['status', 'ttdRef', 'serviceDate', 'slot', 'reportingPoint', 'ticketAmount', 'ttdLogin', 'remarks', 'room', 'checkIn', 'checkOut', 'ttdPayment']
          .forEach(function (k) { if (b[k] !== undefined && b[k] !== '') patch[k] = b[k]; });
        user.name = b.user || 'Extension';
        var saved = saveBooking_(patch, user, 'Result from extension: ' + (patch.status || ''));
        var lang = b.lang || settings_(true).defaultLanguage;
        var msg = buildMessage_(saved, lang);
        var sms = buildMessage_(saved, lang, 'sms');
        return { ok: true, booking: saved, message: msg.text, sms: sms.text, template: msg.key, whatsapp: waLink_(saved.mobile, msg.text),
          contactVia: saved.contactVia || 'WhatsApp', smsReady: smsReady_() };
      }
      case 'messageSent': {
        return { ok: true, booking: markSent_(b.bookingId, b.channel || 'WhatsApp', user) };
      }
      case 'sendSms': {
        var r4 = ACTIONS.sendSms({ bookingId: b.bookingId, text: b.text, lang: b.lang }, user);
        return { ok: true, booking: r4.booking, parts: r4.parts };
      }
      case 'attempting': {
        var s2 = saveBooking_({ bookingId: b.bookingId, status: 'Attempting', ttdLogin: b.ttdLogin || '' }, user, 'Attempt started (extension)');
        return { ok: true, booking: s2 };
      }
      default:
        return { ok: false, error: 'Unknown action' };
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

var OPEN_STATUSES = ['Requested', 'Attempting', 'Lucky Dip - Registered', 'Lucky Dip - Selected', 'Payment Failed', 'Applied', 'In Process', 'Ready to Collect'];
function pendingCustomerIds_() {
  var ids = {};
  readAll_('Bookings').forEach(function (bk) {
    if (OPEN_STATUSES.indexOf(bk.status) < 0) return;
    String(bk.customerIds || '').split(/[,\s]+/).forEach(function (id) { if (id) ids[id] = true; });
  });
  return ids;
}

// ------------------------------------------------------------------ messages (same logic as the dashboard)
function pickTemplate_(b) {
  var kind = deptInfo_(b.department || 'TTD').kind;
  if (kind === 'travel') {
    switch (b.status) {
      case 'Booked': case 'Completed': return 'travel_booked';
      case 'Not Booked': case 'Payment Failed': return 'travel_not_booked';
      case 'Cancelled': return 'travel_cancelled';
      default: return 'travel_received';
    }
  }
  if (kind === 'app' || kind === 'quick') {
    var appKeys = { 'Applied': 'app_applied', 'In Process': 'app_in_process', 'Ready to Collect': 'app_ready', 'Rejected': 'app_rejected' };
    if (appKeys[b.status]) return appKeys[b.status];
    if (b.status === 'Completed' || b.status === 'Booked') return 'order_completed';
    if (b.status === 'Requested' || b.status === 'Attempting') return 'order_received';
  }
  switch (b.status) {
    case 'Requested': case 'Attempting': return 'request_received';
    case 'Booked': case 'Completed': return b.category === 'Accommodation' ? 'booked_room' : 'booked';
    case 'Not Booked':
      return b.refundStatus === 'Refunded' ? 'not_booked_refunded' : b.refundStatus === 'Adjusted to Next Booking' ? 'not_booked_adjusted' : 'not_booked_refund_pending';
    case 'Lucky Dip - Registered': return 'dip_registered';
    case 'Lucky Dip - Selected': return 'dip_selected';
    case 'Lucky Dip - Not Selected': return 'dip_not_selected';
    case 'Payment Failed': return 'payment_failed';
    case 'Cancelled': return 'cancelled';
    default: return 'request_received';
  }
}

/** channel 'sms' uses the short SMS text (falls back to the WhatsApp text if a template has none). */
function buildMessage_(b, lang, channel, forceKey) {
  var key = forceKey || pickTemplate_(b);
  var tpl = readAll_('Messages').filter(function (m) { return m.key === key; })[0] || {};
  var en = lang === 'English';
  var text = channel === 'sms'
    ? String((en ? tpl.smsEnglish : tpl.smsTelugu) || (en ? tpl.english : tpl.telugu) || tpl.smsTelugu || tpl.telugu || '')
    : String((en ? tpl.english : tpl.telugu) || tpl.telugu || '');
  var vals = messageValues_(b, settings_(true));
  text = text.replace(/\{(\w+)\}/g, function (m, k) { return k in vals ? vals[k] : m; });
  text = text.replace(/\n📞\s*$/, '').replace(/\n\s*\(\s*\)\s*$/m, '');
  if (channel === 'sms') text = text.replace(/[*]/g, '').replace(/\s+$/, '');
  return { key: key, text: text };
}

function messageValues_(b, s) {
  var d = function (v) { return v ? fmtDisplay_(v) : '-'; };
  var nr = nextReleaseFor_(b.category);
  var v = {};
  Object.keys(b).forEach(function (k) { v[k] = b[k] == null || b[k] === '' ? '-' : String(b[k]); });
  ['preferredDate', 'alternateDate', 'releaseDate', 'serviceDate', 'checkIn', 'checkOut', 'refundDate', 'expectedDate'].forEach(function (k) { v[k] = d(b[k]); });
  v.balance = inr_(Math.max(0, (Number(b.total) || 0) - (Number(b.received) || 0)));
  ['ticketAmount', 'serviceCharge', 'total', 'received', 'refundAmount'].forEach(function (k) { v[k] = inr_(b[k]); });
  v.name = String(b.customerName || '').split(',')[0] || '-';
  v.route = b.fromPlace || b.toPlace ? (b.fromPlace || '?') + ' → ' + (b.toPlace || '?') : '-';
  v.nextRelease = nr || 'TTD ప్రకటన తర్వాత';
  ['shopName', 'shopNameTe', 'groupName', 'groupNameTe', 'shopPhone', 'shopAddress'].forEach(function (k) { v[k] = s[k] || ''; });
  return v;
}

function nextReleaseFor_(category) {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var list = readAll_('Releases').filter(function (r) { return r.releaseDate && toDate_(r.releaseDate) >= today && (!category || r.category === category); })
    .sort(function (a, b) { return toDate_(a.releaseDate) - toDate_(b.releaseDate); });
  return list.length ? fmtDisplay_(list[0].releaseDate) + ' ' + (list[0].releaseTime || '') : '';
}

// ------------------------------------------------------------------ SMS
function smsReady_() { var p = settings_(true).smsProvider || ''; return !!p && !/^None/.test(p); }
function smsParts_(text) {
  var uni = /[^\x00-\x7F]/.test(text);
  var n = String(text).length;
  return uni ? (n <= 70 ? 1 : Math.ceil(n / 67)) : (n <= 160 ? 1 : Math.ceil(n / 153));
}
function markSent_(bookingId, channel, user, parts) {
  var ex = findRow_('Bookings', 'bookingId', bookingId);
  if (!ex) throw new Error('Booking not found');
  var prev = ex.obj.messageStatus === 'Sent' ? String(ex.obj.messageVia || '') : '';
  var via = !prev || prev === channel ? channel : (prev.indexOf(channel) >= 0 ? prev : 'WhatsApp + SMS');
  return saveBooking_({ bookingId: bookingId, messageStatus: 'Sent', messageSentOn: new Date(), messageVia: via }, user,
    'Message sent (' + channel + (parts ? ', ' + parts + ' SMS' : '') + ')');
}
/** Sends one SMS through the gateway chosen in Settings. Throws with the gateway's reply if it fails. */
function sendSms_(mobile, text) {
  var s = settings_(true);
  var m = digits_(mobile).slice(-10);
  if (m.length !== 10) throw new Error('This booking has no valid 10-digit mobile number');
  text = String(text || '').trim();
  if (!text) throw new Error('The SMS text is empty');
  var unicode = /[^\x00-\x7F]/.test(text);
  var p = String(s.smsProvider || '');
  var res, okCheck = null;
  if (/^Fast2SMS/i.test(p)) {
    if (!s.smsApiKey) throw new Error('Add the Fast2SMS API key in Settings › SMS');
    res = UrlFetchApp.fetch('https://www.fast2sms.com/dev/bulkV2', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { authorization: s.smsApiKey },
      payload: JSON.stringify({ route: 'q', message: text, language: unicode ? 'unicode' : 'english', flash: 0, numbers: m }) });
    okCheck = function (body) { try { return JSON.parse(body)['return'] === true; } catch (e) { return false; } };
  } else if (/^Android/i.test(p)) {
    if (!s.smsUser || !s.smsApiKey) throw new Error('Add the Android SMS Gateway username and password in Settings › SMS');
    var base = String(s.smsGatewayUrl || 'https://api.sms-gate.app/3rdparty/v1').replace(/\/+$/, '');
    res = UrlFetchApp.fetch(base + '/message', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Basic ' + Utilities.base64Encode(s.smsUser + ':' + s.smsApiKey) },
      payload: JSON.stringify({ message: text, phoneNumbers: ['+91' + m] }) });
  } else if (/^Custom/i.test(p)) {
    if (!s.smsCustomUrl) throw new Error('Add the custom SMS API URL in Settings › SMS');
    var fill = function (tpl, enc) {
      return String(tpl).replace(/\{(mobile91|mobile|message|apiKey|unicode)\}/g, function (x, k) {
        var v = { mobile: m, mobile91: '91' + m, message: text, apiKey: s.smsApiKey || '', unicode: unicode ? '1' : '0' }[k];
        return enc === 'url' ? encodeURIComponent(v) : enc === 'json' ? JSON.stringify(v).slice(1, -1) : v;
      });
    };
    var method = String(s.smsCustomMethod || 'GET').toUpperCase() === 'POST' ? 'post' : 'get';
    var opts = { method: method, muteHttpExceptions: true };
    if (method === 'post') {
      var ct = s.smsCustomContentType || 'application/json';
      opts.contentType = ct;
      opts.payload = fill(s.smsCustomBody || '', /json/i.test(ct) ? 'json' : 'url');
    }
    res = UrlFetchApp.fetch(fill(s.smsCustomUrl, 'url'), opts);
  } else {
    throw new Error('No SMS gateway is set up. Use "Phone SMS app", or choose a gateway in Settings › SMS.');
  }
  var code = res.getResponseCode();
  var body = String(res.getContentText() || '').slice(0, 300);
  if (code < 200 || code >= 300 || (okCheck && !okCheck(body))) throw new Error('SMS not sent. Gateway replied (' + code + '): ' + body);
  return { ok: true, response: body, parts: smsParts_(text) };
}

// ------------------------------------------------------------------ automatic reminder SMS
var REMINDER_HANDLER = 'sendDailyReminders';

/** Time-trigger entry point: runs once a day at the hour set in Settings. */
function sendDailyReminders() {
  ensureSchema_();
  var mode = settings_(true).autoReminder || 'Off';
  if (mode === 'Off') return 'off';
  return runReminders_({ name: 'Auto reminder', role: 'Admin' }, false);
}

/** Booked bookings whose darshan / check-in date is N days away and that have had no reminder yet. */
function remindersDue_() {
  var s = settings_(true);
  var days = Math.max(0, parseInt(s.reminderDaysBefore, 10) || 1);
  var smsOnly = (s.autoReminder || '') !== 'All customers';
  var target = new Date(); target.setHours(0, 0, 0, 0); target.setDate(target.getDate() + days);
  return readAll_('Bookings').filter(function (b) {
    if (b.status !== 'Booked' || b.reminderSentOn) return false;
    if (!sameDay_(b.serviceDate || b.checkIn, target)) return false;
    if (smsOnly && !/SMS/.test(String(b.contactVia || ''))) return false;
    return digits_(b.mobile).slice(-10).length === 10;
  });
}

/** Sends (or with dryRun only lists) the due reminders. Max 100 per run, like Bulk SMS. */
function runReminders_(user, dryRun) {
  var due = remindersDue_();
  var list = due.slice(0, 100).map(function (b) {
    return { bookingId: b.bookingId, name: b.customerName, mobile: b.mobile, service: b.service, date: fmtDisplay_(b.serviceDate || b.checkIn), slot: b.slot || '' };
  });
  if (dryRun) return { due: list, more: Math.max(0, due.length - 100), sent: [], failed: [] };
  if (!smsReady_()) {
    if (due.length) log_(user, 'Reminders', 'Reminder SMS not sent', due.length + ' due, but no SMS gateway is set up');
    throw new Error('No SMS gateway is set up. Choose one in Settings › SMS.');
  }
  var lang = settings_(true).defaultLanguage || 'Telugu';
  var sent = [], failed = [];
  due.slice(0, 100).forEach(function (b, i) {
    try {
      var r = sendSms_(b.mobile, buildMessage_(clean_(b), lang, 'sms', deptInfo_(b.department).kind === 'travel' ? 'travel_reminder' : 'reminder').text);
      saveBooking_({ bookingId: b.bookingId, reminderSentOn: new Date() }, user, 'Reminder SMS sent (' + r.parts + ' SMS)');
      sent.push(list[i]);
    } catch (e) {
      failed.push({ bookingId: b.bookingId, name: b.customerName, error: String(e && e.message || e) });
    }
  });
  log_(user, 'Reminders', 'Reminder SMS run', sent.length + ' sent, ' + failed.length + ' failed' + (due.length > 100 ? ', ' + (due.length - 100) + ' left for the next run' : ''));
  return { due: list, more: Math.max(0, due.length - 100), sent: sent, failed: failed };
}

/** Keeps exactly one daily trigger when reminders are on, none when off. */
function syncReminderTrigger_() {
  var s = settings_(true);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === REMINDER_HANDLER) ScriptApp.deleteTrigger(t); });
  if ((s.autoReminder || 'Off') === 'Off') return '';
  var h = Math.min(23, Math.max(0, parseInt(s.reminderHour, 10)));
  if (isNaN(h)) h = 18;
  ScriptApp.newTrigger(REMINDER_HANDLER).timeBased().everyDays(1).atHour(h).inTimezone(APP.tz).create();
  return 'daily ' + h + ':00';
}

function waLink_(mobile, text) {
  var m = digits_(mobile);
  if (m.length === 10) m = '91' + m;
  return 'https://wa.me/' + m + '?text=' + encodeURIComponent(text);
}

// ================================================================== sheet helpers
var _cache = {};
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}
function sheetOf_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) { setup(); sh = ss_().getSheetByName(name); }
  return sh;
}
function headerMap_(name) {
  var sh = sheetOf_(name);
  var lc = sh.getLastColumn();
  var heads = lc ? sh.getRange(1, 1, 1, lc).getValues()[0] : [];
  var map = {};
  SCHEMA[name].cols.forEach(function (col) { var i = heads.indexOf(col.header); if (i >= 0) map[col.key] = i; });
  return { sh: sh, heads: heads, map: map };
}
function readAll_(name) {
  var h = headerMap_(name);
  var lr = h.sh.getLastRow();
  if (lr < 2 || !h.heads.length) return [];
  var vals = h.sh.getRange(2, 1, lr - 1, h.heads.length).getValues();
  var out = [];
  vals.forEach(function (row) {
    if (!row.some(function (v) { return v !== '' && v !== null; })) return;
    var o = {};
    Object.keys(h.map).forEach(function (k) { o[k] = row[h.map[k]]; });
    out.push(o);
  });
  return out;
}
function readColumn_(name, key) {
  var h = headerMap_(name);
  var lr = h.sh.getLastRow();
  if (lr < 2 || !(key in h.map)) return [];
  return h.sh.getRange(2, h.map[key] + 1, lr - 1, 1).getValues().map(function (r) { return r[0]; });
}
function findRow_(name, key, id) {
  var h = headerMap_(name);
  var lr = h.sh.getLastRow();
  if (lr < 2 || !(key in h.map)) return null;
  var vals = h.sh.getRange(2, 1, lr - 1, h.heads.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][h.map[key]]) === String(id)) {
      var o = {};
      Object.keys(h.map).forEach(function (k) { o[k] = vals[i][h.map[k]]; });
      return { row: i + 2, obj: o };
    }
  }
  return null;
}
function colType_(name, key) {
  var col = SCHEMA[name].cols.filter(function (x) { return x.key === key; })[0];
  return col ? col.type : 'text';
}
function toCell_(name, key, v) {
  if (v === undefined || v === null) return '';
  var t = colType_(name, key);
  if ((t === 'date' || t === 'datetime') && v !== '') return toDate_(v) || '';
  if ((t === 'money' || t === 'number') && v !== '') return Number(v) || 0;
  return v instanceof Date ? v : String(v);
}
function appendRows_(name, objs) {
  if (!objs.length) return;
  var h = headerMap_(name);
  var rows = objs.map(function (o) {
    var r = h.heads.map(function () { return ''; });
    Object.keys(h.map).forEach(function (k) { if (k in o) r[h.map[k]] = toCell_(name, k, o[k]); });
    return r;
  });
  h.sh.getRange(h.sh.getLastRow() + 1, 1, rows.length, h.heads.length).setValues(rows);
}
function writeFields_(name, row, obj) {
  var h = headerMap_(name);
  var cur = h.sh.getRange(row, 1, 1, h.heads.length).getValues()[0];
  Object.keys(obj).forEach(function (k) { if (k in h.map) cur[h.map[k]] = toCell_(name, k, obj[k]); });
  h.sh.getRange(row, 1, 1, h.heads.length).setValues([cur]);
}
function upsert_(name, key, obj) {
  var ex = findRow_(name, key, obj[key]);
  if (ex) writeFields_(name, ex.row, obj); else appendRows_(name, [obj]);
}
function log_(user, ref, action, details) {
  try { appendRows_('Activity Log', [{ time: new Date(), user: user && user.name || '', ref: ref || '', action: action, details: details || '' }]); } catch (e) { /* never block on logging */ }
}

// Turns sheet values into JSON-safe values (dates → 'yyyy-MM-dd' or 'yyyy-MM-dd HH:mm').
function clean_(o) {
  var out = {};
  Object.keys(o).forEach(function (k) {
    var v = o[k];
    if (v instanceof Date) {
      var hasTime = v.getHours() || v.getMinutes();
      out[k] = fmt_(v, hasTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
    } else out[k] = v === null || v === undefined ? '' : v;
  });
  if ('pinHash' in out) delete out.pinHash;
  return out;
}

// ------------------------------------------------------------------ small utils
function fmt_(d, f) { return Utilities.formatDate(d, APP.tz, f); }
function pad_(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function digits_(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function inr_(n) { var x = Number(n) || 0; return x.toLocaleString ? x.toLocaleString('en-IN') : String(x); }
function nextSeq_(ids, prefix) {
  var max = 0;
  ids.forEach(function (id) { var n = Number(String(id).replace(prefix, '')); if (n > max) max = n; });
  return max + 1;
}
function toDate_(v) {
  if (v instanceof Date) return v;
  if (v === '' || v == null) return null;
  var s = String(v);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  var d = new Date(s);
  return isNaN(d) ? null : d;
}
function fmtDisplay_(v) { var d = toDate_(v); return d ? fmt_(d, 'dd-MM-yyyy') : String(v); }
function sameDay_(a, b) { a = toDate_(a); b = toDate_(b); return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function addMonths_(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function monthKey_(d) { return d.getFullYear() + '-' + pad_(d.getMonth() + 1, 2); }
function monthName_(d) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear(); }
