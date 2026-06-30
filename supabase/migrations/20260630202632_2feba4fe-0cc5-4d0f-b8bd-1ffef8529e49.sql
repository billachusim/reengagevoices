-- Extend update_story with a cover image parameter
CREATE OR REPLACE FUNCTION public.update_story(_story_id uuid, _youtube_url text DEFAULT NULL::text, _transcript_original text DEFAULT NULL::text, _transcript_english text DEFAULT NULL::text, _description text DEFAULT NULL::text, _elder_name text DEFAULT NULL::text, _region text DEFAULT NULL::text, _tribe text DEFAULT NULL::text, _language text DEFAULT NULL::text, _story_type text DEFAULT NULL::text, _mood text DEFAULT NULL::text, _is_featured boolean DEFAULT NULL::boolean, _cover_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _elder_id uuid;
  _region_id uuid;
  _tribe_id uuid;
  _language_id uuid;
  _type_id uuid;
  _mood_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Base editable fields
  UPDATE public.stories
  SET youtube_url = NULLIF(trim(COALESCE(_youtube_url,'')), ''),
      transcript_original = _transcript_original,
      transcript_english = _transcript_english,
      description = _description,
      is_featured = COALESCE(_is_featured, is_featured),
      cover_url = NULLIF(trim(COALESCE(_cover_url,'')), ''),
      updated_at = now()
  WHERE id = _story_id;

  -- Region (find-or-create)
  IF _region IS NOT NULL AND length(trim(_region)) > 0 THEN
    SELECT id INTO _region_id FROM public.regions WHERE lower(name) = lower(trim(_region)) LIMIT 1;
    IF _region_id IS NULL THEN
      INSERT INTO public.regions (name, slug)
      VALUES (trim(_region), lower(regexp_replace(trim(_region), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5))
      RETURNING id INTO _region_id;
    END IF;
    UPDATE public.stories SET region_id = _region_id WHERE id = _story_id;
  END IF;

  -- Tribe (find-or-create)
  IF _tribe IS NOT NULL AND length(trim(_tribe)) > 0 THEN
    SELECT id INTO _tribe_id FROM public.tribes WHERE lower(name) = lower(trim(_tribe)) LIMIT 1;
    IF _tribe_id IS NULL THEN
      INSERT INTO public.tribes (name, slug)
      VALUES (trim(_tribe), lower(regexp_replace(trim(_tribe), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5))
      RETURNING id INTO _tribe_id;
    END IF;
    UPDATE public.stories SET tribe_id = _tribe_id WHERE id = _story_id;
  END IF;

  -- Language (find-or-create)
  IF _language IS NOT NULL AND length(trim(_language)) > 0 THEN
    SELECT id INTO _language_id FROM public.languages WHERE lower(name) = lower(trim(_language)) LIMIT 1;
    IF _language_id IS NULL THEN
      INSERT INTO public.languages (name, slug)
      VALUES (trim(_language), lower(regexp_replace(trim(_language), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5))
      RETURNING id INTO _language_id;
    END IF;
    UPDATE public.stories SET language_id = _language_id WHERE id = _story_id;
  END IF;

  -- Elder (find-or-create)
  IF _elder_name IS NOT NULL AND length(trim(_elder_name)) > 0 THEN
    SELECT id INTO _elder_id FROM public.elders WHERE lower(name) = lower(trim(_elder_name)) LIMIT 1;
    IF _elder_id IS NULL THEN
      INSERT INTO public.elders (name, slug, region_id, tribe_id, primary_language_id)
      VALUES (trim(_elder_name), lower(regexp_replace(trim(_elder_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5), _region_id, _tribe_id, _language_id)
      RETURNING id INTO _elder_id;
    END IF;
    UPDATE public.stories SET elder_id = _elder_id WHERE id = _story_id;
  END IF;

  -- Story type theme (replace existing of kind 'type')
  IF _story_type IS NOT NULL AND length(trim(_story_type)) > 0 THEN
    SELECT id INTO _type_id FROM public.themes WHERE lower(name) = lower(trim(_story_type)) AND kind = 'type' LIMIT 1;
    IF _type_id IS NOT NULL THEN
      DELETE FROM public.story_themes st USING public.themes t
        WHERE st.story_id = _story_id AND st.theme_id = t.id AND t.kind = 'type';
      INSERT INTO public.story_themes (story_id, theme_id) VALUES (_story_id, _type_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Mood theme (replace existing of kind 'mood')
  IF _mood IS NOT NULL AND length(trim(_mood)) > 0 THEN
    SELECT id INTO _mood_id FROM public.themes WHERE lower(name) = lower(trim(_mood)) AND kind = 'mood' LIMIT 1;
    IF _mood_id IS NOT NULL THEN
      DELETE FROM public.story_themes st USING public.themes t
        WHERE st.story_id = _story_id AND st.theme_id = t.id AND t.kind = 'mood';
      INSERT INTO public.story_themes (story_id, theme_id) VALUES (_story_id, _mood_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$function$;

-- Storage policies for the story-covers bucket
CREATE POLICY "Staff can upload story covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'story-covers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);

CREATE POLICY "Staff can update story covers"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'story-covers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);

CREATE POLICY "Staff can delete story covers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'story-covers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);

CREATE POLICY "Signed-in users can read story covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'story-covers');
