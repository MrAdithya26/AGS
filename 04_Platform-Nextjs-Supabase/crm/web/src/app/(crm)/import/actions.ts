'use server';
import { redirect } from 'next/navigation';
import { currentStaff } from '@/lib/supabase/server';
import { parseCsv, toIsoDate } from '@/lib/csv';
import { digits, validAadhaar, validMobile } from '@/lib/format';

const go = (msg: string, ok = false): never => redirect(`/import?${ok ? 'done' : 'error'}=${encodeURIComponent(msg)}`);
const rp = (v?: string) => Math.round((Number(String(v ?? '').replace(/[₹,\s]/g, '')) || 0) * 100);
const MAX = 2000;

async function readFile(f: FormData) {
  const ctx = await currentStaff();
  if (ctx.staff?.role !== 'owner' && ctx.staff?.role !== 'manager') go('Only the owner or a manager can import.');
  const file = f.get('file') as File | null; if (!file || !file.size) go('Choose a CSV file first.');
  const rows = parseCsv(await file!.text()); if (!rows.length) go('The file has no rows.');
  if (rows.length > MAX) go(`The file has ${rows.length} rows; import at most ${MAX} at a time.`);
  return { ...ctx, rows };
}
const ID_MAP: Record<string, string> = { 'aadhaar card': 'aadhaar', aadhaar: 'aadhaar', 'pan card': 'pan', pan: 'pan', 'voter id': 'voter', passport: 'passport', 'driving licence': 'dl' };

/** Customers tab of Sheet edition (or the TTD devotees template). Skips people already saved with the same name + mobile. */
export async function importCustomers(f: FormData) {
  const { sb, staff, rows } = await readFile(f);
  const { data: fams } = await sb.from('families').select('id, name'); const famMap = new Map((fams ?? []).map(x => [x.name.toLowerCase(), x.id]));
  const { data: existing } = await sb.from('customers').select('name, mobile'); const seen = new Set((existing ?? []).map(c => `${c.name.toLowerCase()}|${c.mobile ?? ''}`));
  let added = 0, skipped = 0, ids = 0, badIds = 0;
  for (const r of rows) {
    const name = r['Devotee Name (as on ID)'] || r['Name'] || r['Customer Name']; if (!name) { skipped++; continue; }
    const mobile = digits(r['Mobile']).slice(-10); const m = validMobile(mobile) ? mobile : null;
    if (seen.has(`${name.toLowerCase()}|${m ?? ''}`)) { skipped++; continue; }
    const fam = (r['Profile Name'] || r['Profile / Family'] || '').trim(); let familyId: string | null = null;
    if (fam) { familyId = famMap.get(fam.toLowerCase()) ?? null; if (!familyId) { const { data } = await sb.from('families').insert({ name: fam }).select('id').single(); familyId = data?.id ?? null; if (familyId) famMap.set(fam.toLowerCase(), familyId); } }
    const notes = [r['Customer ID'] ? `Sheet ID ${r['Customer ID']}` : '', r['Gotram (for Homam)'] ? `Gotram: ${r['Gotram (for Homam)']}` : '', r['Notes']].filter(Boolean).join(' · ') || null;
    const { data: c, error } = await sb.from('customers').insert({ name, mobile: m, family_id: familyId, gender: r['Gender'] || null, dob: toIsoDate(r['Date of Birth (DD/MM/YYYY)'] || r['Date of Birth']),
      email: r['Email ID'] || null, address: r['Address'] || null, city: r['City / Town'] || null, district: r['District'] || null, state: r['State'] || 'Andhra Pradesh', pincode: r['Pincode'] || null, notes, tags: ['imported'], created_by: staff!.id }).select('id').single();
    if (error || !c) { skipped++; continue; }
    added++; seen.add(`${name.toLowerCase()}|${m ?? ''}`);
    const type = ID_MAP[(r['Photo ID Type'] || '').toLowerCase()]; const num = (r['Photo ID Number'] || '').replace(/[\s-]/g, '').toUpperCase();
    if (type && num) { if (type === 'aadhaar' && !validAadhaar(num)) { badIds++; continue; } const { error: e } = await sb.rpc('add_customer_id', { p_customer: c.id, p_type: type, p_number: num }); e ? badIds++ : ids++; }
  }
  go(`Customers: ${added} added, ${skipped} skipped (already saved or no name). ID numbers saved encrypted: ${ids}${badIds ? `, ${badIds} not valid (not saved)` : ''}.`, true);
}

const STEP: Record<string, Record<string, string>> = {
  ttd: { Requested: 'requested', Attempting: 'attempting', Booked: 'booked', Completed: 'completed', 'Not Booked': 'not_booked', 'Lucky Dip - Registered': 'dip_registered', 'Lucky Dip - Selected': 'dip_selected', 'Lucky Dip - Not Selected': 'dip_not_selected', 'Payment Failed': 'payment_failed', Cancelled: 'cancelled' },
  travel: { Requested: 'requested', Attempting: 'attempting', Booked: 'booked', Completed: 'completed', 'Not Booked': 'not_booked', 'Payment Failed': 'not_booked', Cancelled: 'cancelled' },
  application: { Requested: 'received', Attempting: 'received', Applied: 'applied', 'In Process': 'in_process', 'Ready to Collect': 'ready', Completed: 'delivered', Booked: 'delivered', Rejected: 'rejected', 'Not Booked': 'rejected', Cancelled: 'cancelled' },
  quick: { Completed: 'completed', Booked: 'completed', Requested: 'completed', Cancelled: 'cancelled' },
};

