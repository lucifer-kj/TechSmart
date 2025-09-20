-- Section 01 - Database & RLS: portal_invitations, portal_access_grants, and request_customer_id refactor
-- This migration is idempotent. It introduces new tables and updates RLS helpers to derive tenant via user_profiles.

-- Ensure required extension
create extension if not exists pgcrypto;

-- Tables
create table if not exists public.portal_invitations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  email text not null,
  token_hash text not null,
  status text not null default 'pending', -- pending | accepted | revoked | expired
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, email, status) deferrable initially immediate
);

create table if not exists public.portal_access_grants (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active', -- active | suspended | revoked
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, user_id)
);

-- Indexes
create index if not exists idx_portal_invitations_customer on public.portal_invitations(customer_id);
create index if not exists idx_portal_invitations_email on public.portal_invitations(email);
create index if not exists idx_portal_access_grants_customer on public.portal_access_grants(customer_id);
create index if not exists idx_portal_access_grants_user on public.portal_access_grants(user_id);

-- Updated helper: request_customer_id derives from user_profiles mapping
-- Note: keep legacy behavior available under public.request_customer_id_legacy for rollback
create or replace function public.request_customer_id_legacy()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')::uuid;
$$;

create or replace function public.request_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.customer_id
  from public.user_profiles up
  where up.id = auth.uid() and up.is_active = true
$$;

-- Trigger function to keep updated_at in sync
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'UPDATE') then
    begin
      new.updated_at := now();
    exception when undefined_column then
      null;
    end;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_portal_invitations_set_updated_at') then
    create trigger trg_portal_invitations_set_updated_at
      before update on public.portal_invitations
      for each row execute procedure public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_portal_access_grants_set_updated_at') then
    create trigger trg_portal_access_grants_set_updated_at
      before update on public.portal_access_grants
      for each row execute procedure public.update_updated_at_column();
  end if;
end$$;

-- RLS enable
alter table public.portal_invitations enable row level security;
alter table public.portal_access_grants enable row level security;

-- Admin helper: ensure function exists (idempotent)
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  );
$$;

-- Policies
drop policy if exists portal_invitations_admin_all on public.portal_invitations;
create policy portal_invitations_admin_all on public.portal_invitations
  for all using (public.is_current_user_admin());

drop policy if exists portal_access_grants_admin_all on public.portal_access_grants;
create policy portal_access_grants_admin_all on public.portal_access_grants
  for all using (public.is_current_user_admin());

-- Update tenant policies to use new request_customer_id(), preserving admin override
-- Customers
drop policy if exists customers_tenant_isolation_select on public.customers;
drop policy if exists customers_tenant_isolation_modify on public.customers;
create policy customers_tenant_isolation_select on public.customers
  for select using (id = public.request_customer_id() or public.is_current_user_admin());
create policy customers_tenant_isolation_modify on public.customers
  for all to authenticated using (id = public.request_customer_id() or public.is_current_user_admin())
  with check (id = public.request_customer_id() or public.is_current_user_admin());

-- Jobs
drop policy if exists jobs_tenant_isolation_select on public.jobs;
drop policy if exists jobs_tenant_isolation_modify on public.jobs;
create policy jobs_tenant_isolation_select on public.jobs
  for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());
create policy jobs_tenant_isolation_modify on public.jobs
  for all to authenticated using (customer_id = public.request_customer_id() or public.is_current_user_admin())
  with check (customer_id = public.request_customer_id() or public.is_current_user_admin());

-- Documents
drop policy if exists documents_tenant_isolation_select on public.documents;
drop policy if exists documents_tenant_isolation_modify on public.documents;
create policy documents_tenant_isolation_select on public.documents
  for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());
create policy documents_tenant_isolation_modify on public.documents
  for all to authenticated using (customer_id = public.request_customer_id() or public.is_current_user_admin())
  with check (customer_id = public.request_customer_id() or public.is_current_user_admin());

-- Payments
drop policy if exists payments_tenant_isolation_select on public.payments;
drop policy if exists payments_tenant_isolation_modify on public.payments;
create policy payments_tenant_isolation_select on public.payments
  for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());
create policy payments_tenant_isolation_modify on public.payments
  for all to authenticated using (customer_id = public.request_customer_id() or public.is_current_user_admin())
  with check (customer_id = public.request_customer_id() or public.is_current_user_admin());

-- Audit logs (read-only by tenant)
drop policy if exists audit_logs_tenant_isolation_select on public.audit_logs;
create policy audit_logs_tenant_isolation_select on public.audit_logs
  for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());


