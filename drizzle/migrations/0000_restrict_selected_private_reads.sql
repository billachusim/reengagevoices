ALTER POLICY "Profiles are viewable by everyone" ON public.profiles TO authenticated USING (id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin') OR public.has_role((SELECT auth.uid()), 'moderator'));
COMMENT ON POLICY "Profiles are viewable by everyone" ON public.profiles IS 'Private profiles: only the account owner and moderation staff may read them.';

ALTER POLICY "read story_themes" ON public.story_themes TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_themes.story_id));
COMMENT ON POLICY "read story_themes" ON public.story_themes IS 'Only expose associations for stories visible through story RLS.';

ALTER POLICY "read collection_items" ON public.collection_items TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_items.collection_id) AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = collection_items.story_id));
COMMENT ON POLICY "read collection_items" ON public.collection_items IS 'Both the parent collection and story must be visible through their RLS policies.';

ALTER POLICY "Signed-in users can read story covers" ON storage.objects TO authenticated USING (
  bucket_id = 'story-covers' AND (
    owner_id = (SELECT auth.uid()::text)
    OR public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'moderator')
    OR EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.status = 'published'
        AND split_part(split_part(s.cover_url, '/storage/v1/object/sign/story-covers/', 2), '?', 1) = storage.objects.name
    )
    OR EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.is_public
        AND split_part(split_part(c.cover_url, '/storage/v1/object/sign/story-covers/', 2), '?', 1) = storage.objects.name
    )
  )
);
COMMENT ON POLICY "Signed-in users can read story covers" ON storage.objects IS 'Owners and staff can access uploads; other readers may only access covers referenced by published stories or public collections.';

ALTER POLICY "signed in readers open story documents" ON storage.objects TO authenticated USING (
  bucket_id = 'story-documents' AND (
    owner_id = (SELECT auth.uid()::text)
    OR public.has_role((SELECT auth.uid()), 'admin')
    OR public.has_role((SELECT auth.uid()), 'moderator')
    OR EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.status = 'published' AND s.manuscript_url = storage.objects.name
    )
  )
);
COMMENT ON POLICY "signed in readers open story documents" ON storage.objects IS 'Owners and staff can access uploads; other signed-in readers may only open manuscripts attached to published stories.';