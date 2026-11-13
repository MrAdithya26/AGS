'use client';
import { useMemo, useState } from 'react';
import { createJob } from '../actions';

type Field = { key: string; label: string; label_te?: string; type: string; stage: string; options?: string[]; required?: boolean };
type Dept = { id: string; name: string; kind: string; form_fields: Field[] };
type Svc = { id: string; department_id: string; name: string; govt_fee: number; service_charge: number; pricing_unit: string; sla_days: number | null };
type Props = { depts: Dept[]; services: Svc[]; staff: { id: string; name: string }[]; me: string; customer: { id: string; name: string; code: string; mobile: string | null } | null; error?: string };

export function FieldInput({ f, value }: { f: Field; value?: string }) {
  const name = 'f_' + f.key;
  const label = <>{f.label}{f.label_te ? <span className="te muted"> · {f.label_te}</span> : null}</>;
  if (f.type === 'select') return <label className="f">{label}<select className="i" name={name} defaultValue={value ?? ''} required={f.required}><option value="">—</option>{(f.options || []).map(o => <option key={o}>{o}</option>)}</select></label>;
  if (f.type === 'textarea') return <label className="f span2">{label}<textarea className="i" name={name} rows={2} defaultValue={value ?? ''} required={f.required} /></label>;
  return <label className="f">{label}<input className="i" name={name} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} defaultValue={value ?? ''} required={f.required} /></label>;
}

export default function NewJobForm({ depts, services, staff, me, customer, error }: Props) {
  const [deptId, setDeptId] = useState(''); const [svcId, setSvcId] = useState(''); const [persons, setPersons] = useState(1);
  const dept = depts.find(d => d.id === deptId); const svc = services.find(s => s.id === svcId);
  const units = svc ? (svc.pricing_unit === 'person' ? persons : svc.pricing_unit === 'couple' ? Math.ceil(persons / 2) : 1) : 1;
  const fee = svc ? (svc.govt_fee * units) / 100 : 0; const charge = svc ? (svc.service_charge * (svc.pricing_unit === 'person' ? persons : 1)) / 100 : 0;
  const expected = svc?.sla_days ? new Date(Date.now() + svc.sla_days * 864e5).toISOString().slice(0, 10) : '';
  const svcList = useMemo(() => services.filter(s => s.department_id === deptId), [services, deptId]);
  const kind = dept?.kind;
  return (
    <form action={createJob} className="card form">
      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
      <h3>Customer</h3>
      {customer ? <p><input type="hidden" name="preset_customer" value={customer.id} /><b>{customer.name}</b> <span className="muted">{customer.code} · {customer.mobile || 'no mobile'}</span></p> : (
        <div className="grid3">
          <label className="f">Customer no or mobile<input className="i" name="customer_find" placeholder="C00012 or 9876543210" /></label>
          <label className="f">…or new customer name<input className="i" name="new_name" placeholder="Only if not saved before" /></label>
          <p className="small muted" style={{ alignSelf: 'end', margin: 0 }}>A new customer is created with this name and mobile. Add family and ID later on their profile.</p>
        </div>)}
      <h3>What</h3>
      <div className="grid3">
        <label className="f">Department<select className="i" name="department_id" value={deptId} onChange={e => { setDeptId(e.target.value); setSvcId(''); }} required><option value="">— choose —</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="f">Service<select className="i" name="service_id" value={svcId} onChange={e => setSvcId(e.target.value)} required disabled={!deptId}><option value="">— choose —</option>{svcList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="f">{kind === 'ttd' ? 'Devotees' : kind === 'travel' ? 'Passengers' : 'Persons'}<input className="i" name="persons" type="number" min={1} max={50} value={persons} onChange={e => setPersons(Math.max(1, +e.target.value || 1))} /></label>
        {(kind === 'ttd' || kind === 'travel') && <label className="f span2">{kind === 'ttd' ? 'Devotee names' : 'Passenger details (name, gender, age, berth)'}<textarea className="i" name="people" rows={2} placeholder={kind === 'travel' ? 'Sita, F, 30, LB' : 'One per line'} /></label>}
        {kind !== 'quick' && <label className="f">{kind === 'travel' ? 'Journey date wanted' : kind === 'ttd' ? 'Preferred date' : 'Wanted by'}<input className="i" type="date" name="wanted_date" /></label>}
        {kind === 'application' && <label className="f">Expected date<input className="i" type="date" name="expected_date" defaultValue={expected} key={expected} /></label>}
        {(dept?.form_fields || []).filter(f => f.stage === 'request').map(f => <FieldInput key={f.key} f={f} />)}
      </div>
      <h3>Money</h3>
      <div className="grid4">
        <label className="f">{kind === 'travel' || kind === 'ttd' ? 'Ticket amount ₹' : 'Govt / bill amount ₹'}<input className="i" name="govt_fee" inputMode="decimal" defaultValue={fee || ''} key={'f' + fee} /></label>
        <label className="f">Our service charge ₹<input className="i" name="service_charge" inputMode="decimal" defaultValue={charge || ''} key={'c' + charge} /></label>
        <label className="f">Amount received now ₹<input className="i" name="received" inputMode="decimal" /></label>
        <label className="f">Paid by<select className="i" name="mode"><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Card</option></select></label>
      </div>
      <h3>Handling</h3>
      <div className="grid3">
        <label className="f">Assign to<select className="i" name="assigned_to" defaultValue={me}>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="f">Send updates by<select className="i" name="contact_channel"><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="call">Phone call</option></select></label>
        <label className="f">Remarks<input className="i" name="remarks" /></label>
      </div>
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}><a className="btn" href="/jobs">Cancel</a><button className="btn primary">Create booking</button></div>
    </form>
  );
}
