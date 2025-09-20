-- Add quotes table for quote approvals
create table if not exists public.quotes (
  id text primary key, -- ServiceM8 quote ID
  customer_id uuid references public.customers(id) on delete cascade,
  company_uuid text not null, -- ServiceM8 customer UUID
  job_id uuid references public.jobs(id) on delete set null,
  servicem8_job_uuid text, -- ServiceM8 job UUID
  status text not null default 'pending',
  approved_at timestamptz,
  signature text, -- Base64 encoded signature
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_quotes_customer on public.quotes(customer_id);
create index if not exists idx_quotes_company_uuid on public.quotes(company_uuid);
create index if not exists idx_quotes_job on public.quotes(job_id);
create index if not exists idx_quotes_status on public.quotes(status);

-- Enable RLS
alter table public.quotes enable row level security;

-- RLS Policies
drop policy if exists quotes_tenant_isolation_select on public.quotes;
drop policy if exists quotes_tenant_isolation_modify on public.quotes;

create policy quotes_tenant_isolation_select on public.quotes
for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());

create policy quotes_tenant_isolation_modify on public.quotes
for all to authenticated using (customer_id = public.request_customer_id() or public.is_current_user_admin())
with check (customer_id = public.request_customer_id() or public.is_current_user_admin());
