-- AGS Services Master – pro CRM · 0006 jobs engine (Phase 1d, 13 Nov 2026)
set local search_path = crm, public;

-- New job: number per department prefix and month (TTD-2611-0001), first workflow step, creator
create or replace function crm.job_before_insert() returns trigger language plpgsql security definer set search_path = crm, public as $$
declare p text; m text := to_char(now() at time zone 'Asia/Kolkata', 'YYMM'); n int;
begin
  if new.number is null or new.number = '' then
    select job_prefix into p from departments where id = new.department_id;
    insert into job_counters (prefix, month, last) values (coalesce(p, 'AGS'), m, 1)
      on conflict (prefix, month) do update set last = job_counters.last + 1 returning last into n;
    new.number := coalesce(p, 'AGS') || '-' || m || '-' || lpad(n::text, 4, '0');
  end if;
  if new.step_key is null or new.step_key = '' then
    select key into new.step_key from workflow_steps where department_id = new.department_id order by sort limit 1;
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;
create trigger jobs_before_insert before insert on jobs for each row execute function crm.job_before_insert();

create or replace function crm.job_before_update() returns trigger language plpgsql set search_path = crm, public as $$
begin new.updated_at := now(); return new; end $$;
create trigger jobs_before_update before update on jobs for each row execute function crm.job_before_update();

-- Timeline: created, step changes, assignment changes
create or replace function crm.job_after_change() returns trigger language plpgsql security definer set search_path = crm, public as $$
begin
  if tg_op = 'INSERT' then
    insert into job_events (job_id, kind, to_step, actor) values (new.id, 'created', new.step_key, auth.uid());
  else
    if new.step_key is distinct from old.step_key then
      insert into job_events (job_id, kind, from_step, to_step, actor) values (new.id, 'step', old.step_key, new.step_key, auth.uid());
    end if;
    if new.assigned_to is distinct from old.assigned_to then
      insert into job_events (job_id, kind, data, actor) values (new.id, 'assigned', jsonb_build_object('to', new.assigned_to), auth.uid());
    end if;
  end if;
  return new;
end $$;
create trigger jobs_after_change after insert or update on jobs for each row execute function crm.job_after_change();

-- Paid / refunded on the job always equal the sum of its payments
create or replace function crm.payments_sync() returns trigger language plpgsql security definer set search_path = crm, public as $$
declare j uuid := coalesce(new.job_id, old.job_id);
begin
  if j is not null then
    update jobs set paid = coalesce((select sum(amount) from payments where job_id = j and kind = 'receipt'), 0),
                    refunded = coalesce((select sum(amount) from payments where job_id = j and kind = 'refund'), 0)
    where id = j;
    insert into job_events (job_id, kind, data, actor) select j, 'payment', jsonb_build_object('kind', new.kind, 'amount', new.amount, 'mode', new.mode), auth.uid() where tg_op = 'INSERT';
  end if;
  return coalesce(new, old);
end $$;
create trigger payments_sync after insert or update or delete on payments for each row execute function crm.payments_sync();
create trigger payments_audit after insert or update or delete on payments for each row execute function crm.audit_row();
create trigger jobs_audit after delete on jobs for each row execute function crm.audit_row();
revoke execute on function crm.job_before_insert(), crm.job_before_update(), crm.job_after_change(), crm.payments_sync() from public, anon, authenticated;
create index if not exists job_events_job_idx on job_events (job_id, at);
create index if not exists messages_job_idx on messages (job_id, at);
create index if not exists payments_job_idx on payments (job_id);

-- Shop details used in every message (owner edits them later in Settings)
insert into settings (key, value) values ('shop', '{"shopName":"Adithya Internet & CSC Center","shopNameTe":"ఆదిత్య ఇంటర్నెట్ & CSC సెంటర్","groupName":"Adithya Group of Services","groupNameTe":"ఆదిత్య గ్రూప్ ఆఫ్ సర్వీసెస్","shopPhone":"","shopAddress":""}')
on conflict (key) do nothing;
