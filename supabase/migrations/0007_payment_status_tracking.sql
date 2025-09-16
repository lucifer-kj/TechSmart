-- Payment status tracking table
create table if not exists public.payment_status_updates (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id text,
  previous_status text,
  new_status text not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  notes text
);

-- Indexes for performance
create index if not exists idx_payment_status_updates_payment_id on public.payment_status_updates(payment_id);
create index if not exists idx_payment_status_updates_customer_id on public.payment_status_updates(customer_id);
create index if not exists idx_payment_status_updates_job_id on public.payment_status_updates(job_id);
create index if not exists idx_payment_status_updates_updated_at on public.payment_status_updates(updated_at);

-- RLS policies for payment status updates
alter table public.payment_status_updates enable row level security;

-- Customers can only see their own payment status updates
create policy "Customers can view own payment status updates" on public.payment_status_updates
  for select
  using (
    customer_id = (
      select id from public.customers 
      where servicem8_customer_uuid = (
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'customer_id','')
      )
    )
  );

-- System can insert payment status updates
create policy "System can insert payment status updates" on public.payment_status_updates
  for insert
  with check (true);

-- Admins can view all payment status updates
create policy "Admins can view all payment status updates" on public.payment_status_updates
  for select
  using (
    exists (
      select 1 from auth.users 
      where auth.users.id = auth.uid() 
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add a trigger to automatically track payment status changes
create or replace function track_payment_status_change()
returns trigger as $$
begin
  -- Only track if status actually changed
  if OLD.status is distinct from NEW.status then
    insert into public.payment_status_updates (
      payment_id,
      customer_id,
      job_id,
      previous_status,
      new_status,
      updated_at,
      updated_by,
      notes
    ) values (
      NEW.id::text,
      NEW.customer_id,
      NEW.job_id::text,
      OLD.status,
      NEW.status,
      now(),
      'system',
      'Status updated automatically'
    );
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger on payments table
drop trigger if exists payment_status_change_trigger on public.payments;
create trigger payment_status_change_trigger
  after update on public.payments
  for each row
  execute function track_payment_status_change();
