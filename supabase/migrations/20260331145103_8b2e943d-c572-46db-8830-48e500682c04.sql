
-- Read receipts table
CREATE TABLE public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reads in their chats"
ON public.message_reads FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_participants cp ON cp.chat_room_id = m.chat_room_id
    WHERE m.id = message_reads.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.message_reads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Chat attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-attachments');

-- Add attachment columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Past collaborations table
CREATE TABLE public.past_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.past_collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all collaborations"
ON public.past_collaborations FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can manage own collaborations"
ON public.past_collaborations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own collaborations"
ON public.past_collaborations FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own collaborations"
ON public.past_collaborations FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for message_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
