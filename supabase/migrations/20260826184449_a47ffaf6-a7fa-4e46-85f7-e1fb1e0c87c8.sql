-- Hide existing collections from the public site
UPDATE public.collections SET is_public = false, is_homepage = false;

-- Create the three format collections
INSERT INTO public.collections (slug, title, description, is_public, is_homepage, sort_order)
VALUES
  ('audio-stories', 'Audio stories', 'Elders'' voices, recorded and preserved as audio.', true, true, 1),
  ('video-stories', 'Video stories', 'Stories you can watch, filmed with the elders who tell them.', true, true, 2),
  ('written-stories', 'Written stories', 'Transcribed and written memory, to be read at your own pace.', true, true, 3)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      is_public = true,
      is_homepage = true,
      sort_order = EXCLUDED.sort_order;

-- Seed membership
INSERT INTO public.collection_items (collection_id, story_id, position)
SELECT c.id, s.id, row_number() OVER (ORDER BY s.created_at)
FROM public.collections c
JOIN public.stories s ON s.status = 'published' AND s.audio_url IS NOT NULL AND btrim(s.audio_url) <> ''
WHERE c.slug = 'audio-stories'
ON CONFLICT DO NOTHING;

INSERT INTO public.collection_items (collection_id, story_id, position)
SELECT c.id, s.id, row_number() OVER (ORDER BY s.created_at)
FROM public.collections c
JOIN public.stories s ON s.status = 'published' AND s.youtube_url IS NOT NULL AND btrim(s.youtube_url) <> ''
WHERE c.slug = 'video-stories'
ON CONFLICT DO NOTHING;

INSERT INTO public.collection_items (collection_id, story_id, position)
SELECT c.id, s.id, row_number() OVER (ORDER BY s.created_at)
FROM public.collections c
JOIN public.stories s ON s.status = 'published'
  AND (s.audio_url IS NULL OR btrim(s.audio_url) = '')
  AND (coalesce(btrim(s.transcript_english), '') <> '' OR coalesce(btrim(s.transcript_original), '') <> '')
WHERE c.slug = 'written-stories'
ON CONFLICT DO NOTHING;