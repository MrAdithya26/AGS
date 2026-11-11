// Runs the real Code.gs against the in-memory shim. Usage: TZ=Asia/Kolkata node tools/test-server.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'gas-shim.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8'), { filename: 'Code.gs' });

const noDates = (o, where) => JSON.stringify(o, (k, v) => { if (v instanceof Date) throw new Error('Date leaked to client at ' + where + '.' + k); return v; });
const call = (tok, a, p) => { const r = api(tok, a, p); noDates(r, a); if (!r.ok) throw new Error(a + ': ' + r.error); return JSON.parse(JSON.stringify(r.data)); };

setup();
setup(); // repair run must be harmless
const names = __book.getSheets().map(s => s.getName());
assert.deepStrictEqual(names, SHEET_ORDER, 'sheets created in order');
assert.strictEqual(readAll_('Messages').length, DEFAULT_MESSAGES.length, 'messages seeded once');
assert.strictEqual(readAll_('Services').length, DEFAULT_SERVICES.length + DEFAULT_AGS_SERVICES.length, 'services seeded once');
assert.ok(readAll_('Services').every(x => x.department), 'every service has a department');
assert.ok(readAll_('Releases').length >= RELEASE_PATTERN.length, 'releases seeded');

// login
assert.strictEqual(api('', 'login', { name: 'Admin', pin: '0000' }).ok, false, 'wrong pin rejected');
assert.strictEqual(api('nope', 'bootstrap').error, 'SESSION', 'bad token rejected');
const { token } = call('', 'login', { name: 'admin', pin: '1234' });
let db = call(token, 'bootstrap');
assert.strictEqual(db.defaultPin, true);
assert.ok(db.webAppUrl);

// customers via import (template rows) and form
const imp = call(token, 'importCustomers', { rows: [
  { profile: 'Ramesh Family', name: 'Ramesh Kumar', dob: '14/05/1980', gender: 'Male', idType: 'Aadhaar Card', idNumber: '2222 3333 4444', mobile: '9876543210', city: 'Srikakulam', state: 'Andhra Pradesh', pincode: '532001', country: 'India' },
  { profile: 'Ramesh Family', name: 'Lakshmi', dob: '02/11/1984', gender: 'Female', idType: 'Aadhaar Card', idNumber: '3333 4444 5555', mobile: '9876543210' }
] });
assert.strictEqual(imp.added, 2);
const imp2 = call(token, 'importCustomers', { rows: [{ profile: 'Ramesh Family', name: 'Lakshmi', dob: '02/11/1984', gotram: 'Kasyapa' }] });
assert.strictEqual(imp2.updated, 1, 're-import updates instead of duplicating');
assert.strictEqual(imp2.customers.find(c => c.name === 'Lakshmi').gotram, 'Kasyapa');
const c3 = call(token, 'saveCustomer', { profile: 'Rao Family', name: 'Venkata Rao', mobile: '+91 98480 12345', idType: 'Aadhaar Card', idNumber: '444455556666' });
assert.strictEqual(c3.mobile, '9848012345');
assert.strictEqual(c3.idNumber, '4444 5555 6666');
assert.strictEqual(c3.customerId, 'C00003');

// logins
call(token, 'saveLogin', { loginId: '9000000001', holder: 'Adithya', status: 'Active' });

// booking lifecycle
const ids = imp.customers.map(c => c.customerId).join(', ');
let b = call(token, 'saveBooking', { profile: 'Ramesh Family', customerName: 'Ramesh Kumar', mobile: '9876543210', devotees: 'Ramesh Kumar, Lakshmi', customerIds: ids,
  persons: 2, category: 'Darshan', service: 'Special Entry Darshan (₹300)', preferredDate: '2027-02-10', ticketAmount: 600, serviceCharge: 200, received: 800, paymentMode: 'Cash' });
