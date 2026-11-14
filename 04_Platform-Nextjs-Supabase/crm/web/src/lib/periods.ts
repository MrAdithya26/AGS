import { todayIST } from './format';
const d = (s: string) => new Date(s + 'T00:00:00Z');
const iso = (x: Date) => x.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const x = d(s); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
/** [from, to] for a period name, plus the same-length period before it (for "vs previous"). */
export function period(p: string): { from: string; to: string; prevFrom: string; prevTo: string; label: string } {
  const t = todayIST(); const [y, m] = t.split('-').map(Number);
  const mStart = (yy: number, mm: number) => iso(new Date(Date.UTC(yy, mm - 1, 1)));
  if (p === 'today') return { from: t, to: t, prevFrom: addDays(t, -1), prevTo: addDays(t, -1), label: 'Today' };
  if (p === 'last') { const f = mStart(y, m - 1), to = addDays(mStart(y, m), -1); return { from: f, to, prevFrom: mStart(y, m - 2), prevTo: addDays(f, -1), label: 'Last month' }; }
  if (p === 'q') { const f = mStart(y, m - 2); return { from: f, to: t, prevFrom: mStart(y, m - 5), prevTo: addDays(f, -1), label: 'Last 3 months' }; }
  const f = mStart(y, m); const days = Math.round((d(t).getTime() - d(f).getTime()) / 864e5);
  return { from: f, to: t, prevFrom: mStart(y, m - 1), prevTo: addDays(mStart(y, m - 1), days), label: 'This month' };
}
export const PERIODS: [string, string][] = [['today', 'Today'], ['month', 'This month'], ['last', 'Last month'], ['q', '3 months']];
