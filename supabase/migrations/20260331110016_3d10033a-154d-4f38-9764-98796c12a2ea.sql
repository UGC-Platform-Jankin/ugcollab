DROP POLICY IF EXISTS cp_select ON public.chat_participants;

CREATE POLICY cp_select
ON public.chat_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());