assert.match(b.bookingId, /^TTD-\d{4}-0001$/);
assert.strictEqual(b.status, 'Requested');
assert.strictEqual(b.total, 800);
assert.strictEqual(b.paymentStatus, 'Fully Paid');
assert.strictEqual(b.preferredDate, '2027-02-10');
const b2 = call(token, 'saveBooking', { customerName: 'Walk-in', mobile: '9000011111', persons: 1, category: 'Homam', service: 'Srinivasa Divyanugraha Homam (Alipiri)', ticketAmount: 1600, serviceCharge: 150, received: 500 });
assert.match(b2.bookingId, /-0002$/);
assert.strictEqual(b2.paymentStatus, 'Advance Paid');

b = call(token, 'saveBooking', { bookingId: b.bookingId, status: 'Booked', ttdRef: 'SED2702101234', serviceDate: '2027-02-10', slot: '10:00 - 11:00', ttdLogin: '9000000001' });
assert.strictEqual(b.status, 'Booked');
assert.strictEqual(b.ttdPayment, 'Paid to TTD');
assert.strictEqual(b.messageStatus, 'Not Sent');
const m = buildMessage_(b, 'Telugu');
assert.strictEqual(m.key, 'booked');
assert.ok(m.text.includes('SED2702101234') && m.text.includes('10-02-2027') && m.text.includes('ఆదిత్య ఇంటర్నెట్'), 'telugu booked message filled');
assert.ok(!/\{\w+\}/.test(m.text), 'no unfilled placeholders: ' + m.text.match(/\{\w+\}/));
b = call(token, 'markMessage', { bookingId: b.bookingId });
assert.strictEqual(b.messageStatus, 'Sent');

// not booked → refund pending automatically → refunded
let nb = call(token, 'saveBooking', { bookingId: b2.bookingId, status: 'Not Booked' });
assert.strictEqual(nb.refundStatus, 'Refund Pending');
assert.strictEqual(nb.refundAmount, 500);
assert.strictEqual(buildMessage_(nb, 'Telugu').key, 'not_booked_refund_pending');
nb = call(token, 'saveBooking', { bookingId: b2.bookingId, refundStatus: 'Refunded', refundMode: 'Cash' });
assert.ok(nb.refundDate, 'refund date auto-filled');
const en = buildMessage_(nb, 'English');
assert.strictEqual(en.key, 'not_booked_refunded');
assert.ok(!/\{\w+\}/.test(en.text), 'english placeholders filled');

// every template renders without leftover placeholders
readAll_('Messages').forEach(t => {
  const vals = messageValues_(b, settings_(true));
  [t.telugu, t.english].forEach(txt => { const left = String(txt).replace(/\{(\w+)\}/g, (x, k) => k in vals ? '' : x).match(/\{\w+\}/); assert.ok(!left, t.key + ' has unknown placeholder ' + left); });
});

// extension API
assert.strictEqual(extApi_({ key: 'x', action: 'ping' }).ok, false, 'no key → refused');
const key = call(token, 'newApiKey', {});
assert.strictEqual(extApi_({ key, action: 'ping' }).ok, true);
const b3 = call(token, 'saveBooking', { customerName: 'Venkata Rao', mobile: '9848012345', customerIds: c3.customerId, persons: 1, category: 'Arjitha Seva', service: 'Kalyanotsavam', received: 0 });
const pend = extApi_({ key, action: 'pending' });
noDates(pend, 'pending');
assert.ok(pend.bookings.some(x => x.bookingId === b3.bookingId));
const cust = extApi_({ key, action: 'customers', onlyPending: true });
assert.strictEqual(cust.rows.length, 2, 'header + 1 pending devotee');
assert.strictEqual(cust.rows[1][1], 'Venkata Rao');
const res = JSON.parse(doPost({ postData: { contents: JSON.stringify({ key, action: 'result', bookingId: b3.bookingId, status: 'Booked', ttdRef: 'KAL998877', serviceDate: '2027-03-01', user: 'Counter-1' }) } }).getContent());
assert.strictEqual(res.ok, true, res.error);
assert.strictEqual(res.booking.status, 'Booked');
assert.ok(res.whatsapp.startsWith('https://wa.me/919848012345?text='));
assert.ok(res.message.includes('KAL998877'));

