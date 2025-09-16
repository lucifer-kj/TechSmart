-- Document downloads tracking table
create table if not exists public.document_downloads (
  id uuid primary key default gen_random_uuid(),
  document_id text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  download_source text default 'portal'
);

-- Indexes for performance
create index if not exists idx_document_downloads_document_id on public.document_downloads(document_id);
create index if not exists idx_document_downloads_customer_id on public.document_downloads(customer_id);
create index if not exists idx_document_downloads_downloaded_at on public.document_downloads(downloaded_at);

-- RLS policies for document downloads
alter table public.document_downloads enable row level security;

-- Customers can only see their own downloads
create policy "Customers can view own downloads" on public.document_downloads
  for select
  using (
    customer_id = (
      select id from public.customers 
      where servicem8_customer_uuid = (
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')
      )
    )
  );

-- Customers can insert their own downloads
create policy "Customers can insert own downloads" on public.document_downloads
  for insert
  with check (
    customer_id = (
      select id from public.customers 
      where servicem8_customer_uuid = (
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')
      )
    )
  );

-- Admins can view all downloads
create policy "Admins can view all downloads" on public.document_downloads
  for select
  using (
    exists (
      select 1 from auth.users 
      where auth.users.id = auth.uid() 
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
