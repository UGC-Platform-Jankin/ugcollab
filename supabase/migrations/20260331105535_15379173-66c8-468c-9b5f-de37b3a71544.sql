
-- Add max_creators column to campaigns
ALTER TABLE public.campaigns ADD COLUMN max_creators integer NOT NULL DEFAULT 10;

-- Allow brands to see their own campaigns regardless of status
CREATE POLICY "Brands can view their own campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (auth.uid() = brand_user_id);
