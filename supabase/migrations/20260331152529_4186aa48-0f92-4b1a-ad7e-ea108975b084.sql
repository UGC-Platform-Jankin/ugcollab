
-- Video submissions table
CREATE TABLE public.video_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  creator_user_id uuid NOT NULL,
  title text NOT NULL,
  video_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_submissions ENABLE ROW LEVEL SECURITY;

-- Creators can view their own submissions
CREATE POLICY "vs_creator_select" ON public.video_submissions
  FOR SELECT TO authenticated
  USING (creator_user_id = auth.uid());

-- Brands can view submissions for their campaigns
CREATE POLICY "vs_brand_select" ON public.video_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaigns c WHERE c.id = video_submissions.campaign_id AND c.brand_user_id = auth.uid()
  ));

-- Creators can insert their own submissions
CREATE POLICY "vs_creator_insert" ON public.video_submissions
  FOR INSERT TO authenticated
  WITH CHECK (creator_user_id = auth.uid());

-- Creators can update their own submissions (re-upload)
CREATE POLICY "vs_creator_update" ON public.video_submissions
  FOR UPDATE TO authenticated
  USING (creator_user_id = auth.uid());

-- Brands can update submissions (accept/reject) for their campaigns
CREATE POLICY "vs_brand_update" ON public.video_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaigns c WHERE c.id = video_submissions.campaign_id AND c.brand_user_id = auth.uid()
  ));

-- Posted video links table
CREATE TABLE public.posted_video_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.video_submissions(id),
  platform text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posted_video_links ENABLE ROW LEVEL SECURITY;

-- Creators can insert their own posted links
CREATE POLICY "pvl_creator_insert" ON public.posted_video_links
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM video_submissions vs WHERE vs.id = posted_video_links.submission_id AND vs.creator_user_id = auth.uid()
  ));

-- Creators can view their own posted links
CREATE POLICY "pvl_creator_select" ON public.posted_video_links
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM video_submissions vs WHERE vs.id = posted_video_links.submission_id AND vs.creator_user_id = auth.uid()
  ));

-- Brands can view posted links for their campaigns
CREATE POLICY "pvl_brand_select" ON public.posted_video_links
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM video_submissions vs
    JOIN campaigns c ON c.id = vs.campaign_id
    WHERE vs.id = posted_video_links.submission_id AND c.brand_user_id = auth.uid()
  ));

-- Add realtime for video_submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_submissions;

-- Storage bucket for video submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('video-submissions', 'video-submissions', true);

-- Storage policies for video-submissions bucket
CREATE POLICY "Anyone can view videos" ON storage.objects FOR SELECT USING (bucket_id = 'video-submissions');
CREATE POLICY "Auth users can upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'video-submissions');
CREATE POLICY "Users can update own videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'video-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
