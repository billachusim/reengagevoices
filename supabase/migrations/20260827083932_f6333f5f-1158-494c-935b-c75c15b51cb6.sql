-- Keep the three format collections in sync with each story's content.
CREATE OR REPLACE FUNCTION public.sync_story_format_collections(_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _s public.stories;
  _has_audio boolean;
  _has_video boolean;
  _has_text boolean;
  _slugs text[] := ARRAY[]::text[];
  _slug text;
  _cid uuid;
  _pos integer;
BEGIN
  SELECT * INTO _s FROM public.stories WHERE id = _story_id;
  IF NOT FOUND THEN RETURN; END IF;

  _has_audio := COALESCE(length(trim(COALESCE(_s.audio_url,''))) > 0, false);
  _has_video := COALESCE(length(trim(COALESCE(_s.youtube_url,''))) > 0, false);
  _has_text  := COALESCE(length(trim(COALESCE(_s.transcript_original, _s.transcript_english, ''))) > 0, false);

  IF _s.status = 'published' THEN
    IF _has_audio THEN _slugs := _slugs || ARRAY['audio-stories']; END IF;
    IF _has_video THEN _slugs := _slugs || ARRAY['video-stories']; END IF;
    IF NOT _has_audio AND NOT _has_video AND _has_text THEN _slugs := _slugs || ARRAY['written-stories']; END IF;
  END IF;

  -- Remove from any format collection it no longer belongs to
  DELETE FROM public.collection_items ci
  USING public.collections c
  WHERE ci.collection_id = c.id
    AND ci.story_id = _story_id
    AND c.slug IN ('audio-stories','video-stories','written-stories')
    AND NOT (c.slug = ANY(_slugs));

  -- Add to the ones it belongs to
  FOREACH _slug IN ARRAY _slugs LOOP
    SELECT id INTO _cid FROM public.collections WHERE slug = _slug LIMIT 1;
    IF _cid IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.collection_items WHERE collection_id = _cid AND story_id = _story_id) THEN
      CONTINUE;
    END IF;
    SELECT COALESCE(max(position), -1) + 1 INTO _pos FROM public.collection_items WHERE collection_id = _cid;
    INSERT INTO public.collection_items (collection_id, story_id, position) VALUES (_cid, _story_id, _pos);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_story_format()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_story_format_collections(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stories_format_sync ON public.stories;
CREATE TRIGGER trg_stories_format_sync
AFTER INSERT OR UPDATE OF audio_url, youtube_url, transcript_original, transcript_english, status
ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_story_format();

-- Backfill existing stories
DO $$
DECLARE _r record;
BEGIN
  FOR _r IN SELECT id FROM public.stories LOOP
    PERFORM public.sync_story_format_collections(_r.id);
  END LOOP;
END $$;

-- Admin/moderator: create a story from scratch.
CREATE OR REPLACE FUNCTION public.create_story(
  _title text,
  _elder_name text DEFAULT NULL,
  _description text DEFAULT NULL,
  _region text DEFAULT NULL,
  _tribe text DEFAULT NULL,
  _language text DEFAULT NULL,
  _story_type text DEFAULT NULL,
  _mood text DEFAULT NULL,
  _cover_url text DEFAULT NULL,
  _audio_url text DEFAULT NULL,
  _duration_seconds integer DEFAULT 0,
  _youtube_url text DEFAULT NULL,
  _transcript_original text DEFAULT NULL,
  _transcript_english text DEFAULT NULL,
  _is_featured boolean DEFAULT false,
  _status text DEFAULT 'published'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _region_id uuid; _tribe_id uuid; _language_id uuid; _elder_id uuid;
  _type_id uuid; _mood_id uuid; _story_id uuid; _t text;
BEGIN
  IF NOT (public.has_role(_caller,'admin') OR public.has_role(_caller,'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _t := NULLIF(trim(COALESCE(_title,'')),'');
  IF _t IS NULL THEN RAISE EXCEPTION 'Title is required'; END IF;

  IF _region IS NOT NULL AND length(trim(_region)) > 0 THEN
    SELECT id INTO _region_id FROM public.regions WHERE lower(name)=lower(trim(_region)) LIMIT 1;
    IF _region_id IS NULL THEN
      INSERT INTO public.regions (name, slug)
      VALUES (trim(_region), lower(regexp_replace(trim(_region),'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,5))
      RETURNING id INTO _region_id;
    END IF;
  END IF;

  IF _tribe IS NOT NULL AND length(trim(_tribe)) > 0 THEN
    SELECT id INTO _tribe_id FROM public.tribes WHERE lower(name)=lower(trim(_tribe)) LIMIT 1;
    IF _tribe_id IS NULL THEN
      INSERT INTO public.tribes (name, slug)
      VALUES (trim(_tribe), lower(regexp_replace(trim(_tribe),'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,5))
      RETURNING id INTO _tribe_id;
    END IF;
  END IF;

  IF _language IS NOT NULL AND length(trim(_language)) > 0 THEN
    SELECT id INTO _language_id FROM public.languages WHERE lower(name)=lower(trim(_language)) LIMIT 1;
    IF _language_id IS NULL THEN
      INSERT INTO public.languages (name, slug)
      VALUES (trim(_language), lower(regexp_replace(trim(_language),'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,5))
      RETURNING id INTO _language_id;
    END IF;
  END IF;

  IF _elder_name IS NOT NULL AND length(trim(_elder_name)) > 0 THEN
    SELECT id INTO _elder_id FROM public.elders WHERE lower(name)=lower(trim(_elder_name)) LIMIT 1;
    IF _elder_id IS NULL THEN
      INSERT INTO public.elders (name, slug, region_id, tribe_id, primary_language_id)
      VALUES (trim(_elder_name), lower(regexp_replace(trim(_elder_name),'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,5), _region_id, _tribe_id, _language_id)
      RETURNING id INTO _elder_id;
    END IF;
  END IF;

  INSERT INTO public.stories (
    title, slug, description, status, elder_id, region_id, tribe_id, language_id,
    transcript_original, transcript_english, audio_url, cover_url, youtube_url,
    duration_seconds, is_featured, published_at, created_by, submitted_by
  ) VALUES (
    _t,
    lower(regexp_replace(_t,'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,5),
    NULLIF(trim(COALESCE(_description,'')),''),
    COALESCE(_status,'published')::story_status,
    _elder_id, _region_id, _tribe_id, _language_id,
    NULLIF(trim(COALESCE(_transcript_original,'')),''),
    NULLIF(trim(COALESCE(_transcript_english,'')),''),
    NULLIF(trim(COALESCE(_audio_url,'')),''),
    NULLIF(trim(COALESCE(_cover_url,'')),''),
    NULLIF(trim(COALESCE(_youtube_url,'')),''),
    COALESCE(_duration_seconds,0),
    COALESCE(_is_featured,false),
    now(), _caller, _caller
  ) RETURNING id INTO _story_id;

  IF _story_type IS NOT NULL AND length(trim(_story_type)) > 0 THEN
    SELECT id INTO _type_id FROM public.themes WHERE lower(name)=lower(trim(_story_type)) AND kind='type' LIMIT 1;
    IF _type_id IS NOT NULL THEN
      INSERT INTO public.story_themes (story_id, theme_id) VALUES (_story_id, _type_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF _mood IS NOT NULL AND length(trim(_mood)) > 0 THEN
    SELECT id INTO _mood_id FROM public.themes WHERE lower(name)=lower(trim(_mood)) AND kind='mood' LIMIT 1;
    IF _mood_id IS NOT NULL THEN
      INSERT INTO public.story_themes (story_id, theme_id) VALUES (_story_id, _mood_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN _story_id;
END;
$$;