import Link from 'next/link';
import { currentStaff } from '@/lib/supabase/server';
import { ageOf } from '@/lib/format';

type Row = { id: string; code: string; name: string; mobile: string | null; gender: string | null; dob: string | null; city: string | null; tags: string[]; consent_whatsapp: boolean; families: { name: string } | null };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams; const { sb } = await currentStaff();
  let query = sb.from('customers').select('id, code, name, mobile, gender, dob, city, tags, consent_whatsapp, families(name)', { count: 'exact' }).order('created_at', { ascending: false }).limit(200);
  const t = q.trim().replace(/[%,()]/g, ' ');
  if (t) query = query.or(`name.ilike.%${t}%,mobile.ilike.%${t}%,code.ilike.%${t}%,name_te.ilike.%${t}%`);
  const { data, count } = await query; const rows = (data ?? []) as unknown as Row[];
  return (<>
    <header className="top"><h1>Customers</h1><Link className="btn primary" href="/customers/new" style={{ marginLeft: 'auto' }}>+ New customer</Link></header>
    <div className="content">
      <form className="row" style={{ marginBottom: 12 }}><input className="i" name="q" defaultValue={q} placeholder="Search name, mobile or customer no (C00012)…" style={{ maxWidth: 420 }} /><button className="btn">Search</button>{q && <Link className="btn" href="/customers">Clear</Link>}</form>
      <p className="muted small">{count ?? 0} customer(s){rows.length < (count ?? 0) ? `, showing ${rows.length}` : ''}</p>
      <div className="tableWrap"><table className="t"><thead><tr><th>No</th><th>Name</th><th>Mobile</th><th>Family</th><th>Age</th><th>City</th><th>WhatsApp OK</th><th>Tags</th></tr></thead><tbody>
        {rows.map(r => <tr key={r.id}>
          <td className="nowrap"><Link href={`/customers/${r.id}`}><b>{r.code}</b></Link></td>
          <td><Link href={`/customers/${r.id}`}>{r.name}</Link><div className="muted small">{r.gender || ''}</div></td>
          <td className="nowrap">{r.mobile || '—'}</td><td>{r.families?.name || '—'}</td><td>{ageOf(r.dob) ?? '—'}</td><td>{r.city || '—'}</td>
          <td>{r.consent_whatsapp ? <span className="badge ok">Yes</span> : <span className="badge">No</span>}</td>
          <td className="small">{r.tags.join(', ')}</td></tr>)}
      </tbody></table>{!rows.length && <div className="empty">{q ? 'No customer matches this search.' : 'No customers yet. Add the first one.'}</div>}</div>
    </div>
  </>);
}