// roles
call(token, 'saveUser', { name: 'Staff1', role: 'Staff', pin: '4321' });
const st = call('', 'login', { name: 'Staff1', pin: '4321' });
assert.strictEqual(api(st.token, 'deleteBooking', { bookingId: b3.bookingId }).ok, false, 'staff cannot delete');
const sdb = call(st.token, 'bootstrap');
assert.strictEqual(sdb.settings.apiKey, '••••', 'staff does not see API key');
call(token, 'changePin', { oldPin: '1234', newPin: '2468' });
assert.strictEqual(call(token, 'bootstrap').defaultPin, false);

// ---- SMS
assert.strictEqual(api(token, 'sendSms', { bookingId: b3.bookingId }).ok, false, 'no gateway → clear error');
assert.match(api(token, 'sendSms', { bookingId: b3.bookingId }).error, /No SMS gateway/);
const tplRow = readAll_('Messages').find(m => m.key === 'booked');
assert.ok(tplRow.smsTelugu && tplRow.smsEnglish, 'short SMS templates seeded');
call(token, 'saveSettings', { smsProvider: 'Fast2SMS', smsApiKey: 'F2S_KEY', shopPhone: '9876543210' });
call(token, 'saveSettings', { smsApiKey: '••••' });
assert.strictEqual(settings_(true).smsApiKey, 'F2S_KEY', 'masked secret does not overwrite');
const sres = call(token, 'sendSms', { bookingId: b3.bookingId, lang: 'Telugu' });
const f = __fetchLog[__fetchLog.length - 1];
assert.ok(f.url.includes('fast2sms'));
const body = JSON.parse(f.opts.payload);
assert.strictEqual(body.numbers, '9848012345'); assert.strictEqual(body.language, 'unicode'); assert.strictEqual(f.opts.headers.authorization, 'F2S_KEY');
assert.ok(body.message.includes('KAL998877') && !body.message.includes('*') && !/\{\w+\}/.test(body.message), body.message);
assert.strictEqual(sres.booking.messageVia, 'SMS'); assert.strictEqual(sres.booking.messageStatus, 'Sent');
console.log('SMS (' + sres.parts + ' parts, ' + body.message.length + ' chars): ' + body.message);
call(token, 'markMessage', { bookingId: b3.bookingId, channel: 'WhatsApp' });
assert.strictEqual(readAll_('Bookings').find(x => x.bookingId === b3.bookingId).messageVia, 'WhatsApp + SMS');
__fetchReply = () => ({ code: 200, body: '{"return":false,"message":"Insufficient balance"}' });
assert.match(api(token, 'sendSms', { bookingId: b3.bookingId }).error, /Insufficient balance/);
__fetchReply = null;
call(token, 'saveSettings', { smsProvider: 'Android SMS Gateway (sms-gate.app)', smsUser: 'shop', smsApiKey: 'pw' });
call(token, 'testSms', { mobile: '9000011111' });
let g = __fetchLog[__fetchLog.length - 1];
assert.strictEqual(g.url, 'https://api.sms-gate.app/3rdparty/v1/message');
assert.deepStrictEqual(JSON.parse(g.opts.payload).phoneNumbers, ['+919000011111']);
assert.strictEqual(g.opts.headers.Authorization, 'Basic ' + Buffer.from('shop:pw').toString('base64'));
call(token, 'saveSettings', { smsProvider: 'Custom HTTP API', smsCustomUrl: 'https://sms.example.in/send?key={apiKey}&to={mobile91}&msg={message}', smsCustomMethod: 'GET', smsApiKey: 'K1' });
const bulk = call(token, 'bulkSms', { bookingIds: [b.bookingId, b3.bookingId, 'NOPE'], key: 'reminder', lang: 'English' });
assert.strictEqual(bulk.sent.length, 2); assert.strictEqual(bulk.failed.length, 1);
g = __fetchLog[__fetchLog.length - 1];
assert.ok(g.url.startsWith('https://sms.example.in/send?key=K1&to=919848012345&msg=Reminder%3A'), g.url);
const ext = extApi_({ key, action: 'sendSms', bookingId: b3.bookingId });
assert.strictEqual(ext.ok, true, ext.error);
const res2 = extApi_({ key, action: 'result', bookingId: b2.bookingId, status: 'Cancelled' });
assert.ok(res2.sms && res2.smsReady === true && res2.contactVia === 'WhatsApp');
assert.strictEqual(call(st.token, 'bootstrap').settings.smsApiKey, '••••', 'staff cannot see SMS key');
assert.strictEqual(api(st.token, 'testSms', { mobile: '9000011111' }).ok, false, 'staff cannot test gateway');

