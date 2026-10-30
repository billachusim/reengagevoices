ALTER POLICY "owners insert stories" ON public.stories WITH CHECK (public.has_role((SELECT auth.uid()), 'admin') OR public.has_role((SELECT auth.uid()), 'moderator'));
ALTER POLICY "owners or mods update stories" ON public.stories USING (public.has_role((SELECT auth.uid()), 'admin') OR public.has_role((SELECT auth.uid()), 'moderator')) WITH CHECK (public.has_role((SELECT auth.uid()), 'admin') OR public.has_role((SELECT auth.uid()), 'moderator'));
COMMENT ON POLICY "owners insert stories" ON public.stories IS 'Only moderation staff may create archive stories; contributors use pending_stories for review.';
COMMENT ON POLICY "owners or mods update stories" ON public.stories IS 'Only moderation staff may edit or publish archive stories, including owner-created rows.';

CREATE OR REPLACE FUNCTION public.award_listen_point(_story_id uuid, _listener_id uuid, _listen_award integer DEFAULT 1, _verify_threshold integer DEFAULT 100)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _caller uuid := auth.uid();
  _creator uuid;
  _new_points integer;
BEGIN
  IF _caller IS NULL OR _listener_id IS DISTINCT FROM _caller THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _listen_award IS DISTINCT FROM 1 OR _verify_threshold IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'Invalid reward configuration';
  END IF;
  SELECT submitted_by INTO _creator FROM public.stories WHERE id = _story_id AND status = 'published';
  IF _creator IS NULL OR _creator = _caller THEN RETURN; END IF;
  INSERT INTO public.point_events (user_id, story_id, kind, points, listener_id)
  VALUES (_creator, _story_id, 'listen', 1, _caller) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.creator_stats (user_id, points) VALUES (_creator, 1)
  ON CONFLICT (user_id) DO UPDATE SET points = public.creator_stats.points + 1, updated_at = now()
  RETURNING points INTO _new_points;
  IF _new_points >= 100 THEN
    UPDATE public.creator_stats SET verified = true, verified_at = COALESCE(verified_at, now())
    WHERE user_id = _creator AND verified = false;
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.award_listen_point(uuid, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_listen_point(uuid, uuid, integer, integer) TO authenticated;
