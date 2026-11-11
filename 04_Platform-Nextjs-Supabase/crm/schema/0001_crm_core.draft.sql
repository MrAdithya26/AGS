-- AGS Services Master – pro CRM · core schema DRAFT v1.0 (11 Nov 2026)
-- NOT APPLIED to any database yet. Phase 1a turns this into real Supabase migrations.
-- Conventions: uuid ids, created_at/created_by everywhere, RLS on every table, money in paise (bigint).

create extension if not exists pgcrypto;

-- ---------- organisation & staff
create type staff_role as enum ('owner', 'manager', 'counter', 'agent', 'accountant', 'viewer');
create table branches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,               -- 'SKLM'
  name text not null, address text, phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null, mobile text, role staff_role not null default 'counter',
  branch_id uuid references branches(id), active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- departments, services, workflows
create type dept_kind as enum ('ttd', 'travel', 'application', 'quick', 'home_service');
create table departments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,               -- 'TTD','TRAIN','PAN' …
  name text not null, name_te text, kind dept_kind not null,
  job_prefix text not null,                -- 'TTD','TRV','AGS','QS'
  sort int not null default 0, active boolean not null default true
);
create table staff_departments (            -- which departments a staff member may work on
  staff_id uuid references staff(id) on delete cascade,
  department_id uuid references departments(id) on delete cascade,
  primary key (staff_id, department_id)
);
create table services (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  code text unique, name text not null, name_te text,
  govt_fee bigint not null default 0,      -- paise
  service_charge bigint not null default 0,
  pricing_unit text not null default 'booking' check (pricing_unit in ('person','couple','room','booking','page')),
  docs_required text[] not null default '{}',
  sla_days int,                            -- usual days to complete
  form_fields jsonb not null default '[]', -- extra fields for this service (PNR, quota, gotram …)
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table workflow_steps (               -- per department (service can override later)
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  key text not null, label text not null, label_te text,
  sort int not null, outcome text check (outcome in ('open','success','failed','cancelled')) default 'open',
  template_key text,                       -- message prepared when a job enters this step
  unique (department_id, key)
);

-- ---------- customers (one master record)
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null, created_at timestamptz not null default now()
);
create table customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,               -- 'C00001'
  family_id uuid references families(id),
  name text not null, name_te text, gender text, dob date,
  mobile text, alt_mobile text, email text,
  address text, city text, district text, state text default 'Andhra Pradesh', pincode text,
  consent_whatsapp boolean not null default false, consent_sms boolean not null default false,
  consent_calls boolean not null default false, consent_at timestamptz,
  preferred_lang text not null default 'te' check (preferred_lang in ('te','en')),
  tags text[] not null default '{}', notes text,
  created_by uuid references staff(id), created_at timestamptz not null default now()
);
create index on customers (mobile);
create table customer_ids (                 -- ID documents: masked for display, full number encrypted
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  id_type text not null,                   -- 'aadhaar','pan','voter','passport','dl'
  last4 text not null,
  number_enc bytea,                        -- encrypted with a server-side key (never sent to the browser)
  created_at timestamptz not null default now()
);
create table customer_files (               -- private storage bucket, signed URLs only
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  kind text, storage_path text not null, delete_after date,
  created_by uuid references staff(id), created_at timestamptz not null default now()
);

