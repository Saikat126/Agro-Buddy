-- ─────────────────────────────────────────────────────────────────────────────
-- Avatars Storage Bucket Setup
--
-- STEP 1 (Dashboard only — cannot be done via SQL):
--   Supabase Dashboard → Storage → New bucket
--   Name: avatars
--   Public bucket: YES (toggle on)
--
-- STEP 2: Run this SQL in the Supabase SQL Editor to add RLS policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can upload their own avatar (file path must start with their user ID)
CREATE POLICY "users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can replace/update their own avatar
CREATE POLICY "users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own avatar
CREATE POLICY "users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone (including unauthenticated visitors) can view avatars
-- (Safe because this is a public bucket — no private data in filenames)
CREATE POLICY "anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
