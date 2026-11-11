import { currentStaff } from '@/lib/supabase/server';
import { updateStaff } from './actions';

type Row = { id: string; name: string; email: string | null; role: string; active: boolean; created_at: string };

export default async function StaffPage() {
  const { sb, staff } = await currentStaff();
  const { data } = await sb.from('staff').select('id, name, email, role, active, created_at').order('created_at');
  const rows = (data ?? []) as Row[]; const owner = staff?.role === 'owner';
  return (<>
    <header className="top"><h1>Staff &amp; roles</h1></header>
    <div className="content">
      <div className="card" style={{ marginBottom: 16 }}><h3>How to add a staff member</h3>
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Supabase dashboard › Authentication › Users › <b>Add user</b> › enter their email and a password › tick <i>Auto confirm</i>.</li>
          <li>They appear below as <b>off</b>. Choose their role and switch them on.</li>
        </ol></div>
      <div className="tableWrap"><table className="t"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th></th></tr></thead><tbody>
        {rows.map(r => (
          <tr key={r.id}>{owner ? (<>
            <td colSpan={5} style={{ padding: 0 }}><form action={updateStaff} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr .6fr auto', gap: 10, alignItems: 'center', padding: '8px 12px' }}>
              <input type="hidden" name="id" value={r.id} />
              <input className="i" name="name" defaultValue={r.name} />
              <span className="small muted">{r.email}</span>
              <select className="i" name="role" defaultValue={r.role} disabled={r.id === staff?.id}>{['owner', 'manager', 'counter', 'agent', 'accountant', 'viewer'].map(x => <option key={x}>{x}</option>)}</select>
              {r.id === staff?.id && <input type="hidden" name="role" value={r.role} />}
              <label className="small"><input type="checkbox" name="active" defaultChecked={r.active} disabled={r.id === staff?.id} /> on</label>
              {r.id === staff?.id && <input type="hidden" name="active" value="on" />}
              <button className="btn sm">Save</button>
            </form></td></>) : (<>
            <td><b>{r.name}</b></td><td className="small">{r.email}</td><td>{r.role}</td><td>{r.active ? <span className="badge ok">on</span> : <span className="badge off">off</span>}</td><td></td></>)}
          </tr>))}
      </tbody></table></div>
      {!owner && <p className="small muted">Only the owner can change roles.</p>}
    </div>
  </>);
}
