import { notFound } from 'next/navigation';
import CustomerForm from '../../CustomerForm';
import { currentStaff } from '@/lib/supabase/server';

export default async function EditCustomer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]); const { sb } = await currentStaff();
  const [{ data: c }, { data: families }] = await Promise.all([sb.from('customers').select('*').eq('id', id).maybeSingle(), sb.from('families').select('id, name').order('name')]);
  if (!c) notFound();
  return (<><header className="top"><h1>Edit {c.name}</h1></header><div className="content"><CustomerForm c={c} families={families ?? []} error={error} /></div></>);
}
