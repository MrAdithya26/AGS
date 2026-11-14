import { notFound, redirect } from 'next/navigation';
import { currentStaff } from '@/lib/supabase/server';
import { fmtDate, inr, inWords } from '@/lib/format';
import PrintBar from '@/components/PrintBar';

export const dynamic = 'force-dynamic';
const PAGE: Record<string, string> = { A4: '@page{size:A4;margin:14mm}', A5: '@page{size:A5;margin:8mm}', '80mm': '@page{size:80mm auto;margin:3mm}' };

export default async function Receipt({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ size?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { sb, user, staff } = await currentStaff();
  if (!user || !staff?.active) redirect('/login');
  const { data: p } = await sb.from('payments').select('*, jobs(id, number, persons, ext_ref, service_date, govt_fee, service_charge, discount, total, paid, refunded, details, services(name), departments(name, kind)), customers(name, mobile, code)').eq('id', id).maybeSingle();
  if (!p) notFound();
  const [{ data: shopRow }, { data: recRow }, { data: by }] = await Promise.all([
    sb.from('settings').select('value').eq('key', 'shop').maybeSingle(), sb.from('settings').select('value').eq('key', 'receipt').maybeSingle(),
    sb.from('staff').select('name').eq('id', p.received_by).maybeSingle()]);
  const shop: any = shopRow?.value || {}; const rc: any = recRow?.value || {}; const j: any = p.jobs || {}; const d = j.details || {};
  const size = PAGE[sp.size || ''] ? sp.size! : 'A5'; const refund = p.kind === 'refund';
  const row = (te: string, en: string, v: React.ReactNode, cls = '') => v === null || v === undefined || v === '' ? null : <tr className={cls}><td><span className="te">{te}</span> {en}</td><td>{v}</td></tr>;
  const kind = j.departments?.kind;
  return (<>
    <style>{PAGE[size]}{`body{background:#E9E2D8} @media print{body{background:#fff}.noprint{display:none!important}.rcpt{box-shadow:none;margin:0;max-width:none}}`}</style>
    <PrintBar id={id} size={size} back={j.id ? `/jobs/${j.id}` : '/accounts'} />
    <div className={`rcpt sz-${size}`}>
      <div className="rHead"><div className="rShop">{shop.shopName}</div><div className="te">{shop.shopNameTe}</div>
        <div className="rSub">{shop.groupName}{shop.groupNameTe ? <> · <span className="te">{shop.groupNameTe}</span></> : null}</div>
        {(shop.shopAddress || shop.shopPhone) && <div className="rSub">{shop.shopAddress}{shop.shopAddress && shop.shopPhone ? ' · ' : ''}{shop.shopPhone ? 'Ph ' + shop.shopPhone : ''}</div>}</div>
      <div className="rTitle">{refund ? <><span className="te">రీఫండ్ రసీదు</span> · REFUND RECEIPT</> : <><span className="te">రసీదు</span> · RECEIPT</>}</div>
      <table className="rMeta"><tbody><tr><td><span className="te">రసీదు నం.</span> Receipt No<br /><b>{p.receipt_no}</b></td><td className="r"><span className="te">తేదీ</span> Date<br /><b>{fmtDate(p.at)}</b></td></tr></tbody></table>
      <table className="rTab"><tbody>
        {row('పేరు', 'Name', <b>{p.customers?.name}</b>)}{row('మొబైల్', 'Mobile', p.customers?.mobile)}
        {row('బుకింగ్ నం.', 'Booking No', j.number)}{row('సేవ', 'Service', [j.departments?.name, j.services?.name].filter(Boolean).join(' · '))}
        {row(kind === 'travel' ? 'ప్రయాణికులు' : kind === 'ttd' ? 'భక్తులు' : 'వ్యక్తులు', kind === 'travel' ? 'Passengers' : kind === 'ttd' ? 'Devotees' : 'Persons', d.people ? `${d.people} (${j.persons})` : j.persons > 1 ? j.persons : null)}
        {row(kind === 'travel' ? 'ప్రయాణం' : '', kind === 'travel' ? 'Journey' : '', d.from || d.to ? `${d.from || '?'} → ${d.to || '?'}` : null)}
        {row('తేదీ', kind === 'travel' ? 'Journey date' : 'Service date', j.service_date ? fmtDate(j.service_date) + (d.slot || d.departure ? ' · ' + (d.slot || d.departure) : '') : null)}
        {row(kind === 'travel' ? 'PNR' : kind === 'application' ? 'దరఖాస్తు నం.' : 'టికెట్ నం.', kind === 'travel' ? 'PNR / ticket' : kind === 'application' ? 'Application no' : 'Ticket / ref', j.ext_ref)}
        {kind === 'travel' && rc.irctc_agent_id ? row('', 'IRCTC agent ID', rc.irctc_agent_id) : null}
      </tbody></table>
      <table className="rTab money"><tbody>
        {row(kind === 'ttd' || kind === 'travel' ? 'టికెట్ మొత్తం' : 'ప్రభుత్వ / పోర్టల్ రుసుము', kind === 'ttd' || kind === 'travel' ? 'Ticket amount' : 'Govt / portal fee', inr(j.govt_fee))}
        {row('సేవా రుసుము', 'Service charge', inr(j.service_charge))}{j.discount ? row('తగ్గింపు', 'Discount', '− ' + inr(j.discount)) : null}
        {row('మొత్తం', 'Total', inr(j.total), 'tot')}
        {row(refund ? 'తిరిగి ఇచ్చినది' : 'ఈ రసీదు', refund ? 'Refunded now' : 'Paid now', <b>{inr(p.amount)} · {p.mode}{p.ref ? ` · ${p.ref}` : ''}</b>, 'paid')}
        {row('మొత్తం చెల్లించినది', 'Total paid', inr(j.paid))}{j.refunded ? row('మొత్తం రీఫండ్', 'Total refunded', inr(j.refunded)) : null}
        {!refund && j.total - j.paid > 0 ? row('బాకీ', 'Balance due', inr(j.total - j.paid), 'due') : null}
      </tbody></table>
      <div className="rWords">{refund ? 'Refunded' : 'Received'}: Rupees {inWords(p.amount / 100)} Only</div>
      <div className="rNote"><div className="te">{rc.note_te}</div><div>{rc.note_en}</div>
        <div style={{ marginTop: 4 }}><b>AGS is an independent private service, not a government service.</b> <span className="te">ఇది ప్రభుత్వ సేవ కాదు.</span></div></div>
      <div className="rSign"><div>{by?.name || ''}</div><div className="r">{shop.shopName}<br /><small>Authorised signature</small></div></div>
      <div className="rFoot"><span className="te">ధన్యవాదాలు</span> · Thank you</div>
    </div>
  </>);
}
