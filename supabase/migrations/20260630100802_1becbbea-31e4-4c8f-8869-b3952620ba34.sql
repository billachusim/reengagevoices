-- Allow authenticated users to upload audio into their own folder ({uid}/...)
CREATE POLICY "Users can upload own story audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'story-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read/sign their own uploaded audio
CREATE POLICY "Users can read own story audio"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'story-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow staff (admins/moderators) to read any submission audio for review
CREATE POLICY "Staff can read all story audio"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'story-audio'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);