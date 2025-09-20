-- Add customer_feedback table for feedback system
create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  feedback_text text not null,
  rating integer check (rating >= 1 and rating <= 5),
  category text not null default 'general' check (category in ('quality', 'service', 'timeliness', 'general')),
  submitted_by uuid references auth.users(id) on delete set null,
  synced_to_servicem8 boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_customer_feedback_customer on public.customer_feedback(customer_id);
create index if not exists idx_customer_feedback_job on public.customer_feedback(job_id);
create index if not exists idx_customer_feedback_rating on public.customer_feedback(rating);
create index if not exists idx_customer_feedback_category on public.customer_feedback(category);
create index if not exists idx_customer_feedback_created on public.customer_feedback(created_at);

-- Enable RLS
alter table public.customer_feedback enable row level security;

-- RLS Policies
drop policy if exists customer_feedback_tenant_isolation_select on public.customer_feedback;
drop policy if exists customer_feedback_tenant_isolation_modify on public.customer_feedback;

-- Customers can only see/modify their own feedback
create policy customer_feedback_tenant_isolation_select on public.customer_feedback
for select using (
  (customer_id = public.request_customer_id()) or 
  public.is_current_user_admin()
);

create policy customer_feedback_tenant_isolation_modify on public.customer_feedback
for all to authenticated using (
  (customer_id = public.request_customer_id()) or 
  public.is_current_user_admin()
) with check (
  (customer_id = public.request_customer_id()) or 
  public.is_current_user_admin()
);

-- Trigger to maintain updated_at
create or replace function public.update_customer_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customer_feedback_set_updated_at on public.customer_feedback;
create trigger trg_customer_feedback_set_updated_at
  before update on public.customer_feedback
  for each row
  execute function public.update_customer_feedback_updated_at();
