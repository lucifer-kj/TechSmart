-- Update schema for ServiceM8 API alignment
-- Add missing ServiceM8 fields and remove RLS policies

-- 1. Remove all Row Level Security policies
-- Drop policies for customers table
DROP POLICY IF EXISTS customers_tenant_isolation_select ON public.customers;
DROP POLICY IF EXISTS customers_tenant_isolation_modify ON public.customers;

-- Drop policies for jobs table
DROP POLICY IF EXISTS jobs_tenant_isolation_select ON public.jobs;
DROP POLICY IF EXISTS jobs_tenant_isolation_modify ON public.jobs;

-- Drop policies for documents table
DROP POLICY IF EXISTS documents_tenant_isolation_select ON public.documents;
DROP POLICY IF EXISTS documents_tenant_isolation_modify ON public.documents;

-- Drop policies for payments table
DROP POLICY IF EXISTS payments_tenant_isolation_select ON public.payments;
DROP POLICY IF EXISTS payments_tenant_isolation_modify ON public.payments;

-- Drop policies for audit_logs table
DROP POLICY IF EXISTS audit_logs_tenant_isolation_select ON public.audit_logs;

-- Drop policies for job_materials table
DROP POLICY IF EXISTS job_materials_tenant_isolation_select ON public.job_materials;
DROP POLICY IF EXISTS job_materials_tenant_isolation_modify ON public.job_materials;

-- Drop policies for job_activities table
DROP POLICY IF EXISTS job_activities_tenant_isolation_select ON public.job_activities;
DROP POLICY IF EXISTS job_activities_tenant_isolation_modify ON public.job_activities;

-- 2. Disable Row Level Security on all tables
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_activities DISABLE ROW LEVEL SECURITY;

-- 3. Add missing ServiceM8 fields to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS active integer DEFAULT 1;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_created_sm8 timestamptz;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_last_modified_sm8 timestamptz;

-- 4. Add missing ServiceM8 fields to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS date_created_sm8 timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS date_last_modified_sm8 timestamptz;

-- 5. Add missing ServiceM8 fields to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS servicem8_attachment_uuid text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS date_created_sm8 timestamptz;

-- Add unique constraint for servicem8_attachment_uuid
CREATE UNIQUE INDEX IF NOT EXISTS documents_servicem8_attachment_uuid_key 
ON public.documents(servicem8_attachment_uuid) 
WHERE servicem8_attachment_uuid IS NOT NULL;

-- 6. Add missing ServiceM8 fields to job_materials table
ALTER TABLE public.job_materials ADD COLUMN IF NOT EXISTS date_created_sm8 timestamptz;

-- 7. Add missing ServiceM8 fields to job_activities table
ALTER TABLE public.job_activities ADD COLUMN IF NOT EXISTS date_created_sm8 timestamptz;

-- 8. Add additional indexes for new ServiceM8 fields
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(active);
CREATE INDEX IF NOT EXISTS idx_customers_date_created_sm8 ON public.customers(date_created_sm8);
CREATE INDEX IF NOT EXISTS idx_jobs_date_created_sm8 ON public.jobs(date_created_sm8);
CREATE INDEX IF NOT EXISTS idx_jobs_date_last_modified_sm8 ON public.jobs(date_last_modified_sm8);
CREATE INDEX IF NOT EXISTS idx_documents_date_created_sm8 ON public.documents(date_created_sm8);
CREATE INDEX IF NOT EXISTS idx_job_materials_date_created_sm8 ON public.job_materials(date_created_sm8);
CREATE INDEX IF NOT EXISTS idx_job_activities_date_created_sm8 ON public.job_activities(date_created_sm8);

-- 9. Add comments for documentation
COMMENT ON COLUMN public.customers.address IS 'ServiceM8 company address field';
COMMENT ON COLUMN public.customers.active IS 'ServiceM8 active status (1=active, 0=inactive)';
COMMENT ON COLUMN public.customers.date_created_sm8 IS 'ServiceM8 creation timestamp';
COMMENT ON COLUMN public.customers.date_last_modified_sm8 IS 'ServiceM8 last modified timestamp';

COMMENT ON COLUMN public.jobs.date_created_sm8 IS 'ServiceM8 job creation timestamp';
COMMENT ON COLUMN public.jobs.date_last_modified_sm8 IS 'ServiceM8 job last modified timestamp';

COMMENT ON COLUMN public.documents.servicem8_attachment_uuid IS 'ServiceM8 attachment UUID for direct API reference';
COMMENT ON COLUMN public.documents.date_created_sm8 IS 'ServiceM8 attachment creation timestamp';

COMMENT ON COLUMN public.job_materials.date_created_sm8 IS 'ServiceM8 material creation timestamp';

COMMENT ON COLUMN public.job_activities.date_created_sm8 IS 'ServiceM8 activity creation timestamp';
