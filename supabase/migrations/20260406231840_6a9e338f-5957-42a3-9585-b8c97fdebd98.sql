CREATE OR REPLACE FUNCTION public.get_campaign_creator_emails(_campaign_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.creator_user_id AS user_id, au.email::text AS email
  FROM public.campaign_applications ca
  JOIN auth.users au ON au.id = ca.creator_user_id
  WHERE ca.campaign_id = _campaign_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = _campaign_id
        AND c.brand_user_id = auth.uid()
    );
$$;