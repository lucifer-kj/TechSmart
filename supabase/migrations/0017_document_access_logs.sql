-- Create document_access_logs table for monitoring document access
create table "public"."document_access_logs" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "user_id" uuid not null,
    "access_type" text not null check (access_type in ('view', 'download', 'acknowledge', 'print')),
    "ip_address" text,
    "user_agent" text,
    "access_duration_ms" integer,
    "file_size_bytes" bigint,
    "success" boolean not null default true,
    "error_message" text,
    "timestamp" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
);

-- Enable RLS
alter table "public"."document_access_logs" enable row level security;

-- Create primary key
CREATE UNIQUE INDEX document_access_logs_pkey ON public.document_access_logs USING btree (id);
alter table "public"."document_access_logs" add constraint "document_access_logs_pkey" PRIMARY KEY using index "document_access_logs_pkey";

-- Create indexes for efficient querying
CREATE INDEX document_access_logs_document_id_idx ON public.document_access_logs USING btree (document_id);
CREATE INDEX document_access_logs_user_id_idx ON public.document_access_logs USING btree (user_id);
CREATE INDEX document_access_logs_access_type_idx ON public.document_access_logs USING btree (access_type);
CREATE INDEX document_access_logs_success_idx ON public.document_access_logs USING btree (success);
CREATE INDEX document_access_logs_timestamp_idx ON public.document_access_logs USING btree (timestamp);
CREATE INDEX document_access_logs_created_at_idx ON public.document_access_logs USING btree (created_at);

-- Create composite indexes for common queries
CREATE INDEX document_access_logs_document_user_idx ON public.document_access_logs USING btree (document_id, user_id);
CREATE INDEX document_access_logs_user_timestamp_idx ON public.document_access_logs USING btree (user_id, timestamp);
CREATE INDEX document_access_logs_document_timestamp_idx ON public.document_access_logs USING btree (document_id, timestamp);
CREATE INDEX document_access_logs_access_type_timestamp_idx ON public.document_access_logs USING btree (access_type, timestamp);

-- Add foreign key constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'job_attachments'
  ) THEN
    EXECUTE 'alter table public.document_access_logs add constraint document_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.job_attachments(id) ON DELETE CASCADE not valid';
    EXECUTE 'alter table public.document_access_logs validate constraint document_access_logs_document_id_fkey';
  END IF;
END$$;

alter table "public"."document_access_logs" add constraint "document_access_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."document_access_logs" validate constraint "document_access_logs_user_id_fkey";

-- RLS Policy: Only admins can read document access logs
create policy "Allow admin to read document access logs"
on "public"."document_access_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin')))));

-- RLS Policy: Allow system to insert document access logs
create policy "Allow system to insert document access logs"
on "public"."document_access_logs"
as permissive
for insert
to anon
with check (true);

-- Create a function to get document access statistics
CREATE OR REPLACE FUNCTION get_document_access_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  total_accesses bigint,
  successful_accesses bigint,
  failed_accesses bigint,
  unique_documents bigint,
  unique_users bigint,
  total_download_size bigint,
  avg_access_duration numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_logs AS (
    SELECT *
    FROM document_access_logs
    WHERE (start_date IS NULL OR timestamp >= start_date)
      AND (end_date IS NULL OR timestamp <= end_date)
  )
  SELECT 
    COUNT(*) as total_accesses,
    COUNT(*) FILTER (WHERE success = true) as successful_accesses,
    COUNT(*) FILTER (WHERE success = false) as failed_accesses,
    COUNT(DISTINCT document_id) as unique_documents,
    COUNT(DISTINCT user_id) as unique_users,
    COALESCE(SUM(file_size_bytes) FILTER (WHERE access_type = 'download' AND file_size_bytes IS NOT NULL), 0) as total_download_size,
    AVG(access_duration_ms) FILTER (WHERE access_duration_ms IS NOT NULL) as avg_access_duration
  FROM filtered_logs;
$$;

