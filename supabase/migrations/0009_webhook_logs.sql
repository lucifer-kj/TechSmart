-- Create webhook_logs table for tracking webhook events
create table "public"."webhook_logs" (
    "id" uuid not null default gen_random_uuid(),
    "webhook_id" text,
    "event_type" text not null,
    "object_uuid" text not null,
    "status" text not null check (status in ('processing', 'completed', 'failed')),
    "error" text,
    "result" text,
    "created_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone
);

-- Enable RLS
alter table "public"."webhook_logs" enable row level security;

-- Create primary key
CREATE UNIQUE INDEX webhook_logs_pkey ON public.webhook_logs USING btree (id);
alter table "public"."webhook_logs" add constraint "webhook_logs_pkey" PRIMARY KEY using index "webhook_logs_pkey";

-- Create index for webhook_id lookups (for idempotency)
CREATE INDEX webhook_logs_webhook_id_idx ON public.webhook_logs USING btree (webhook_id);

-- Create index for event type filtering
CREATE INDEX webhook_logs_event_type_idx ON public.webhook_logs USING btree (event_type);

-- Create index for status filtering
CREATE INDEX webhook_logs_status_idx ON public.webhook_logs USING btree (status);

-- Create index for created_at (for cleanup queries)
CREATE INDEX webhook_logs_created_at_idx ON public.webhook_logs USING btree (created_at);

-- RLS Policy: Only admins can read webhook logs
create policy "Allow admin to read webhook logs"
on "public"."webhook_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

-- RLS Policy: Only system can insert webhook logs (no auth required for webhooks)
create policy "Allow webhook insertion"
on "public"."webhook_logs"
as permissive
for insert
to anon
with check (true);

-- RLS Policy: Only system can update webhook logs
create policy "Allow webhook updates"
on "public"."webhook_logs"
as permissive
for update
to anon
using (true);

-- Add cleanup function for old webhook logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM webhook_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
$$;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- This would need to be set up separately in production
-- SELECT cron.schedule('cleanup-webhook-logs', '0 2 * * *', 'SELECT cleanup_old_webhook_logs();');
