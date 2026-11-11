/* Fills the in-memory demo sheet with made-up customers and bookings (demo page only). All names / numbers are fictional. */
(function () {
  setup();
  var admin = { name: 'Admin', role: 'Admin' };
  upsert_('Settings', 'key', { key: 'shopPhone', value: '98765 43210' });
  upsert_('Settings', 'key', { key: 'apiKey', value: 'ttd_demo_key_0000' });
  // Demo SMS gateway: nothing is really sent (the demo's network stub answers "OK").
  upsert_('Settings', 'key', { key: 'smsProvider', value: 'Android SMS Gateway (sms-gate.app)' });
  upsert_('Settings', 'key', { key: 'smsUser', value: 'demo' });
  upsert_('Settings', 'key', { key: 'smsApiKey', value: 'demo' });
  [['9000000001', 'Adithya (Owner)'], ['9000000002', 'Counter 2'], ['9000000003', 'Counter 3']].forEach(function (l) {
    appendRows_('TTD Logins', [{ loginId: l[0], holder: l[1], status: 'Active', createdOn: new Date() }]);
  });
  var fams = [
    ['Ramesh Family', 'Srikakulam', [['Ramesh Kumar', '14/05/1980', 'Male'], ['Lakshmi Devi', '02/11/1984', 'Female'], ['Sai Teja', '21/07/2008', 'Male']]],
    ['Rao Family', 'Amadalavalasa', [['Venkata Rao', '11/03/1962', 'Male'], ['Padmavathi', '09/09/1966', 'Female']]],
    ['Suresh & Friends', 'Narasannapeta', [['Suresh Babu', '12/12/1990', 'Male'], ['Kiran', '03/04/1991', 'Male'], ['Mahesh', '19/08/1992', 'Male'], ['Naveen', '27/01/1993', 'Male']]],
    ['Anjali Family', 'Tekkali', [['Anjali Sharma', '05/06/1988', 'Female'], ['Prakash Sharma', '15/02/1985', 'Male']]],
    ['Murthy Family', 'Palasa', [['Krishna Murthy', '01/01/1955', 'Male'], ['Saraswathi', '30/10/1958', 'Female']]],
    ['Bhavani Family', 'Rajam', [['Bhavani', '17/03/1979', 'Female'], ['Gopal', '22/05/1976', 'Male'], ['Harika', '08/12/2004', 'Female']]],
    ['Nagaraju Family', 'Ichchapuram', [['Nagaraju', '10/10/1970', 'Male'], ['Sujatha', '06/06/1974', 'Female']]],
    ['Divya Family', 'Pathapatnam', [['Divya Sri', '25/12/1995', 'Female'], ['Ravi Teja', '14/02/1994', 'Male']]]
  ];
  var cust = [];
  fams.forEach(function (f, fi) {
    f[2].forEach(function (d, di) {
      var c = saveCustomer_({ profile: f[0], name: d[0], dob: d[1], gender: d[2], idType: 'Aadhaar Card', idNumber: String(100000000000 + fi * 1111111 + di * 97531),
        gotram: fi % 2 ? 'Kasyapa' : 'Bharadwaja', mobile: '9' + String(800000000 + fi * 1234567).slice(0, 9), email: '', address: (fi + 1) + '-' + (di + 2) + '-3, Main Road',
        city: f[1], district: 'Srikakulam', state: 'Andhra Pradesh', pincode: '5320' + pad_(fi + 1, 2), country: 'India' }, admin);
      cust.push(c);
    });
  });
  var services = [['Darshan', 'Special Entry Darshan (₹300)', 300, 'p'], ['Arjitha Seva', 'Kalyanotsavam', 1000, 'c'], ['Angapradakshinam', 'Angapradakshinam Token', 0, 'p'],
    ['Homam', 'Srinivasa Divyanugraha Homam (Alipiri)', 1600, 'c'], ['Accommodation', 'Tirumala Rooms (₹500 - ₹1,000)', 1000, 'r'], ['Arjitha Seva', 'Suprabhatam', 120, 'p'], ['Darshan', 'SRIVANI Trust Darshan', 10500, 'p']];
  var now = new Date();
  var seq = 0;
  function mk(monthsAgo, day, fi, si, status, extra) {
    var f = fams[fi], members = cust.filter(function (c) { return c.profile === f[0]; });
    var s = services[si];
    var persons = s[3] === 'r' ? members.length : s[3] === 'c' ? 2 : Math.min(members.length, s[0] === 'Angapradakshinam' ? 1 : 6);
    var team = members.slice(0, persons);
    var ticket = s[3] === 'p' ? s[2] * persons : s[2];
    var charge = s[3] === 'p' ? 100 * persons : 150;
    var req = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 11, 15);
    if (req > now) req = new Date(now.getTime() - 3600000 * (seq + 2));
    var pref = new Date(req.getFullYear(), req.getMonth() + 3, 5 + (seq % 20));
    seq++;
    var b = saveBooking_({ profile: f[0], customerName: team[0].name, mobile: team[0].mobile, devotees: team.map(function (x) { return x.name; }).join(', '),
      customerIds: team.map(function (x) { return x.customerId; }).join(', '), persons: persons, category: s[0], service: s[1], preferredDate: pref,
      releaseDate: new Date(req.getFullYear(), req.getMonth(), 24), requestDate: req, ticketAmount: ticket, serviceCharge: charge,
      received: status === 'Requested' && seq % 3 === 0 ? Math.round((ticket + charge) / 2) : ticket + charge, paymentMode: seq % 2 ? 'UPI / PhonePe / GPay' : 'Cash' }, admin);
    var login = '900000000' + (1 + seq % 3);
    if (status !== 'Requested') {
      var p = { bookingId: b.bookingId, status: status, ttdLogin: login };
      if (status === 'Booked' || status === 'Completed' || status === 'Lucky Dip - Selected') {
        p.ttdRef = (s[0] === 'Accommodation' ? 'ACC' : s[0] === 'Darshan' ? 'SED' : 'SEV') + (2600000000 + seq * 7919);
        if (s[0] === 'Accommodation') { p.checkIn = pref; p.checkOut = new Date(pref.getTime() + 86400000); p.room = 'Cottage ' + (100 + seq); }
        else { p.serviceDate = pref; p.slot = ['07:00 - 08:00', '10:00 - 11:00', '15:00 - 16:00'][seq % 3]; }
      }
      if (status === 'Lucky Dip - Registered') p.ttdRef = 'LD' + (5500000 + seq);
      Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
      b = saveBooking_(p, admin);
      if (extra && extra.messageStatus === undefined && seq % 4) saveBooking_({ bookingId: b.bookingId, messageStatus: 'Sent', messageSentOn: new Date(req.getTime() + 86400000 * 30) }, admin);
    }
    var row = findRow_('Bookings', 'bookingId', b.bookingId);
    var upd = monthsAgo === 0 && (status === 'Booked' || status === 'Not Booked') ? new Date(now.getTime() - 86400000 * (seq % 3)) : new Date(req.getTime() + 86400000 * 24);
    if (upd > now) upd = now;
    writeFields_('Bookings', row.row, { updatedOn: upd, createdOn: req });
    return b;
  }
  var plan = [
    [5, 21, 0, 0, 'Booked'], [5, 21, 1, 1, 'Not Booked', { refundStatus: 'Refunded', refundMode: 'Cash' }], [5, 23, 2, 2, 'Booked'], [5, 24, 3, 0, 'Completed'],
    [4, 18, 4, 5, 'Lucky Dip - Not Selected', { refundStatus: 'Refunded', refundMode: 'UPI / PhonePe / GPay' }], [4, 21, 5, 1, 'Booked'], [4, 24, 6, 0, 'Not Booked', { refundStatus: 'Refunded', refundMode: 'Cash' }], [4, 24, 7, 4, 'Booked'],
    [3, 21, 0, 1, 'Completed'], [3, 23, 1, 3, 'Booked'], [3, 24, 2, 0, 'Not Booked', { refundStatus: 'Adjusted to Next Booking' }], [3, 24, 3, 6, 'Completed'], [3, 24, 4, 0, 'Booked'],
    [2, 18, 5, 5, 'Lucky Dip - Selected'], [2, 21, 6, 1, 'Not Booked', { refundStatus: 'Refunded', refundMode: 'UPI / PhonePe / GPay' }], [2, 23, 7, 2, 'Booked'], [2, 24, 0, 0, 'Booked'], [2, 24, 1, 4, 'Booked'], [2, 24, 2, 0, 'Not Booked', { refundStatus: 'Refunded', refundMode: 'Cash' }],
    [1, 18, 3, 5, 'Lucky Dip - Registered'], [1, 21, 4, 1, 'Booked'], [1, 23, 5, 3, 'Not Booked'], [1, 24, 6, 0, 'Booked'], [1, 24, 7, 0, 'Booked'], [1, 24, 0, 4, 'Payment Failed'], [1, 24, 1, 0, 'Booked'],
    [0, 3, 2, 0, 'Booked'], [0, 4, 3, 2, 'Not Booked'], [0, 5, 4, 0, 'Requested'], [0, 5, 5, 0, 'Requested'], [0, 6, 6, 1, 'Requested'], [0, 6, 7, 3, 'Attempting'], [0, 7, 0, 2, 'Requested'], [0, 7, 1, 4, 'Requested']
  ];
  plan.forEach(function (p) { mk(p[0], p[1], p[2], p[3], p[4], p[5]); });
  // Elderly families without WhatsApp get SMS.
  readAll_('Bookings').forEach(function (b, i) {
    if (b.profile === 'Murthy Family' || b.profile === 'Rao Family') writeFields_('Bookings', i + 2, { contactVia: 'SMS', messageVia: b.messageStatus === 'Sent' ? 'SMS' : '' });
    else if (b.messageStatus === 'Sent') writeFields_('Bookings', i + 2, { messageVia: 'WhatsApp' });
  });
  // A couple of darshans coming up soon, for the "Upcoming" list and reminders.
  var soon = readAll_('Bookings').filter(function (b) { return b.status === 'Booked' && b.category !== 'Accommodation'; }).slice(-3);
  soon.forEach(function (b, i) {
    var r = findRow_('Bookings', 'bookingId', b.bookingId);
    writeFields_('Bookings', r.row, { serviceDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 + i * 4), messageStatus: i === 0 ? 'Not Sent' : 'Sent' });
  });
  // Other departments: travel, applications and quick sales spread over the last days.
  var day = function (n, h) { return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, h || 11, 15); };
  var tr = saveBooking_({ department: 'Train', service: 'Train ticket (Tatkal)', customerName: 'Venkata Rao', mobile: '9848012345', contactVia: 'SMS', persons: 2, devotees: 'Venkata Rao, Saraswathi',
    passengerDetails: 'Venkata Rao, M, 67, LB\nSaraswathi, F, 62, LB', fromPlace: 'Srikakulam Road (CHE)', toPlace: 'Tirupati (TPTY)', operator: 'IRCTC', travelClass: '3A', quota: 'Tatkal',
    ticketAmount: 2380, serviceCharge: 200, received: 2580, paymentMode: 'Cash', requestDate: day(1, 10) }, admin);
  saveBooking_({ bookingId: tr.bookingId, status: 'Booked', ttdRef: '4521789630', serviceDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2), slot: '18:45', vehicleNo: '17479',
    seatInfo: 'B2 21, 24', ticketStatus: 'CNF', boardingPoint: 'Srikakulam Road', messageStatus: 'Sent', messageVia: 'SMS' }, admin);
  saveBooking_({ department: 'Bus', service: 'APSRTC bus ticket', customerName: 'Kiran', mobile: '9701122334', persons: 1, fromPlace: 'Srikakulam', toPlace: 'Visakhapatnam', operator: 'APSRTC',
    travelClass: 'AC Seater', preferredDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), ticketAmount: 420, serviceCharge: 30, received: 450, paymentMode: 'UPI / PhonePe / GPay', requestDate: day(0, 9) }, admin);
  var pan = saveBooking_({ department: 'PAN', service: 'New PAN card', customerName: 'Divya Sri', mobile: '9908765432', ticketAmount: 107, serviceCharge: 100, received: 207, paymentMode: 'Cash',
    documents: 'Aadhaar card, Passport photo, Signature, Mobile', requestDate: day(12) }, admin);
  saveBooking_({ bookingId: pan.bookingId, status: 'Applied', ttdRef: 'N-881245671', expectedDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), messageStatus: 'Sent', messageVia: 'WhatsApp' }, admin);
  var cert = saveBooking_({ department: 'Certificates', service: 'Income certificate', customerName: 'Lakshmi Devi', mobile: '9440044455', ticketAmount: 45, serviceCharge: 50, received: 50,
    documents: 'Aadhaar card, Rice card, Passport photo', requestDate: day(6) }, admin);
  saveBooking_({ bookingId: cert.bookingId, status: 'Ready to Collect', ttdRef: 'MS2611-998877' }, admin);
  saveBooking_({ department: 'Aadhaar', service: 'Aadhaar demographic update (mobile / address / name / DOB)', customerName: 'Suresh Babu', mobile: '9802469134', ticketAmount: 75, serviceCharge: 50,
    received: 125, paymentMode: 'Cash', documents: 'Aadhaar card, Mobile', requestDate: day(0, 12) }, admin);
  [[0, 'Xerox (per page)', 14], [0, 'Electricity bill', 1], [1, 'Mobile / DTH recharge', 1], [1, 'Lamination', 2], [2, 'AEPS cash withdrawal', 1], [3, 'Passport photos (set)', 1]].forEach(function (q) {
    var r = ACTIONS.quickSale({ service: q[1], qty: q[2], amount: q[1] === 'Electricity bill' ? 1260 : q[1] === 'Mobile / DTH recharge' ? 299 : q[1] === 'AEPS cash withdrawal' ? 0 : '' }, admin);
    writeFields_('Bookings', findRow_('Bookings', 'bookingId', r.bookingId).row, { requestDate: day(q[0], 13) });
  });
})();
