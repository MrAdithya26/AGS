export const inr = (paise: number | null | undefined) => '₹' + ((paise || 0) / 100).toLocaleString('en-IN');
export const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
export const fmtDate = (v: string | null | undefined) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
export const ageOf = (dob: string | null | undefined) => {
  if (!dob) return null; const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a;
};
export const validMobile = (m: string) => /^[6-9]\d{9}$/.test(m);

// Verhoeff check digit (Aadhaar numbers end with one)
const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
export const validAadhaar = (n: string) => {
  if (!/^[2-9]\d{11}$/.test(n)) return false;
  let c = 0; n.split('').reverse().forEach((ch, i) => { c = D[c][P[i % 8][+ch]]; }); return c === 0;
};
export const ID_TYPES: [string, string][] = [['aadhaar', 'Aadhaar'], ['pan', 'PAN'], ['voter', 'Voter ID (EPIC)'], ['passport', 'Passport'], ['dl', 'Driving licence'], ['ration', 'Rice / ration card'], ['other', 'Other']];
export const idLabel = (t: string) => (ID_TYPES.find(x => x[0] === t) || [t, t])[1];

/** Rupees in words, Indian system (lakh, crore). */
export function inWords(rupees: number): string {
  let n = Math.round(Math.abs(rupees)); if (!n) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
  const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const out: string[] = [];
  for (const [v, w] of [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']] as [number, string][]) {
    if (n >= v) { out.push((v === 10000000 ? inWords(Math.floor(n / v)) : two(Math.floor(n / v))) + ' ' + w); n %= v; }
  }
  if (n) out.push(three(n));
  return out.join(' ');
}
/** Today's date in India as YYYY-MM-DD. */
export const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
