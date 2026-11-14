'use client';
import Link from 'next/link';
export default function PrintBar({ id, size, back }: { id: string; size: string; back: string }) {
  return (<div className="printbar noprint">
    <Link className="btn" href={back}>← Back</Link>
    <div className="seg">{['A4', 'A5', '80mm'].map(s => <Link key={s} className={s === size ? 'on' : ''} href={`/receipt/${id}?size=${s}`}>{s === '80mm' ? '80mm thermal' : s}</Link>)}</div>
    <button className="btn primary" onClick={() => window.print()}>Print / Save as PDF</button>
  </div>);
}
