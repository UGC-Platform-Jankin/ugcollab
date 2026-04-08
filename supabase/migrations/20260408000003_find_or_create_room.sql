-- find_or_create_private_room: single RPC handles everything
-- Bypasses RLS — finds or creates room, looks up name, adds participants
CREATE OR REPLACE FUNCTION public.find_or_create_private_room(_campaign_id uuid, _user_id uuid, _other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room_id uuid;
  _display_name text;
  _business_name text;
  _pIds uuid[];
BEGIN
  FOR _room_id IN
    SELECT cr.id FROM public.chat_rooms cr
    WHERE cr.campaign_id = _campaign_id AND cr.type = 'private'
  LOOP
    SELECT ARRAY_AGG(cp.user_id) INTO _pIds
    FROM public.chat_participants cp
    WHERE cp.chat_room_id = _room_id;
    IF _pIds @> ARRAY[_user_id, _other_user_id] AND _pIds <@ ARRAY[_user_id, _other_user_id] THEN
      RETURN _room_id;
    END IF;
  END LOOP;

  SELECT display_name INTO _display_name FROM public.profiles WHERE user_id = _other_user_id LIMIT 1;
  IF _display_name IS NULL THEN
    SELECT business_name INTO _business_name FROM public.brand_profiles WHERE user_id = _other_user_id LIMIT 1;
    _display_name := _business_name;
  END IF;
  IF _display_name IS NULL THEN
    _display_name := 'Chat';
  END IF;

  INSERT INTO public.chat_rooms (campaign_id, type, name)
  VALUES (_campaign_id, 'private', _display_name)
  RETURNING id INTO _room_id;

  INSERT INTO public.chat_participants (chat_room_id, user_id) VALUES (_room_id, _user_id);
  INSERT INTO public.chat_participants (chat_room_id, user_id) VALUES (_room_id, _other_user_id);

  RETURN _room_id;
END;
$$;
