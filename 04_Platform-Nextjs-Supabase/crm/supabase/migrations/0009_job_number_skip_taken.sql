-- AGS Services Master – pro CRM · 0009 booking numbers skip numbers already taken (imported from Sheet edition)
set local search_path = crm, public;
create or replace function crm.job_before_insert() returns trigger language plpgsql security definer set search_path = crm, public as $$
declare p text; m text := to_char(now() at time zone 'Asia/Kolkata', 'YYMM'); n int;
begin
  if new.number is null or new.number = '' then
    select job_prefix into p from departments where id = new.department_id; p := coalesce(p, 'AGS');
    loop
      insert into job_counters (prefix, month, last) values (p, m, 1)
        on conflict (prefix, month) do update set last = job_counters.last + 1 returning last into n;
      new.number := p || '-' || m || '-' || lpad(n::text, 4, '0');
      exit when not exists (select 1 from jobs where number = new.number);
    end loop;
  end if;
  if new.step_key is null or new.step_key = '' then
    select key into new.step_key from workflow_steps where department_id = new.department_id order by sort limit 1;
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;
