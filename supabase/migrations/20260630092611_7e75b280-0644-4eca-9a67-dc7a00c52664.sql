
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_play_count(UUID) FROM PUBLIC, anon, authenticated;

-- search relies on RLS public-read of published stories, so it can run as invoker
CREATE OR REPLACE FUNCTION public.search_stories(q TEXT)
RETURNS SETOF public.stories LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT s.* FROM public.stories s
  LEFT JOIN public.elders e ON e.id = s.elder_id
  WHERE s.status = 'published' AND (
    q IS NULL OR q = '' OR
    s.title ILIKE '%'||q||'%' OR
    s.description ILIKE '%'||q||'%' OR
    s.transcript_original ILIKE '%'||q||'%' OR
    s.transcript_english ILIKE '%'||q||'%' OR
    e.name ILIKE '%'||q||'%'
  )
  ORDER BY s.play_count DESC
  LIMIT 50
$$;
