-- Add 'rejected' to story_status enum
ALTER TYPE public.story_status ADD VALUE IF NOT EXISTS 'rejected';

-- Link approved stories to the creator who submitted them
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- Add rejection reason to pending submissions
ALTER TABLE public.pending_stories ADD COLUMN IF NOT EXISTS reject_reason text;

-- ============ creator_stats ============
CREATE TABLE public.creator_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  approved_count integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_stats TO authenticated;
GRANT ALL ON public.creator_stats TO service_role;

ALTER TABLE public.creator_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators read own stats" ON public.creator_stats
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_creator_stats_updated_at
  BEFORE UPDATE ON public.creator_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ point_events ============
CREATE TABLE public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('approval','listen')),
  points integer NOT NULL,
  listener_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.point_events TO authenticated;
GRANT ALL ON public.point_events TO service_role;

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators read own point events" ON public.point_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- one approval event per story
CREATE UNIQUE INDEX point_events_approval_unique
  ON public.point_events (story_id) WHERE kind = 'approval';
-- one listen credit per (story, listener)
CREATE UNIQUE INDEX point_events_listen_unique
  ON public.point_events (story_id, listener_id) WHERE kind = 'listen';

-- ============ approve_pending_story ============
CREATE OR REPLACE FUNCTION public.approve_pending_story(
  _pending_id uuid,
  _title text,
  _elder_name text,
  _region text DEFAULT NULL,
  _tribe text DEFAULT NULL,
  _language text DEFAULT NULL,
  _story_type text DEFAULT NULL,
  _mood text DEFAULT NULL,
  _transcript text DEFAULT NULL,
  _description text DEFAULT NULL,
  _point_award integer DEFAULT 25,
  _verify_threshold integer DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  INSERT INTO public.stories (title, slug, description, status, elder_id, region_id, tribe_id, language_id, transcript_original, audio_url, submitted_by, published_at, created_by)
  VALUES (trim(_title), _slug, _description, 'published', _elder_id, _region_id, _tribe_id, _language_id, _transcript, _pending.audio_url, _pending.submitter_id, now(), _pending.submitter_id)
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
$$;

-- ============ reject_pending_story ============
CREATE OR REPLACE FUNCTION public.reject_pending_story(_pending_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.pending_stories
  SET status = 'rejected', reject_reason = _reason, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _pending_id;
END;
$$;

-- ============ award_listen_point ============
CREATE OR REPLACE FUNCTION public.award_listen_point(_story_id uuid, _listener_id uuid, _listen_award integer DEFAULT 1, _verify_threshold integer DEFAULT 100)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator uuid;
  _new_points integer;
BEGIN
  SELECT submitted_by INTO _creator FROM public.stories WHERE id = _story_id AND status = 'published';
  IF _creator IS NULL OR _listener_id IS NULL OR _creator = _listener_id THEN
    RETURN;
  END IF;

  INSERT INTO public.point_events (user_id, story_id, kind, points, listener_id)
  VALUES (_creator, _story_id, 'listen', _listen_award, _listener_id)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.creator_stats (user_id, points)
  VALUES (_creator, _listen_award)
  ON CONFLICT (user_id) DO UPDATE
    SET points = public.creator_stats.points + _listen_award, updated_at = now()
  RETURNING points INTO _new_points;

  IF _new_points >= _verify_threshold THEN
    UPDATE public.creator_stats
    SET verified = true, verified_at = COALESCE(verified_at, now())
    WHERE user_id = _creator AND verified = false;
  END IF;
END;
$$;

-- ============ admin role + verification management ============
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_creator_verified(_user_id uuid, _verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.creator_stats (user_id, verified, verified_at, verified_by)
  VALUES (_user_id, _verified, CASE WHEN _verified THEN now() ELSE NULL END, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET verified = _verified,
        verified_at = CASE WHEN _verified THEN COALESCE(public.creator_stats.verified_at, now()) ELSE NULL END,
        verified_by = auth.uid(),
        updated_at = now();
END;
$$;