'use server';
import { revalidatePath } from 'next/cache';
import { currentStaff } from '@/lib/supabase/server';

const ROLES = ['owner', 'manager', 'counter', 'agent', 'accountant', 'viewer'] as const;

export async function updateStaff(form: FormData) {
  const { sb, staff } = await currentStaff();
  if (staff?.role !== 'owner') throw new Error('Only the owner can change staff.');
  const id = String(form.get('id'));
  const role = String(form.get('role')) as typeof ROLES[number];
  if (!ROLES.includes(role)) throw new Error('Unknown role');
  const { error } = await sb.from('staff').update({ role, active: form.get('active') === 'on', name: String(form.get('name') || '').trim() || undefined }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/staff');
}
