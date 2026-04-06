
-- Posting schedule events table
CREATE TABLE public.posting_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posting_schedule ENABLE ROW LEVEL SECURITY;

-- Brand can manage schedule for own campaigns
CREATE POLICY "Brand can manage own posting schedule"
  ON public.posting_schedule FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaigns c WHERE c.id = posting_schedule.campaign_id AND c.brand_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaigns c WHERE c.id = posting_schedule.campaign_id AND c.brand_user_id = auth.uid()
  ));

-- Accepted creators can view posting schedule
CREATE POLICY "Accepted creators can view posting schedule"
  ON public.posting_schedule FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaign_applications ca
    WHERE ca.campaign_id = posting_schedule.campaign_id
      AND ca.creator_user_id = auth.uid()
      AND ca.status = 'accepted'
  ));

-- Add campaign settings columns
ALTER TABLE public.campaigns
  ADD COLUMN group_chat_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN posting_schedule_enabled BOOLEAN NOT NULL DEFAULT true;

-- Index for faster lookups
CREATE INDEX idx_posting_schedule_campaign ON public.posting_schedule(campaign_id);
CREATE INDEX idx_posting_schedule_date ON public.posting_schedule(event_date);
