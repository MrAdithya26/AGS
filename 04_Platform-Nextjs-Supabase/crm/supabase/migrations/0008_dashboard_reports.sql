-- AGS Services Master – pro CRM · 0008 dashboard and report summaries (Phase 1f, 14 Nov 2026)
-- Run as the signed-in user (security invoker), so row security still decides what each person sees.
set local search_path = crm, public;

create or replace view crm.job_view with (security_invoker = true) as
  select j.*, d.name as dept, d.kind::text as kind, coalesce(w.outcome, 'open') as outcome, w.label as step_label,
         (j.created_at at time zone 'Asia/Kolkata')::date as created_day
  from jobs j join departments d on d.id = j.department_id
  left join workflow_steps w on w.department_id = j.department_id and w.key = j.step_key;
grant select on crm.job_view to authenticated;

create or replace function crm.dashboard(p_from date, p_to date) returns jsonb language sql stable security invoker set search_path = crm, public as $$
with j as (select * from job_view),
jr as (select * from j where created_day between p_from and p_to),
pr as (select p.*, (p.at at time zone 'Asia/Kolkata')::date as day from payments p where (p.at at time zone 'Asia/Kolkata')::date between p_from and p_to),
today as (select (now() at time zone 'Asia/Kolkata')::date as d)
select jsonb_build_object(
  'received', (select coalesce(sum(amount), 0) from pr where kind = 'receipt'),
  'refunded', (select coalesce(sum(amount), 0) from pr where kind = 'refund'),
  'income', (select coalesce(sum(service_charge - discount), 0) from jr where outcome = 'success'),
  'new_jobs', (select count(*) from jr),
  'done', (select count(*) from jr where outcome = 'success'),
  'failed', (select count(*) from jr where outcome = 'failed'),
  'open', (select count(*) from j where outcome = 'open'),
  'overdue', (select count(*) from j, today where outcome = 'open' and expected_date < today.d),
  'ready', (select count(*) from j where step_key = 'ready'),
  'soon', (select count(*) from j, today where outcome in ('open', 'success') and service_date between today.d and today.d + 2),
  'unpaid', (select jsonb_build_object('n', count(*), 'amt', coalesce(sum(total - paid), 0)) from j where outcome in ('open', 'success') and total > paid),
  'refunds_due', (select jsonb_build_object('n', count(*), 'amt', coalesce(sum(paid - refunded), 0)) from j where outcome in ('failed', 'cancelled') and paid > refunded),
  'by_dept', (select coalesce(jsonb_agg(x order by (x->>'received')::bigint desc, x->>'dept'), '[]') from (
     select jsonb_build_object('dept', dept, 'kind', kind, 'n', count(*), 'done', count(*) filter (where outcome = 'success'),
       'open', count(*) filter (where outcome = 'open'), 'received', coalesce(sum(paid), 0),
       'income', coalesce(sum(service_charge - discount) filter (where outcome = 'success'), 0)) as x
     from jr group by dept, kind) s),
  'monthly', (select coalesce(jsonb_agg(x order by x->>'month'), '[]') from (
     select jsonb_build_object('month', m, 'kind', k, 'amount', a) as x from (
       select to_char(date_trunc('month', p.at at time zone 'Asia/Kolkata'), 'YYYY-MM') as m, d.kind::text as k,
              sum(case p.kind when 'refund' then -p.amount else p.amount end) as a
       from payments p join jobs jb on jb.id = p.job_id join departments d on d.id = jb.department_id
       where p.at >= date_trunc('month', now()) - interval '5 months'
       group by 1, 2) q) s),
  'staff', (select coalesce(jsonb_agg(x order by (x->>'received')::bigint desc), '[]') from (
     select jsonb_build_object('name', st.name,
       'created', (select count(*) from jr where jr.created_by = st.id),
       'done', (select count(*) from jr where jr.assigned_to = st.id and jr.outcome = 'success'),
       'open', (select count(*) from j where j.assigned_to = st.id and j.outcome = 'open'),
       'received', (select coalesce(sum(amount), 0) from pr where pr.received_by = st.id and pr.kind = 'receipt')) as x
     from staff st where st.active) s),
  'not_closed', (select coalesce(jsonb_agg(distinct st.name), '[]') from payments p join staff st on st.id = p.received_by, today
     where (p.at at time zone 'Asia/Kolkata')::date = today.d
       and not exists (select 1 from cash_closings c where c.staff_id = st.id and c.day = today.d))
) $$;

create or replace function crm.report(p_from date, p_to date) returns jsonb language sql stable security invoker set search_path = crm, public as $$
with jr as (select v.*, s.name as service from job_view v left join services s on s.id = v.service_id where created_day between p_from and p_to),
pr as (select (at at time zone 'Asia/Kolkata')::date as day, kind, amount from payments where (at at time zone 'Asia/Kolkata')::date between p_from and p_to)
select jsonb_build_object(
  'by_service', (select coalesce(jsonb_agg(x order by (x->>'received')::bigint desc), '[]') from (
     select jsonb_build_object('dept', dept, 'service', coalesce(service, '—'), 'n', count(*), 'done', count(*) filter (where outcome = 'success'),
       'failed', count(*) filter (where outcome = 'failed'), 'received', coalesce(sum(paid), 0), 'refunded', coalesce(sum(refunded), 0),
       'income', coalesce(sum(service_charge - discount) filter (where outcome = 'success'), 0)) as x
     from jr group by dept, service) s),
  'daily', (select coalesce(jsonb_agg(x order by x->>'day' desc), '[]') from (
     select jsonb_build_object('day', day, 'received', coalesce(sum(amount) filter (where kind = 'receipt'), 0),
       'refunded', coalesce(sum(amount) filter (where kind = 'refund'), 0), 'entries', count(*)) as x
     from pr group by day) s)
) $$;
revoke execute on function crm.dashboard(date, date), crm.report(date, date) from public, anon;
grant execute on function crm.dashboard(date, date), crm.report(date, date) to authenticated;
