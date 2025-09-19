-- Comprehensive RLS Policies for ServiceM8 Customer Portal
-- This migration implements complete Row Level Security policies

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
DROP POLICY IF EXISTS "customers_update_policy" ON customers;
DROP POLICY IF EXISTS "jobs_select_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_update_policy" ON jobs;
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "job_materials_select_policy" ON job_materials;
DROP POLICY IF EXISTS "job_materials_update_policy" ON job_materials;
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "customer_feedback_select_policy" ON customer_feedback;
DROP POLICY IF EXISTS "customer_feedback_insert_policy" ON customer_feedback;
DROP POLICY IF EXISTS "document_acknowledgments_select_policy" ON document_acknowledgments;
DROP POLICY IF EXISTS "document_acknowledgments_insert_policy" ON document_acknowledgments;
DROP POLICY IF EXISTS "document_downloads_select_policy" ON document_downloads;
DROP POLICY IF EXISTS "document_downloads_insert_policy" ON document_downloads;
DROP POLICY IF EXISTS "payment_status_updates_select_policy" ON payment_status_updates;
DROP POLICY IF EXISTS "payment_status_updates_insert_policy" ON payment_status_updates;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "customer_invitations_select_policy" ON customer_invitations;
DROP POLICY IF EXISTS "customer_invitations_insert_policy" ON customer_invitations;
DROP POLICY IF EXISTS "customer_invitations_update_policy" ON customer_invitations;

-- Helper function to get current user's customer_id
CREATE OR REPLACE FUNCTION get_current_user_customer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT customer_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is active
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_active = true 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CUSTOMERS POLICIES
-- Admins can see all customers, customers can only see their own
CREATE POLICY "customers_select_policy" ON customers
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND id = get_current_user_customer_id())
  );

-- Only admins can update customer records
CREATE POLICY "customers_update_policy" ON customers
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- JOBS POLICIES
-- Admins can see all jobs, customers can only see their own jobs
CREATE POLICY "jobs_select_policy" ON jobs
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Only admins can update job records
CREATE POLICY "jobs_update_policy" ON jobs
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DOCUMENTS POLICIES
-- Admins can see all documents, customers can only see their own documents
CREATE POLICY "documents_select_policy" ON documents
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Only admins can update document records
CREATE POLICY "documents_update_policy" ON documents
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- JOB MATERIALS POLICIES
-- Admins can see all materials, customers can only see materials for their jobs
CREATE POLICY "job_materials_select_policy" ON job_materials
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Only admins can update material records
CREATE POLICY "job_materials_update_policy" ON job_materials
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());


-- PAYMENTS POLICIES
-- Admins can see all payments, customers can only see their own payments
CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Only admins can update payment records
CREATE POLICY "payments_update_policy" ON payments
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- CUSTOMER FEEDBACK POLICIES
-- Admins can see all feedback, customers can only see their own feedback
CREATE POLICY "customer_feedback_select_policy" ON customer_feedback
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Customers can insert their own feedback
CREATE POLICY "customer_feedback_insert_policy" ON customer_feedback
  FOR INSERT
  WITH CHECK (
    is_user_active() AND 
    customer_id = get_current_user_customer_id()
  );

-- DOCUMENT ACKNOWLEDGMENTS POLICIES
-- Admins can see all acknowledgments, customers can only see their own
CREATE POLICY "document_acknowledgments_select_policy" ON document_acknowledgments
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Customers can insert their own acknowledgments
CREATE POLICY "document_acknowledgments_insert_policy" ON document_acknowledgments
  FOR INSERT
  WITH CHECK (
    is_user_active() AND 
    customer_id = get_current_user_customer_id()
  );

-- DOCUMENT DOWNLOADS POLICIES
-- Admins can see all downloads, customers can only see their own downloads
CREATE POLICY "document_downloads_select_policy" ON document_downloads
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Customers can insert their own download records
CREATE POLICY "document_downloads_insert_policy" ON document_downloads
  FOR INSERT
  WITH CHECK (
    is_user_active() AND 
    customer_id = get_current_user_customer_id()
  );

-- PAYMENT STATUS UPDATES POLICIES
-- Admins can see all status updates, customers can only see their own
CREATE POLICY "payment_status_updates_select_policy" ON payment_status_updates
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND customer_id = get_current_user_customer_id())
  );

-- Only admins can insert payment status updates
CREATE POLICY "payment_status_updates_insert_policy" ON payment_status_updates
  FOR INSERT
  WITH CHECK (is_admin());

-- USER PROFILES POLICIES
-- Users can see their own profile, admins can see all profiles
CREATE POLICY "user_profiles_select_policy" ON user_profiles
  FOR SELECT
  USING (
    is_admin() OR 
    id = auth.uid()
  );

-- Users can update their own profile, admins can update all profiles
CREATE POLICY "user_profiles_update_policy" ON user_profiles
  FOR UPDATE
  USING (
    is_admin() OR 
    id = auth.uid()
  )
  WITH CHECK (
    is_admin() OR 
    id = auth.uid()
  );

-- CUSTOMER INVITATIONS POLICIES
-- Admins can see all invitations, customers can see invitations for their email
CREATE POLICY "customer_invitations_select_policy" ON customer_invitations
  FOR SELECT
  USING (
    is_admin() OR 
    (is_user_active() AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Only admins can insert invitations
CREATE POLICY "customer_invitations_insert_policy" ON customer_invitations
  FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update invitations
CREATE POLICY "customer_invitations_update_policy" ON customer_invitations
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create indexes for better performance with RLS policies
CREATE INDEX IF NOT EXISTS idx_user_profiles_customer_id ON user_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_customer_id ON job_materials(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_id ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_document_acknowledgments_customer_id ON document_acknowledgments(customer_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_customer_id ON document_downloads(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_updates_customer_id ON payment_status_updates(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_invitations_email ON customer_invitations(email);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_current_user_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_active() TO authenticated;
