import Link from 'next/link';
import { currentStaff } from '@/lib/supabase/server';
import { inr, fmtDate } from '@/lib/format';
import { savePortal, addWalletTxn } from '../accounts/actions';

export default async function Wallets({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams; const { sb, staff } = await currentStaff();
  const [{ data: accts }, { data: txns }] = await Promise.all([
    sb.from('wallet_balances').select('*').order('portal'),
    sb.from('wallet_txns').select('id, portal_account_id, kind, amount, note, at, jobs(id, number)').order('at', { ascending: false }).limit(50),
  ]);
  const list = (accts ?? []) as any[]; const admin = staff?.role === 'owner' || staff?.role === 'manager';
  return (<>
    <header className="top"><h1>Portal wallets</h1></header>
    <div className="content">
      {sp.error && <div className="err" style={{ marginBottom: 12 }}>{sp.error}</div>}
      {sp.saved && <div className="okmsg" style={{ marginBottom: 12 }}>Saved.</div>}
      <p className="muted small" style={{ marginTop: 0 }}>Money kept on portals (IRCTC agent wallet, AEPS, recharge portal, TTD logins…). Record top-ups and what each booking used, so the balance here matches the portal. <b>No passwords are stored here.</b></p>
      <div className="cards" style={{ marginBottom: 16 }}>{list.map(a => <div key={a.id} className="card dcard">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>{a.label}</b><span className="badge">{a.portal}</span></div>
        <div style={{ fontSize: 22, fontWeight: 650, marginTop: 6, color: a.balance < 0 ? 'var(--red)' : undefined }}>{inr(a.balance)}</div>
        <div className="small muted">{a.login_ref || ''}{a.holder ? ` · ${a.holder}` : ''}</div>
        <div className="small muted">{a.used_this_month} used this month{a.monthly_limit ? ` of ${a.monthly_limit}` : ''}{a.monthly_limit && a.used_this_month >= a.monthly_limit ? <b style={{ color: 'var(--red)' }}> · limit reached</b> : null}</div>
      </div>)}{!list.length && <p className="muted">No portal accounts yet.</p>}</div>
      <div className="grid2">
        <form action={addWalletTxn} className="card form"><h3>Record a top-up or usage</h3>
          <div className="grid2">
            <label className="f">Account<select className="i" name="account" required>{list.map(a => <option key={a.id} value={a.id}>{a.portal} · {a.label}</option>)}</select></label>
            <label className="f">What<select className="i" name="kind"><option value="debit">Used for a booking</option><option value="topup">Top-up</option><option value="refund">Refund back to wallet</option></select></label>
            <label className="f">Amount ₹<input className="i" name="amount" inputMode="decimal" required /></label>
            <label className="f">Booking no (optional)<input className="i" name="job_number" placeholder="TRV-2611-0001" /></label>
            <label className="f span2">Note<input className="i" name="note" /></label>
          </div><div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn primary" disabled={!list.length}>Save</button></div></form>
        {admin && <form action={savePortal} className="card form"><h3>Add a portal account</h3>
          <div className="grid2">
            <label className="f">Portal<select className="i" name="portal">{['IRCTC', 'TTD', 'AEPS', 'Recharge / bills', 'Bus', 'Flight', 'Other'].map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="f">Name<input className="i" name="label" placeholder="IRCTC agent wallet" required /></label>
            <label className="f">Login ID / mobile (no password)<input className="i" name="login_ref" /></label>
            <label className="f">Holder<input className="i" name="holder" /></label>
            <label className="f">Monthly booking limit<input className="i" name="monthly_limit" inputMode="numeric" /></label>
          </div><div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn primary">Add account</button></div></form>}
      </div>
      <div className="card" style={{ marginTop: 16 }}><h3>Latest wallet entries</h3>
        <table className="t"><tbody>{(txns ?? []).map((t: any) => <tr key={t.id}><td className="small">{fmtDate(t.at)}</td><td>{list.find(a => a.id === t.portal_account_id)?.label}</td><td>{t.kind}</td><td className="right" style={{ color: t.kind === 'debit' ? 'var(--red)' : 'var(--green)' }}>{t.kind === 'debit' ? '− ' : '+ '}{inr(t.amount)}</td><td className="small">{t.jobs ? <Link href={`/jobs/${t.jobs.id}`}>{t.jobs.number}</Link> : ''} {t.note}</td></tr>)}</tbody></table></div>
    </div>
  </>);
}
