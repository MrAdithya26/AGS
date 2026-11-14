import Link from 'next/link';
import { currentStaff } from '@/lib/supabase/server';
import { inr, todayIST } from '@/lib/format';

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams; const t = todayIST();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from || '') ? sp.from! : t.slice(0, 8) + '01'; const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to || '') ? sp.to! : t;
  const { sb } = await currentStaff();
  const { data } = await sb.rpc('report', { p_from: from, p_to: to }); const R: any = data || {};
  const svc = (R.by_service || []) as any[]; const days = (R.daily || []) as any[];
  const sum = (a: any[], k: string) => a.reduce((s, x) => s + (x[k] || 0), 0);
  const q = `from=${from}&to=${to}`;
  return (<>
    <header className="top"><h1>Reports</h1>
      <form className="row" style={{ marginLeft: 'auto' }}><input className="i" type="date" name="from" defaultValue={from} /><span className="muted">to</span><input className="i" type="date" name="to" defaultValue={to} /><button className="btn">Show</button></form></header>
    <div className="content">
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <a className="btn" href={`/export?kind=jobs&${q}`}>Download bookings (CSV)</a>
        <a className="btn" href={`/export?kind=payments&${q}`}>Download receipts &amp; refunds (CSV)</a>
        <a className="btn" href={`/export?kind=customers`}>Download customers (CSV)</a>
        <span className="small muted">CSV files open in Excel and Google Sheets.</span></div>
      <div className="card" style={{ marginBottom: 16 }}><h3>By service</h3>
        <div className="tableWrap"><table className="t"><thead><tr><th>Department</th><th>Service</th><th className="right">Bookings</th><th className="right">Done</th><th className="right">Not done</th><th className="right">Received</th><th className="right">Refunded</th><th className="right">Service income</th></tr></thead><tbody>
          {svc.map((x, i) => <tr key={i}><td>{x.dept}</td><td>{x.service}</td><td className="right">{x.n}</td><td className="right">{x.done}</td><td className="right">{x.failed}</td><td className="right">{inr(x.received)}</td><td className="right">{inr(x.refunded)}</td><td className="right">{inr(x.income)}</td></tr>)}
          <tr><td colSpan={2}><b>Total</b></td><td className="right"><b>{sum(svc, 'n')}</b></td><td className="right"><b>{sum(svc, 'done')}</b></td><td className="right"><b>{sum(svc, 'failed')}</b></td><td className="right"><b>{inr(sum(svc, 'received'))}</b></td><td className="right"><b>{inr(sum(svc, 'refunded'))}</b></td><td className="right"><b>{inr(sum(svc, 'income'))}</b></td></tr>
        </tbody></table></div></div>
      <div className="card"><h3>Daily income</h3>
        <table className="t"><thead><tr><th>Day</th><th className="right">Entries</th><th className="right">Received</th><th className="right">Refunded</th><th className="right">Net</th><th></th></tr></thead><tbody>
          {days.map(x => <tr key={x.day}><td>{x.day}</td><td className="right">{x.entries}</td><td className="right">{inr(x.received)}</td><td className="right">{inr(x.refunded)}</td><td className="right"><b>{inr(x.received - x.refunded)}</b></td><td><Link className="btn sm" href={`/accounts?day=${x.day}`}>Day book</Link></td></tr>)}
          <tr><td><b>Total</b></td><td className="right"><b>{sum(days, 'entries')}</b></td><td className="right"><b>{inr(sum(days, 'received'))}</b></td><td className="right"><b>{inr(sum(days, 'refunded'))}</b></td><td className="right"><b>{inr(sum(days, 'received') - sum(days, 'refunded'))}</b></td><td /></tr>
        </tbody></table><p className="small muted">“Received” is all money taken in (ticket and govt fees included). “Service income” is only your own charges on finished work.</p></div>
    </div>
  </>);
}
