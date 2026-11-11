import { currentStaff } from '@/lib/supabase/server';

export default async function Dashboard() {
  const { sb, staff } = await currentStaff();
  const count = async (table: string, filter?: (q: any) => any) => {
    let q = sb.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count } = await q; return count ?? 0;
  };
  const [customers, jobs, services, depts, staffN] = await Promise.all([
    count('customers'), count('jobs'), count('services', q => q.eq('active', true)), count('departments', q => q.eq('active', true)), count('staff', q => q.eq('active', true)),
  ]);
  const hour = new Date().getHours();
  return (<>
    <header className="top"><h1>Dashboard</h1></header>
    <div className="content">
      <p className="muted" style={{ marginTop: 0 }}>{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, {staff?.name}. Phase 1a: the foundation is ready. Customers and jobs screens arrive in Phases 1b–1d.</p>
      <div className="kpis">
        <div className="kpi"><div className="lbl">Customers</div><div className="val">{customers}</div><div className="sub">master records</div></div>
        <div className="kpi"><div className="lbl">Bookings &amp; jobs</div><div className="val">{jobs}</div><div className="sub">all departments</div></div>
        <div className="kpi"><div className="lbl">Departments</div><div className="val">{depts}</div><div className="sub">active</div></div>
        <div className="kpi"><div className="lbl">Services</div><div className="val">{services}</div><div className="sub">active in catalogue</div></div>
        <div className="kpi"><div className="lbl">Staff</div><div className="val">{staffN}</div><div className="sub">active logins</div></div>
      </div>
      <div className="card"><h3>Free mode and paid features</h3>
        <p className="small muted" style={{ margin: 0 }}>Everything runs on free plans. WhatsApp messages open in WhatsApp for one-click sending (free); automatic sending through the WhatsApp Business API, SMS, automatic calls and the AI voice agent are built as switches that stay <b>off</b> until the owner approves the cost.</p></div>
    </div>
  </>);
}
