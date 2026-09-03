import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { StoryDTO, ElderDTO, CollectionDTO, FacetsDTO } from "./types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const STORY_SELECT =
  "id,slug,title,description,audio_url,cover_url,duration_seconds,play_count,transcript_original,transcript_english,manuscript_url,manuscript_filename,youtube_url,is_featured,published_at,created_at,elder:elders(slug,name,photo_url),region:regions(slug,name),tribe:tribes(slug,name),language:languages(slug,name),story_themes(theme:themes(slug,name,kind))";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapStory(row: any): StoryDTO {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    audio_url: row.audio_url,
    cover_url: row.cover_url,
    duration_seconds: row.duration_seconds ?? 0,
    play_count: row.play_count ?? 0,
    transcript_original: row.transcript_original ?? null,
    transcript_english: row.transcript_english ?? null,
    manuscript_url: row.manuscript_url ?? null,
    manuscript_filename: row.manuscript_filename ?? null,
    youtube_url: row.youtube_url ?? null,
    is_featured: row.is_featured ?? false,
    elder: row.elder ?? null,
    region: row.region ?? null,
    tribe: row.tribe ?? null,
    language: row.language ?? null,
    themes: (row.story_themes ?? []).map((st: any) => st.theme).filter(Boolean),
  };
}

// List views only need to know whether a transcript exists (to derive the
// story format), never the full text — so the list payload carries a stub.
function stubTranscripts(story: StoryDTO): StoryDTO {
  const stub = (t: string | null) => (t && t.trim() ? t.slice(0, 1) : null);
  return { ...story, transcript_original: stub(story.transcript_original), transcript_english: stub(story.transcript_english) };
}

export const getStories = createServerFn({ method: "GET" }).handler(async (): Promise<StoryDTO[]> => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("stories")
    .select(STORY_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapStory).map(stubTranscripts);
});

export const getStory = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ story: StoryDTO; related: StoryDTO[] } | null> => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("stories")
      .select(STORY_SELECT)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const story = mapStory(row);
    const { data: rel } = await sb
      .from("stories")
      .select(STORY_SELECT)
      .eq("status", "published")
      .neq("slug", data.slug)
      .limit(20);
    const related = (rel ?? [])
      .map(mapStory)
      .filter(
        (s) =>
          s.elder?.slug === story.elder?.slug ||
          s.tribe?.slug === story.tribe?.slug ||
          s.themes.some((t) => story.themes.some((u) => u.slug === t.slug)),
      )
      .slice(0, 6);
    return { story, related };
  });

export const getFacets = createServerFn({ method: "GET" }).handler(async (): Promise<FacetsDTO> => {
  const sb = publicClient();
  const [regions, tribes, languages, themes] = await Promise.all([
    sb.from("regions").select("id,slug,name,country,region,village,parent_id"),
    sb.from("tribes").select("slug,name").order("name"),
    sb.from("languages").select("slug,name").order("name"),
    sb.from("themes").select("slug,name,kind").order("name"),
  ]);
  return {
    regions: (regions.data ?? []) as FacetsDTO["regions"],
    tribes: (tribes.data ?? []) as FacetsDTO["tribes"],
    languages: (languages.data ?? []) as FacetsDTO["languages"],
    themes: (themes.data ?? []) as FacetsDTO["themes"],
  };
});

export const getElders = createServerFn({ method: "GET" }).handler(async (): Promise<ElderDTO[]> => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("elders")
    .select("id,slug,name,bio,photo_url,is_homepage,sort_order,region:regions(slug,name),tribe:tribes(slug,name),language:languages!primary_language_id(slug,name),stories(count)")
    .order("is_homepage", { ascending: false })
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    bio: r.bio,
    photo_url: r.photo_url ?? null,
    region: r.region ?? null,
    tribe: r.tribe ?? null,
    language: r.language ?? null,
    story_count: r.stories?.[0]?.count ?? 0,
    is_homepage: r.is_homepage ?? false,
    sort_order: r.sort_order ?? 0,
  }));
});

export const getElder = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ elder: ElderDTO; stories: StoryDTO[] } | null> => {
    const sb = publicClient();
    const { data: e, error } = await sb
      .from("elders")
      .select("id,slug,name,bio,photo_url,is_homepage,sort_order,region:regions(slug,name),tribe:tribes(slug,name),language:languages!primary_language_id(slug,name)")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!e) return null;
    const { data: rows } = await sb
      .from("stories")
      .select(STORY_SELECT)
      .eq("status", "published")
      .eq("elder_id", (e as any).id);
    const stories = (rows ?? []).map(mapStory);
    return {
      elder: {
        id: (e as any).id,
        slug: (e as any).slug,
        name: (e as any).name,
        bio: (e as any).bio,
        photo_url: (e as any).photo_url ?? null,
        region: (e as any).region ?? null,
        tribe: (e as any).tribe ?? null,
        language: (e as any).language ?? null,
        story_count: stories.length,
      },
      stories,
    };
  });

export const getCollections = createServerFn({ method: "GET" }).handler(async (): Promise<CollectionDTO[]> => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("collections")
    .select("id,slug,title,description,cover_url,is_homepage,sort_order,collection_items(position,story:stories(cover_url))")
    .eq("is_public", true)
    .order("is_homepage", { ascending: false })
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c: any) => {
    const items = (c.collection_items ?? []).slice().sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
    const firstCover = items.map((i: any) => i.story?.cover_url).find((u: any) => u && String(u).trim());
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      story_count: c.collection_items?.[0]?.count ?? items.length,
      cover_url: (c.cover_url && String(c.cover_url).trim()) ? c.cover_url : (firstCover ?? null),
      is_homepage: c.is_homepage ?? false,
      sort_order: c.sort_order ?? 0,
    };
  });
});

export const getCollection = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ collection: CollectionDTO; stories: StoryDTO[] } | null> => {
    const sb = publicClient();
    const { data: c, error } = await sb
      .from("collections")
      .select("id,slug,title,description,collection_items(position,story:stories(" + STORY_SELECT + "))")
      .eq("slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) return null;
    const items = ((c as any).collection_items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((i: any) => i.story)
      .filter(Boolean)
      .map(mapStory);
    return {
      collection: { id: (c as any).id, slug: (c as any).slug, title: (c as any).title, description: (c as any).description, story_count: items.length, cover_url: items.map((s: any) => s.cover_url).find((u: any) => u && String(u).trim()) ?? null },
      stories: items,
    };
  });

export const searchStories = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => z.object({ q: z.string() }).parse(d))
  .handler(async ({ data }): Promise<StoryDTO[]> => {
    const sb = publicClient();
    if (!data.q.trim()) return [];
    const { data: ids, error } = await sb.rpc("search_stories", { q: data.q.trim() });
    if (error) throw new Error(error.message);
    const slugs = (ids ?? []).map((r: any) => r.slug);
    if (slugs.length === 0) return [];
    const { data: rows } = await sb.from("stories").select(STORY_SELECT).in("slug", slugs);
    return (rows ?? []).map(mapStory);
  });

export const incrementPlay = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("increment_play_count", { _story_id: data.id });
    return { ok: true };
  });
