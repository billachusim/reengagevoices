DROP FUNCTION IF EXISTS public.update_story(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_story(uuid, text, text, text, text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.update_story(uuid, text, text, text, text, text, text, text, text, text, text, boolean, text);

CREATE OR REPLACE FUNCTION public.update_story(
  _story_id uuid,
  _youtube_url text DEFAULT NULL,
  _transcript_original text DEFAULT NULL,
  _transcript_english text DEFAULT NULL,
  _description text DEFAULT NULL,
  _elder_name text DEFAULT NULL,
  _region text DEFAULT NULL,
  _tribe text DEFAULT NULL,
  _language text DEFAULT NULL,
  _story_type text DEFAULT NULL,
  _mood text DEFAULT NULL,
  _is_featured boolean DEFAULT NULL,
  _cover_url text DEFAULT NULL,
  _title text DEFAULT NULL,
  _audio_url text DEFAULT NULL,
  _duration_seconds integer DEFAULT NULL,
  _status text DEFAULT NULL,
  _regenerate_slug boolean DEFAULT false
)
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
  _new_title text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _new_title := NULLIF(trim(COALESCE(_title, '')), '');

  -- Base editable fields. NULL = leave unchanged, '' = clear.
  UPDATE public.stories
  SET youtube_url = CASE WHEN _youtube_url IS NULL THEN youtube_url ELSE NULLIF(trim(_youtube_url), '') END,
      cover_url = CASE WHEN _cover_url IS NULL THEN cover_url ELSE NULLIF(trim(_cover_url), '') END,
      audio_url = CASE WHEN _audio_url IS NULL THEN audio_url ELSE NULLIF(trim(_audio_url), '') END,
      duration_seconds = COALESCE(_duration_seconds, duration_seconds),
      transcript_original = COALESCE(_transcript_original, transcript_original),
      transcript_english = COALESCE(_transcript_english, transcript_english),
      description = COALESCE(_description, description),
      title = COALESCE(_new_title, title),
      is_featured = COALESCE(_is_featured, is_featured),
      status = COALESCE(_status::story_status, status),
      updated_at = now()
  WHERE id = _story_id;

  IF _regenerate_slug AND _new_title IS NOT NULL THEN
    UPDATE public.stories
    SET slug = lower(regexp_replace(_new_title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5)
    WHERE id = _story_id;
  END IF;

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

  -- Story type theme
  IF _story_type IS NOT NULL AND length(trim(_story_type)) > 0 THEN
    SELECT id INTO _type_id FROM public.themes WHERE lower(name) = lower(trim(_story_type)) AND kind = 'type' LIMIT 1;
    IF _type_id IS NOT NULL THEN
      DELETE FROM public.story_themes st USING public.themes t
        WHERE st.story_id = _story_id AND st.theme_id = t.id AND t.kind = 'type';
      INSERT INTO public.story_themes (story_id, theme_id) VALUES (_story_id, _type_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Mood theme
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

REVOKE ALL ON FUNCTION public.update_story(uuid, text, text, text, text, text, text, text, text, text, text, boolean, text, text, text, integer, text, boolean) FROM anon;

CREATE OR REPLACE FUNCTION public.delete_story(_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.story_themes WHERE story_id = _story_id;
  DELETE FROM public.collection_items WHERE story_id = _story_id;
  DELETE FROM public.saves WHERE story_id = _story_id;
  DELETE FROM public.play_history WHERE story_id = _story_id;
  DELETE FROM public.point_events WHERE story_id = _story_id;
  DELETE FROM public.stories WHERE id = _story_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_story(uuid) FROM anon;

CREATE POLICY "staff manage story audio"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'story-audio' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')))
WITH CHECK (bucket_id = 'story-audio' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')));