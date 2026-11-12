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