// automatic reminder SMS (Custom HTTP gateway is still selected from the tests above)
assert.strictEqual(sendDailyReminders(), 'off', 'reminders off by default');
assert.strictEqual(__triggers.length, 0, 'no trigger while off');
const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
const tmrKey = fmt_(tmr, 'yyyy-MM-dd');
const rA = call(token, 'saveBooking', { customerName: 'Sita Devi', mobile: '9440011122', contactVia: 'SMS', persons: 1, category: 'Darshan', service: 'Special Entry Darshan (₹300)',
  status: 'Booked', ttdRef: 'SED-R1', serviceDate: tmrKey, slot: '09:00 - 10:00', ticketAmount: 300, serviceCharge: 100, received: 400 });
const rB = call(token, 'saveBooking', { customerName: 'Gopal', mobile: '9440011133', contactVia: 'WhatsApp', persons: 1, category: 'Accommodation', service: 'Accommodation',
  status: 'Booked', ttdRef: 'ROOM-R2', checkIn: tmrKey, ticketAmount: 100, serviceCharge: 50, received: 150 });
call(token, 'saveBooking', { customerName: 'Not yet', mobile: '9440011144', contactVia: 'SMS', category: 'Darshan', service: 'Special Entry Darshan (₹300)', serviceDate: tmrKey });
call(token, 'saveSettings', { autoReminder: 'SMS customers only', reminderHour: '19' });
assert.strictEqual(__triggers.length, 1); assert.strictEqual(__triggers[0].hour, 19); assert.strictEqual(__triggers[0].tz, 'Asia/Kolkata');
call(token, 'saveSettings', { reminderHour: '18' });
assert.strictEqual(__triggers.length, 1, 'trigger replaced, not duplicated'); assert.strictEqual(__triggers[0].hour, 18);
let prev = call(token, 'runReminders', { dryRun: true });
assert.deepStrictEqual(prev.due.map(x => x.bookingId), [rA.bookingId], 'only booked SMS customer due tomorrow');
assert.strictEqual(api(st.token, 'runReminders', { dryRun: true }).ok, false, 'staff cannot run reminders');
const nFetch = __fetchLog.length;
const auto = sendDailyReminders();
assert.strictEqual(auto.sent.length, 1); assert.strictEqual(__fetchLog.length, nFetch + 1);
assert.ok(decodeURIComponent(__fetchLog[nFetch].url).includes('SED-R1'), 'reminder text has ticket no');
const rArow = readAll_('Bookings').find(x => x.bookingId === rA.bookingId);
assert.ok(rArow.reminderSentOn instanceof Date, 'reminderSentOn stored'); assert.strictEqual(rArow.messageStatus, 'Not Sent', 'booked message status untouched');
assert.strictEqual(sendDailyReminders().sent.length, 0, 'no second reminder');
call(token, 'saveSettings', { autoReminder: 'All customers' });
prev = call(token, 'runReminders', { dryRun: true });
assert.deepStrictEqual(prev.due.map(x => x.bookingId), [rB.bookingId], 'WhatsApp customer included, check-in date used');
__fetchReply = () => ({ code: 500, body: 'down' });
const fr = call(token, 'runReminders', {});
assert.strictEqual(fr.failed.length, 1); assert.match(fr.failed[0].error, /down/);
__fetchReply = null;
assert.ok(!readAll_('Bookings').find(x => x.bookingId === rB.bookingId).reminderSentOn, 'failed reminder can retry');
call(token, 'saveSettings', { autoReminder: 'Off' });
assert.strictEqual(__triggers.length, 0, 'trigger removed when off');

