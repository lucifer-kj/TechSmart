-- Create admin_override_logs table for tracking admin override actions
create table if not exists "public"."admin_override_logs" (
    "id" uuid not null default gen_random_uuid(),
    "action_type" text not null check (action_type in ('bypass_rls', 'force_access', 'emergency_unban', 'data_export', 'bulk_operation')),
    "target_type" text not null check (target_type in ('customer', 'job', 'document', 'payment', 'all')),
    "target_id" uuid,
    "reason" text not null,
    "performed_by" uuid not null,
    "performed_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
);

-- Ensure columns exist for idempotency
alter table "public"."admin_override_logs" add column if not exists "expires_at" timestamp with time zone;
alter table "public"."admin_override_logs" add column if not exists "metadata" text;

-- Enable RLS
alter table "public"."admin_override_logs" enable row level security;

-- Create primary key
CREATE UNIQUE INDEX IF NOT EXISTS admin_override_logs_pkey ON public.admin_override_logs USING btree (id);
alter table "public"."admin_override_logs" add constraint "admin_override_logs_pkey" PRIMARY KEY using index "admin_override_logs_pkey";

-- Create indexes
CREATE INDEX IF NOT EXISTS admin_override_logs_action_type_idx ON public.admin_override_logs USING btree (action_type);
CREATE INDEX IF NOT EXISTS admin_override_logs_target_type_idx ON public.admin_override_logs USING btree (target_type);
CREATE INDEX IF NOT EXISTS admin_override_logs_target_id_idx ON public.admin_override_logs USING btree (target_id);
CREATE INDEX IF NOT EXISTS admin_override_logs_performed_by_idx ON public.admin_override_logs USING btree (performed_by);
CREATE INDEX IF NOT EXISTS admin_override_logs_performed_at_idx ON public.admin_override_logs USING btree (performed_at);
CREATE INDEX IF NOT EXISTS admin_override_logs_expires_at_idx ON public.admin_override_logs USING btree (expires_at);

-- Add foreign key constraints
alter table "public"."admin_override_logs" add constraint "admin_override_logs_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."admin_override_logs" validate constraint "admin_override_logs_performed_by_fkey";

-- RLS Policy: Only admins can read admin override logs
create policy "Allow admin to read admin override logs"
on "public"."admin_override_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

-- RLS Policy: Only admins can insert admin override logs
create policy "Allow admin to insert admin override logs"
on "public"."admin_override_logs"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

-- Add admin_override_enabled column to user_profiles table
alter table "public"."user_profiles" add column "admin_override_enabled" boolean not null default false;

-- Create index for admin_override_enabled
CREATE INDEX user_profiles_admin_override_enabled_idx ON public.user_profiles USING btree (admin_override_enabled);

-- Create a function to enable admin override for a user
CREATE OR REPLACE FUNCTION enable_admin_override(user_uuid uuid, enabled_by uuid, reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the enabler is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = enabled_by AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can enable admin override';
  END IF;

  -- Enable admin override
  UPDATE user_profiles 
  SET admin_override_enabled = true,
      updated_at = NOW()
  WHERE id = user_uuid AND role = 'admin';

  -- Log the action
  INSERT INTO admin_override_logs (
    action_type,
    target_type,
    target_id,
    reason,
    performed_by,
    performed_at
  ) VALUES (
    'bypass_rls',
    'all',
    user_uuid,
    reason,
    enabled_by,
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Create a function to disable admin override for a user
CREATE OR REPLACE FUNCTION disable_admin_override(user_uuid uuid, disabled_by uuid, reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the disabler is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = disabled_by AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can disable admin override';
  END IF;

  -- Disable admin override
  UPDATE user_profiles 
  SET admin_override_enabled = false,
      updated_at = NOW()
  WHERE id = user_uuid AND role = 'admin';

  -- Log the action
  INSERT INTO admin_override_logs (
    action_type,
    target_type,
    target_id,
    reason,
    performed_by,
    performed_at
  ) VALUES (
    'bypass_rls',
    'all',
    user_uuid,
    reason,
    disabled_by,
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Create a function to get admin override statistics
CREATE OR REPLACE FUNCTION get_admin_override_stats()
RETURNS TABLE (
  total_overrides bigint,
  active_overrides bigint,
  expired_overrides bigint,
  recent_overrides bigint,
  top_action_types json
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) as total_overrides,
    COUNT(*) FILTER (WHERE a.expires_at IS NULL OR a.expires_at > NOW()) as active_overrides,
    COUNT(*) FILTER (WHERE a.expires_at IS NOT NULL AND a.expires_at <= NOW()) as expired_overrides,
    COUNT(*) FILTER (WHERE a.performed_at > NOW() - INTERVAL '7 days') as recent_overrides,
    (
      SELECT json_agg(json_build_object('action_type', action_type, 'count', cnt))
      FROM (
        SELECT action_type, COUNT(*) as cnt
        FROM admin_override_logs
        WHERE performed_at > NOW() - INTERVAL '30 days'
        GROUP BY action_type
        ORDER BY cnt DESC
        LIMIT 5
      ) s
    ) as top_action_types
  FROM admin_override_logs a;
$$;

-- Create a function to cleanup expired override logs
CREATE OR REPLACE FUNCTION cleanup_expired_admin_overrides()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM admin_override_logs 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() - INTERVAL '30 days';
$$;
