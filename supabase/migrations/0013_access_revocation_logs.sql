-- Create access_revocation_logs table for tracking access revocation events
create table "public"."access_revocation_logs" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "user_id" uuid not null,
    "ban_reason" text not null,
    "banned_by" uuid not null,
    "sessions_revoked" integer not null default 0,
    "revoked_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
);

-- Create session_revocation_logs table for tracking session revocation events
create table "public"."session_revocation_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "sessions_revoked" integer not null default 0,
    "revoked_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
);

-- Create access_restoration_logs table for tracking access restoration events
create table "public"."access_restoration_logs" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "restored_by" uuid not null,
    "restored_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
);

-- Enable RLS
alter table "public"."access_revocation_logs" enable row level security;
alter table "public"."session_revocation_logs" enable row level security;
alter table "public"."access_restoration_logs" enable row level security;

-- Create primary keys
CREATE UNIQUE INDEX access_revocation_logs_pkey ON public.access_revocation_logs USING btree (id);
alter table "public"."access_revocation_logs" add constraint "access_revocation_logs_pkey" PRIMARY KEY using index "access_revocation_logs_pkey";

CREATE UNIQUE INDEX session_revocation_logs_pkey ON public.session_revocation_logs USING btree (id);
alter table "public"."session_revocation_logs" add constraint "session_revocation_logs_pkey" PRIMARY KEY using index "session_revocation_logs_pkey";

CREATE UNIQUE INDEX access_restoration_logs_pkey ON public.access_restoration_logs USING btree (id);
alter table "public"."access_restoration_logs" add constraint "access_restoration_logs_pkey" PRIMARY KEY using index "access_restoration_logs_pkey";

-- Create indexes for access_revocation_logs
CREATE INDEX access_revocation_logs_customer_id_idx ON public.access_revocation_logs USING btree (customer_id);
CREATE INDEX access_revocation_logs_user_id_idx ON public.access_revocation_logs USING btree (user_id);
CREATE INDEX access_revocation_logs_banned_by_idx ON public.access_revocation_logs USING btree (banned_by);
CREATE INDEX access_revocation_logs_revoked_at_idx ON public.access_revocation_logs USING btree (revoked_at);

-- Create indexes for session_revocation_logs
CREATE INDEX session_revocation_logs_user_id_idx ON public.session_revocation_logs USING btree (user_id);
CREATE INDEX session_revocation_logs_revoked_at_idx ON public.session_revocation_logs USING btree (revoked_at);

-- Create indexes for access_restoration_logs
CREATE INDEX access_restoration_logs_customer_id_idx ON public.access_restoration_logs USING btree (customer_id);
CREATE INDEX access_restoration_logs_restored_by_idx ON public.access_restoration_logs USING btree (restored_by);
CREATE INDEX access_restoration_logs_restored_at_idx ON public.access_restoration_logs USING btree (restored_at);

-- Add foreign key constraints
alter table "public"."access_revocation_logs" add constraint "access_revocation_logs_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;
alter table "public"."access_revocation_logs" validate constraint "access_revocation_logs_customer_id_fkey";

alter table "public"."access_revocation_logs" add constraint "access_revocation_logs_banned_by_fkey" FOREIGN KEY (banned_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."access_revocation_logs" validate constraint "access_revocation_logs_banned_by_fkey";

alter table "public"."access_restoration_logs" add constraint "access_restoration_logs_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;
alter table "public"."access_restoration_logs" validate constraint "access_restoration_logs_customer_id_fkey";

alter table "public"."access_restoration_logs" add constraint "access_restoration_logs_restored_by_fkey" FOREIGN KEY (restored_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."access_restoration_logs" validate constraint "access_restoration_logs_restored_by_fkey";

-- RLS Policies for access_revocation_logs
create policy "Allow admin to read access revocation logs"
on "public"."access_revocation_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

create policy "Allow system to insert access revocation logs"
on "public"."access_revocation_logs"
as permissive
for insert
to anon
with check (true);

-- RLS Policies for session_revocation_logs
create policy "Allow admin to read session revocation logs"
on "public"."session_revocation_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

create policy "Allow system to insert session revocation logs"
on "public"."session_revocation_logs"
as permissive
for insert
to anon
with check (true);

-- RLS Policies for access_restoration_logs
create policy "Allow admin to read access restoration logs"
on "public"."access_restoration_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

create policy "Allow system to insert access restoration logs"
on "public"."access_restoration_logs"
as permissive
for insert
to anon
with check (true);

-- Create a function to get access revocation statistics
CREATE OR REPLACE FUNCTION get_access_revocation_stats()
RETURNS TABLE (
  total_revocations bigint,
  total_sessions_revoked bigint,
  recent_revocations bigint,
  avg_sessions_per_revocation numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) as total_revocations,
    SUM(sessions_revoked) as total_sessions_revoked,
    COUNT(*) FILTER (WHERE revoked_at > NOW() - INTERVAL '7 days') as recent_revocations,
    AVG(sessions_revoked) as avg_sessions_per_revocation
  FROM access_revocation_logs;
$$;

-- Create a function to get customer access history
CREATE OR REPLACE FUNCTION get_customer_access_history(customer_uuid uuid)
RETURNS TABLE (
  event_type text,
  event_date timestamp with time zone,
  reason text,
  performed_by uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    'revocation' as event_type,
    revoked_at as event_date,
    ban_reason as reason,
    banned_by as performed_by
  FROM access_revocation_logs
  WHERE customer_id = customer_uuid
  
  UNION ALL
  
  SELECT 
    'restoration' as event_type,
    restored_at as event_date,
    'Access restored' as reason,
    restored_by as performed_by
  FROM access_restoration_logs
  WHERE customer_id = customer_uuid
  
  ORDER BY event_date DESC;
$$;
