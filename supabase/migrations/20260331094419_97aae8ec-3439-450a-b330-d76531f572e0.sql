
-- Campaign invites table
CREATE TABLE public.campaign_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  brand_user_id uuid NOT NULL,
  creator_user_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_invites ENABLE ROW LEVEL SECURITY;

-- Brands can insert invites for their own campaigns
CREATE POLICY "ci_brand_insert" ON public.campaign_invites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = brand_user_id AND EXISTS (
    SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.brand_user_id = auth.uid()
  ));

-- Brands can see their own invites
CREATE POLICY "ci_brand_select" ON public.campaign_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = brand_user_id);

-- Creators can see invites sent to them
CREATE POLICY "ci_creator_select" ON public.campaign_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_user_id);

-- Creators can update invites sent to them (to mark as viewed)
CREATE POLICY "ci_creator_update" ON public.campaign_invites
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_user_id);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
