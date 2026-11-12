import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentStaff } from '@/lib/supabase/server';
import { saveDepartment, saveService, saveStep, deleteStep, saveFields } from '../actions';

type Field = { key: string; label: string; label_te?: string; type: string; stage: string; options?: string[]; required?: boolean };
const rs = (p: number | null) => ((p || 0) / 100).toString();
const UNITS = ['person', 'couple', 'room', 'booking', 'page'];
const OUTCOMES: [string, string][] = [['open', 'Open (in progress)'], ['success', 'Done – success'], ['failed', 'Not done – failed'], ['cancelled', 'Cancelled']];
const TEMPLATES = ['', 'request_received', 'booked', 'booked_room', 'not_booked_refund_pending', 'not_booked_refunded', 'not_booked_adjusted', 'dip_registered', 'dip_selected', 'dip_not_selected', 'payment_failed', 'cancelled', 'reminder',
  'travel_received', 'travel_booked', 'travel_not_booked', 'travel_cancelled', 'travel_reminder', 'order_received', 'order_completed', 'app_applied', 'app_in_process', 'app_ready', 'app_rejected'];

export default async function Department({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { sb, staff } = await currentStaff();
  const [{ data: d }, { data: svcs }, { data: steps }] = await Promise.all([
    sb.from('departments').select('*').eq('id', id).maybeSingle(),
    sb.from('services').select('*').eq('department_id', id).order('name'),
    sb.from('workflow_steps').select('*').eq('department_id', id).order('sort'),
  ]);
  if (!d) notFound();
  const can = staff?.role === 'owner' || staff?.role === 'manager';
  const fields: Field[] = d.form_fields ?? [];
  return (<>
    <header className="top"><Link href="/departments" className="muted">Departments</Link><span className="muted">/</span><h1>{d.name}</h1>{d.name_te && <span className="te muted">{d.name_te}</span>}</header>
    <div className="content">
      {sp.error && <div className="err" style={{ marginBottom: 12 }}>{sp.error}</div>}
      {sp.saved && <div className="okmsg" style={{ marginBottom: 12 }}>Saved.</div>}
      {!can && <div className="banner">You can view this page. Only the owner or a manager can change it.</div>}
      <fieldset disabled={!can} className="plain">

      <form action={saveDepartment} className="card form" style={{ marginBottom: 16 }}>
        <input type="hidden" name="id" value={d.id} />
        <h3>Department</h3>
        <div className="grid4">
          <label className="f">Name<input className="i" name="name" defaultValue={d.name} required /></label>
          <label className="f">Name in Telugu<input className="i te" name="name_te" defaultValue={d.name_te ?? ''} /></label>
          <label className="f">Booking number prefix<input className="i" name="job_prefix" defaultValue={d.job_prefix} maxLength={5} /></label>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" name="active" defaultChecked={d.active} /> Active</label>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn primary">Save department</button></div>
      </form>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Services &amp; prices <span className="muted small" style={{ fontWeight: 400 }}>amounts in ₹ · documents separated by commas</span></h3>
        <div className="svcHead"><span>Service</span><span>Telugu name</span><span>Govt / ticket fee ₹</span><span>Our charge ₹</span><span>Per</span><span>Days</span><span>Documents needed</span><span>On</span><span></span></div>
        {[...(svcs ?? []), null].map((x: any, i) => (
          <form key={x?.id ?? 'new'} action={saveService} className={`svcRow ${x ? '' : 'newRow'}`}>
            <input type="hidden" name="department_id" value={d.id} /><input type="hidden" name="dept_code" value={d.code} />{x && <input type="hidden" name="id" value={x.id} />}
            <input className="i" name="name" defaultValue={x?.name ?? ''} placeholder={x ? '' : '+ New service name'} required={!!x} />
            <input className="i te" name="name_te" defaultValue={x?.name_te ?? ''} />
            <input className="i" name="govt_fee" inputMode="decimal" defaultValue={x ? rs(x.govt_fee) : ''} />
            <input className="i" name="service_charge" inputMode="decimal" defaultValue={x ? rs(x.service_charge) : ''} />
            <select className="i" name="pricing_unit" defaultValue={x?.pricing_unit ?? 'booking'}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
            <input className="i" name="sla_days" inputMode="numeric" defaultValue={x?.sla_days ?? ''} />
            <input className="i" name="docs" defaultValue={(x?.docs_required ?? []).join(', ')} />
            <input type="checkbox" name="active" defaultChecked={x ? x.active : true} />
            <button className="btn sm">{x ? 'Save' : 'Add'}</button>
          </form>))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Workflow steps <span className="muted small" style={{ fontWeight: 400 }}>the path every booking in this department follows; the message is prepared when a booking reaches the step</span></h3>
        <div className="stepHead"><span>Order</span><span>Step</span><span>Telugu</span><span>Result</span><span>Message to prepare</span><span></span></div>
        {[...(steps ?? []), null].map((w: any) => (
          <div key={w?.id ?? 'new'} className="row" style={{ gap: 6 }}>
            <form action={saveStep} className={`stepRow ${w ? '' : 'newRow'}`}>
              <input type="hidden" name="department_id" value={d.id} />{w && <input type="hidden" name="id" value={w.id} />}
              <input className="i" name="sort" inputMode="numeric" defaultValue={w?.sort ?? (steps?.length ?? 0) + 1} />
              <input className="i" name="label" defaultValue={w?.label ?? ''} placeholder={w ? '' : '+ New step'} required={!!w} />
              <input className="i te" name="label_te" defaultValue={w?.label_te ?? ''} />
              <select className="i" name="outcome" defaultValue={w?.outcome ?? 'open'}>{OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <select className="i" name="template_key" defaultValue={w?.template_key ?? ''}>{TEMPLATES.map(t => <option key={t} value={t}>{t || '— none —'}</option>)}</select>
              <button className="btn sm">{w ? 'Save' : 'Add'}</button>
            </form>
            {w && <form action={deleteStep}><input type="hidden" name="department_id" value={d.id} /><input type="hidden" name="id" value={w.id} /><button className="btn sm" title="Delete step">✕</button></form>}
          </div>))}
      </div>

      <form action={saveFields} className="card">
        <input type="hidden" name="department_id" value={d.id} />
        <h3>Form fields <span className="muted small" style={{ fontWeight: 400 }}>extra boxes on bookings of this department · “When” = asked at booking time or filled when done</span></h3>
        <div className="fieldHead"><span>Label</span><span>Telugu</span><span>Type</span><span>Choices (for list)</span><span>When</span><span>Must fill</span><span>Remove</span></div>
        {[...fields, null, null].map((x, i) => (
          <div key={i} className={`fieldRow ${x ? '' : 'newRow'}`}>
            <input type="hidden" name="key" value={x?.key ?? ''} />
            <input className="i" name="label" defaultValue={x?.label ?? ''} placeholder={x ? '' : '+ New field'} />
            <input className="i te" name="label_te" defaultValue={x?.label_te ?? ''} />
            <select className="i" name="type" defaultValue={x?.type ?? 'text'}>{['text', 'number', 'date', 'select', 'textarea'].map(t => <option key={t} value={t}>{t === 'select' ? 'list' : t}</option>)}</select>
            <input className="i" name="options" defaultValue={(x?.options ?? []).join(', ')} />
            <select className="i" name="stage" defaultValue={x?.stage ?? 'request'}><option value="request">At booking</option><option value="result">When done</option></select>
            <input type="checkbox" name="required" value={i} defaultChecked={!!x?.required} />
            <input type="checkbox" name="remove" value={i} disabled={!x} />
          </div>))}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn primary">Save form fields</button></div>
      </form>
      </fieldset>
    </div>
  </>);
}
