import Link from 'next/link';
import { currentStaff } from '@/lib/supabase/server';

const KIND: Record<string, string> = { ttd: 'TTD', travel: 'Travel', application: 'Applications', quick: 'Counter & bills', home_service: 'Home services' };

export default async function Departments() {
  const { sb } = await currentStaff();
  const [{ data: depts }, { data: svcs }, { data: steps }] = await Promise.all([
    sb.from('departments').select('id, code, name, name_te, kind, job_prefix, active').order('sort'),
    sb.from('services').select('department_id, active, govt_fee, service_charge'),
    sb.from('workflow_steps').select('department_id'),
  ]);
  const list = depts ?? []; const sv = svcs ?? [];
  const groups = Object.keys(KIND).map(k => [k, list.filter(d => d.kind === k)] as const).filter(([, l]) => l.length);
  return (<>
    <header className="top"><h1>Departments &amp; services</h1></header>
    <div className="content">
      <p className="muted" style={{ marginTop: 0 }}>Open a department to set real fees and charges, documents, usual days, workflow steps and form fields. <b>Starter fees are samples</b>: please set yours before going live.</p>
      {groups.map(([k, l]) => <div key={k} style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{KIND[k]}</h3>
        <div className="cards">{l.map(d => { const mine = sv.filter(x => x.department_id === d.id); const unset = mine.filter(x => !x.govt_fee && !x.service_charge).length; return (
          <Link key={d.id} href={`/departments/${d.id}`} className="card dcard">
            <div className="row" style={{ justifyContent: 'space-between' }}><b>{d.name}</b>{!d.active && <span className="badge off">off</span>}</div>
            {d.name_te && <div className="te muted small">{d.name_te}</div>}
            <div className="small muted" style={{ marginTop: 6 }}>{mine.filter(x => x.active).length} services · {(steps ?? []).filter(x => x.department_id === d.id).length} steps · {d.job_prefix}-</div>
            {unset > 0 && <div className="small" style={{ color: 'var(--amber)', marginTop: 4 }}>{unset} without fee or charge</div>}
          </Link>); })}</div>
      </div>)}
    </div>
  </>);
}
