import { saveCustomer } from './actions';
import { ID_TYPES } from '@/lib/format';

type C = Record<string, any>;
export default function CustomerForm({ c, families, error }: { c?: C; families: { id: string; name: string }[]; error?: string }) {
  const v = (k: string) => (c?.[k] ?? '') as string;
  return (
    <form action={saveCustomer} className="card form">
      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <input type="hidden" name="had_consent" value={c?.consent_at ? '1' : '0'} />
      <h3>Person</h3>
      <div className="grid3">
        <label className="f req">Name (as on ID)<input className="i" name="name" defaultValue={v('name')} required /></label>
        <label className="f">Name in Telugu<input className="i te" name="name_te" defaultValue={v('name_te')} /></label>
        <label className="f">Gender<select className="i" name="gender" defaultValue={v('gender')}><option value="">—</option><option>Male</option><option>Female</option><option>Transgender</option></select></label>
        <label className="f">Date of birth<input className="i" type="date" name="dob" defaultValue={v('dob')} /></label>
        <label className="f">Mobile<input className="i" name="mobile" inputMode="numeric" defaultValue={v('mobile')} placeholder="10 digits" /></label>
        <label className="f">Other mobile<input className="i" name="alt_mobile" inputMode="numeric" defaultValue={v('alt_mobile')} /></label>
        <label className="f">Email<input className="i" type="email" name="email" defaultValue={v('email')} /></label>
        <label className="f">Messages in<select className="i" name="preferred_lang" defaultValue={v('preferred_lang') || 'te'}><option value="te">Telugu</option><option value="en">English</option></select></label>
        <label className="f">Tags<input className="i" name="tags" defaultValue={(c?.tags || []).join(', ')} placeholder="VIP, senior citizen" /></label>
      </div>
      <h3>Family</h3>
      <div className="grid3">
        <label className="f">Existing family<select className="i" name="family_id" defaultValue={v('family_id')}><option value="">— none —</option>{families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label className="f">…or new family name<input className="i" name="new_family" placeholder="e.g. Ramesh Family" /></label>
      </div>
      <h3>Address</h3>
      <div className="grid3">
        <label className="f span2">Address<input className="i" name="address" defaultValue={v('address')} /></label>
        <label className="f">City / town<input className="i" name="city" defaultValue={v('city')} /></label>
        <label className="f">District<input className="i" name="district" defaultValue={v('district') || 'Srikakulam'} /></label>
        <label className="f">State<input className="i" name="state" defaultValue={v('state') || 'Andhra Pradesh'} /></label>
        <label className="f">Pincode<input className="i" name="pincode" inputMode="numeric" defaultValue={v('pincode')} /></label>
      </div>
      <h3>Consent <span className="muted small" style={{ fontWeight: 400 }}>ask the customer; the date is saved (DPDP Act)</span></h3>
      <div className="row">
        <label className="check"><input type="checkbox" name="consent_whatsapp" defaultChecked={!!c?.consent_whatsapp} /> WhatsApp messages</label>
        <label className="check"><input type="checkbox" name="consent_sms" defaultChecked={!!c?.consent_sms} /> SMS</label>
        <label className="check"><input type="checkbox" name="consent_calls" defaultChecked={!!c?.consent_calls} /> Phone / automatic calls</label>
      </div>
      <h3>ID document <span className="muted small" style={{ fontWeight: 400 }}>only the last 4 digits are shown; the full number is encrypted</span></h3>
      <div className="grid3">
        <label className="f">ID type<select className="i" name="id_type" defaultValue="aadhaar">{ID_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="f">ID number<input className="i" name="id_number" autoComplete="off" placeholder={c?.id ? 'Leave empty to keep the saved one' : ''} /></label>
      </div>
      <label className="f" style={{ marginTop: 12 }}>Notes<textarea className="i" name="notes" rows={2} defaultValue={v('notes')} /></label>
      {!c?.id && <label className="check" style={{ marginTop: 10 }}><input type="checkbox" name="allow_duplicate" /> Save anyway if the same name and mobile already exist</label>}
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}><a className="btn" href={c?.id ? `/customers/${c.id}` : '/customers'}>Cancel</a><button className="btn primary">Save customer</button></div>
    </form>
  );
}
