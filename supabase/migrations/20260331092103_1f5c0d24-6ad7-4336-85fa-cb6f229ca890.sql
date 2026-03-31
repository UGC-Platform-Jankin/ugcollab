ALTER TABLE public.campaigns 
  ADD COLUMN target_regions text[] NOT NULL DEFAULT '{Worldwide}',
  ADD COLUMN platforms text[] DEFAULT NULL,
  ADD COLUMN campaign_length_days integer DEFAULT NULL;

UPDATE public.campaigns SET target_regions = ARRAY[target_region] WHERE target_region IS NOT NULL;
UPDATE public.campaigns SET platforms = ARRAY[platform] WHERE platform IS NOT NULL;

ALTER TABLE public.campaigns DROP COLUMN target_region;
ALTER TABLE public.campaigns DROP COLUMN platform;
ALTER TABLE public.campaigns DROP COLUMN deadline;