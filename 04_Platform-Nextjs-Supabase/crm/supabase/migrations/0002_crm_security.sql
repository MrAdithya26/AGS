-- AGS Services Master – pro CRM · 0002 security (Phase 1a)
set local search_path = crm, public;
-- Every table has Row Level Security. Only active staff can read; writes follow the role.

-- Helpers (security definer so policies can read staff without recursion)
create or replace function crm.my_role() returns staff_role language sql stable security definer set search_path = crm, public as
  $$ select role from staff where id = auth.uid() and active $$;
create or replace function crm.is_staff() returns boolean language sql stable security definer set search_path = crm, public as
  $$ select exists (select 1 from staff where id = auth.uid() and active) $$;
create or replace function crm.is_admin() returns boolean language sql stable security definer set search_path = crm, public as
  $$ select coalesce(my_role() in ('owner','manager'), false) $$;
revoke execute on function crm.my_role(), crm.is_staff(), crm.is_admin() from anon, public;
grant execute on function crm.my_role(), crm.is_staff(), crm.is_admin() to authenticated;

-- New login → staff row. The very first login becomes the active owner; everyone after starts switched off.
create or replace function crm.handle_new_user() returns trigger language plpgsql security definer set search_path = crm, public as $$
begin
  insert into staff (id, name, email, role, active)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email,
          case when exists (select 1 from staff) then 'viewer'::staff_role else 'owner'::staff_role end,
          not exists (select 1 from staff));
  return new;
end $$;
create trigger crm_on_auth_user_created after insert on auth.users for each row execute function crm.handle_new_user();
revoke execute on function crm.handle_new_user() from anon, authenticated, public;

-- Enable RLS everywhere
do $$ declare t text; begin
  foreach t in array array['branches','staff','departments','staff_departments','services','workflow_steps','families','customers','customer_ids',
    'customer_files','job_counters','jobs','job_people','job_events','job_documents','payments','cash_closings','portal_accounts','wallet_txns',
    'message_templates','automations','messages','calls','tasks','leads','api_keys','audit_log','settings']
  loop execute format('alter table crm.%I enable row level security', t); end loop;
end $$;

-- Staff: everyone active sees the team; you can always see yourself; only the owner changes rows
create policy staff_read on staff for select to authenticated using (is_staff() or id = auth.uid());
create policy staff_owner_update on staff for update to authenticated using (my_role() = 'owner') with check (my_role() = 'owner');

-- Catalogue: staff read; owner/manager write
do $$ declare t text; begin
  foreach t in array array['branches','departments','services','workflow_steps','message_templates','automations','portal_accounts','settings','staff_departments'] loop
    execute format('create policy %1$s_read on crm.%1$I for select to authenticated using (crm.is_staff())', t);
    execute format('create policy %1$s_admin on crm.%1$I for all to authenticated using (crm.is_admin()) with check (crm.is_admin())', t);
  end loop;
end $$;

-- Working data: active staff (not viewers) read and write; viewers read only. Branch / department limits come with multi-branch (Phase 5).
do $$ declare t text; begin
  foreach t in array array['families','customers','customer_files','jobs','job_people','job_events','job_documents','payments','messages','calls','tasks','leads','wallet_txns','job_counters'] loop
    execute format('create policy %1$s_read on crm.%1$I for select to authenticated using (crm.is_staff())', t);
    execute format('create policy %1$s_write on crm.%1$I for insert to authenticated with check (crm.is_staff() and crm.my_role() <> ''viewer'')', t);
    execute format('create policy %1$s_update on crm.%1$I for update to authenticated using (is_staff() and my_role() <> ''viewer'') with check (crm.is_staff() and crm.my_role() <> ''viewer'')', t);
  end loop;
end $$;
-- Deletes: owner only, and only where it makes sense
create policy jobs_owner_delete on jobs for delete to authenticated using (my_role() = 'owner');
create policy customers_owner_delete on customers for delete to authenticated using (my_role() = 'owner');

-- Sensitive: encrypted ID numbers and cash closings – owner, manager, accountant; audit and API keys – owner only
create policy customer_ids_read on customer_ids for select to authenticated using (is_staff());
create policy customer_ids_write on customer_ids for insert to authenticated with check (is_staff() and my_role() <> 'viewer');
create policy cash_read on cash_closings for select to authenticated using (my_role() in ('owner','manager','accountant') or staff_id = auth.uid());
create policy cash_write on cash_closings for insert to authenticated with check (staff_id = auth.uid() or is_admin());
create policy audit_owner on audit_log for select to authenticated using (my_role() = 'owner');
create policy apikeys_owner on api_keys for all to authenticated using (my_role() = 'owner') with check (my_role() = 'owner');

-- Never let the browser read the encrypted column itself
revoke select on customer_ids from authenticated, anon;
grant select (id, customer_id, id_type, last4, created_at) on customer_ids to authenticated;