-- Create a function to get document popularity
CREATE OR REPLACE FUNCTION get_document_popularity(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  document_id uuid,
  access_count bigint,
  unique_users bigint,
  total_download_size bigint,
  last_accessed timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_logs AS (
    SELECT *
    FROM document_access_logs
    WHERE (start_date IS NULL OR timestamp >= start_date)
      AND (end_date IS NULL OR timestamp <= end_date)
  )
  SELECT 
    document_id,
    COUNT(*) as access_count,
    COUNT(DISTINCT user_id) as unique_users,
    COALESCE(SUM(file_size_bytes) FILTER (WHERE access_type = 'download' AND file_size_bytes IS NOT NULL), 0) as total_download_size,
    MAX(timestamp) as last_accessed
  FROM filtered_logs
  GROUP BY document_id
  ORDER BY access_count DESC
  LIMIT limit_count;
$$;

-- Create a function to get user document activity
CREATE OR REPLACE FUNCTION get_user_document_activity(
  user_uuid uuid,
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  document_id uuid,
  access_count bigint,
  first_access timestamp with time zone,
  last_access timestamp with time zone,
  access_types text[],
  total_download_size bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH filtered_logs AS (
    SELECT *
    FROM document_access_logs
    WHERE user_id = user_uuid
      AND (start_date IS NULL OR timestamp >= start_date)
      AND (end_date IS NULL OR timestamp <= end_date)
  )
  SELECT 
    document_id,
    COUNT(*) as access_count,
    MIN(timestamp) as first_access,
    MAX(timestamp) as last_access,
    ARRAY_AGG(DISTINCT access_type) as access_types,
    COALESCE(SUM(file_size_bytes) FILTER (WHERE access_type = 'download' AND file_size_bytes IS NOT NULL), 0) as total_download_size
  FROM filtered_logs
  GROUP BY document_id
  ORDER BY access_count DESC;
$$;

-- Create a function to detect suspicious document access
CREATE OR REPLACE FUNCTION detect_suspicious_document_access(
  time_window_hours integer DEFAULT 1,
  access_threshold integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  document_id uuid,
  access_count bigint,
  time_window_start timestamp with time zone,
  time_window_end timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH time_windows AS (
    SELECT 
      user_id,
      document_id,
      DATE_TRUNC('hour', timestamp) as window_start,
      DATE_TRUNC('hour', timestamp) + INTERVAL '1 hour' as window_end,
      COUNT(*) as access_count
    FROM document_access_logs
    WHERE timestamp >= NOW() - INTERVAL '1 day'
      AND success = true
    GROUP BY user_id, document_id, DATE_TRUNC('hour', timestamp)
  )
  SELECT 
    user_id,
    document_id,
    access_count,
    window_start as time_window_start,
    window_end as time_window_end
  FROM time_windows
  WHERE access_count >= access_threshold
  ORDER BY access_count DESC;
$$;

-- Create a function to cleanup old document access logs
CREATE OR REPLACE FUNCTION cleanup_old_document_access_logs(retention_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM document_access_logs 
  WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create a view for recent document access activity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'job_attachments'
  ) THEN
    EXECUTE $stmt$
      CREATE OR REPLACE VIEW recent_document_access AS
      SELECT 
        dal.id,
        dal.document_id,
        dal.user_id,
        dal.access_type,
        dal.success,
        dal.timestamp,
        dal.error_message,
        dal.file_size_bytes,
        dal.access_duration_ms,
        up.email as user_email,
        up.role as user_role,
        ja.file_name as document_name
      FROM document_access_logs dal
      LEFT JOIN user_profiles up ON up.id = dal.user_id
      LEFT JOIN public.job_attachments ja ON ja.id = dal.document_id
      WHERE dal.timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY dal.timestamp DESC;
    $stmt$;
  ELSE
    EXECUTE $stmt$
      CREATE OR REPLACE VIEW recent_document_access AS
      SELECT 
        dal.id,
        dal.document_id,
        dal.user_id,
        dal.access_type,
        dal.success,
        dal.timestamp,
        dal.error_message,
        dal.file_size_bytes,
        dal.access_duration_ms,
        up.email as user_email,
        up.role as user_role,
        NULL::text as document_name
      FROM document_access_logs dal
      LEFT JOIN user_profiles up ON up.id = dal.user_id
      WHERE dal.timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY dal.timestamp DESC;
    $stmt$;
  END IF;
END$$;

-- Grant access to the view
GRANT SELECT ON recent_document_access TO authenticated;

-- Create a view for document access summary
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'job_attachments'
  ) THEN
    EXECUTE $stmt$
      CREATE OR REPLACE VIEW document_access_summary AS
      SELECT 
        dal.document_id,
        ja.file_name as document_name,
        COUNT(*) as total_accesses,
        COUNT(DISTINCT dal.user_id) as unique_users,
        COUNT(*) FILTER (WHERE dal.access_type = 'download') as downloads,
        COUNT(*) FILTER (WHERE dal.access_type = 'view') as views,
        COUNT(*) FILTER (WHERE dal.access_type = 'acknowledge') as acknowledgments,
        SUM(dal.file_size_bytes) FILTER (WHERE dal.access_type = 'download') as total_download_size,
        MAX(dal.timestamp) as last_accessed
      FROM document_access_logs dal
      LEFT JOIN public.job_attachments ja ON ja.id = dal.document_id
      WHERE dal.timestamp > NOW() - INTERVAL '30 days'
      GROUP BY dal.document_id, ja.file_name
      ORDER BY total_accesses DESC;
    $stmt$;
  ELSE
    EXECUTE $stmt$
      CREATE OR REPLACE VIEW document_access_summary AS
      SELECT 
        dal.document_id,
        NULL::text as document_name,
        COUNT(*) as total_accesses,
        COUNT(DISTINCT dal.user_id) as unique_users,
        COUNT(*) FILTER (WHERE dal.access_type = 'download') as downloads,
        COUNT(*) FILTER (WHERE dal.access_type = 'view') as views,
        COUNT(*) FILTER (WHERE dal.access_type = 'acknowledge') as acknowledgments,
        SUM(dal.file_size_bytes) FILTER (WHERE dal.access_type = 'download') as total_download_size,
        MAX(dal.timestamp) as last_accessed
      FROM document_access_logs dal
      WHERE dal.timestamp > NOW() - INTERVAL '30 days'
      GROUP BY dal.document_id
      ORDER BY total_accesses DESC;
    $stmt$;
  END IF;
END$$;

-- Grant access to the view
GRANT SELECT ON document_access_summary TO authenticated;
