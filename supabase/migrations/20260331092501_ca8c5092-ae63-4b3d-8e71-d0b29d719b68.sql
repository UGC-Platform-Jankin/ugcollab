
-- 1. Create all tables first (no cross-references in policies yet)
CREATE TABLE public.campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL,
  cover_letter text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, creator_user_id)
);
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'private',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chat_room_id, user_id)
);
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Now add all RLS policies
CREATE POLICY "ca_creator_insert" ON public.campaign_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "ca_creator_select" ON public.campaign_applications FOR SELECT TO authenticated USING (auth.uid() = creator_user_id);
CREATE POLICY "ca_brand_select" ON public.campaign_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_applications.campaign_id AND c.brand_user_id = auth.uid()));
CREATE POLICY "ca_brand_update" ON public.campaign_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_applications.campaign_id AND c.brand_user_id = auth.uid()));

CREATE POLICY "cr_select" ON public.chat_rooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.chat_room_id = chat_rooms.id AND cp.user_id = auth.uid()));
CREATE POLICY "cr_insert" ON public.chat_rooms FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cp_select" ON public.chat_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_participants cp2 WHERE cp2.chat_room_id = chat_participants.chat_room_id AND cp2.user_id = auth.uid()));
CREATE POLICY "cp_insert" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.chat_room_id = messages.chat_room_id AND cp.user_id = auth.uid()));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.chat_room_id = messages.chat_room_id AND cp.user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
