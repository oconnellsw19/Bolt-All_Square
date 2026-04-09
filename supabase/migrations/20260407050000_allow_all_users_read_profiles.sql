-- Allow all authenticated users to read profiles
-- This enables course managers to see sponsor names on sponsorship requests
-- and sponsors to see course manager names

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
