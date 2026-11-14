-- AGS Services Master – pro CRM · 0007 accounts (Phase 1e, 14 Nov 2026)
set local search_path = crm, public;

-- Receipt numbers: R-2611-0001 for money received, RF-2611-0001 for refunds
create or replace function crm.payment_before_insert() returns trigger language plpgsql security definer set search_path = crm, public as $$
declare p text := case when new.kind = 'refund' then 'RF' else 'R' end; m text := to_char(now() at time zone 'Asia/Kolkata', 'YYMM'); n int;
begin
  if new.receipt_no is null or new.receipt_no = '' then
    insert into job_counters (prefix, month, last) values (p, m, 1)
      on conflict (prefix, month) do update set last = job_counters.last + 1 returning last into n;
    new.receipt_no := p || '-' || m || '-' || lpad(n::text, 4, '0');
  end if;
  new.received_by := coalesce(new.received_by, auth.uid());
  return new;
end $$;
create trigger payments_before_insert before insert on payments for each row execute function crm.payment_before_insert();
revoke execute on function crm.payment_before_insert() from public, anon, authenticated;
create index if not exists payments_day_idx on payments (at);

-- Cash closing: one per staff per day; the system works out the expected cash
alter table cash_closings add column if not exists upi bigint not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists closed_by uuid references staff(id);
create or replace function crm.cash_expected(p_staff uuid, p_day date) returns table (cash bigint, upi bigint, other bigint, receipts int)
language sql stable security definer set search_path = crm, public as $$
  select coalesce(sum(case when mode = 'Cash' then (case kind when 'refund' then -amount else amount end) end), 0)::bigint,
         coalesce(sum(case when mode = 'UPI' then (case kind when 'refund' then -amount else amount end) end), 0)::bigint,
         coalesce(sum(case when mode not in ('Cash','UPI') then (case kind when 'refund' then -amount else amount end) end), 0)::bigint,
         count(*)::int
  from payments where received_by = p_staff and (at at time zone 'Asia/Kolkata')::date = p_day and crm.is_staff()
$$;
revoke execute on function crm.cash_expected(uuid, date) from public, anon;
grant execute on function crm.cash_expected(uuid, date) to authenticated;
create policy cash_admin_update on cash_closings for update to authenticated using (crm.is_admin()) with check (crm.is_admin());
create trigger cash_closings_audit after insert or update or delete on cash_closings for each row execute function crm.audit_row();

-- Portal wallets (IRCTC agent wallet, AEPS, TTD logins …): balance = top-ups + refunds - debits
alter table wallet_txns add column if not exists note text, add column if not exists created_by uuid references staff(id) default auth.uid();
create or replace view crm.wallet_balances with (security_invoker = true) as
  select a.id, a.portal, a.label, a.login_ref, a.holder, a.monthly_limit, a.active,
         coalesce(sum(case t.kind when 'debit' then -t.amount else t.amount end), 0)::bigint as balance,
         count(t.id) filter (where t.kind = 'debit' and date_trunc('month', t.at) = date_trunc('month', now()))::int as used_this_month,
         max(t.at) as last_txn
  from portal_accounts a left join wallet_txns t on t.portal_account_id = a.id
  group by a.id;
grant select on crm.wallet_balances to authenticated;
create trigger wallet_txns_audit after insert or update or delete on wallet_txns for each row execute function crm.audit_row();
create trigger portal_accounts_audit after insert or update or delete on portal_accounts for each row execute function crm.audit_row();

-- Receipt wording (owner can edit later in Settings)
insert into settings (key, value) values ('receipt', '{"note_te":"ప్రభుత్వ / పోర్టల్ / టికెట్ రుసుము మీ తరఫున చెల్లించబడుతుంది. మా సేవా రుసుము విడిగా చూపబడింది. ఈ రసీదును భద్రపరచుకోండి.","note_en":"Government / portal / ticket fees are paid on your behalf. Our service charge is shown separately. Please keep this receipt.","irctc_agent_id":""}')
on conflict (key) do nothing;
