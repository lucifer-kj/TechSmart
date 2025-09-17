-- Create api_logs table for tracking API calls
create table "public"."api_logs" (
    "id" uuid not null default gen_random_uuid(),
    "api_name" text not null,
    "endpoint" text not null,
    "method" text not null,
    "request_payload" text,
    "response_payload" text,
    "status_code" integer not null,
    "response_time_ms" integer not null,
    "user_id" uuid,
    "ip_address" text,
    "user_agent" text,
    "error_message" text,
    "timestamp" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
);

-- Enable RLS
alter table "public"."api_logs" enable row level security;

-- Create primary key
CREATE UNIQUE INDEX api_logs_pkey ON public.api_logs USING btree (id);
alter table "public"."api_logs" add constraint "api_logs_pkey" PRIMARY KEY using index "api_logs_pkey";

-- Create indexes for efficient querying
CREATE INDEX api_logs_api_name_idx ON public.api_logs USING btree (api_name);
CREATE INDEX api_logs_endpoint_idx ON public.api_logs USING btree (endpoint);
CREATE INDEX api_logs_method_idx ON public.api_logs USING btree (method);
CREATE INDEX api_logs_status_code_idx ON public.api_logs USING btree (status_code);
CREATE INDEX api_logs_response_time_ms_idx ON public.api_logs USING btree (response_time_ms);
CREATE INDEX api_logs_user_id_idx ON public.api_logs USING btree (user_id);
CREATE INDEX api_logs_timestamp_idx ON public.api_logs USING btree (timestamp);
CREATE INDEX api_logs_created_at_idx ON public.api_logs USING btree (created_at);

-- Create composite indexes for common queries
CREATE INDEX api_logs_api_endpoint_idx ON public.api_logs USING btree (api_name, endpoint);
CREATE INDEX api_logs_api_status_idx ON public.api_logs USING btree (api_name, status_code);
CREATE INDEX api_logs_timestamp_status_idx ON public.api_logs USING btree (timestamp, status_code);
CREATE INDEX api_logs_user_timestamp_idx ON public.api_logs USING btree (user_id, timestamp);

-- Add foreign key constraint
alter table "public"."api_logs" add constraint "api_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."api_logs" validate constraint "api_logs_user_id_fkey";

-- RLS Policy: Only admins can read API logs
create policy "Allow admin to read api logs"
on "public"."api_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

-- RLS Policy: Allow system to insert API logs
create policy "Allow system to insert api logs"
on "public"."api_logs"
as permissive
for insert
to anon
with check (true);

-- Create a function to get API performance statistics
CREATE OR REPLACE FUNCTION get_api_performance_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  total_calls bigint,
  successful_calls bigint,
  failed_calls bigint,
  avg_response_time numeric,
  p95_response_time numeric,
  p99_response_time numeric,
  slow_calls bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_logs AS (
    SELECT *
    FROM api_logs
    WHERE (start_date IS NULL OR timestamp >= start_date)
      AND (end_date IS NULL OR timestamp <= end_date)
  ),
  response_times AS (
    SELECT response_time_ms
    FROM filtered_logs
    ORDER BY response_time_ms
  ),
  percentiles AS (
    SELECT 
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99
    FROM response_times
  )
  SELECT 
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful_calls,
    COUNT(*) FILTER (WHERE status_code < 200 OR status_code >= 300) as failed_calls,
    AVG(response_time_ms) as avg_response_time,
    (SELECT p95 FROM percentiles) as p95_response_time,
    (SELECT p99 FROM percentiles) as p99_response_time,
    COUNT(*) FILTER (WHERE response_time_ms > 5000) as slow_calls
  FROM filtered_logs;
$$;

-- Create a function to get API error summary
CREATE OR REPLACE FUNCTION get_api_error_summary(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  error_message text,
  count bigint,
  first_occurrence timestamp with time zone,
  last_occurrence timestamp with time zone,
  affected_endpoints text[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_logs AS (
    SELECT *
    FROM api_logs
    WHERE (start_date IS NULL OR timestamp >= start_date)
      AND (end_date IS NULL OR timestamp <= end_date)
      AND error_message IS NOT NULL
  )
  SELECT 
    error_message,
    COUNT(*) as count,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence,
    ARRAY_AGG(DISTINCT endpoint) as affected_endpoints
  FROM filtered_logs
  GROUP BY error_message
  ORDER BY count DESC;
$$;

-- Create a function to get API usage by user
CREATE OR REPLACE FUNCTION get_api_usage_by_user(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  total_calls bigint,
  successful_calls bigint,
  failed_calls bigint,
  avg_response_time numeric,
  most_used_api text,
  most_used_endpoint text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_logs AS (
    SELECT *
    FROM api_logs
    WHERE (start_date IS NULL OR timestamp >= start_date)
      AND (end_date IS NULL OR timestamp <= end_date)
      AND user_id IS NOT NULL
  ),
  user_stats AS (
    SELECT 
      user_id,
      COUNT(*) as total_calls,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful_calls,
      COUNT(*) FILTER (WHERE status_code < 200 OR status_code >= 300) as failed_calls,
      AVG(response_time_ms) as avg_response_time
    FROM filtered_logs
    GROUP BY user_id
  ),
  user_api_counts AS (
    SELECT 
      user_id,
      api_name,
      COUNT(*) as api_count
    FROM filtered_logs
    GROUP BY user_id, api_name
  ),
  user_endpoint_counts AS (
    SELECT 
      user_id,
      endpoint,
      COUNT(*) as endpoint_count
    FROM filtered_logs
    GROUP BY user_id, endpoint
  )
  SELECT 
    us.user_id,
    us.total_calls,
    us.successful_calls,
    us.failed_calls,
    us.avg_response_time,
    (SELECT api_name FROM user_api_counts uac WHERE uac.user_id = us.user_id ORDER BY api_count DESC LIMIT 1) as most_used_api,
    (SELECT endpoint FROM user_endpoint_counts uec WHERE uec.user_id = us.user_id ORDER BY endpoint_count DESC LIMIT 1) as most_used_endpoint
  FROM user_stats us
  ORDER BY us.total_calls DESC;
$$;

-- Create a function to cleanup old API logs
CREATE OR REPLACE FUNCTION cleanup_old_api_logs(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM api_logs 
  WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create a view for recent API activity
CREATE OR REPLACE VIEW recent_api_activity AS
SELECT 
  al.id,
  al.api_name,
  al.endpoint,
  al.method,
  al.status_code,
  al.response_time_ms,
  al.timestamp,
  al.error_message,
  al.user_id,
  up.email as user_email,
  up.role as user_role
FROM api_logs al
LEFT JOIN user_profiles up ON up.id = al.user_id
WHERE al.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY al.timestamp DESC;

-- Grant access to the view
GRANT SELECT ON recent_api_activity TO authenticated;

-- Create a view for slow API calls
CREATE OR REPLACE VIEW slow_api_calls AS
SELECT 
  al.id,
  al.api_name,
  al.endpoint,
  al.method,
  al.status_code,
  al.response_time_ms,
  al.timestamp,
  al.error_message,
  al.user_id,
  up.email as user_email,
  up.role as user_role
FROM api_logs al
LEFT JOIN user_profiles up ON up.id = al.user_id
WHERE al.response_time_ms > 5000
ORDER BY al.response_time_ms DESC;

-- Grant access to the view
GRANT SELECT ON slow_api_calls TO authenticated;
