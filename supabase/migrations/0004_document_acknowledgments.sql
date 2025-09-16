-- Document acknowledgments table
create table if not exists public.document_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  document_id text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  signature text not null,
  notes text,
  acknowledged_by text not null,
  acknowledged_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_document_acknowledgments_document_id on public.document_acknowledgments(document_id);
create index if not exists idx_document_acknowledgments_customer_id on public.document_acknowledgments(customer_id);

-- RLS policies for document acknowledgments
alter table public.document_acknowledgments enable row level security;

-- Customers can only see their own acknowledgments
create policy "Customers can view own acknowledgments" on public.document_acknowledgments
  for select
  using (
    customer_id = (
      select id from public.customers 
      where servicem8_customer_uuid = (
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')
      )
    )
  );

-- Customers can insert their own acknowledgments
create policy "Customers can insert own acknowledgments" on public.document_acknowledgments
  for insert
  with check (
    customer_id = (
      select id from public.customers 
      where servicem8_customer_uuid = (
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')
      )
    )
  );

-- Admins can view all acknowledgments
create policy "Admins can view all acknowledgments" on public.document_acknowledgments
  for select
  using (
    exists (
      select 1 from auth.users 
      where auth.users.id = auth.uid() 
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
