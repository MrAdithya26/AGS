-- AGS Services Master – pro CRM · 0004 Customer 360 (Phase 1b, 12 Nov 2026)
set local search_path = crm, public, extensions;

-- Customer numbers C00001, C00002 … filled in automatically
create sequence if not exists crm.customer_code_seq;
alter table crm.customers alter column code set default ('C' || lpad(nextval('crm.customer_code_seq')::text, 5, '0'));
alter table crm.customers add column if not exists updated_at timestamptz not null default now(),
                          add column if not exists updated_by uuid references crm.staff(id);
create index if not exists customers_family_idx on crm.customers (family_id);
create index if not exists customers_name_idx on crm.customers (lower(name));
create unique index if not exists customer_ids_one_per_type on crm.customer_ids (customer_id, id_type);

-- Encryption key for ID numbers lives in Supabase Vault (never leaves the database)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'crm_id_key', 'AGS CRM: key for customer ID numbers')
where not exists (select 1 from vault.secrets where name = 'crm_id_key');
create or replace function crm.id_key() returns text language sql stable security definer set search_path = '' as
  $$ select decrypted_secret from vault.decrypted_secrets where name = 'crm_id_key' $$;
revoke execute on function crm.id_key() from public, anon, authenticated;

-- Save an ID number: stores the last 4 digits for display and the full number encrypted
create or replace function crm.add_customer_id(p_customer uuid, p_type text, p_number text) returns void
language plpgsql security definer set search_path = crm, public, extensions as $$
declare n text := upper(regexp_replace(coalesce(p_number, ''), '[\s-]', '', 'g'));
begin
  if not (is_staff() and my_role() <> 'viewer') then raise exception 'Not allowed'; end if;
  if p_type not in ('aadhaar','pan','voter','passport','dl','ration','other') then raise exception 'Unknown ID type'; end if;
  if p_type = 'aadhaar' and n !~ '^[2-9][0-9]{11}$' then raise exception 'Aadhaar must be 12 digits'; end if;
  if p_type = 'pan' and n !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then raise exception 'PAN format is ABCDE1234F'; end if;
  if length(n) < 4 then raise exception 'ID number is too short'; end if;
  insert into customer_ids (customer_id, id_type, last4, number_enc)
  values (p_customer, p_type, right(n, 4), pgp_sym_encrypt(n, crm.id_key()))
  on conflict (customer_id, id_type) do update set last4 = excluded.last4, number_enc = excluded.number_enc, created_at = now();
  insert into audit_log (actor, action, entity, entity_id, data) values (auth.uid(), 'id_saved', 'customer', p_customer::text, jsonb_build_object('type', p_type, 'last4', right(n, 4)));
end $$;

-- Reveal a full ID number: owner / manager only, and every reveal is written to the audit log
create or replace function crm.reveal_customer_id(p_id uuid) returns text
language plpgsql security definer set search_path = crm, public, extensions as $$
declare r customer_ids;
begin
  if not is_admin() then raise exception 'Only the owner or a manager can see full ID numbers'; end if;
  select * into r from customer_ids where id = p_id;
  if not found then raise exception 'Not found'; end if;
  insert into audit_log (actor, action, entity, entity_id, data) values (auth.uid(), 'id_revealed', 'customer', r.customer_id::text, jsonb_build_object('type', r.id_type));
  return pgp_sym_decrypt(r.number_enc, crm.id_key());
end $$;
revoke execute on function crm.add_customer_id(uuid, text, text), crm.reveal_customer_id(uuid) from public, anon;
grant execute on function crm.add_customer_id(uuid, text, text), crm.reveal_customer_id(uuid) to authenticated;
create policy customer_ids_delete on crm.customer_ids for delete to authenticated using (crm.is_staff() and crm.my_role() <> 'viewer');

-- Change log and "updated" stamps for customers and families
create or replace function crm.audit_row() returns trigger language plpgsql security definer set search_path = crm, public as $$
begin
  insert into audit_log (actor, action, entity, entity_id, data)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, ''),
          case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create or replace function crm.touch_row() returns trigger language plpgsql set search_path = crm, public as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
create trigger customers_touch before update on crm.customers for each row execute function crm.touch_row();
create trigger customers_audit after insert or update or delete on crm.customers for each row execute function crm.audit_row();
create trigger families_audit after insert or update or delete on crm.families for each row execute function crm.audit_row();
revoke execute on function crm.audit_row(), crm.touch_row() from public, anon, authenticated;

-- Private document store (free Supabase Storage). Files are opened only through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit) values ('crm-files', 'crm-files', false, 10485760)
on conflict (id) do nothing;
create policy crm_files_read on storage.objects for select to authenticated using (bucket_id = 'crm-files' and crm.is_staff());
create policy crm_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'crm-files' and crm.is_staff() and crm.my_role() <> 'viewer');
create policy crm_files_delete on storage.objects for delete to authenticated using (bucket_id = 'crm-files' and crm.is_admin());
create policy customer_files_delete on crm.customer_files for delete to authenticated using (crm.is_admin());
