CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE chat_room_id = _chat_room_id
      AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS cp_select ON public.chat_participants;

CREATE POLICY cp_select
ON public.chat_participants
FOR SELECT
TO authenticated
USING (public.is_chat_participant(chat_room_id));