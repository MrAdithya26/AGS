'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentStaff } from '@/lib/supabase/server';
import { digits, validMobile } from '@/lib/format';
import defaults from '@/lib/default-templates.json';

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? '').trim(); return v === '' ? null : v; };
const paise = (v: string | null) => Math.round((Number(String(v ?? '0').replace(/[₹,\s]/g, '')) || 0) * 100);
const go = (path: string, err?: string | null): never => redirect(path + (err ? `${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(err)}` : ''));
const fieldValues = (f: FormData) => { const o: Record<string, string> = {}; f.forEach((v, k) => { if (k.startsWith('f_') && String(v).trim()) o[k.slice(2)] = String(v).trim(); }); return o; };

async function writer() {
  const ctx = await currentStaff();
  if (!ctx.staff || ctx.staff.role === 'viewer') go('/jobs', 'You can only view bookings.');
  return ctx;
}

export async function createJob(f: FormData) {
  const { sb, staff } = await writer();
  const back = '/jobs/new' + (s(f, 'preset_customer') ? `?customer=${s(f, 'preset_customer')}` : '');
  const dept = s(f, 'department_id'); if (!dept) go(back, 'Choose a department.');
  // Customer: preset, or found by customer no / mobile, or created from name + mobile
  let customerId = s(f, 'preset_customer');
  if (!customerId) {
    const find = (s(f, 'customer_find') || '').toUpperCase();
    const mobile = digits(find).slice(-10);
    if (find) {
      const { data } = /^C\d+$/.test(find) ? await sb.from('customers').select('id').eq('code', find).limit(1)
        : validMobile(mobile) ? await sb.from('customers').select('id').eq('mobile', mobile).order('created_at').limit(1) : { data: [] as any[] };
      customerId = data?.[0]?.id ?? null;
    }
    if (!customerId) {
      const name = s(f, 'new_name');
      if (!name) go(back, find ? 'No customer with that number or mobile. Type the name to add a new customer.' : 'Enter a customer number / mobile, or a new customer name.');
      if (mobile && !validMobile(mobile)) go(back, 'Mobile must be 10 digits.');
      const { data, error } = await sb.from('customers').insert({ name, mobile: validMobile(mobile) ? mobile : null, created_by: staff!.id }).select('id').single();
      if (error) go(back, error.message); customerId = data!.id;
    }
  }
  const details: Record<string, string> = { ...fieldValues(f) };
  if (s(f, 'people')) details.people = s(f, 'people')!;
  if (s(f, 'remarks')) details.remarks = s(f, 'remarks')!;
  const { data: job, error } = await sb.from('jobs').insert({
    department_id: dept, service_id: s(f, 'service_id'), customer_id: customerId, persons: Number(s(f, 'persons') || 1),
    wanted_date: s(f, 'wanted_date'), expected_date: s(f, 'expected_date'), assigned_to: s(f, 'assigned_to') || staff!.id,
    govt_fee: paise(s(f, 'govt_fee')), service_charge: paise(s(f, 'service_charge')), contact_channel: s(f, 'contact_channel') || 'whatsapp', details, created_by: staff!.id,
  }).select('id').single();
  if (error) go(back, error.message);
  const received = paise(s(f, 'received'));
  if (received > 0) {
    const { error: e2 } = await sb.from('payments').insert({ job_id: job!.id, customer_id: customerId, kind: 'receipt', amount: received, mode: s(f, 'mode') || 'Cash', received_by: staff!.id });
    if (e2) go(`/jobs/${job!.id}`, 'Booking saved, but the payment was not: ' + e2.message);
  }
  revalidatePath('/jobs'); redirect(`/jobs/${job!.id}?saved=1`);
}

export async function moveStep(f: FormData) {
  const { sb } = await writer(); const id = String(f.get('id'));
  const { error } = await sb.from('jobs').update({ step_key: String(f.get('step')) }).eq('id', id);
  revalidatePath(`/jobs/${id}`); go(`/jobs/${id}`, error?.message);
}

export async function saveJobDetails(f: FormData) {
  const { sb } = await writer(); const id = String(f.get('id'));
  const { data: cur } = await sb.from('jobs').select('details').eq('id', id).single();
  const details = { ...(cur?.details || {}), ...fieldValues(f) };
  for (const k of ['remarks', 'people']) { const v = s(f, k); if (v !== null) details[k] = v; }
  const { error } = await sb.from('jobs').update({
    details, ext_ref: s(f, 'ext_ref'), service_date: s(f, 'service_date'), expected_date: s(f, 'expected_date'), wanted_date: s(f, 'wanted_date'),
    assigned_to: s(f, 'assigned_to'), govt_fee: paise(s(f, 'govt_fee')), service_charge: paise(s(f, 'service_charge')), discount: paise(s(f, 'discount')),
  }).eq('id', id);
  revalidatePath(`/jobs/${id}`); go(`/jobs/${id}?saved=1`, error?.message);
}

export async function addPayment(f: FormData) {
  const { sb, staff } = await writer(); const id = String(f.get('id'));
  const amount = paise(s(f, 'amount')); if (amount <= 0) go(`/jobs/${id}`, 'Enter an amount.');
  const { error } = await sb.from('payments').insert({ job_id: id, customer_id: s(f, 'customer_id'), kind: s(f, 'kind') || 'receipt', amount, mode: s(f, 'mode') || 'Cash', ref: s(f, 'ref'), received_by: staff!.id });
  revalidatePath(`/jobs/${id}`); go(`/jobs/${id}?saved=1`, error?.message);
}

/** Free mode: the message is sent by staff through WhatsApp / SMS on their phone; this records that it was sent. */
export async function logMessage(f: FormData) {
  const { sb, staff } = await writer(); const id = String(f.get('id'));
  const { error } = await sb.from('messages').insert({ job_id: id, customer_id: s(f, 'customer_id'), channel: s(f, 'channel') || 'whatsapp', direction: 'out', template_key: s(f, 'template_key'), body: s(f, 'body'), status: 'sent', handled_by: staff!.id });
  revalidatePath(`/jobs/${id}`); go(`/jobs/${id}?saved=1`, error?.message);
}

/** One-time: copy the standard Telugu / English templates (from Sheet edition 3.0) into the database. */
export async function loadDefaultTemplates() {
  const { sb, staff } = await currentStaff();
  if (staff?.role !== 'owner' && staff?.role !== 'manager') go('/jobs', 'Only the owner or a manager can load templates.');
  const { error } = await sb.from('message_templates').upsert((defaults as any).templates, { onConflict: 'key,channel,lang', ignoreDuplicates: true });
  revalidatePath('/jobs'); go('/jobs?saved=1', error?.message);
}
