/* Adithya TTD Booking Assistant - background worker: reminders, messaging, shortcuts. */
importScripts('lib/core.js');

chrome.runtime.onInstalled.addListener(async details => {
  const cur = await chrome.storage.local.get(null);
  const patch = {};
  for (const k of Object.keys(ATBA.DEFAULTS)) if (!(k in cur)) patch[k] = ATBA.DEFAULTS[k];
  if (Object.keys(patch).length) await ATBA.save(patch);
  const s = await ATBA.load(); // also moves 1.0 data into a profile
  if (!s.profiles.length) {
    const p = ATBA.newProfile('My Family');
    await ATBA.save({ profiles: [p], activeProfileId: p.id });
  }
  await reschedule();
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(reschedule);
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && (ch.schedule || ch.reminders || ch.monthly)) reschedule();
});

async function reschedule() {
  await chrome.alarms.clearAll();
  chrome.alarms.create('refresh', { periodInMinutes: 360 });
  const s = await ATBA.load();
  const now = Date.now();
  // Monthly nudge to update this month's release dates.
  if (s.reminders.reviewDay) {
    const item = { id: 'review', day: s.reminders.reviewDay, time: s.reminders.reviewTime || '09:00', enabled: true };
    const t = ATBA.nextRelease(item, now, {});
    if (t) chrome.alarms.create(`review|${t}`, { when: t });
  }
  if (!s.reminders.enabled) return;
  for (const item of s.schedule) {
    const info = ATBA.nextReleaseInfo(item, now, s.monthly);
    if (!info || !info.enabled) continue;
    for (const off of s.reminders.offsets) {
      const when = info.t - off * 60000;
      if (when > now + 2000) chrome.alarms.create(`rem|${item.id}|${off}|${info.t}`, { when });
    }
  }
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === 'refresh') return reschedule();
  if (alarm.name.startsWith('review|')) {
    const s = await ATBA.load();
    const { y, m } = ATBA.istParts();
    const key = ATBA.monthKey(y, m);
    const nextKey = ATBA.addMonths(key, 1);
    chrome.notifications.create(`review|${Date.now()}`, {
      type: 'basic', iconUrl: 'icons/icon128.png',
      title: 'Update TTD release dates',
      message: `TTD announces quota dates every month. Check the announcement and edit the dates for ${ATBA.monthName(key)} / ${ATBA.monthName(nextKey)} so your reminders are right.`,
      buttons: [{ title: 'Edit monthly dates' }], priority: 1
    });
    setTimeout(reschedule, 3000);
    return s;
  }
  if (!alarm.name.startsWith('rem|')) return;
  const [, id, off, t] = alarm.name.split('|');
  const s = await ATBA.load();
  const item = s.schedule.find(x => x.id === id);
  if (item) notify(item, Number(off), Number(t));
  if (Number(off) === Math.min(...s.reminders.offsets)) setTimeout(reschedule, 5000);
});

function notify(item, off, t) {
  const title = off > 0 ? `${item.label} opens in ${off} min` : `${item.label} - booking open now`;
  chrome.notifications.create(`n|${item.id}|${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message: `Release time: ${ATBA.fmtWhen(t)}. Log in to TTD, keep the pilgrim details page ready and pick your profile. Confirm timings on the official TTD site.`,
    buttons: [{ title: 'Open TTD booking page' }],
    priority: 2,
    requireInteraction: off <= 5
  });
}

async function openFor(notificationId) {
  chrome.notifications.clear(notificationId);
  if (notificationId.startsWith('review|')) {
    return chrome.tabs.create({ url: chrome.runtime.getURL('options.html#schedule') });
  }
  const id = notificationId.split('|')[1];
  const s = await ATBA.load();
  const item = s.schedule.find(x => x.id === id);
  chrome.tabs.create({ url: (item && item.url) || ATBA.TTD_HOME });
}
chrome.notifications.onClicked.addListener(openFor);
chrome.notifications.onButtonClicked.addListener(openFor);

// Makes sure the helper is present in a tab (injects it on demand for other pages).
async function ensureContent(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: 'atba:ping' });
    if (r && r.ok) return true;
  } catch (e) { /* not injected yet */ }
  await chrome.scripting.executeScript({ target: { tabId }, files: ['lib/core.js', 'content.js'] });
  return true;
}

chrome.commands.onCommand.addListener(async cmd => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    await ensureContent(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: cmd === 'autofill' ? 'atba:autofill' : 'atba:paste' });
  } catch (e) { console.warn('ATBA command failed', e); }
});

// Default selection when switching profile: everyone in it, up to 6 (TTD's usual per-booking limit).
const defaultSelection = prof => (prof ? prof.pilgrims.slice(0, 6).map(p => p.id) : []);

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    switch (msg.type) {
      case 'getFillData': {
        const s = await ATBA.load();
        const prof = ATBA.activeProfile(s);
        const locked = await ATBA.isLocked();
        const all = await ATBA.reveal(prof ? prof.pilgrims : []);
        const selectedIds = s.selectedIds.filter(id => all.some(p => p.id === id));
        return {
          profiles: s.profiles.map(p => ({ id: p.id, name: p.name, count: p.pilgrims.length, city: p.contact.city, state: p.contact.state })),
          activeProfileId: prof ? prof.id : '',
          profileName: prof ? prof.name : '',
          self: prof ? prof.contact : ATBA.emptyContact(),
          pilgrims: selectedIds.map(id => all.find(p => p.id === id)),
          all: all.map(p => ({ id: p.id, name: p.name, age: ATBA.ageFrom(p.dob), gender: p.gender, gotram: p.gotram || '', hasPhoto: !!p.photo })),
          selectedIds, locked, panel: s.panel,
          bookingType: ATBA.bookingType(s.bookingType).id
        };
      }
      case 'setBookingType':
        await ATBA.save({ bookingType: ATBA.bookingType(msg.id).id });
        return { ok: true };
      case 'setGotram': {
        // Saves Gotram typed in the on-page picker straight into the devotee's profile.
        const s = await ATBA.load();
        const g = String(msg.gotram || '').trim().replace(/\s+/g, ' ');
        let n = 0;
        for (const p of ATBA.allPilgrims(s)) if (msg.ids.includes(p.id)) { p.gotram = g; n++; }
        if (n) await ATBA.save({ profiles: s.profiles });
        return { ok: true, updated: n };
      }
      case 'setSelected':
        await ATBA.save({ selectedIds: msg.ids });
        return { ok: true };
      case 'setProfile': {
        const s = await ATBA.load();
        const prof = s.profiles.find(p => p.id === msg.profileId);
        if (!prof) return { error: 'Profile not found' };
        await ATBA.save({ activeProfileId: prof.id, selectedIds: msg.ids || defaultSelection(prof) });
        return { ok: true };
      }
      case 'testReminder':
        notify({ id: 'test', label: 'Test reminder', url: ATBA.TTD_HOME }, 5, Date.now() + 5 * 60000);
        return { ok: true };
      case 'reschedule':
        await reschedule();
        return { ok: true };
      case 'openOptions':
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html' + (msg.hash ? '#' + msg.hash : '')) });
        return { ok: true };
      default:
        return { error: 'unknown message' };
    }
  })().then(reply, e => reply({ error: String(e && e.message || e) }));
  return true;
});
