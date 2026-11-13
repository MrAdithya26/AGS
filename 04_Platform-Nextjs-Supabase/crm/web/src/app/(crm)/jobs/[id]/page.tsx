import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentStaff } from '@/lib/supabase/server';
import { fmtDate, inr } from '@/lib/format';
import { fillTemplate, waLink } from '@/lib/messages';
import { FieldInput } from '../new/NewJobForm';
import { moveStep, saveJobDetails, addPayment, logMessage } from '../actions';

const OUT: Record<string, string> = { open: 'info', success: 'ok', failed: 'off', cancelled: '' };
const rs = (p: number | null) => ((p || 0) / 100).toString();
const when = (v: string) => new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function Job({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; lang?: string; ch?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { sb, staff } = await currentStaff();
  const { data: j } = await sb.from('jobs').select('*, customers(id, name, code, mobile, preferred_lang, consent_whatsapp, consent_sms), services(name), departments(id, name, kind, form_fields)').eq('id', id).maybeSingle();
  if (!j) notFound();
  const [{ data: steps }, { data: events }, { data: pays }, { data: msgs }, { data: team }, { data: shopRow }] = await Promise.all([
    sb.from('workflow_steps').select('key, label, label_te, outcome, template_key, sort').eq('department_id', j.department_id).order('sort'),
    sb.from('job_events').select('id, kind, from_step, to_step, data, actor, at').eq('job_id', id).order('at', { ascending: false }),
    sb.from('payments').select('id, kind, amount, mode, ref, at').eq('job_id', id).order('at'),
    sb.from('messages').select('id, channel, template_key, at, handled_by').eq('job_id', id).order('at', { ascending: false }),
    sb.from('staff').select('id, name').order('name'),
    sb.from('settings').select('value').eq('key', 'shop').maybeSingle(),
  ]);
  const cur = (steps ?? []).find(s => s.key === j.step_key);
  const label = (k: string | null) => (steps ?? []).find(s => s.key === k)?.label || k || '';
  const who = (u: string | null) => (team ?? []).find(t => t.id === u)?.name || '—';
  const can = staff?.role !== 'viewer';
  const kind = j.departments?.kind; const fields = (j.departments?.form_fields || []) as any[];
  const lang = sp.lang || j.customers?.preferred_lang || 'te'; const ch = sp.ch === 'sms' ? 'sms' : 'whatsapp';
  const tplKey = cur?.template_key;
  const { data: tpl } = tplKey ? await sb.from('message_templates').select('body').eq('key', tplKey).eq('channel', ch).eq('lang', lang).maybeSingle() : { data: null };
  const text = tpl ? fillTemplate(tpl.body, j, j.customers, shopRow?.value || {}, j.services?.name) : '';
  const wa = waLink(j.customers?.mobile, text);
  const sentNow = (msgs ?? []).some(m => m.template_key === tplKey && events?.length && m.at >= (events.find(e => e.kind !== 'payment')?.at || ''));
  const bal = Math.max(0, (j.total || 0) - (j.paid || 0));
  const q = (o: Record<string, string>) => `/jobs/${id}?` + new URLSearchParams({ lang, ch, ...o }).toString();
  return (<>
    <header className="top"><Link href="/jobs" className="muted">Bookings</Link><span className="muted">/</span><h1>{j.number}</h1>
      <span className={`badge ${OUT[cur?.outcome ?? 'open']}`}>{cur?.label || j.step_key}</span>
      <span className="muted small" style={{ marginLeft: 'auto' }}>{j.departments?.name} · {j.services?.name}</span></header>
    <div className="content">
      {sp.error && <div className="err" style={{ marginBottom: 12 }}>{sp.error}</div>}
      {sp.saved && <div className="okmsg" style={{ marginBottom: 12 }}>Saved.</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div><b><Link href={`/customers/${j.customers?.id}`}>{j.customers?.name}</Link></b> <span className="muted small">{j.customers?.code} · {j.customers?.mobile || 'no mobile'}</span></div>
          <div className="small">Total <b>{inr(j.total)}</b> · Paid <b>{inr(j.paid)}</b>{j.refunded ? <> · Refunded <b>{inr(j.refunded)}</b></> : null} · {bal > 0 ? <b style={{ color: 'var(--red)' }}>Due {inr(bal)}</b> : <span className="badge ok">Fully paid</span>}</div>
        </div>
        <h3 style={{ margin: '14px 0 8px' }}>Move to step</h3>
        <div className="row wrap">{(steps ?? []).map(s => (
          <form key={s.key} action={moveStep}><input type="hidden" name="id" value={id} /><input type="hidden" name="step" value={s.key} />
            <button className={`btn sm ${s.key === j.step_key ? 'primary' : ''} out-${s.outcome}`} disabled={!can || s.key === j.step_key}>{s.label}</button></form>))}</div>
      </div>

      <div className="grid2">
        <div className="card"><h3>Message for this step <span className="muted small" style={{ fontWeight: 400 }}>free: sends from your WhatsApp</span></h3>
          {!tplKey ? <p className="small muted">This step has no message. Choose one in Departments › {j.departments?.name} › Workflow steps.</p>
            : !tpl ? <p className="small muted">Templates not loaded yet. The owner can load them from the Bookings page.</p> : <>
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="seg"><Link className={lang === 'te' ? 'on' : ''} href={q({ lang: 'te' })}>తెలుగు</Link><Link className={lang === 'en' ? 'on' : ''} href={q({ lang: 'en' })}>English</Link></div>
              <div className="seg"><Link className={ch === 'whatsapp' ? 'on' : ''} href={q({ ch: 'whatsapp' })}>WhatsApp</Link><Link className={ch === 'sms' ? 'on' : ''} href={q({ ch: 'sms' })}>SMS</Link></div>
              {sentNow && <span className="badge ok">sent</span>}</div>
            {!j.customers?.[ch === 'sms' ? 'consent_sms' : 'consent_whatsapp'] && <p className="small" style={{ color: 'var(--amber)', margin: '0 0 6px' }}>No {ch === 'sms' ? 'SMS' : 'WhatsApp'} consent recorded for this customer. Ask them first.</p>}
            <form action={logMessage}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="customer_id" value={j.customers?.id} /><input type="hidden" name="template_key" value={tplKey} /><input type="hidden" name="channel" value={ch} />
              <textarea className="i msg" name="body" rows={10} defaultValue={text} key={lang + ch + j.step_key} />
              <div className="row wrap" style={{ marginTop: 8 }}>
                {ch === 'whatsapp' && wa && <a className="btn wa" href={wa} target="_blank" rel="noreferrer">Open in WhatsApp</a>}
                {ch === 'sms' && j.customers?.mobile && <a className="btn" href={`sms:+91${j.customers.mobile}?body=${encodeURIComponent(text)}`}>Open in phone SMS app</a>}
                {can && <button className="btn">I sent it ✓</button>}
              </div>
              <p className="small muted" style={{ marginBottom: 0 }}>Automatic sending (WhatsApp Business API) is a paid add-on that stays off until you approve it.</p>
            </form></>}
        </div>

        <form action={saveJobDetails} className="card form"><input type="hidden" name="id" value={id} />
          <h3>Details</h3>
          <div className="grid2">
            <label className="f">{kind === 'travel' ? 'PNR / ticket no' : kind === 'ttd' ? 'TTD booking / ticket no' : kind === 'application' ? 'Application / ack no' : 'Reference no'}<input className="i" name="ext_ref" defaultValue={j.ext_ref ?? ''} /></label>
            <label className="f">{kind === 'travel' ? 'Journey date' : kind === 'ttd' ? 'Darshan / seva / check-in date' : 'Service date'}<input className="i" type="date" name="service_date" defaultValue={j.service_date ?? ''} /></label>
            <label className="f">Wanted date<input className="i" type="date" name="wanted_date" defaultValue={j.wanted_date ?? ''} /></label>
            <label className="f">Expected date<input className="i" type="date" name="expected_date" defaultValue={j.expected_date ?? ''} /></label>
            {fields.map(f => <FieldInput key={f.key} f={{ ...f, required: false }} value={j.details?.[f.key]} />)}
            {(kind === 'ttd' || kind === 'travel') && <label className="f span2">{kind === 'ttd' ? 'Devotees' : 'Passengers'}<textarea className="i" name="people" rows={2} defaultValue={j.details?.people ?? ''} /></label>}
            <label className="f">Fee ₹<input className="i" name="govt_fee" inputMode="decimal" defaultValue={rs(j.govt_fee)} /></label>
            <label className="f">Our charge ₹<input className="i" name="service_charge" inputMode="decimal" defaultValue={rs(j.service_charge)} /></label>
            <label className="f">Discount ₹<input className="i" name="discount" inputMode="decimal" defaultValue={rs(j.discount)} /></label>
            <label className="f">Assigned to<select className="i" name="assigned_to" defaultValue={j.assigned_to ?? ''}><option value="">—</option>{(team ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label className="f span2">Remarks<input className="i" name="remarks" defaultValue={j.details?.remarks ?? ''} /></label>
          </div>
          {can && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn primary">Save details</button></div>}
        </form>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card"><h3>Payments</h3>
          {(pays ?? []).length ? <table className="t"><tbody>{(pays ?? []).map(p => <tr key={p.id}><td>{p.kind === 'refund' ? <span className="badge off">Refund</span> : <span className="badge ok">Received</span>}</td><td className="right"><b>{inr(p.amount)}</b></td><td>{p.mode}{p.ref ? ` · ${p.ref}` : ''}</td><td className="small muted">{when(p.at)}</td></tr>)}</tbody></table> : <p className="small muted">No payments yet.</p>}
          {can && <form action={addPayment} className="row wrap" style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={id} /><input type="hidden" name="customer_id" value={j.customers?.id} />
            <select className="i" name="kind" style={{ width: 'auto' }}><option value="receipt">Received</option><option value="refund">Refund given</option></select>
            <input className="i" name="amount" inputMode="decimal" placeholder="₹" style={{ width: 100 }} defaultValue={bal > 0 ? rs(bal) : ''} />
            <select className="i" name="mode" style={{ width: 'auto' }}><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Card</option></select>
            <input className="i" name="ref" placeholder="UPI ref (optional)" style={{ width: 160 }} />
            <button className="btn sm primary">Add</button></form>}
          <p className="small muted" style={{ marginBottom: 0 }}>Receipts, receipt numbers and daily cash closing arrive in Phase 1e.</p>
        </div>
        <div className="card"><h3>Timeline</h3>
          <div className="timeline">{[...(events ?? []).map(e => ({ at: e.at, t: e.kind === 'created' ? `Created at “${label(e.to_step)}”` : e.kind === 'step' ? `${label(e.from_step)} → ${label(e.to_step)}` : e.kind === 'assigned' ? `Assigned to ${who((e.data as any)?.to)}` : e.kind === 'payment' ? `${(e.data as any)?.kind === 'refund' ? 'Refund' : 'Payment'} ${inr((e.data as any)?.amount)} (${(e.data as any)?.mode})` : e.kind, by: e.actor })),
            ...(msgs ?? []).map(m => ({ at: m.at, t: `Message sent by ${m.channel}${m.template_key ? ` (${m.template_key})` : ''}`, by: m.handled_by }))]
            .sort((a, b) => b.at.localeCompare(a.at)).map((e, i) => <div key={i} className="ev"><b>{e.t}</b><div className="small muted">{when(e.at)} · {who(e.by)}</div></div>)}</div>
        </div>
      </div>
    </div>
  </>);
}
