import Link from 'next/link';
import { currentStaff } from '@/lib/supabase/server';
import { inr } from '@/lib/format';
import { period, PERIODS } from '@/lib/periods';

const COLORS: Record<string, string> = { ttd: '#2a78d6', travel: '#eb6834', application: '#1baf7a', quick: '#eda100', home_service: '#6250d6' };
const NAMES: Record<string, string> = { ttd: 'TTD', travel: 'Travel', application: 'Applications', quick: 'Counter & bills', home_service: 'Home services' };
const delta = (a: number, b: number) => { if (!b) return a ? <span className="delta up">new</span> : null; const p = Math.round((a - b) * 100 / Math.abs(b)); return <span className={`delta ${p > 0 ? 'up' : p < 0 ? 'down' : ''}`}>{p > 0 ? '▲' : p < 0 ? '▼' : ''} {Math.abs(p)}%</span>; };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams; const p = PERIODS.some(x => x[0] === sp.p) ? sp.p! : 'month'; const r = period(p);
  const { sb, staff } = await currentStaff();
  const [{ data: cur }, { data: prev }] = await Promise.all([sb.rpc('dashboard', { p_from: r.from, p_to: r.to }), sb.rpc('dashboard', { p_from: r.prevFrom, p_to: r.prevTo })]);
  const D: any = cur || {}; const P: any = prev || {};
  const net = (x: any) => (x.received || 0) - (x.refunded || 0);
  const months = [...new Set((D.monthly || []).map((m: any) => m.month))].sort() as string[];
  const kinds = [...new Set((D.monthly || []).map((m: any) => m.kind))] as string[];
  const mTotal = (mo: string) => (D.monthly || []).filter((m: any) => m.month === mo).reduce((a: number, m: any) => a + Math.max(0, m.amount), 0);
  const max = Math.max(1, ...months.map(mTotal));
  const queue: [string, number, string, string][] = ([
    ['Refunds to give', D.refunds_due?.n, 'var(--red)', '/jobs?show=failed'],
    ['Past expected date', D.overdue, 'var(--red)', '/jobs?show=late'],
    ['Money still due from customers', D.unpaid?.n, 'var(--amber)', '/jobs?show=all'],
    ['Ready to collect: call customer', D.ready, 'var(--accent)', '/jobs?show=open'],
    ['Darshan / journey / service in next 2 days', D.soon, 'var(--accent)', '/jobs?show=all'],
  ] as [string, number, string, string][]).filter(x => x[1]);
  return (<>
    <header className="top"><h1>Dashboard</h1>
      <div className="seg" style={{ marginLeft: 'auto' }}>{PERIODS.map(([k, l]) => <Link key={k} href={`/?p=${k}`} className={p === k ? 'on' : ''}>{l}</Link>)}</div></header>
    <div className="content">
      <p className="muted" style={{ marginTop: 0 }}>{r.label} · {r.from} to {r.to} · compared with the same length before. Hello, {staff?.name}.</p>
      {(D.not_closed || []).length > 0 && <div className="banner">Cash not closed today: <b>{D.not_closed.join(', ')}</b>. <Link href="/accounts">Close in Accounts</Link></div>}
      <div className="kpis">
        <div className="kpi"><div className="lbl">Money received (net)</div><div className="val">{inr(net(D))}</div><div className="sub">{delta(net(D), net(P))} refunds {inr(D.refunded)}</div></div>
        <div className="kpi"><div className="lbl">Service income</div><div className="val">{inr(D.income)}</div><div className="sub">{delta(D.income || 0, P.income || 0)} your charges on finished work</div></div>
        <div className="kpi"><div className="lbl">New bookings</div><div className="val">{D.new_jobs ?? 0}</div><div className="sub">{delta(D.new_jobs || 0, P.new_jobs || 0)}</div></div>
        <div className="kpi"><div className="lbl">Completed</div><div className="val">{D.done ?? 0}</div><div className="sub">{D.done + D.failed ? Math.round(D.done * 100 / (D.done + D.failed)) : 0}% success</div></div>
        <div className="kpi"><div className="lbl">Open work</div><div className="val">{D.open ?? 0}</div><div className="sub">all departments</div></div>
        <div className="kpi"><div className="lbl">Due from customers</div><div className="val">{inr(D.unpaid?.amt)}</div><div className="sub">{D.unpaid?.n ?? 0} bookings</div></div>
      </div>
      <div className="grid2">
        <div className="card"><h3>Money received by service line <span className="muted small" style={{ fontWeight: 400 }}>last 6 months</span></h3>
          <div className="row wrap small" style={{ marginBottom: 10 }}>{kinds.map(k => <span key={k}><i className="sw" style={{ background: COLORS[k] }} />{NAMES[k] || k}</span>)}</div>
          {months.length ? <div className="bars">{months.map(mo => <div key={mo} className="barcol" title={`${mo}: ${inr(mTotal(mo))}`}>
            <div className="stack" style={{ height: `${Math.round(mTotal(mo) * 100 / max)}%` }}>{kinds.map(k => { const v = Math.max(0, (D.monthly || []).find((m: any) => m.month === mo && m.kind === k)?.amount || 0); return v ? <div key={k} style={{ background: COLORS[k], flexGrow: v }} title={`${NAMES[k]}: ${inr(v)}`} /> : null; })}</div>
            <div className="small muted">{new Date(mo + '-01').toLocaleDateString('en-IN', { month: 'short' })}</div><div className="small">{inr(mTotal(mo))}</div></div>)}</div>
            : <p className="muted small">No payments yet.</p>}
        </div>
        <div className="card"><h3>Work queue</h3>
          {queue.length ? queue.map(([t, n, c, href]) => <Link key={t} href={href} className="q"><span className="dot" style={{ background: c }} /><span style={{ flex: 1 }}>{t}</span><b>{n}</b></Link>) : <div className="okmsg">All clear. Nothing waiting.</div>}
          {D.refunds_due?.amt ? <p className="small muted">Refunds to give total {inr(D.refunds_due.amt)}.</p> : null}
        </div>
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card"><h3>By department</h3>
          <table className="t"><thead><tr><th>Department</th><th className="right">Bookings</th><th className="right">Done</th><th className="right">Open</th><th className="right">Received</th><th className="right">Income</th></tr></thead><tbody>
            {(D.by_dept || []).map((x: any) => <tr key={x.dept}><td><i className="sw" style={{ background: COLORS[x.kind] }} />{x.dept}</td><td className="right">{x.n}</td><td className="right">{x.done}</td><td className="right">{x.open}</td><td className="right">{inr(x.received)}</td><td className="right">{inr(x.income)}</td></tr>)}
          </tbody></table>{!(D.by_dept || []).length && <div className="empty">No bookings in this period.</div>}</div>
        <div className="card"><h3>Staff</h3>
          <table className="t"><thead><tr><th>Name</th><th className="right">Created</th><th className="right">Done</th><th className="right">Open now</th><th className="right">Collected</th></tr></thead><tbody>
            {(D.staff || []).map((x: any) => <tr key={x.name}><td>{x.name}</td><td className="right">{x.created}</td><td className="right">{x.done}</td><td className="right">{x.open}</td><td className="right">{inr(x.received)}</td></tr>)}
          </tbody></table></div>
      </div>
    </div>
  </>);
}