// departments + quick sale
const pan = call(token, 'saveBooking', { service: 'New PAN card', customerName: 'Ravi', mobile: '9440022233', persons: 1, ticketAmount: 107, serviceCharge: 100, received: 207 });
assert.strictEqual(pan.department, 'PAN', 'department taken from the service');
assert.match(pan.bookingId, /^AGS-\d{4}-0001$/); assert.strictEqual(pan.category, 'PAN');
const trn = call(token, 'saveBooking', { department: 'Train', service: 'Train ticket (Tatkal)', customerName: 'Mohan', mobile: '9440022244', persons: 2 });
assert.match(trn.bookingId, /^TRV-\d{4}-0001$/);
assert.strictEqual(buildMessage_(clean_(findRow_('Bookings', 'bookingId', pan.bookingId).obj), 'English').key, 'order_received');
const qs = call(token, 'quickSale', { service: 'Xerox (per page)', qty: 10 });
assert.match(qs.bookingId, /^QS-/); assert.strictEqual(qs.status, 'Completed'); assert.strictEqual(qs.total, 20); assert.strictEqual(qs.received, 20);
assert.strictEqual(qs.messageStatus, 'Not Needed'); assert.strictEqual(qs.department, 'Counter'); assert.strictEqual(qs.customerName, 'Walk-in');
const qs2 = call(st.token, 'quickSale', { service: 'Electricity bill', amount: 1250, serviceCharge: 10, mobile: '9440022255', paymentMode: 'UPI / PhonePe / GPay' });
assert.strictEqual(qs2.total, 1260); assert.strictEqual(qs2.messageStatus, 'Not Sent');
assert.strictEqual(buildMessage_(clean_(findRow_('Bookings', 'bookingId', qs2.bookingId).obj), 'Telugu').key, 'order_completed');
assert.ok(extApi_({ key, action: 'pending' }).bookings.every(x => x.department === 'TTD'), 'extension sees TTD bookings only');
assert.ok(readAll_('Bookings').filter(x => /^TTD-/.test(x.bookingId)).every(x => x.department === 'TTD'));
assert.ok(call(token, 'bootstrap').depts.length > 10);

// travel (Phase B)
let tv = call(token, 'saveBooking', { department: 'Train', service: 'Train ticket (Tatkal)', customerName: 'Sita', mobile: '9440033344', contactVia: 'SMS', persons: 2,
  devotees: 'Sita, Rama', passengerDetails: 'Sita, F, 30\nRama, M, 35, LB', fromPlace: 'Srikakulam Road (CHE)', toPlace: 'Tirupati (TPTY)', travelClass: '3A', quota: 'Tatkal', preferredDate: tmrKey });
let tm = buildMessage_(clean_(findRow_('Bookings', 'bookingId', tv.bookingId).obj), 'English');
assert.strictEqual(tm.key, 'travel_received'); assert.ok(tm.text.includes('Srikakulam Road (CHE) → Tirupati (TPTY)'), tm.text);
tv = call(token, 'saveBooking', { bookingId: tv.bookingId, status: 'Booked', ttdRef: '4521789630', serviceDate: tmrKey, slot: '18:45', operator: 'IRCTC', vehicleNo: '17479',
  seatInfo: 'B2 21, 22', ticketStatus: 'CNF', boardingPoint: 'Srikakulam Road', ticketAmount: 2400 });
