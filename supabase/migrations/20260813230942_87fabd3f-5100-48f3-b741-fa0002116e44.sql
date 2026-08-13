DROP POLICY IF EXISTS "staff manage elder photos" ON storage.objects;
CREATE POLICY "staff manage elder photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'elder-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')))
  WITH CHECK (bucket_id = 'elder-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')));