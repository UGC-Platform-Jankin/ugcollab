
-- Allow brands to view any creator profile (needed for viewing applicants)
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Allow brands to view social connections of any user (for viewing applicant stats)
CREATE POLICY "Anyone authenticated can view social connections"
  ON public.social_connections FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view their own connections" ON public.social_connections;
