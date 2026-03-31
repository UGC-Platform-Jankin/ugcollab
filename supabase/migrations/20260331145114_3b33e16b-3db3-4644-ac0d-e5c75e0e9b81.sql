
DROP POLICY IF EXISTS "Users can manage own collaborations" ON public.past_collaborations;
CREATE POLICY "Users can insert own collaborations"
ON public.past_collaborations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
