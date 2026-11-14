import { currentStaff } from '@/lib/supabase/server';

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return 'No data\n';
  const keys = Object.keys(rows[0]); const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
};
const rs = (p: number | null) => ((p || 0) / 100).toFixed(2);

export async function GET(req: Request) {
  const u = new URL(req.url); const kind = u.searchParams.get('kind'); const from = u.searchParams.get('from') || '2000-01-01'; const to = u.searchParams.get('to') || '2999-12-31';
  const { sb, staff } = await currentStaff();
  if (!staff?.active) return new Response('Please sign in', { status: 401 });
  if (kind === 'customers' && staff.role !== 'owner' && staff.role !== 'manager') return new Response('Only the owner or a manager can download customers', { status: 403 });
  let rows: Record<string, unknown>[] = [];
  if (kind === 'jobs') {
    const { data } = await sb.from('jobs').select('number, step_key, persons, wanted_date, service_date, expected_date, ext_ref, govt_fee, service_charge, discount, total, paid, refunded, created_at, details, customers(code, name, mobile), services(name), departments(name)').gte('created_at', from + 'T00:00:00+05:30').lte('created_at', to + 'T23:59:59+05:30').order('created_at');
    rows = (data ?? []).map((j: any) => ({ booking: j.number, department: j.departments?.name, service: j.services?.name, step: j.step_key, customer_no: j.customers?.code, customer: j.customers?.name, mobile: j.customers?.mobile, persons: j.persons, wanted: j.wanted_date, service_date: j.service_date, expected: j.expected_date, ref_pnr_app_no: j.ext_ref, fee: rs(j.govt_fee), charge: rs(j.service_charge), discount: rs(j.discount), total: rs(j.total), paid: rs(j.paid), refunded: rs(j.refunded), created: j.created_at, details: j.details }));
  } else if (kind === 'payments') {
    const { data } = await sb.from('payments').select('receipt_no, kind, amount, mode, ref, at, jobs(number), customers(name)').gte('at', from + 'T00:00:00+05:30').lte('at', to + 'T23:59:59+05:30').order('at');
    rows = (data ?? []).map((p: any) => ({ receipt: p.receipt_no, type: p.kind, amount: rs(p.amount), mode: p.mode, ref: p.ref, time: p.at, booking: p.jobs?.number, customer: p.customers?.name }));
  } else if (kind === 'customers') {
    const { data } = await sb.from('customers').select('code, name, name_te, gender, dob, mobile, alt_mobile, email, address, city, district, state, pincode, consent_whatsapp, consent_sms, consent_calls, consent_at, tags, created_at, families(name)').order('code');
    rows = (data ?? []).map((c: any) => ({ ...c, family: c.families?.name, families: undefined }));
  } else return new Response('Unknown export', { status: 400 });
  return new Response(csv(rows), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="ags-${kind}-${from}-to-${to}.csv"` } });
}
