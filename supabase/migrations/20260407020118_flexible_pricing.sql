-- Add pricing mode and videos mode to campaigns
ALTER TABLE campaigns ADD COLUMN pricing_mode TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE campaigns ADD COLUMN videos_mode TEXT NOT NULL DEFAULT 'fixed';

-- Add per-creator proposed pricing to campaign_invites
ALTER TABLE campaign_invites ADD COLUMN proposed_price_per_video NUMERIC;
ALTER TABLE campaign_invites ADD COLUMN proposed_video_count INTEGER;

-- Add agreed/proposed pricing and negotiation status to campaign_applications
ALTER TABLE campaign_applications ADD COLUMN agreed_price_per_video NUMERIC;
ALTER TABLE campaign_applications ADD COLUMN agreed_video_count INTEGER;
ALTER TABLE campaign_applications ADD COLUMN proposed_price_per_video NUMERIC;
ALTER TABLE campaign_applications ADD COLUMN proposed_video_count INTEGER;
ALTER TABLE campaign_applications ADD COLUMN pricing_status TEXT DEFAULT 'pending';

-- Backfill existing accepted applications with campaign defaults
UPDATE campaign_applications ca
SET
  agreed_price_per_video = c.price_per_video,
  agreed_video_count = c.expected_video_count,
  pricing_status = 'agreed'
FROM campaigns c
WHERE ca.campaign_id = c.id
  AND ca.status = 'accepted'
  AND ca.agreed_price_per_video IS NULL;
