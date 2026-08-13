-- Homepage curation columns
ALTER TABLE public.elders
  ADD COLUMN IF NOT EXISTS is_homepage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_homepage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Staff write access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elders TO authenticated;
GRANT ALL ON public.elders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
GRANT ALL ON public.collection_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regions TO authenticated;
GRANT ALL ON public.regions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribes TO authenticated;
GRANT ALL ON public.tribes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;

DROP POLICY IF EXISTS "staff manage elders" ON public.elders;
CREATE POLICY "staff manage elders" ON public.elders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "staff manage collections" ON public.collections;
CREATE POLICY "staff manage collections" ON public.collections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "staff manage collection_items" ON public.collection_items;
CREATE POLICY "staff manage collection_items" ON public.collection_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- Elder upsert
CREATE OR REPLACE FUNCTION public.upsert_elder(
  _elder_id uuid DEFAULT NULL,
  _name text DEFAULT NULL,
  _bio text DEFAULT NULL,
  _photo_url text DEFAULT NULL,
  _region text DEFAULT NULL,
  _tribe text DEFAULT NULL,
  _language text DEFAULT NULL,
  _is_homepage boolean DEFAULT NULL,
  _sort_order integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _region_id uuid; _tribe_id uuid; _language_id uuid; _id uuid; _n text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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

  _n := NULLIF(trim(COALESCE(_name,'')),'');

  IF _elder_id IS NULL THEN
    IF _n IS NULL THEN RAISE EXCEPTION 'Name is required'; END IF;
    INSERT INTO public.elders (name, slug, bio, photo_url, region_id, tribe_id, primary_language_id, is_homepage, sort_order)
    VALUES (_n,
      lower(regexp_replace(_n,'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,5),
      NULLIF(trim(COALESCE(_bio,'')),''),
      NULLIF(trim(COALESCE(_photo_url,'')),''),
      _region_id, _tribe_id, _language_id,
      COALESCE(_is_homepage,false), COALESCE(_sort_order,0))
    RETURNING id INTO _id;
    RETURN _id;
  END IF;

  UPDATE public.elders
  SET name = COALESCE(_n, name),
      bio = CASE WHEN _bio IS NULL THEN bio ELSE NULLIF(trim(_bio),'') END,
      photo_url = CASE WHEN _photo_url IS NULL THEN photo_url ELSE NULLIF(trim(_photo_url),'') END,
      region_id = COALESCE(_region_id, region_id),
      tribe_id = COALESCE(_tribe_id, tribe_id),
      primary_language_id = COALESCE(_language_id, primary_language_id),
      is_homepage = COALESCE(_is_homepage, is_homepage),
      sort_order = COALESCE(_sort_order, sort_order)
  WHERE id = _elder_id;
  RETURN _elder_id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_elder(_elder_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _cnt integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT count(*) INTO _cnt FROM public.stories WHERE elder_id = _elder_id;
  IF _cnt > 0 THEN
    RAISE EXCEPTION 'Cannot delete: % story(ies) still reference this elder', _cnt;
  END IF;
  DELETE FROM public.elder_languages WHERE elder_id = _elder_id;
  DELETE FROM public.follows WHERE elder_id = _elder_id;
  DELETE FROM public.elders WHERE id = _elder_id;
END; $$;

-- Collection upsert
CREATE OR REPLACE FUNCTION public.upsert_collection(
  _collection_id uuid DEFAULT NULL,
  _title text DEFAULT NULL,
  _description text DEFAULT NULL,
  _cover_url text DEFAULT NULL,
  _is_public boolean DEFAULT NULL,
  _is_homepage boolean DEFAULT NULL,
  _sort_order integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid; _t text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  _t := NULLIF(trim(COALESCE(_title,'')),'');
  IF _collection_id IS NULL THEN
    IF _t IS NULL THEN RAISE EXCEPTION 'Title is required'; END IF;
    INSERT INTO public.collections (title, slug, description, cover_url, curator_id, is_public, is_homepage, sort_order)
    VALUES (_t,
      lower(regexp_replace(_t,'[^a-zA-Z0-9]+','-','g'))||'-'||substr(md5(random()::text),1,5),
      NULLIF(trim(COALESCE(_description,'')),''),
      NULLIF(trim(COALESCE(_cover_url,'')),''),
      auth.uid(), COALESCE(_is_public,true), COALESCE(_is_homepage,false), COALESCE(_sort_order,0))
    RETURNING id INTO _id;
    RETURN _id;
  END IF;

  UPDATE public.collections
  SET title = COALESCE(_t, title),
      description = CASE WHEN _description IS NULL THEN description ELSE NULLIF(trim(_description),'') END,
      cover_url = CASE WHEN _cover_url IS NULL THEN cover_url ELSE NULLIF(trim(_cover_url),'') END,
      is_public = COALESCE(_is_public, is_public),
      is_homepage = COALESCE(_is_homepage, is_homepage),
      sort_order = COALESCE(_sort_order, sort_order),
      updated_at = now()
  WHERE id = _collection_id;
  RETURN _collection_id;
END; $$;

CREATE OR REPLACE FUNCTION public.set_collection_items(_collection_id uuid, _story_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _i integer;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.collection_items WHERE collection_id = _collection_id;
  IF _story_ids IS NULL THEN RETURN; END IF;
  FOR _i IN 1..array_length(_story_ids,1) LOOP
    INSERT INTO public.collection_items (collection_id, story_id, position)
    VALUES (_collection_id, _story_ids[_i], _i - 1);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_collection(_collection_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.collection_items WHERE collection_id = _collection_id;
  DELETE FROM public.collections WHERE id = _collection_id;
END; $$;