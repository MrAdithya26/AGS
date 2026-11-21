-- AGS Services Master – pro CRM · 0010 devotee details for the AGS TTD Assistant extension (21 Nov 2026)
-- TTD forms need the full photo ID number, so this decrypts it – only for working staff (not viewers / accountants),
-- only customers with an open TTD booking (or their family) unless the owner/manager asks for all, and every call is logged.
set local search_path = crm, public, extensions;

create or replace function crm.ttd_devotees(p_only_pending boolean default true) returns jsonb
language plpgsql security definer set search_path = crm, public, extensions as $$
declare r jsonb; n int;
begin
  if not (is_staff() and my_role() in ('owner', 'manager', 'counter', 'agent')) then raise exception 'Not allowed'; end if;
  if not p_only_pending and not is_admin() then raise exception 'Only the owner or a manager can download all devotees'; end if;
  with open_ttd as (
    select j.customer_id, c.family_id from jobs j join departments d on d.id = j.department_id and d.kind = 'ttd'
    join workflow_steps w on w.department_id = j.department_id and w.key = j.step_key and w.outcome = 'open'
    join customers c on c.id = j.customer_id),
  people as (
    select c.* from customers c
    where not p_only_pending or c.id in (select customer_id from open_ttd) or c.family_id in (select family_id from open_ttd where family_id is not null))
  select coalesce(jsonb_agg(jsonb_build_array(
           coalesce(f.name, p.name), p.name, coalesce(to_char(p.dob, 'DD/MM/YYYY'), ''), coalesce(p.gender, ''),
           case i.id_type when 'aadhaar' then 'Aadhaar Card' when 'pan' then 'PAN Card' when 'voter' then 'Voter ID' when 'passport' then 'Passport' when 'dl' then 'Driving Licence' else '' end,
           coalesce(pgp_sym_decrypt(i.number_enc, crm.id_key()), ''),
           coalesce(substring(p.notes from 'Gotram: ([^·]+)'), ''), coalesce(p.mobile, ''), coalesce(p.email, ''), coalesce(p.address, ''),
           coalesce(p.city, ''), coalesce(p.district, ''), coalesce(p.state, ''), coalesce(p.pincode, ''), 'India') order by f.name nulls last, p.name), '[]'::jsonb),
         count(*)
    into r, n
  from people p left join families f on f.id = p.family_id
  left join lateral (select id_type, number_enc from customer_ids ci where ci.customer_id = p.id
                     order by case id_type when 'aadhaar' then 0 when 'passport' then 1 when 'voter' then 2 else 3 end limit 1) i on true;
  insert into audit_log (actor, action, entity, entity_id, data) values (auth.uid(), 'ttd_devotees_pulled', 'customer', '', jsonb_build_object('count', n, 'only_pending', p_only_pending));
  return jsonb_build_object('count', n, 'rows', jsonb_build_array(jsonb_build_array('Profile Name', 'Devotee Name (as on ID)', 'Date of Birth (DD/MM/YYYY)', 'Gender', 'Photo ID Type', 'Photo ID Number',
    'Gotram (for Homam)', 'Mobile', 'Email ID', 'Address', 'City / Town', 'District', 'State', 'Pincode', 'Country')) || r);
end $$;
revoke execute on function crm.ttd_devotees(boolean) from public, anon;
grant execute on function crm.ttd_devotees(boolean) to authenticated;