tm = buildMessage_(clean_(findRow_('Bookings', 'bookingId', tv.bookingId).obj), 'Telugu', 'sms');
assert.strictEqual(tm.key, 'travel_booked'); assert.ok(tm.text.includes('4521789630') && tm.text.includes('B2 21, 22') && !/\{\w+\}/.test(tm.text), tm.text);
call(token, 'saveSettings', { autoReminder: 'SMS customers only' });
const nf = __fetchLog.length;
const tr = call(token, 'runReminders', {});
assert.ok(tr.sent.some(x => x.bookingId === tv.bookingId), 'journey reminder sent');
assert.ok(decodeURIComponent(__fetchLog.slice(nf).map(x => x.url).join(' ')).includes('PNR 4521789630'), 'travel reminder text used');
call(token, 'saveSettings', { autoReminder: 'Off' });
call(token, 'saveBooking', { bookingId: tv.bookingId, status: 'Cancelled', refundStatus: 'Refund Pending', refundAmount: 1800 });
assert.strictEqual(buildMessage_(clean_(findRow_('Bookings', 'bookingId', tv.bookingId).obj), 'English').key, 'travel_cancelled');

// applications (Phase C)
assert.strictEqual(findRow_('Services', 'name', 'New PAN card').obj.daysToComplete, 15, 'docs/days seeded');
let ap = call(token, 'saveBooking', { service: 'Income certificate', customerName: 'Lakshmi', mobile: '9440044455', ticketAmount: 45, serviceCharge: 50, received: 50, documents: 'Aadhaar card, Rice card' });
assert.strictEqual(ap.department, 'Certificates');
ap = call(token, 'saveBooking', { bookingId: ap.bookingId, status: 'Applied', ttdRef: 'MS2611-998877' });
const exp = new Date(); exp.setDate(exp.getDate() + 7);
assert.strictEqual(ap.expectedDate, fmt_(exp, 'yyyy-MM-dd'), 'expected date from service days');
let am = buildMessage_(clean_(findRow_('Bookings', 'bookingId', ap.bookingId).obj), 'English');
assert.strictEqual(am.key, 'app_applied'); assert.ok(am.text.includes('MS2611-998877') && am.text.includes(fmt_(exp, 'dd-MM-yyyy')), am.text);
call(token, 'saveBooking', { bookingId: ap.bookingId, status: 'Ready to Collect' });
am = buildMessage_(clean_(findRow_('Bookings', 'bookingId', ap.bookingId).obj), 'Telugu', 'sms');
assert.strictEqual(am.key, 'app_ready'); assert.ok(am.text.includes('₹45'), 'balance in ready message: ' + am.text);
const rj = call(token, 'saveBooking', { bookingId: ap.bookingId, status: 'Rejected', remarks: 'Rice card name mismatch' });
assert.strictEqual(rj.refundStatus, 'Refund Pending', 'rejected with money received -> refund pending');
assert.strictEqual(buildMessage_(clean_(findRow_('Bookings', 'bookingId', ap.bookingId).obj), 'English').key, 'app_rejected');

// receipt
assert.ok(call(token, 'bootstrap').settings.receiptNoteTe, 'receipt note seeded');
assert.strictEqual(call(st.token, 'receiptPrinted', { bookingId: b.bookingId, size: 'A5', lang: 'Both' }), true, 'staff can print receipts');
assert.strictEqual(api(token, 'receiptPrinted', { bookingId: 'NOPE' }).ok, false);
assert.ok(readAll_('Activity Log').some(r => r.action === 'Receipt printed' && r.ref === b.bookingId), 'receipt print logged');

db = call(token, 'bootstrap');
assert.ok(db.activity.length > 5);
console.log('All server tests passed ✔ (' + db.bookings.length + ' bookings, ' + db.customers.length + ' customers, ' + db.activity.length + ' log rows)');
console.log('\n--- sample Telugu message ---\n' + m.text);
