ALTER TABLE public.campaign_applications ADD COLUMN videos_delivered integer NOT NULL DEFAULT 0;

-- Allow creators to update their own applications (for leaving)
CREATE POLICY ca_creator_update
ON public.campaign_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = creator_user_id);