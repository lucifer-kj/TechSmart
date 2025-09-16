-- Initial schema for SmartTech client portal
-- Extensions
create extension if not exists pgcrypto;

-- JWT claim helper: expects claim customer_id as UUID string
create or replace function public.request_customer_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')::uuid;
$$;

-- customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  servicem8_customer_uuid text unique,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  servicem8_job_uuid text unique,
  job_no text,
  description text,
  status text,
  updated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  type text not null,
  title text not null,
  url text not null,
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'AUD',
  status text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- audit_logs
create table if not exists public.audit_logs (
  id bigserial primary key,
  customer_id uuid not null,
  actor_id uuid,
  event text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_jobs_customer_updated on public.jobs(customer_id, updated desc nulls last);
create index if not exists idx_documents_customer_created on public.documents(customer_id, created_at desc);
create index if not exists idx_payments_customer_paid on public.payments(customer_id, paid_at desc nulls last);
create index if not exists idx_audit_logs_customer_created on public.audit_logs(customer_id, created_at desc);

-- Enable RLS
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.documents enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Policies (drop/create for idempotency)
-- customers
drop policy if exists customers_tenant_isolation_select on public.customers;
drop policy if exists customers_tenant_isolation_modify on public.customers;
create policy customers_tenant_isolation_select on public.customers
for select using (id = request_customer_id());
create policy customers_tenant_isolation_modify on public.customers
for all to authenticated using (id = request_customer_id()) with check (id = request_customer_id());

-- jobs
drop policy if exists jobs_tenant_isolation_select on public.jobs;
drop policy if exists jobs_tenant_isolation_modify on public.jobs;
create policy jobs_tenant_isolation_select on public.jobs
for select using (customer_id = request_customer_id());
create policy jobs_tenant_isolation_modify on public.jobs
for all to authenticated using (customer_id = request_customer_id()) with check (customer_id = request_customer_id());

-- documents
drop policy if exists documents_tenant_isolation_select on public.documents;
drop policy if exists documents_tenant_isolation_modify on public.documents;
create policy documents_tenant_isolation_select on public.documents
for select using (customer_id = request_customer_id());
create policy documents_tenant_isolation_modify on public.documents
for all to authenticated using (customer_id = request_customer_id()) with check (customer_id = request_customer_id());

-- payments
drop policy if exists payments_tenant_isolation_select on public.payments;
drop policy if exists payments_tenant_isolation_modify on public.payments;
create policy payments_tenant_isolation_select on public.payments
for select using (customer_id = request_customer_id());
create policy payments_tenant_isolation_modify on public.payments
for all to authenticated using (customer_id = request_customer_id()) with check (customer_id = request_customer_id());

-- audit_logs: read-only for tenant
drop policy if exists audit_logs_tenant_isolation_select on public.audit_logs;
create policy audit_logs_tenant_isolation_select on public.audit_logs
for select using (customer_id = request_customer_id());


