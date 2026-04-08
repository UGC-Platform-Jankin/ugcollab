-- Create SECURITY DEFINER functions to bypass RLS for chat room creation
-- The cr_insert policy fails for authenticated users because the chat_rooms
-- table has an FK to campaigns, which is filtered by RLS. Using a SECURITY
-- DEFINER function (owned by postgres) bypasses RLS at call time.

CREATE OR REPLACE FUNCTION public.create_chat_room(_campaign_id uuid, _type text, _name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.chat_rooms (campaign_id, type, name)
  VALUES (_campaign_id, _type, _name)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_chat_participant(_room_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_participants (chat_room_id, user_id)
  VALUES (_room_id, _user_id)
  ON CONFLICT (chat_room_id, user_id) DO NOTHING;
END;
$$;
