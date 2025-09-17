-- Create audit_logs table for tracking user actions
create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "action_type" text not null,
    "resource_type" text not null,
    "resource_id" uuid,
    "action_details" text not null,
    "ip_address" text,
    "user_agent" text,
    "timestamp" timestamp with time zone not null,
    "success" boolean not null default true,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
);

-- Enable RLS
alter table "public"."audit_logs" enable row level security;

-- Create primary key
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);
alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

-- Create indexes for efficient querying
CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);
CREATE INDEX audit_logs_action_type_idx ON public.audit_logs USING btree (action_type);
CREATE INDEX audit_logs_resource_type_idx ON public.audit_logs USING btree (resource_type);
CREATE INDEX audit_logs_resource_id_idx ON public.audit_logs USING btree (resource_id);
CREATE INDEX audit_logs_timestamp_idx ON public.audit_logs USING btree (timestamp);
CREATE INDEX audit_logs_success_idx ON public.audit_logs USING btree (success);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);

-- Create composite indexes for common queries
CREATE INDEX audit_logs_user_action_idx ON public.audit_logs USING btree (user_id, action_type);
CREATE INDEX audit_logs_resource_action_idx ON public.audit_logs USING btree (resource_type, action_type);
CREATE INDEX audit_logs_timestamp_success_idx ON public.audit_logs USING btree (timestamp, success);

-- Add foreign key constraint
alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

-- RLS Policy: Only admins can read audit logs
create policy "Allow admin to read audit logs"
on "public"."audit_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

-- RLS Policy: Allow system to insert audit logs
create policy "Allow system to insert audit logs"
on "public"."audit_logs"
as permissive
for insert
to anon
with check (true);

-- Create a function to get audit log statistics
CREATE OR REPLACE FUNCTION get_audit_log_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  total_actions bigint,
  successful_actions bigint,
  failed_actions bigint,
  unique_users bigint,
  top_actions json,
  top_users json
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_logs AS (
    SELECT *
    FROM audit_logs
    WHERE (start_date IS NULL OR timestamp >= start_date)
      AND (end_date IS NULL OR timestamp <= end_date)
  ),
  action_counts AS (
    SELECT 
      action_type,
      COUNT(*) as count
    FROM filtered_logs
    GROUP BY action_type
    ORDER BY count DESC
    LIMIT 10
  ),
  user_counts AS (
    SELECT 
      user_id,
      COUNT(*) as count
    FROM filtered_logs
    GROUP BY user_id
    ORDER BY count DESC
    LIMIT 10
  )
  SELECT 
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE success = true) as successful_actions,
    COUNT(*) FILTER (WHERE success = false) as failed_actions,
    COUNT(DISTINCT user_id) as unique_users,
    json_agg(json_build_object('action_type', action_type, 'count', count)) as top_actions,
    json_agg(json_build_object('user_id', user_id, 'count', count)) as top_users
  FROM filtered_logs
  CROSS JOIN action_counts
  CROSS JOIN user_counts;
$$;

-- Create a function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(user_uuid uuid)
RETURNS TABLE (
  total_actions bigint,
  successful_actions bigint,
  failed_actions bigint,
  first_action timestamp with time zone,
  last_action timestamp with time zone,
  most_common_action text,
  action_types json
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_logs AS (
    SELECT *
    FROM audit_logs
    WHERE user_id = user_uuid
  ),
  action_type_counts AS (
    SELECT 
      action_type,
      COUNT(*) as count
    FROM user_logs
    GROUP BY action_type
    ORDER BY count DESC
  )
  SELECT 
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE success = true) as successful_actions,
    COUNT(*) FILTER (WHERE success = false) as failed_actions,
    MIN(timestamp) as first_action,
    MAX(timestamp) as last_action,
    (SELECT action_type FROM action_type_counts LIMIT 1) as most_common_action,
    json_agg(json_build_object('action_type', action_type, 'count', count)) as action_types
  FROM user_logs
  CROSS JOIN action_type_counts;
$$;

-- Create a function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create a function to get audit log summary by date range
CREATE OR REPLACE FUNCTION get_audit_log_summary_by_date(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  group_by text DEFAULT 'day'
)
RETURNS TABLE (
  period text,
  total_actions bigint,
  successful_actions bigint,
  failed_actions bigint,
  unique_users bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN group_by = 'hour' THEN to_char(timestamp, 'YYYY-MM-DD HH24:00')
      WHEN group_by = 'day' THEN to_char(timestamp, 'YYYY-MM-DD')
      WHEN group_by = 'week' THEN to_char(timestamp, 'YYYY-"W"WW')
      WHEN group_by = 'month' THEN to_char(timestamp, 'YYYY-MM')
      ELSE to_char(timestamp, 'YYYY-MM-DD')
    END as period,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE success = true) as successful_actions,
    COUNT(*) FILTER (WHERE success = false) as failed_actions,
    COUNT(DISTINCT user_id) as unique_users
  FROM audit_logs
  WHERE timestamp >= start_date AND timestamp <= end_date
  GROUP BY period
  ORDER BY period;
$$;

-- Create a view for recent audit activity
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT 
  al.id,
  al.user_id,
  al.action_type,
  al.resource_type,
  al.resource_id,
  al.timestamp,
  al.success,
  al.error_message,
  up.email as user_email,
  up.role as user_role
FROM audit_logs al
LEFT JOIN user_profiles up ON up.id = al.user_id
WHERE al.timestamp > NOW() - INTERVAL '7 days'
ORDER BY al.timestamp DESC;

-- Grant access to the view
GRANT SELECT ON recent_audit_activity TO authenticated;
