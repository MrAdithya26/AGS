'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentStaff } from '@/lib/supabase/server';
import { digits, validAadhaar, validMobile } from '@/lib/format';

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? '').trim(); return v === '' ? null : v; };
const back = (path: string, msg: string): never => redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);

/** Create or update a customer (with family, consent and an optional ID number). */
export async function saveCustomer(form: FormData) {
  const { sb, staff } = await currentStaff();
  const id = s(form, 'id');
  const here = id ? `/customers/${id}/edit` : '/customers/new';
  if (!staff || staff.role === 'viewer') back(here, 'You can only view customers.');
  const name = s(form, 'name');
  if (!name) back(here, 'Name is required.');
  const mobile = digits(form.get('mobile')).slice(-10);
  if (mobile && !validMobile(mobile)) back(here, 'Mobile must be a 10-digit Indian number.');
  const idType = s(form, 'id_type'); const idNum = (s(form, 'id_number') || '').replace(/[\s-]/g, '').toUpperCase();
  if (idNum && idType === 'aadhaar' && !validAadhaar(idNum)) back(here, 'This Aadhaar number is not valid (check the digits).');
  if (idNum && idType === 'pan' && !/^[A-Z]{5}\d{4}[A-Z]$/.test(idNum)) back(here, 'PAN format is ABCDE1234F.');

  let familyId = s(form, 'family_id');
  const newFamily = s(form, 'new_family');
  if (newFamily) {
    const { data, error } = await sb.from('families').insert({ name: newFamily }).select('id').single();
    if (error) back(here, error.message); familyId = data!.id;
  }
  const consent = { consent_whatsapp: form.get('consent_whatsapp') === 'on', consent_sms: form.get('consent_sms') === 'on', consent_calls: form.get('consent_calls') === 'on' };
  const row: Record<string, unknown> = {
    name, name_te: s(form, 'name_te'), gender: s(form, 'gender'), dob: s(form, 'dob'), mobile: mobile || null,
    alt_mobile: digits(form.get('alt_mobile')).slice(-10) || null, email: s(form, 'email'), address: s(form, 'address'), city: s(form, 'city'),
    district: s(form, 'district'), state: s(form, 'state'), pincode: s(form, 'pincode'), preferred_lang: s(form, 'preferred_lang') || 'te',
    tags: (s(form, 'tags') || '').split(',').map(t => t.trim()).filter(Boolean), notes: s(form, 'notes'), family_id: familyId, ...consent,
  };
  if (Object.values(consent).some(Boolean) && form.get('had_consent') !== '1') row.consent_at = new Date().toISOString();

  let customerId = id;
  if (id) {
    const { error } = await sb.from('customers').update(row).eq('id', id); if (error) back(here, error.message);
  } else {
    if (mobile) {
      const { data: dup } = await sb.from('customers').select('code, name').eq('mobile', mobile).ilike('name', name!).limit(1);
      if (dup?.length && form.get('allow_duplicate') !== 'on') back(here, `${dup[0].name} (${dup[0].code}) already has this mobile. Tick "Save anyway" if this is a different person.`);
    }
    const { data, error } = await sb.from('customers').insert({ ...row, created_by: staff!.id }).select('id').single();
    if (error) back(here, error.message); customerId = data!.id;
  }
  if (idType && idNum) {
    const { error } = await sb.rpc('add_customer_id', { p_customer: customerId, p_type: idType, p_number: idNum });
    if (error) back(`/customers/${customerId}/edit`, 'Customer saved, but the ID was not: ' + error.message);
  }
  revalidatePath('/customers');
  redirect(`/customers/${customerId}?saved=1`);
}

/** Full ID number for owner / manager (logged in the audit log by the database). */
export async function revealId(rowId: string): Promise<string> {
  const { sb } = await currentStaff();
  const { data, error } = await sb.rpc('reveal_customer_id', { p_id: rowId });
  if (error) throw new Error(error.message);
  return String(data);
}

/** Upload a document to the private store (max 10 MB). */
export async function uploadFile(form: FormData) {
  const { sb, staff } = await currentStaff();
  const customerId = String(form.get('customer_id'));
  const file = form.get('file') as File | null;
  const here = `/customers/${customerId}`;
  if (!staff || staff.role === 'viewer') back(here, 'You can only view.');
  if (!file || !file.size) back(here, 'Choose a file first.');
  if (file!.size > 10 * 1024 * 1024) back(here, 'File is larger than 10 MB.');
  const safe = file!.name.replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `customers/${customerId}/${Date.now()}-${safe}`;
  const { error } = await sb.storage.from('crm-files').upload(path, file!, { contentType: file!.type || 'application/octet-stream' });
  if (error) back(here, 'Upload failed: ' + error.message);
  const { error: e2 } = await sb.from('customer_files').insert({ customer_id: customerId, kind: s(form, 'kind') || 'Document', storage_path: path, delete_after: s(form, 'delete_after'), created_by: staff!.id });
  if (e2) back(here, e2.message);
  revalidatePath(here); redirect(here + '?saved=1');
}
