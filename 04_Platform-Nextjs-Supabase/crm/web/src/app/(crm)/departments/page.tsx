import { currentStaff } from '@/lib/supabase/server';

type Dept = { id: string; code: string; name: string; name_te: string | null; kind: string; job_prefix: string; active: boolean };
type Svc = { id: string; department_id: string; name: string; govt_fee: number; service_charge: number; pricing_unit: string; sla_days: number | null; docs_required: string[]; active: boolean };
const inr = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN');

export default async function Departments() {
  const { sb } = await currentStaff();
  const [{ data: depts }, { data: svcs }] = await Promise.all([
    sb.from('departments').select('id, code, name, name_te, kind, job_prefix, active').order('sort'),
    sb.from('services').select('id, department_id, name, govt_fee, service_charge, pricing_unit, sla_days, docs_required, active').order('name'),
  ]);
  const list = (depts ?? []) as Dept[]; const all = (svcs ?? []) as Svc[];
  return (<>
    <header className="top"><h1>Departments &amp; services</h1></header>
    <div className="content">
      <p className="muted" style={{ marginTop: 0 }}>{list.length} departments · {all.length} services. Fees and charges are starting values: set your real ones before going live (editing arrives in Phase 1c).</p>
      {list.map(d => { const s = all.filter(x => x.department_id === d.id); return (
        <div className="card" key={d.id} style={{ marginBottom: 14 }}>
          <h3>{d.name} {d.name_te && <span className="muted" style={{ fontWeight: 400 }}>· {d.name_te}</span>} <span className="badge info" style={{ marginLeft: 6 }}>{d.kind}</span> <span className="badge" style={{ marginLeft: 4 }}>{d.job_prefix}-</span></h3>
          {s.length ? <div className="tableWrap"><table className="t"><thead><tr><th>Service</th><th className="right">Govt fee</th><th className="right">Charge</th><th>Per</th><th>Days</th><th>Documents</th><th>Active</th></tr></thead><tbody>
            {s.map(x => <tr key={x.id}><td><b>{x.name}</b></td><td className="right">{inr(x.govt_fee)}</td><td className="right">{inr(x.service_charge)}</td><td>{x.pricing_unit}</td><td>{x.sla_days ?? '—'}</td><td className="small">{x.docs_required.join(', ') || '—'}</td><td>{x.active ? <span className="badge ok">Yes</span> : <span className="badge off">No</span>}</td></tr>)}
          </tbody></table></div> : <div className="muted small">No services yet.</div>}
        </div>); })}
    </div>
  </>);
}
