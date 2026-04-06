
DROP POLICY "Users can view their own brand profile" ON public.brand_profiles;
CREATE POLICY "Anyone authenticated can view brand profiles"
  ON public.brand_profiles FOR SELECT
  TO authenticated
  USING (true);
