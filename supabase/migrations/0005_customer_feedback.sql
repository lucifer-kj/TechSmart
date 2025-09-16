-- Customer feedback table
create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  feedback text not null,
  rating integer check (rating >= 0 and rating <= 5),
  feedback_type text not null check (feedback_type in ('general', 'complaint', 'compliment', 'suggestion')),
  submitted_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_customer_feedback_job_id on public.customer_feedback(job_id);
create index if not exists idx_customer_feedback_customer_id on public.customer_feedback(customer_id);
create index if not exists idx_customer_feedback_feedback_type on public.customer_feedback(feedback_type);

-- RLS policies for customer feedback
alter table public.customer_feedback enable row level security;

-- Customers can only see their own feedback
create policy "Customers can view own feedback" on public.customer_feedback
  for select
  using (
    customer_id = (
      select id from public.customers 
      where servicem8_customer_uuid = (
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')
      )
    )
  );

-- Customers can insert their own feedback
create policy "Customers can insert own feedback" on public.customer_feedback
  for insert
  with check (
    customer_id = (
      select id from public.customers 
      where servicem8_customer_uuid = (
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')
      )
    )
  );

-- Admins can view all feedback
create policy "Admins can view all feedback" on public.customer_feedback
  for select
  using (
    exists (
      select 1 from auth.users 
      where auth.users.id = auth.uid() 
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
