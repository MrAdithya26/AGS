import Link from 'next/link';
import { currentStaff } from '@/lib/supabase/server';
import { inr, todayIST } from '@/lib/format';
import { closeCash } from './actions';

export default async function Accounts({ searchParams }: { searchParams: Promise<{ day?: string; error?: string; saved?: string }> }) {
  const sp = await searchParams; const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day || '') ? sp.day! : todayIST();
  const { sb, staff } = await currentStaff();
  const from = new Date(day + 'T00:00:00+05:30').toISOString(), to = new Date(new Date(day + 'T00:00:00+05:30').getTime() + 864e5).toISOString();
  const [{ data: pays }, { data: team }, { data: closings }, { data: mine }] = await Promise.all([
    sb.from('payments').select('id, receipt_no, kind, amount, mode, ref, at, received_by, jobs(id, number, services(name)), customers(name)').gte('at', from).lt('at', to).order('at'),
    sb.from('staff').select('id, name'), sb.from('cash_closings').select('*').eq('day', day),
    sb.rpc('cash_expected', { p_staff: staff!.id, p_day: day }),
  ]);
  const list = (pays ?? []) as any[]; const who = (u: string) => (team ?? []).find(t => t.id === u)?.name || '—';
  const sign = (p: any) => (p.kind === 'refund' ? -1 : 1) * p.amount;
  const by = (k: string) => Object.entries(list.reduce((a: Record<string, number>, p) => { const key = k === 'mode' ? p.mode : who(p.received_by); a[key] = (a[key] || 0) + sign(p); return a; }, {}));
  const net = list.reduce((a, p) => a + sign(p), 0); const recv = list.filter(p => p.kind !== 'refund').reduce((a, p) => a + p.amount, 0);
  const myExp: any = (mine as any[])?.[0] || { cash: 0, upi: 0, other: 0, receipts: 0 }; const myClose = (closings ?? []).find((c: any) => c.staff_id === staff!.id);
  const admin = staff?.role === 'owner' || staff?.role === 'manager' || staff?.role === 'accountant';
  return (<>
    <header className="top"><h1>Accounts</h1><form className="row" style={{ marginLeft: 'auto' }}><input className="i" type="date" name="day" defaultValue={day} /><button className="btn">Show</button></form></header>
    <div className="content">
      {sp.error && <div className="err" style={{ marginBottom: 12 }}>{sp.error}</div>}
      {sp.saved && <div className="okmsg" style={{ marginBottom: 12 }}>Saved.</div>}
      <div className="kpis">
        <div className="kpi"><div className="lbl">Received</div><div className="val">{inr(recv)}</div><div className="sub">{list.filter(p => p.kind !== 'refund').length} receipts</div></div>
        <div className="kpi"><div className="lbl">Refunds given</div><div className="val">{inr(recv - net)}</div></div>
        <div className="kpi"><div className="lbl">Net for the day</div><div className="val">{inr(net)}</div></div>
        {by('mode').map(([m, v]) => <div key={m} className="kpi"><div className="lbl">{m}</div><div className="val">{inr(v as number)}</div></div>)}
      </div>
      <div className="grid2">
        <div className="card"><h3>My cash closing · {day}</h3>
          <p className="small" style={{ marginTop: 0 }}>By the system you should have <b>{inr(myExp.cash)}</b> in cash, plus {inr(myExp.upi)} by UPI and {inr(myExp.other)} other ({myExp.receipts} entries).</p>
          {myClose ? <p>Closed: counted <b>{inr(myClose.counted)}</b> · difference <b style={{ color: myClose.counted - myClose.expected ? 'var(--red)' : 'var(--green)' }}>{inr(myClose.counted - myClose.expected)}</b>{myClose.note ? ` · ${myClose.note}` : ''}</p>
            : <form action={closeCash} className="row wrap"><input type="hidden" name="day" value={day} /><label className="f">Cash I counted ₹<input className="i" name="counted" inputMode="decimal" required style={{ width: 140 }} /></label><label className="f">Note<input className="i" name="note" placeholder="e.g. ₹10 short – change" /></label><button className="btn primary" style={{ alignSelf: 'end' }}>Close my day</button></form>}
        </div>
        <div className="card"><h3>By staff</h3>
          <table className="t"><thead><tr><th>Staff</th><th className="right">Net</th><th>Closing</th></tr></thead><tbody>
            {by('staff').map(([n, v]) => { const st = (team ?? []).find(t => t.name === n); const c: any = (closings ?? []).find((x: any) => x.staff_id === st?.id); return <tr key={n}><td>{n}</td><td className="right">{inr(v as number)}</td><td className="small">{c ? <>counted {inr(c.counted)} · diff <b style={{ color: c.counted - c.expected ? 'var(--red)' : 'var(--green)' }}>{inr(c.counted - c.expected)}</b></> : <span className="muted">not closed</span>}</td></tr>; })}
          </tbody></table>{!admin && <p className="small muted">You see your own closing; managers see all.</p>}</div>
      </div>
      <div className="card" style={{ marginTop: 16 }}><h3>Day book</h3>
        <div className="tableWrap"><table className="t"><thead><tr><th>Time</th><th>Receipt</th><th>Customer</th><th>Booking</th><th>Mode</th><th className="right">Amount</th><th>By</th><th></th></tr></thead><tbody>
          {list.map(p => <tr key={p.id}><td className="small nowrap">{new Date(p.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td><td className="nowrap"><b>{p.receipt_no}</b></td><td>{p.customers?.name || '—'}</td>
            <td className="small">{p.jobs ? <Link href={`/jobs/${p.jobs.id}`}>{p.jobs.number}</Link> : '—'}<div className="muted">{p.jobs?.services?.name}</div></td><td>{p.mode}{p.ref ? <div className="muted small">{p.ref}</div> : null}</td>
            <td className="right" style={{ color: p.kind === 'refund' ? 'var(--red)' : undefined }}>{p.kind === 'refund' ? '− ' : ''}{inr(p.amount)}</td><td className="small">{who(p.received_by)}</td><td><Link className="btn sm" href={`/receipt/${p.id}`}>Receipt</Link></td></tr>)}
        </tbody></table>{!list.length && <div className="empty">No money in or out on this day.</div>}</div></div>
    </div>
  </>);
}
