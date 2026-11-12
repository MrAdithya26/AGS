'use client';
import { useState } from 'react';
import { revealId } from '@/app/(crm)/customers/actions';

/** Owner / manager: show the full ID number for 30 seconds (each reveal is logged). */
export default function RevealId({ rowId }: { rowId: string }) {
  const [val, setVal] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (val) return <b className="mono">{val}</b>;
  return <button type="button" className="btn sm" disabled={busy} onClick={async () => {
    setBusy(true);
    try { const v = await revealId(rowId); setVal(v); setTimeout(() => setVal(null), 30000); } catch (e) { alert(String((e as Error).message || e)); } finally { setBusy(false); }
  }}>{busy ? '…' : 'Show full'}</button>;
}
