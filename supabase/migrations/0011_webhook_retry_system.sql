-- Create webhook_retry_queue table for managing retry jobs
create table "public"."webhook_retry_queue" (
    "id" uuid not null default gen_random_uuid(),
    "webhook_id" text not null,
    "webhook_url" text not null,
    "payload" text not null,
    "headers" text,
    "scheduled_for" timestamp with time zone not null,
    "attempts" integer not null default 0,
    "status" text not null check (status in ('pending', 'processing', 'completed', 'failed')),
    "error" text,
    "created_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "failed_at" timestamp with time zone
);

-- Create webhook_retry_logs table for detailed retry logging
create table "public"."webhook_retry_logs" (
    "id" uuid not null default gen_random_uuid(),
    "webhook_id" text not null,
    "attempt" integer not null,
    "webhook_url" text,
    "status" text not null check (status in ('attempting', 'success', 'failure', 'exhausted')),
    "error" text,
    "created_at" timestamp with time zone not null default now()
);

-- Enable RLS
alter table "public"."webhook_retry_queue" enable row level security;
alter table "public"."webhook_retry_logs" enable row level security;

-- Create primary keys
CREATE UNIQUE INDEX webhook_retry_queue_pkey ON public.webhook_retry_queue USING btree (id);
alter table "public"."webhook_retry_queue" add constraint "webhook_retry_queue_pkey" PRIMARY KEY using index "webhook_retry_queue_pkey";

CREATE UNIQUE INDEX webhook_retry_logs_pkey ON public.webhook_retry_logs USING btree (id);
alter table "public"."webhook_retry_logs" add constraint "webhook_retry_logs_pkey" PRIMARY KEY using index "webhook_retry_logs_pkey";

-- Create indexes for webhook_retry_queue
CREATE INDEX webhook_retry_queue_webhook_id_idx ON public.webhook_retry_queue USING btree (webhook_id);
CREATE INDEX webhook_retry_queue_status_idx ON public.webhook_retry_queue USING btree (status);
CREATE INDEX webhook_retry_queue_scheduled_for_idx ON public.webhook_retry_queue USING btree (scheduled_for);
CREATE INDEX webhook_retry_queue_created_at_idx ON public.webhook_retry_queue USING btree (created_at);

-- Create indexes for webhook_retry_logs
CREATE INDEX webhook_retry_logs_webhook_id_idx ON public.webhook_retry_logs USING btree (webhook_id);
CREATE INDEX webhook_retry_logs_status_idx ON public.webhook_retry_logs USING btree (status);
CREATE INDEX webhook_retry_logs_created_at_idx ON public.webhook_retry_logs USING btree (created_at);

-- RLS Policies for webhook_retry_queue
create policy "Allow admin to read webhook retry queue"
on "public"."webhook_retry_queue"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

create policy "Allow system to manage webhook retry queue"
on "public"."webhook_retry_queue"
as permissive
for all
to anon
using (true);

-- RLS Policies for webhook_retry_logs
create policy "Allow admin to read webhook retry logs"
on "public"."webhook_retry_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

create policy "Allow system to manage webhook retry logs"
on "public"."webhook_retry_logs"
as permissive
for all
to anon
using (true);

-- Add cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_webhook_retry_data()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Clean up completed retries older than 7 days
  DELETE FROM webhook_retry_queue 
  WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days';
  
  -- Clean up failed retries older than 30 days
  DELETE FROM webhook_retry_queue 
  WHERE status = 'failed' AND failed_at < NOW() - INTERVAL '30 days';
  
  -- Clean up retry logs older than 30 days
  DELETE FROM webhook_retry_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
$$;

-- Create a function to get retry statistics
CREATE OR REPLACE FUNCTION get_webhook_retry_stats()
RETURNS TABLE (
  total_retries bigint,
  pending_retries bigint,
  processing_retries bigint,
  completed_retries bigint,
  failed_retries bigint,
  avg_attempts numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) as total_retries,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_retries,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_retries,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_retries,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_retries,
    AVG(attempts) as avg_attempts
  FROM webhook_retry_queue;
$$;
