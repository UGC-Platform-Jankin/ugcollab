
-- Add unique constraint on username (only for non-null values)
CREATE UNIQUE INDEX idx_profiles_username_unique ON public.profiles (username) WHERE username IS NOT NULL;
