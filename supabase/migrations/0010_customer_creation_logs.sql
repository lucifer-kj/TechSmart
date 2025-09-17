-- Create customer_creation_logs table for tracking customer creation webhooks
create table "public"."customer_creation_logs" (
    "id" uuid not null default gen_random_uuid(),
    "webhook_id" text,
    "customer_id" text not null,
    "customer_name" text not null,
    "customer_email" text not null,
    "status" text not null check (status in ('processing', 'completed', 'failed', 'skipped')),
    "error" text,
    "result" text,
    "created_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone
);

-- Enable RLS
alter table "public"."customer_creation_logs" enable row level security;

-- Create primary key
CREATE UNIQUE INDEX customer_creation_logs_pkey ON public.customer_creation_logs USING btree (id);
alter table "public"."customer_creation_logs" add constraint "customer_creation_logs_pkey" PRIMARY KEY using index "customer_creation_logs_pkey";

-- Create index for webhook_id lookups (for idempotency)
CREATE INDEX customer_creation_logs_webhook_id_idx ON public.customer_creation_logs USING btree (webhook_id);

-- Create index for customer_id lookups
CREATE INDEX customer_creation_logs_customer_id_idx ON public.customer_creation_logs USING btree (customer_id);

-- Create index for status filtering
CREATE INDEX customer_creation_logs_status_idx ON public.customer_creation_logs USING btree (status);

-- Create index for created_at (for cleanup queries)
CREATE INDEX customer_creation_logs_created_at_idx ON public.customer_creation_logs USING btree (created_at);

-- RLS Policy: Only admins can read customer creation logs
create policy "Allow admin to read customer creation logs"
on "public"."customer_creation_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

-- RLS Policy: Allow webhook insertion (no auth required for webhooks)
create policy "Allow customer creation webhook insertion"
on "public"."customer_creation_logs"
as permissive
for insert
to anon
with check (true);

-- RLS Policy: Allow webhook updates
create policy "Allow customer creation webhook updates"
on "public"."customer_creation_logs"
as permissive
for update
to anon
using (true);

-- Add cleanup function for old customer creation logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_customer_creation_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM customer_creation_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
$$;
