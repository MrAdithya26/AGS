import Link from 'next/link';
import { currentStaff } from '@/lib/supabase/server';
import { fmtDate, inr } from '@/lib/format';
import { loadDefaultTemplates } from './actions';

type SP = { dept?: string; show?: string; q?: string; mine?: string; error?: string; saved?: string };
const OUT: Record<string, string> = { open: 'info', success: 'ok', failed: 'off', cancelled: '' };

export default async function Jobs({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams; const { sb, staff } = await currentStaff();
  const show = sp.show || 'open';
  const [{ data: depts }, { data: steps }, { count: tplCount }] = await Promise.all([
    sb.from('departments').select('id, name').eq('active', true).order('sort'),
    sb.from('workflow_steps').select('department_id, key, label, outcome'),
    sb.from('message_templates').select('key', { count: 'exact', head: true }),
  ]);
  const stepOf = (d: string, k: string) => (steps ?? []).find(x => x.department_id === d && x.key === k);
  let q = sb.from('jobs').select('id, number, department_id, step_key, persons, total, paid, expected_date, service_date, created_at, assigned_to, ext_ref, customers(name, mobile, code), services(name), departments(name)').order('created_at', { ascending: false }).limit(300);
  if (sp.dept) q = q.eq('department_id', sp.dept);
  if (sp.mine) q = q.eq('assigned_to', staff!.id);
  const t = (sp.q || '').trim().replace(/[%,()]/g, ' ');
  if (t) q = q.or(`number.ilike.%${t}%,ext_ref.ilike.%${t}%`);
  const { data } = await q;
  const today = new Date().toISOString().slice(0, 10);
  const rows = (data ?? []).map((j: any) => ({ ...j, st: stepOf(j.department_id, j.step_key) })).filter((j: any) => show === 'all' || (show === 'late' ? j.st?.outcome === 'open' && j.expected_date && j.expected_date < today : (j.st?.outcome ?? 'open') === show));
  const link = (o: Partial<SP>) => '/jobs?' + new URLSearchParams(Object.entries({ ...sp, error: '', saved: '', ...o }).filter(([, v]) => v) as [string, string][]).toString();
  const isAdmin = staff?.role === 'owner' || staff?.role === 'manager';
  return (<>
    <header className="top"><h1>Bookings &amp; jobs</h1><Link className="btn primary" href="/jobs/new" style={{ marginLeft: 'auto' }}>+ New booking</Link></header>
    <div className="content">
      {sp.error && <div className="err" style={{ marginBottom: 12 }}>{sp.error}</div>}
      {sp.saved && <div className="okmsg" style={{ marginBottom: 12 }}>Done.</div>}
      {!tplCount && isAdmin && <form action={loadDefaultTemplates} className="banner row">Message templates are not loaded yet.<button className="btn sm primary">Load the standard Telugu / English templates</button></form>}
      <div className="row wrap" style={{ marginBottom: 10 }}>
        {[['open', 'Open'], ['late', 'Past expected date'], ['success', 'Done'], ['failed', 'Not done'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([k, l]) => <Link key={k} href={link({ show: k })} className={`chip ${show === k ? 'on' : ''}`}>{l}</Link>)}
        <Link href={link({ mine: sp.mine ? '' : '1' })} className={`chip ${sp.mine ? 'on' : ''}`}>Assigned to me</Link>
      </div>
      <form className="row wrap" style={{ marginBottom: 12 }}>
        <input type="hidden" name="show" value={show} />{sp.mine && <input type="hidden" name="mine" value="1" />}
        <select className="i" name="dept" defaultValue={sp.dept || ''} style={{ width: 'auto' }}><option value="">All departments</option>{(depts ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <input className="i" name="q" defaultValue={sp.q || ''} placeholder="Booking no, PNR or application no" style={{ maxWidth: 280 }} />
        <button className="btn">Filter</button>
      </form>
      <div className="tableWrap"><table className="t"><thead><tr><th>Booking</th><th>Customer</th><th>Service</th><th>Step</th><th>Date</th><th className="right">Total</th><th className="right">Paid</th></tr></thead><tbody>
        {rows.map((j: any) => <tr key={j.id}>
          <td className="nowrap"><Link href={`/jobs/${j.id}`}><b>{j.number}</b></Link><div className="muted small">{fmtDate(j.created_at)}</div></td>
          <td>{j.customers?.name || '—'}<div className="muted small">{j.customers?.mobile || ''}</div></td>
          <td>{j.services?.name || '—'}<div className="muted small">{j.departments?.name}{j.ext_ref ? ` · ${j.ext_ref}` : ''}</div></td>
          <td><span className={`badge ${OUT[j.st?.outcome ?? 'open'] ?? ''}`}>{j.st?.label || j.step_key}</span></td>
          <td className="small nowrap">{j.service_date ? fmtDate(j.service_date) : j.expected_date ? <span style={{ color: j.expected_date < today && j.st?.outcome === 'open' ? 'var(--red)' : undefined }}>due {fmtDate(j.expected_date)}</span> : '—'}</td>
          <td className="right">{inr(j.total)}</td><td className="right">{inr(j.paid)}</td></tr>)}
      </tbody></table>{!rows.length && <div className="empty">Nothing here. Use “+ New booking”.</div>}</div>
    </div>
  </>);
}
