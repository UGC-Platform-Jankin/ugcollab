-- Enable chat_participants and chat_rooms for realtime so new chat rooms appear immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

