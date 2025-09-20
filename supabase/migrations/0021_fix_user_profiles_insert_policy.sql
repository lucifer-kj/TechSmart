-- Fix missing INSERT policy for user_profiles table
-- This policy is needed for admin-created customer portal accounts

-- Only admins can insert new user profiles
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Alternative approach using the helper function (if it exists)
-- DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
-- CREATE POLICY "user_profiles_insert_policy" ON user_profiles
--   FOR INSERT
--   WITH CHECK (public.is_admin());
