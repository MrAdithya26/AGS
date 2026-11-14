'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentStaff } from '@/lib/supabase/server';

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? '').trim(); return v === '' ? null : v; };
const paise = (v: string | null) => Math.round((Number(String(v ?? '0').replace(/[₹,\s]/g, '')) || 0) * 100);
const go = (p: string, err?: string | null): never => redirect(p + (err ? `${p.includes('?') ? '&' : '?'}error=${encodeURIComponent(err)}` : `${p.includes('?') ? '&' : '?'}saved=1`));

/** Close my cash for the day: the database works out what I should have; I enter what I counted. */
export async function closeCash(f: FormData) {
  const { sb, staff } = await currentStaff();
  const day = String(f.get('day')); const back = `/accounts?day=${day}`;
  if (!staff || staff.role === 'viewer') go(back, 'Not allowed.');
  const { data: exp, error: e1 } = await sb.rpc('cash_expected', { p_staff: staff!.id, p_day: day });
  if (e1) go(back, e1.message);
  const row = (exp as any[])?.[0] || { cash: 0, upi: 0 };
  const { error } = await sb.from('cash_closings').insert({ staff_id: staff!.id, day, expected: row.cash, upi: row.upi, counted: paise(s(f, 'counted')), note: s(f, 'note'), closed_by: staff!.id });
  revalidatePath('/accounts'); go(back, error?.code === '23505' ? 'You already closed this day. A manager can correct it.' : error?.message);
}

export async function savePortal(f: FormData) {
  const { sb, staff } = await currentStaff();
  if (staff?.role !== 'owner' && staff?.role !== 'manager') go('/wallets', 'Only the owner or a manager can add portal accounts.');
  const row = { portal: s(f, 'portal') || 'Other', label: s(f, 'label'), login_ref: s(f, 'login_ref'), holder: s(f, 'holder'), monthly_limit: s(f, 'monthly_limit') ? Number(s(f, 'monthly_limit')) : null, active: true };
  if (!row.label) go('/wallets', 'Give the account a name.');
  const { error } = await sb.from('portal_accounts').insert(row);
  revalidatePath('/wallets'); go('/wallets', error?.message);
}

export async function addWalletTxn(f: FormData) {
  const { sb, staff } = await currentStaff();
  if (!staff || staff.role === 'viewer') go('/wallets', 'Not allowed.');
  const amount = paise(s(f, 'amount')); if (amount <= 0) go('/wallets', 'Enter an amount.');
  let jobId: string | null = null; const num = (s(f, 'job_number') || '').toUpperCase();
  if (num) { const { data } = await sb.from('jobs').select('id').eq('number', num).maybeSingle(); if (!data) go('/wallets', `No booking ${num}.`); jobId = data!.id; }
  const { error } = await sb.from('wallet_txns').insert({ portal_account_id: s(f, 'account'), kind: s(f, 'kind') || 'debit', amount, job_id: jobId, note: s(f, 'note') });
  revalidatePath('/wallets'); go('/wallets', error?.message);
}
