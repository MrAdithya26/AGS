/* Adithya TTD Booking Assistant - link to the "Adithya TTD Master" Google Sheet web app (v1.5).
 * Used by the popup and options page only. Sends data only to the web app URL you enter. */
(function (g) {
  const SS = {};
  const KEY = 'sheet';

  SS.cfg = async function () {
    const s = await chrome.storage.local.get(KEY);
    return Object.assign({ url: '', key: '', user: '' }, s[KEY] || {});
  };
  SS.saveCfg = cfg => chrome.storage.local.set({ [KEY]: cfg });
  SS.isOn = async () => { const c = await SS.cfg(); return !!(c.url && c.key); };

  SS.call = async function (action, payload) {
    const c = await SS.cfg();
    if (!c.url || !c.key) throw new Error('Connect the Google Sheet first (Options › Google Sheet).');
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(c.url)) throw new Error('The web app URL should look like https://script.google.com/macros/s/…/exec');
    let res;
    try {
      res = await fetch(c.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // text/plain avoids a CORS preflight
        body: JSON.stringify(Object.assign({ key: c.key, user: c.user || 'Extension', action }, payload || {})),
        redirect: 'follow'
      });
    } catch (e) {
      throw new Error('Could not reach Google. Check your internet connection.');
    }
    const text = await res.text();
    let j;
    try { j = JSON.parse(text); } catch (e) {
      throw new Error('Unexpected reply. Check the web app URL ends with /exec and the deployment has "Who has access: Anyone".');
    }
    if (!j.ok) throw new Error(j.error || 'The sheet refused the request');
    return j;
  };

  // Booking category in the sheet -> booking type in the extension.
  SS.typeFor = cat => ({ 'Darshan': 'sed', 'Angapradakshinam': 'angapradakshinam', 'Arjitha Seva': 'arjitha', 'Virtual Seva': 'arjitha', 'Homam': 'homam' }[cat] || '');

  // Pulls booking details out of the text of a TTD confirmation page. Always shown to the user to check.
  SS.parsePage = function (text) {
    const t = String(text || '').replace(/ /g, ' ');
    const out = {};
    const ref = t.match(/(?:Booking|Ticket|Token|Transaction|Reference|Registration)\s*(?:ID|No\.?|Number|Num)\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\-\/]{5,})/i);
    if (ref) out.ttdRef = ref[1];
    const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const isoOf = (d, m, y) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let dm = t.match(/(?:Darshan|Seva|Visit|Arrival|Reporting|Slot|Journey|Check[- ]?in)\s*Date\s*[:\-]?\s*(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/i)
      || t.match(/(?:Darshan|Seva|Visit|Arrival|Reporting|Slot|Journey|Check[- ]?in)\s*Date\s*[:\-]?\s*(\d{1,2})[- ]([A-Za-z]{3,9})[- ,]+(\d{4})/i);
    if (dm) {
      const m = /^\d+$/.test(dm[2]) ? Number(dm[2]) : months[dm[2].slice(0, 3).toLowerCase()];
      if (m) out.serviceDate = isoOf(dm[1], m, dm[3]);
    }
    const slot = t.match(/(\d{1,2}[:.]\d{2}\s*(?:AM|PM|hrs)?\s*(?:-|to|–)\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM|hrs)?)/i);
    if (slot) out.slot = slot[1].replace(/\s+/g, ' ');
    const amt = t.match(/(?:Total\s*Amount|Amount\s*Paid|Total\s*Fare|Total|Amount)\s*(?:\(.*?\))?\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (amt) out.ticketAmount = Math.round(Number(amt[1].replace(/,/g, '')));
    if (/booking\s*(?:is\s*)?(?:successful|confirmed)|payment\s*successful|ticket\s*(?:is\s*)?confirmed|successfully\s*booked/i.test(t)) out.looksBooked = true;
    if (/payment\s*failed|transaction\s*failed|booking\s*failed|unsuccessful|sold\s*out|quota\s*(?:is\s*)?(?:full|exhausted)/i.test(t)) out.looksFailed = true;
    return out;
  };

  g.SheetSync = SS;
})(typeof self !== 'undefined' ? self : this);
