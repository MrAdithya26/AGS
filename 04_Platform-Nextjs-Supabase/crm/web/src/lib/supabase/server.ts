import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    db: { schema: 'crm' },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component: middleware refreshes */ }
      },
    },
  });
}

export type Staff = { id: string; name: string; role: 'owner' | 'manager' | 'counter' | 'agent' | 'accountant' | 'viewer'; active: boolean };

/** Signed-in user + their staff row (null when not signed in). */
export async function currentStaff() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, staff: null as Staff | null };
  const { data: staff } = await sb.from('staff').select('id, name, role, active').eq('id', user.id).maybeSingle();
  return { sb, user, staff: (staff as Staff | null) };
}