-- ---------- jobs (every booking, application, sale)
create table job_counters (prefix text, month text, last int not null default 0, primary key (prefix, month));
create table jobs (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,             -- 'TTD-2611-0001'
  department_id uuid not null references departments(id),
  service_id uuid references services(id),
  customer_id uuid references customers(id), family_id uuid references families(id),
  branch_id uuid references branches(id),
  step_key text not null,                  -- current workflow step
  assigned_to uuid references staff(id),
  persons int not null default 1,
  wanted_date date, service_date date, expected_date date,
  ext_ref text,                            -- PNR / TTD ticket / application no
  details jsonb not null default '{}',     -- department form values (route, class, slot, room …)
  govt_fee bigint not null default 0, service_charge bigint not null default 0, discount bigint not null default 0,
  total bigint generated always as (govt_fee + service_charge - discount) stored,
  paid bigint not null default 0, refunded bigint not null default 0,
  contact_channel text not null default 'whatsapp',
  created_by uuid references staff(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on jobs (department_id, step_key); create index on jobs (customer_id); create index on jobs (expected_date);
create table job_people (job_id uuid references jobs(id) on delete cascade, customer_id uuid references customers(id), role text, extra jsonb default '{}', primary key (job_id, customer_id));
create table job_events (                   -- timeline + audit for a job
  id bigserial primary key, job_id uuid not null references jobs(id) on delete cascade,
  kind text not null, from_step text, to_step text, note text, data jsonb,
  actor uuid references staff(id), at timestamptz not null default now()
);
create table job_documents (job_id uuid references jobs(id) on delete cascade, name text, received boolean default false, file_id uuid references customer_files(id), primary key (job_id, name));

-- ---------- accounts
create table payments (
  id uuid primary key default gen_random_uuid(),
  receipt_no text unique,
  job_id uuid references jobs(id), customer_id uuid references customers(id),
  kind text not null check (kind in ('receipt','refund')),
  amount bigint not null check (amount > 0), mode text not null, ref text,
  received_by uuid references staff(id), at timestamptz not null default now()
);
create table cash_closings (id uuid primary key default gen_random_uuid(), staff_id uuid references staff(id), day date not null,
  expected bigint not null, counted bigint not null, note text, unique (staff_id, day));
create table portal_accounts (              -- IRCTC agent ID, TTD logins, AEPS: no passwords stored here
  id uuid primary key default gen_random_uuid(), portal text not null, label text not null, login_ref text, holder text,
  monthly_limit int, active boolean default true);
create table wallet_txns (id bigserial primary key, portal_account_id uuid references portal_accounts(id), job_id uuid references jobs(id),
  kind text check (kind in ('topup','debit','refund')), amount bigint not null, at timestamptz default now());

-- ---------- messaging, calls, automation
create table message_templates (
  key text, channel text check (channel in ('whatsapp','sms','voice')), lang text check (lang in ('te','en')),
  body text not null, provider_template text, dlt_template_id text, variables text[] default '{}',
  primary key (key, channel, lang));
create table automations (
  id uuid primary key default gen_random_uuid(), name text not null, active boolean default false,
  trigger text not null check (trigger in ('step_entered','date_offset','new_job','new_lead','inbound_message')),
  conditions jsonb not null default '{}',  -- e.g. {"department":"TRAIN","step":"booked"}
  action text not null check (action in ('send_template','assign','create_task','call')),
  params jsonb not null default '{}');     -- e.g. {"template":"journey_reminder","offset_days":-1,"at":"18:00"}
create table messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id), job_id uuid references jobs(id),
  channel text not null, direction text not null check (direction in ('out','in')),
  template_key text, body text, status text not null default 'queued',  -- queued/sent/delivered/read/failed/received
  provider_id text, cost_paise int, error text,
  handled_by uuid references staff(id), at timestamptz not null default now());
create table calls (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id), job_id uuid references jobs(id),
  direction text check (direction in ('out','in')), agent text default 'staff' check (agent in ('staff','ivr','ai')),
  staff_id uuid references staff(id), status text, duration_s int, recording_path text, summary text,
  provider_id text, cost_paise int, at timestamptz not null default now());

-- ---------- work management
create table tasks (id uuid primary key default gen_random_uuid(), title text not null, job_id uuid references jobs(id),
  customer_id uuid references customers(id), assigned_to uuid references staff(id), due_at timestamptz,
  done boolean default false, created_at timestamptz default now());
create table leads (id uuid primary key default gen_random_uuid(), source text not null, name text, mobile text,
  interest text, note text, status text default 'new', job_id uuid references jobs(id), assigned_to uuid references staff(id),
  created_at timestamptz default now());

-- ---------- system
create table api_keys (id uuid primary key default gen_random_uuid(), label text, key_hash text not null, scopes text[] default '{}',
  created_by uuid references staff(id), created_at timestamptz default now(), revoked_at timestamptz);
create table audit_log (id bigserial primary key, actor uuid, action text, entity text, entity_id text, data jsonb, at timestamptz default now());
create table settings (key text primary key, value jsonb);

-- ---------- security (pattern; full policies written in Phase 1a)
alter table customers enable row level security;
alter table jobs enable row level security;
-- example: staff see jobs of their branch and departments; owners/managers see all
-- create policy jobs_read on jobs for select using (
--   exists (select 1 from staff s where s.id = auth.uid() and s.active and (s.role in ('owner','manager')
--     or (jobs.branch_id = s.branch_id and exists (select 1 from staff_departments d where d.staff_id = s.id and d.department_id = jobs.department_id)))));
