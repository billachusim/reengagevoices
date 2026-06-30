-- Add YouTube embed support to stories
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS youtube_url text;

-- Update approval RPC to accept an optional YouTube link
CREATE OR REPLACE FUNCTION public.approve_pending_story(_pending_id uuid, _title text, _elder_name text, _region text DEFAULT NULL::text, _tribe text DEFAULT NULL::text, _language text DEFAULT NULL::text, _story_type text DEFAULT NULL::text, _mood text DEFAULT NULL::text, _transcript text DEFAULT NULL::text, _description text DEFAULT NULL::text, _point_award integer DEFAULT 25, _verify_threshold integer DEFAULT 100, _youtube_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _pending public.pending_stories;
  _elder_id uuid;
  _region_id uuid;
  _tribe_id uuid;
  _language_id uuid;
  _type_id uuid;
  _mood_id uuid;
  _story_id uuid;
  _slug text;
  _new_points integer;
BEGIN
  IF NOT (public.has_role(_caller, 'admin') OR public.has_role(_caller, 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _pending FROM public.pending_stories WHERE id = _pending_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF _pending.status = 'published' THEN RAISE EXCEPTION 'Already published'; END IF;

  -- Region
  IF _region IS NOT NULL AND length(trim(_region)) > 0 THEN
    SELECT id INTO _region_id FROM public.regions WHERE lower(name) = lower(trim(_region)) LIMIT 1;
    IF _region_id IS NULL THEN
      INSERT INTO public.regions (name, slug)
      VALUES (trim(_region), lower(regexp_replace(trim(_region), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5))
      RETURNING id INTO _region_id;
    END IF;
  END IF;

  -- Tribe
  IF _tribe IS NOT NULL AND length(trim(_tribe)) > 0 THEN
    SELECT id INTO _tribe_id FROM public.tribes WHERE lower(name) = lower(trim(_tribe)) LIMIT 1;
    IF _tribe_id IS NULL THEN
      INSERT INTO public.tribes (name, slug)
      VALUES (trim(_tribe), lower(regexp_replace(trim(_tribe), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5))
      RETURNING id INTO _tribe_id;
    END IF;
  END IF;

  -- Language
  IF _language IS NOT NULL AND length(trim(_language)) > 0 THEN
    SELECT id INTO _language_id FROM public.languages WHERE lower(name) = lower(trim(_language)) LIMIT 1;
    IF _language_id IS NULL THEN
      INSERT INTO public.languages (name, slug)
      VALUES (trim(_language), lower(regexp_replace(trim(_language), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5))
      RETURNING id INTO _language_id;
    END IF;
  END IF;

  -- Elder
  SELECT id INTO _elder_id FROM public.elders WHERE lower(name) = lower(trim(_elder_name)) LIMIT 1;
  IF _elder_id IS NULL THEN
    INSERT INTO public.elders (name, slug, region_id, tribe_id, primary_language_id)
    VALUES (trim(_elder_name), lower(regexp_replace(trim(_elder_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5), _region_id, _tribe_id, _language_id)
    RETURNING id INTO _elder_id;
  END IF;

  -- Story
  _slug := lower(regexp_replace(trim(_title), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text),1,5);
  INSERT INTO public.stories (title, slug, description, status, elder_id, region_id, tribe_id, language_id, transcript_original, audio_url, submitted_by, published_at, created_by, youtube_url)
  VALUES (trim(_title), _slug, _description, 'published', _elder_id, _region_id, _tribe_id, _language_id, _transcript, _pending.audio_url, _pending.submitter_id, now(), _pending.submitter_id, NULLIF(trim(COALESCE(_youtube_url,'')), ''))
  RETURNING id INTO _story_id;

  -- Themes (type + mood)
  IF _story_type IS NOT NULL AND length(trim(_story_type)) > 0 THEN
    SELECT id INTO _type_id FROM public.themes WHERE lower(name) = lower(trim(_story_type)) AND kind = 'type' LIMIT 1;
    IF _type_id IS NOT NULL THEN
      INSERT INTO public.story_themes (story_id, theme_id) VALUES (_story_id, _type_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF _mood IS NOT NULL AND length(trim(_mood)) > 0 THEN
    SELECT id INTO _mood_id FROM public.themes WHERE lower(name) = lower(trim(_mood)) AND kind = 'mood' LIMIT 1;
    IF _mood_id IS NOT NULL THEN
      INSERT INTO public.story_themes (story_id, theme_id) VALUES (_story_id, _mood_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Mark submission published
  UPDATE public.pending_stories
  SET status = 'published', reviewed_at = now(), reviewed_by = _caller
  WHERE id = _pending_id;

  -- Award points to the submitter
  IF _pending.submitter_id IS NOT NULL THEN
    INSERT INTO public.point_events (user_id, story_id, kind, points)
    VALUES (_pending.submitter_id, _story_id, 'approval', _point_award)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.creator_stats (user_id, points, approved_count)
    VALUES (_pending.submitter_id, _point_award, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.creator_stats.points + _point_award,
          approved_count = public.creator_stats.approved_count + 1,
          updated_at = now()
    RETURNING points INTO _new_points;

    IF _new_points >= _verify_threshold THEN
      UPDATE public.creator_stats
      SET verified = true, verified_at = COALESCE(verified_at, now())
      WHERE user_id = _pending.submitter_id AND verified = false;
    END IF;
  END IF;

  RETURN _story_id;
END;
$function$;

-- Staff-only editing of a published story's editable fields
CREATE OR REPLACE FUNCTION public.update_story(_story_id uuid, _youtube_url text DEFAULT NULL::text, _transcript_original text DEFAULT NULL::text, _transcript_english text DEFAULT NULL::text, _description text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.stories
  SET youtube_url = NULLIF(trim(COALESCE(_youtube_url,'')), ''),
      transcript_original = _transcript_original,
      transcript_english = _transcript_english,
      description = _description,
      updated_at = now()
  WHERE id = _story_id;
END;
$function$;