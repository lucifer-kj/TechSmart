-- Add RLS policies for banned customers
-- These policies will prevent banned customers from accessing their data

-- Policy for customers table - banned customers cannot read their own data
create policy "Prevent banned customers from reading customer data"
on "public"."customers"
as permissive
for select
to authenticated
using (
  -- Allow if user is admin
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
  OR
  -- Allow if user is customer and not banned
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) 
              AND (user_profiles.role = 'customer') 
              AND (user_profiles.is_active = true)
              AND (user_profiles.customer_id = customers.id))))
);

-- Policy for jobs table - banned customers cannot read job data
create policy "Prevent banned customers from reading job data"
on "public"."jobs"
as permissive
for select
to authenticated
using (
  -- Allow if user is admin
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
  OR
  -- Allow if user is customer and not banned
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) 
              AND (user_profiles.role = 'customer') 
              AND (user_profiles.is_active = true)
              AND (user_profiles.customer_id = jobs.customer_id))))
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'job_attachments'
  ) THEN
    EXECUTE $stmt$
      create policy "Prevent banned customers from reading job attachments"
      on public.job_attachments
      as permissive
      for select
      to authenticated
      using (
        (EXISTS ( SELECT 1 FROM public.user_profiles WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
        OR
        (EXISTS ( SELECT 1 FROM public.user_profiles up JOIN public.jobs j ON j.id = job_attachments.job_id
                  WHERE ((up.id = auth.uid()) AND (up.role = 'customer') AND (up.is_active = true) AND (up.customer_id = j.customer_id))))
      )
    $stmt$;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'job_materials'
  ) THEN
    EXECUTE $stmt$
      create policy "Prevent banned customers from reading job materials"
      on public.job_materials
      as permissive
      for select
      to authenticated
      using (
        (EXISTS ( SELECT 1 FROM public.user_profiles WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
        OR
        (EXISTS ( SELECT 1 FROM public.user_profiles up JOIN public.jobs j ON j.id = job_materials.job_id
                  WHERE ((up.id = auth.uid()) AND (up.role = 'customer') AND (up.is_active = true) AND (up.customer_id = j.customer_id))))
      )
    $stmt$;
  END IF;
END$$;

-- Policy for customer_feedback table - banned customers cannot submit feedback
create policy "Prevent banned customers from submitting feedback"
on "public"."customer_feedback"
as permissive
for insert
to authenticated
with check (
  -- Allow if user is admin
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
  OR
  -- Allow if user is customer and not banned
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) 
              AND (user_profiles.role = 'customer') 
              AND (user_profiles.is_active = true)
              AND (user_profiles.customer_id = customer_feedback.customer_id))))
);

-- Policy for customer_feedback table - banned customers cannot read feedback
create policy "Prevent banned customers from reading feedback"
on "public"."customer_feedback"
as permissive
for select
to authenticated
using (
  -- Allow if user is admin
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
  OR
  -- Allow if user is customer and not banned
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) 
              AND (user_profiles.role = 'customer') 
              AND (user_profiles.is_active = true)
              AND (user_profiles.customer_id = customer_feedback.customer_id))))
);

-- Policy for document_acknowledgments table - banned customers cannot acknowledge documents
create policy "Prevent banned customers from acknowledging documents"
on "public"."document_acknowledgments"
as permissive
for insert
to authenticated
with check (
  -- Allow if user is admin
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
  OR
  -- Allow if user is customer and not banned
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) 
              AND (user_profiles.role = 'customer') 
              AND (user_profiles.is_active = true)
              AND (user_profiles.customer_id = document_acknowledgments.customer_id))))
);

-- Policy for document_acknowledgments table - banned customers cannot read acknowledgments
create policy "Prevent banned customers from reading document acknowledgments"
on "public"."document_acknowledgments"
as permissive
for select
to authenticated
using (
  -- Allow if user is admin
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
  OR
  -- Allow if user is customer and not banned
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) 
              AND (user_profiles.role = 'customer') 
              AND (user_profiles.is_active = true)
              AND (user_profiles.customer_id = document_acknowledgments.customer_id))))
);

-- Policy for payments table - banned customers cannot read payments
create policy "Prevent banned customers from reading payments"
on "public"."payments"
as permissive
for select
to authenticated
using (
  -- Allow if user is admin
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'))))
  OR
  -- Allow if user is customer and not banned
  (EXISTS ( SELECT 1
        FROM public.user_profiles
       WHERE ((user_profiles.id = auth.uid()) 
              AND (user_profiles.role = 'customer') 
              AND (user_profiles.is_active = true)
              AND (user_profiles.customer_id = payments.customer_id))))
);

-- Create a function to check if a customer is banned
CREATE OR REPLACE FUNCTION is_customer_banned(customer_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE customer_id = customer_uuid 
      AND role = 'customer' 
      AND is_active = false
  );
$$;

-- Create a function to get customer ban status with reason
CREATE OR REPLACE FUNCTION get_customer_ban_status(customer_uuid uuid)
RETURNS TABLE (
  is_banned boolean,
  ban_reason text,
  banned_at timestamp with time zone,
  banned_by uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    NOT up.is_active as is_banned,
    cbh.ban_reason,
    cbh.banned_at,
    cbh.banned_by
  FROM user_profiles up
  LEFT JOIN customer_ban_history cbh ON cbh.customer_id = customer_uuid
  WHERE up.customer_id = customer_uuid 
    AND up.role = 'customer'
  ORDER BY cbh.banned_at DESC
  LIMIT 1;
$$;
