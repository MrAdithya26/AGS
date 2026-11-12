'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentStaff } from '@/lib/supabase/server';

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? '').trim(); return v === '' ? null : v; };
const paise = (v: string | null) => Math.round((Number(String(v ?? '0').replace(/[₹,\s]/g, '')) || 0) * 100);
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

async function admin(deptId: string) {
  const ctx = await currentStaff();
  if (ctx.staff?.role !== 'owner' && ctx.staff?.role !== 'manager') redirect(`/departments/${deptId}?error=${encodeURIComponent('Only the owner or a manager can change this.')}`);
  return ctx.sb;
}
const done = (deptId: string, err?: string | null): never => {
  revalidatePath(`/departments/${deptId}`); revalidatePath('/departments');
  redirect(`/departments/${deptId}?${err ? 'error=' + encodeURIComponent(err) : 'saved=1'}`);
};

export async function saveDepartment(f: FormData) {
  const id = String(f.get('id')); const sb = await admin(id);
  const { error } = await sb.from('departments').update({ name: s(f, 'name'), name_te: s(f, 'name_te'), job_prefix: (s(f, 'job_prefix') || 'AGS').toUpperCase().slice(0, 5), active: f.get('active') === 'on', updated_at: new Date().toISOString() }).eq('id', id);
  done(id, error?.message);
}

export async function saveService(f: FormData) {
  const dept = String(f.get('department_id')); const sb = await admin(dept); const id = s(f, 'id');
  const name = s(f, 'name'); if (!name) done(dept, 'Service name is required.');
  const row = {
    department_id: dept, name, name_te: s(f, 'name_te'), govt_fee: paise(s(f, 'govt_fee')), service_charge: paise(s(f, 'service_charge')),
    pricing_unit: s(f, 'pricing_unit') || 'booking', sla_days: s(f, 'sla_days') ? Number(s(f, 'sla_days')) : null,
    docs_required: (s(f, 'docs') || '').split(',').map(x => x.trim()).filter(Boolean), active: f.get('active') === 'on',
  };
  const { error } = id ? await sb.from('services').update(row).eq('id', id)
    : await sb.from('services').insert({ ...row, code: `${String(f.get('dept_code'))}-${slug(name!).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}` });
  done(dept, error?.message);
}

export async function saveStep(f: FormData) {
  const dept = String(f.get('department_id')); const sb = await admin(dept); const id = s(f, 'id');
  const label = s(f, 'label'); if (!label) done(dept, 'Step name is required.');
  const row = { department_id: dept, label, label_te: s(f, 'label_te'), sort: Number(s(f, 'sort') || 99), outcome: s(f, 'outcome') || 'open', template_key: s(f, 'template_key') };
  const { error } = id ? await sb.from('workflow_steps').update(row).eq('id', id) : await sb.from('workflow_steps').insert({ ...row, key: slug(label!) });
  done(dept, error?.code === '23505' ? 'A step with this name already exists.' : error?.message);
}

export async function deleteStep(f: FormData) {
  const dept = String(f.get('department_id')); const sb = await admin(dept);
  const { data: step } = await sb.from('workflow_steps').select('key').eq('id', String(f.get('id'))).single();
  const { count } = await sb.from('jobs').select('id', { count: 'exact', head: true }).eq('department_id', dept).eq('step_key', step?.key ?? '');
  if (count) done(dept, `${count} job(s) are at this step. Move them first.`);
  const { error } = await sb.from('workflow_steps').delete().eq('id', String(f.get('id')));
  done(dept, error?.message);
}

/** Form fields: rows come as field_key[], field_label[] …; a row with "remove" ticked or no label is dropped. */
export async function saveFields(f: FormData) {
  const dept = String(f.get('department_id')); const sb = await admin(dept);
  const all = (k: string) => f.getAll(k).map(v => String(v).trim());
  const labels = all('label'), keys = all('key'), te = all('label_te'), types = all('type'), opts = all('options'), stages = all('stage');
  const req = new Set(all('required')), rm = new Set(all('remove'));
  const fields = labels.map((label, i) => ({ i, label })).filter(r => r.label && !rm.has(String(r.i))).map(({ i, label }) => ({
    key: keys[i] || slug(label), label, ...(te[i] ? { label_te: te[i] } : {}), type: types[i] || 'text', stage: stages[i] || 'request',
    ...(types[i] === 'select' ? { options: opts[i].split(',').map(x => x.trim()).filter(Boolean) } : {}), ...(req.has(String(i)) ? { required: true } : {}),
  }));
  const { error } = await sb.from('departments').update({ form_fields: fields }).eq('id', dept);
  done(dept, error?.message);
}
