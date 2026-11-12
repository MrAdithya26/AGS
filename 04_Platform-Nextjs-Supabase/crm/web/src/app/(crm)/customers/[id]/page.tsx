import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentStaff } from '@/lib/supabase/server';
import { ageOf, fmtDate, idLabel, inr } from '@/lib/format';
import RevealId from '@/components/RevealId';
import { uploadFile } from '../actions';

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { sb, staff } = await currentStaff();
  const { data: c } = await sb.from('customers').select('*, families(id, name)').eq('id', id).maybeSingle();
  if (!c) notFound();
  const admin = staff?.role === 'owner' || staff?.role === 'manager';
  const [ids, files, members, jobs, msgs, calls] = await Promise.all([
    sb.from('customer_ids').select('id, id_type, last4, created_at').eq('customer_id', id),
    sb.from('customer_files').select('id, kind, storage_path, delete_after, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    c.family_id ? sb.from('customers').select('id, code, name, dob, gender').eq('family_id', c.family_id).neq('id', id) : Promise.resolve({ data: [] as any[] }),
    sb.from('jobs').select('id, number, step_key, total, paid, created_at, departments(name), services(name)').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
    sb.from('messages').select('id', { count: 'exact', head: true }).eq('customer_id', id),
    sb.from('calls').select('id', { count: 'exact', head: true }).eq('customer_id', id),
  ]);
  const paths = (files.data ?? []).map(f => f.storage_path);
  const signed = paths.length ? (await sb.storage.from('crm-files').createSignedUrls(paths, 300)).data ?? [] : [];
  const link = (p: string) => signed.find(s => s.path === p)?.signedUrl ?? undefined;
  const wa = c.mobile ? `https://wa.me/91${c.mobile}` : null;
  const totalSpent = (jobs.data ?? []).reduce((a: number, j: any) => a + (j.paid || 0), 0);
  const kv = (l: string, v: React.ReactNode) => <div><small>{l}</small><span>{v || <span className="muted">—</span>}</span></div>;
  return (<>
    <header className="top"><h1>{c.name}</h1><span className="badge">{c.code}</span>
      <div className="row" style={{ marginLeft: 'auto' }}>
        {wa && <a className="btn" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
        {c.mobile && <a className="btn" href={`tel:+91${c.mobile}`}>Call</a>}
        <Link className="btn primary" href={`/customers/${id}/edit`}>Edit</Link></div></header>
    <div className="content">
      {sp.error && <div className="err" style={{ marginBottom: 12 }}>{sp.error}</div>}
      {sp.saved && <div className="okmsg" style={{ marginBottom: 12 }}>Saved.</div>}
      <div className="kpis">
        <div className="kpi"><div className="lbl">Bookings &amp; jobs</div><div className="val">{jobs.data?.length ?? 0}</div></div>
        <div className="kpi"><div className="lbl">Paid in total</div><div className="val">{inr(totalSpent)}</div></div>
        <div className="kpi"><div className="lbl">Messages</div><div className="val">{msgs.count ?? 0}</div></div>
        <div className="kpi"><div className="lbl">Calls</div><div className="val">{calls.count ?? 0}</div></div>
      </div>
      <div className="grid2">
        <div className="card"><h3>Details</h3><div className="kv">
          {kv('Name in Telugu', c.name_te && <span className="te">{c.name_te}</span>)}{kv('Gender · age', [c.gender, ageOf(c.dob) != null ? ageOf(c.dob) + ' yrs' : ''].filter(Boolean).join(' · '))}
          {kv('Mobile', c.mobile)}{kv('Other mobile', c.alt_mobile)}{kv('Email', c.email)}{kv('Messages in', c.preferred_lang === 'en' ? 'English' : 'Telugu')}
          {kv('Address', [c.address, c.city, c.district, c.state, c.pincode].filter(Boolean).join(', '))}{kv('Tags', (c.tags || []).join(', '))}
          {kv('Customer since', fmtDate(c.created_at))}{kv('Notes', c.notes)}</div></div>
        <div className="card"><h3>Consent</h3>
          <div className="row">{[['WhatsApp', c.consent_whatsapp], ['SMS', c.consent_sms], ['Calls', c.consent_calls]].map(([l, ok]) => <span key={l as string} className={`badge ${ok ? 'ok' : 'off'}`}>{l as string}: {ok ? 'yes' : 'no'}</span>)}</div>
          <p className="small muted">{c.consent_at ? `Consent recorded on ${fmtDate(c.consent_at)}.` : 'No consent recorded yet. Ask the customer and tick it in Edit.'}</p>
          <h3 style={{ marginTop: 16 }}>ID documents</h3>
          {(ids.data ?? []).length ? <table className="t"><tbody>{(ids.data ?? []).map(r => <tr key={r.id}><td>{idLabel(r.id_type)}</td><td className="mono">•••• {r.last4}</td><td className="right">{admin && <RevealId rowId={r.id} />}</td></tr>)}</tbody></table>
            : <p className="small muted">No ID saved. Add it in Edit.</p>}
          {!admin && (ids.data ?? []).length > 0 && <p className="small muted">Only the owner or a manager can see full numbers.</p>}
        </div>
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card"><h3>Family {c.families?.name ? `· ${c.families.name}` : ''}</h3>
          {(members.data ?? []).length ? <div className="list">{(members.data ?? []).map((m: any) => <Link key={m.id} href={`/customers/${m.id}`} className="li"><b>{m.name}</b><span className="muted small">{m.code} · {m.gender || ''} {ageOf(m.dob) != null ? '· ' + ageOf(m.dob) + ' yrs' : ''}</span></Link>)}</div>
            : <p className="small muted">{c.family_id ? 'No other members yet.' : 'Not in a family. Choose or create one in Edit.'}</p>}
          <Link className="btn sm" href="/customers/new" style={{ marginTop: 8 }}>+ Add family member</Link></div>
        <div className="card"><h3>Documents <span className="muted small" style={{ fontWeight: 400 }}>private · links work for 5 minutes</span></h3>
          {(files.data ?? []).length ? <table className="t"><tbody>{(files.data ?? []).map(f => <tr key={f.id}><td>{f.kind}</td><td className="small">{fmtDate(f.created_at)}{f.delete_after ? ` · delete after ${fmtDate(f.delete_after)}` : ''}</td><td className="right">{link(f.storage_path) ? <a className="btn sm" href={link(f.storage_path)} target="_blank" rel="noreferrer">Open</a> : '—'}</td></tr>)}</tbody></table>
            : <p className="small muted">No documents yet.</p>}
          {staff?.role !== 'viewer' && <form action={uploadFile} className="row wrap" style={{ marginTop: 10 }}>
            <input type="hidden" name="customer_id" value={id} />
            <select className="i" name="kind" style={{ width: 'auto' }}>{['Aadhaar copy', 'PAN copy', 'Photo', 'Certificate', 'Ticket', 'Form', 'Other'].map(k => <option key={k}>{k}</option>)}</select>
            <input type="file" name="file" accept="image/*,application/pdf" required />
            <label className="small">Delete after <input className="i" type="date" name="delete_after" style={{ width: 'auto' }} /></label>
            <button className="btn sm primary">Upload</button></form>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}><h3>History</h3>
        {(jobs.data ?? []).length ? <div className="tableWrap"><table className="t"><thead><tr><th>No</th><th>Department</th><th>Service</th><th>Step</th><th className="right">Total</th><th className="right">Paid</th><th>Date</th></tr></thead><tbody>
          {(jobs.data ?? []).map((j: any) => <tr key={j.id}><td><b>{j.number}</b></td><td>{j.departments?.name}</td><td>{j.services?.name}</td><td>{j.step_key}</td><td className="right">{inr(j.total)}</td><td className="right">{inr(j.paid)}</td><td>{fmtDate(j.created_at)}</td></tr>)}
        </tbody></table></div> : <p className="small muted">No bookings or applications yet. They appear here once the jobs screen arrives (Phase 1d).</p>}
      </div>
    </div>
  </>);
}