/** Bookings tab of Sheet edition. Keeps the same booking numbers; skips numbers already in the CRM. */
export async function importBookings(f: FormData) {
  const { sb, staff, rows } = await readFile(f);
  const [{ data: depts }, { data: svcs }, { data: have }] = await Promise.all([sb.from('departments').select('id, name, kind'), sb.from('services').select('id, department_id, name'), sb.from('jobs').select('number')]);
  const nums = new Set((have ?? []).map(x => x.number)); const custByMobile = new Map<string, string>();
  let added = 0, skipped = 0, pays = 0;
  for (const r of rows) {
    const number = r['Booking ID']; if (!number || nums.has(number)) { skipped++; continue; }
    const dept = (depts ?? []).find(d => d.name.toLowerCase() === (r['Department'] || 'TTD').toLowerCase()) || (depts ?? []).find(d => d.name === 'TTD'); if (!dept) { skipped++; continue; }
    const svc = (svcs ?? []).find(s => s.department_id === dept.id && s.name.toLowerCase() === (r['Service'] || '').toLowerCase());
    const mobile = digits(r['Mobile']).slice(-10); let customerId: string | null = null;
    if (validMobile(mobile)) {
      customerId = custByMobile.get(mobile) ?? null;
      if (!customerId) { const { data } = await sb.from('customers').select('id').eq('mobile', mobile).order('created_at').limit(1); customerId = data?.[0]?.id ?? null; }
    }
    if (!customerId && r['Customer Name']) { const { data } = await sb.from('customers').insert({ name: r['Customer Name'], mobile: validMobile(mobile) ? mobile : null, tags: ['imported'], created_by: staff!.id }).select('id').single(); customerId = data?.id ?? null; }
    if (customerId && validMobile(mobile)) custByMobile.set(mobile, customerId);
    const step = STEP[dept.kind]?.[r['Booking Status']] || (dept.kind === 'application' ? 'received' : dept.kind === 'quick' ? 'completed' : 'requested');
    const created = toIsoDate(r['Request Date']);
    const details = Object.fromEntries(Object.entries({ people: r['Passenger Details (name, gender, age, berth)'] || r['Devotees'], slot: r['Slot / Reporting Time'], reporting_point: r['Reporting Point'], ttd_login: r['TTD Login (Mobile)'],
      room: r['Room / Cottage'], check_out: toIsoDate(r['Check-out (Rooms)']), from: r['From (Travel)'], to: r['To (Travel)'], operator: r['Operator / Airline'], vehicle_no: r['Train / Bus / Flight No'], class: r['Class'], quota: r['Quota'],
      boarding: r['Boarding Point'], seat: r['Coach / Seat / Berth'], ticket_status: r['Ticket Status (CNF/RAC/WL)'], documents: r['Documents Received'], refund_status: r['Refund Status'], remarks: r['Remarks'], imported_from: 'Sheet edition' }).filter(([, v]) => v));
    const { data: job, error } = await sb.from('jobs').insert({ number, department_id: dept.id, service_id: svc?.id ?? null, customer_id: customerId, step_key: step, persons: Number(r['No. of Persons']) || 1,
      wanted_date: toIsoDate(r['Preferred Date']), service_date: toIsoDate(r['Darshan / Seva Date'] || r['Check-in (Rooms)']), expected_date: toIsoDate(r['Expected Date (Applications)']), ext_ref: r['TTD Booking / Ticket No'] || null,
      govt_fee: rp(r['Ticket Amount (₹)']), service_charge: rp(r['Service Charge (₹)']), contact_channel: /SMS/.test(r['Send Messages By'] || '') ? 'sms' : 'whatsapp', details, created_by: staff!.id,
      ...(created ? { created_at: created + 'T10:00:00+05:30' } : {}) }).select('id').single();
    if (error || !job) { skipped++; continue; }
    added++; nums.add(number);
    const at = created ? created + 'T10:00:00+05:30' : undefined;
    if (rp(r['Amount Received (₹)']) > 0) { const { error: e } = await sb.from('payments').insert({ job_id: job.id, customer_id: customerId, kind: 'receipt', amount: rp(r['Amount Received (₹)']), mode: r['Payment Mode'] || 'Cash', ref: 'Imported', ...(at ? { at } : {}) }); if (!e) pays++; }
    if (r['Refund Status'] === 'Refunded' && rp(r['Refund Amount (₹)']) > 0) { const { error: e } = await sb.from('payments').insert({ job_id: job.id, customer_id: customerId, kind: 'refund', amount: rp(r['Refund Amount (₹)']), mode: r['Refund Mode'] || 'Cash', ref: 'Imported', at: (toIsoDate(r['Refund Date']) || created || '') ? (toIsoDate(r['Refund Date']) || created) + 'T12:00:00+05:30' : undefined }); if (!e) pays++; }
  }
  go(`Bookings: ${added} added, ${skipped} skipped (already in the CRM, no booking number, or unknown department). Payments recorded: ${pays}.`, true);
}
