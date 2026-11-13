import NewJobForm from './NewJobForm';
import { currentStaff } from '@/lib/supabase/server';

export default async function NewJob({ searchParams }: { searchParams: Promise<{ customer?: string; error?: string }> }) {
  const sp = await searchParams; const { sb, staff } = await currentStaff();
  const [{ data: depts }, { data: services }, { data: team }, cust] = await Promise.all([
    sb.from('departments').select('id, name, kind, form_fields').eq('active', true).order('sort'),
    sb.from('services').select('id, department_id, name, govt_fee, service_charge, pricing_unit, sla_days').eq('active', true).order('name'),
    sb.from('staff').select('id, name').eq('active', true).order('name'),
    sp.customer ? sb.from('customers').select('id, name, code, mobile').eq('id', sp.customer).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (<><header className="top"><h1>New booking</h1></header>
    <div className="content"><NewJobForm depts={(depts ?? []) as any} services={services ?? []} staff={team ?? []} me={staff!.id} customer={cust.data as any} error={sp.error} /></div></>);
}
