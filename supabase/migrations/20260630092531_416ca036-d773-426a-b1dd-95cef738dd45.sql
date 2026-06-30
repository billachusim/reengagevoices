
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.story_status AS ENUM ('draft','pending','published');
CREATE TYPE public.theme_kind AS ENUM ('type','mood');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- now attach the auth trigger
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TAXONOMY
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  country TEXT,
  region TEXT,
  village TEXT,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  iso_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind theme_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ELDERS
CREATE TABLE public.elders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  tribe_id UUID REFERENCES public.tribes(id) ON DELETE SET NULL,
  primary_language_id UUID REFERENCES public.languages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.elder_languages (
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  PRIMARY KEY (elder_id, language_id)
);

-- STORIES
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  elder_id UUID REFERENCES public.elders(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  tribe_id UUID REFERENCES public.tribes(id) ON DELETE SET NULL,
  language_id UUID REFERENCES public.languages(id) ON DELETE SET NULL,
  audio_url TEXT,
  cover_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  transcript_original TEXT,
  transcript_english TEXT,
  play_count INTEGER NOT NULL DEFAULT 0,
  status story_status NOT NULL DEFAULT 'published',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_stories_updated BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.story_themes (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, theme_id)
);

-- COLLECTIONS
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  curator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (collection_id, story_id)
);

-- USER ACTIVITY
CREATE TABLE public.saves (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);
CREATE TABLE public.follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, elder_id)
);
CREATE TABLE public.play_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ms_listened INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE public.pending_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_url TEXT,
  status story_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTS (public read taxonomy + stories + collections)
GRANT SELECT ON public.regions, public.tribes, public.languages, public.themes, public.elders, public.elder_languages, public.stories, public.story_themes, public.collections, public.collection_items TO anon, authenticated;
GRANT ALL ON public.regions, public.tribes, public.languages, public.themes, public.elders, public.elder_languages, public.stories, public.story_themes, public.collections, public.collection_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saves, public.follows, public.play_history, public.collections, public.collection_items, public.stories, public.pending_stories TO authenticated;
GRANT ALL ON public.saves, public.follows, public.play_history, public.pending_stories TO service_role;

-- RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elder_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "read tribes" ON public.tribes FOR SELECT USING (true);
CREATE POLICY "read languages" ON public.languages FOR SELECT USING (true);
CREATE POLICY "read themes" ON public.themes FOR SELECT USING (true);
CREATE POLICY "read elders" ON public.elders FOR SELECT USING (true);
CREATE POLICY "read elder_languages" ON public.elder_languages FOR SELECT USING (true);
CREATE POLICY "read story_themes" ON public.story_themes FOR SELECT USING (true);
CREATE POLICY "read collection_items" ON public.collection_items FOR SELECT USING (true);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published stories" ON public.stories FOR SELECT USING (status = 'published' OR auth.uid() = created_by OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners insert stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "owners or mods update stories" ON public.stories FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mods delete stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read public collections" ON public.collections FOR SELECT USING (is_public OR auth.uid() = curator_id);
CREATE POLICY "owners manage collections" ON public.collections FOR ALL TO authenticated USING (auth.uid() = curator_id) WITH CHECK (auth.uid() = curator_id);

ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saves" ON public.saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follows" ON public.follows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history" ON public.play_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.pending_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submit pending" ON public.pending_stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitter_id);
CREATE POLICY "view own pending or mod" ON public.pending_stories FOR SELECT TO authenticated USING (auth.uid() = submitter_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mods update pending" ON public.pending_stories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

-- search RPC over published stories
CREATE OR REPLACE FUNCTION public.search_stories(q TEXT)
RETURNS SETOF public.stories LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- increment play count
CREATE OR REPLACE FUNCTION public.increment_play_count(_story_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.stories SET play_count = play_count + 1 WHERE id = _story_id AND status = 'published'
$$;
GRANT EXECUTE ON FUNCTION public.search_stories(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_play_count(UUID) TO anon, authenticated;
