-- Migration: Supabase Auth RBAC compatible with existing tenant model
-- This migration is idempotent and aligns with current schema using customer_id tenancy

-- Extensions (ensure pgcrypto exists for gen_random_uuid)
create extension if not exists pgcrypto;

-- Table: user_profiles (links auth.users to portal roles and optional tenant)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null check (role in ('admin','customer')) default 'customer',
  customer_id uuid references public.customers(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table: customer_invitations (invite customers to portal)
create table if not exists public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  token text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_customer on public.user_profiles(customer_id);
create index if not exists idx_customer_invitations_email on public.customer_invitations(email);
create index if not exists idx_customer_invitations_token on public.customer_invitations(token);

-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.customer_invitations enable row level security;

-- Helper: Determine if current auth user is an active admin
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  );
$$;

-- Trigger function: update updated_at if column exists
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'UPDATE') then
    begin
      new.updated_at := now();
    exception when undefined_column then
      -- table has no updated_at column; ignore
      null;
    end;
  end if;
  return new;
end;
$$;

-- Trigger to maintain updated_at on user_profiles
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_user_profiles_set_updated_at'
  ) then
    create trigger trg_user_profiles_set_updated_at
      before update on public.user_profiles
      for each row execute procedure public.update_updated_at_column();
  end if;
end$$;

-- Auto-create a profile row when a new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_on_auth_user_created'
  ) then
    create trigger trg_on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_auth_user();
  end if;
end$$;

-- RLS Policies for user_profiles
drop policy if exists user_profiles_select_self on public.user_profiles;
drop policy if exists user_profiles_update_self on public.user_profiles;
drop policy if exists user_profiles_admin_all on public.user_profiles;

create policy user_profiles_select_self on public.user_profiles
for select using (auth.uid() = id or public.is_current_user_admin());

create policy user_profiles_update_self on public.user_profiles
for update using (auth.uid() = id or public.is_current_user_admin());

create policy user_profiles_admin_all on public.user_profiles
for all using (public.is_current_user_admin());

-- RLS Policies for customer_invitations (admin only)
drop policy if exists customer_invitations_admin_all on public.customer_invitations;
create policy customer_invitations_admin_all on public.customer_invitations
for all using (public.is_current_user_admin());

-- Ensure RLS is enabled on tenant tables (was disabled in a prior migration)
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.documents enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.job_materials enable row level security;
alter table public.job_activities enable row level security;

-- Update existing tenant policies to allow admin override

-- customers
drop policy if exists customers_tenant_isolation_select on public.customers;
drop policy if exists customers_tenant_isolation_modify on public.customers;
create policy customers_tenant_isolation_select on public.customers
for select using (id = public.request_customer_id() or public.is_current_user_admin());
create policy customers_tenant_isolation_modify on public.customers
for all to authenticated using (id = public.request_customer_id() or public.is_current_user_admin())
with check (id = public.request_customer_id() or public.is_current_user_admin());

-- jobs
drop policy if exists jobs_tenant_isolation_select on public.jobs;
drop policy if exists jobs_tenant_isolation_modify on public.jobs;
create policy jobs_tenant_isolation_select on public.jobs
for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());
create policy jobs_tenant_isolation_modify on public.jobs
for all to authenticated using (customer_id = public.request_customer_id() or public.is_current_user_admin())
with check (customer_id = public.request_customer_id() or public.is_current_user_admin());

-- documents
drop policy if exists documents_tenant_isolation_select on public.documents;
drop policy if exists documents_tenant_isolation_modify on public.documents;
create policy documents_tenant_isolation_select on public.documents
for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());
create policy documents_tenant_isolation_modify on public.documents
for all to authenticated using (customer_id = public.request_customer_id() or public.is_current_user_admin())
with check (customer_id = public.request_customer_id() or public.is_current_user_admin());

-- payments
drop policy if exists payments_tenant_isolation_select on public.payments;
drop policy if exists payments_tenant_isolation_modify on public.payments;
create policy payments_tenant_isolation_select on public.payments
for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());
create policy payments_tenant_isolation_modify on public.payments
for all to authenticated using (customer_id = public.request_customer_id() or public.is_current_user_admin())
with check (customer_id = public.request_customer_id() or public.is_current_user_admin());

-- audit_logs (read-only by tenant, admins can see all)
drop policy if exists audit_logs_tenant_isolation_select on public.audit_logs;
create policy audit_logs_tenant_isolation_select on public.audit_logs
for select using (customer_id = public.request_customer_id() or public.is_current_user_admin());


