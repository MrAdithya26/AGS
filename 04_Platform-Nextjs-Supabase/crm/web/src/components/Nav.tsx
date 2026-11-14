'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: (readonly [string, string] | readonly ['sep', string])[] = [
  ['sep', 'Overview'], ['/', 'Dashboard'],
  ['sep', 'Work'], ['/jobs', 'Bookings & jobs'], ['/customers', 'Customers'],
  ['sep', 'Money'], ['/accounts', 'Accounts & cash'], ['/wallets', 'Portal wallets'],
  ['sep', 'Admin'], ['/departments', 'Departments & services'], ['/staff', 'Staff & roles'],
];
export default function Nav() {
  const path = usePathname();
  return <nav className="nav">{NAV.map(([href, label], i) => href === 'sep'
    ? <div key={i} className="sep">{label}</div>
    : <Link key={href} href={href} className={path === href || (href !== '/' && path.startsWith(href)) ? 'on' : ''}>{label}</Link>)}</nav>;
}
