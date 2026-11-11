import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import { currentStaff } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const { user, staff } = await currentStaff();
  if (!user) redirect('/login');
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><div className="logo">AGS</div><div><b>AGS Services Master</b><small>Adithya Group of Services</small></div></div>
        <Nav />
        <div className="foot">
          <div>Signed in as <b>{staff?.name || user.email}</b>{staff ? ` · ${staff.role}` : ''}</div>
          <form action="/auth/signout" method="post" style={{ marginTop: 8 }}><button className="btn sm" style={{ background: 'transparent', color: 'inherit', borderColor: 'rgba(255,255,255,.15)' }}>Sign out</button></form>
        </div>
      </aside>
      <div className="main">
        {!staff || !staff.active
          ? <div className="content"><div className="banner">Your login works, but the owner has not given you access yet. Ask the owner to switch you on in <b>Staff &amp; roles</b>.</div></div>
          : children}
      </div>
    </div>
  );
}
