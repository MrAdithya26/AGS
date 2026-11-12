import CustomerForm from '../CustomerForm';
import { currentStaff } from '@/lib/supabase/server';

export default async function NewCustomer({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams; const { sb } = await currentStaff();
  const { data: families } = await sb.from('families').select('id, name').order('name');
  return (<><header className="top"><h1>New customer</h1></header><div className="content"><CustomerForm families={families ?? []} error={error} /></div></>);
}
