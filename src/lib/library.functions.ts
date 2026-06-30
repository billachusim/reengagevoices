import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StoryDTO, ElderDTO } from "./types";

const STORY_SELECT =
  "id,slug,title,description,audio_url,cover_url,duration_seconds,play_count,transcript_original,transcript_english,elder:elders(slug,name),region:regions(slug,name),tribe:tribes(slug,name),language:languages(slug,name),story_themes(theme:themes(slug,name,kind))";

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
    elder: row.elder ?? null,
    region: row.region ?? null,
    tribe: row.tribe ?? null,
    language: row.language ?? null,
    themes: (row.story_themes ?? []).map((st: any) => st.theme).filter(Boolean),
  };
}

export const getMyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ savedIds: string[]; followingIds: string[] }> => {
    const { supabase, userId } = context;
    const [saves, follows] = await Promise.all([
      supabase.from("saves").select("story_id").eq("user_id", userId),
      supabase.from("follows").select("elder_id").eq("user_id", userId),
    ]);
    return {
      savedIds: (saves.data ?? []).map((r: any) => r.story_id),
      followingIds: (follows.data ?? []).map((r: any) => r.elder_id),
    };
  });

export const getLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [savesRes, followsRes, historyRes, playlistsRes] = await Promise.all([
      supabase.from("saves").select("created_at, story:stories(" + STORY_SELECT + ")").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("follows").select("elder:elders(id,slug,name,bio,region:regions(slug,name),tribe:tribes(slug,name),language:languages!primary_language_id(slug,name))").eq("user_id", userId),
      supabase.from("play_history").select("played_at, story:stories(" + STORY_SELECT + ")").eq("user_id", userId).order("played_at", { ascending: false }).limit(30),
      supabase.from("collections").select("id,slug,title,description,collection_items(count)").eq("curator_id", userId).order("created_at", { ascending: false }),
    ]);
    const saved: StoryDTO[] = (savesRes.data ?? []).map((r: any) => r.story).filter(Boolean).map(mapStory);
    const following: ElderDTO[] = (followsRes.data ?? []).map((r: any) => r.elder).filter(Boolean).map((e: any) => ({
      id: e.id, slug: e.slug, name: e.name, bio: e.bio, region: e.region ?? null, tribe: e.tribe ?? null, language: e.language ?? null,
    }));
    const historyStories: StoryDTO[] = [];
    const seen = new Set<string>();
    for (const r of historyRes.data ?? []) {
      const s = (r as any).story;
      if (s && !seen.has(s.id)) { seen.add(s.id); historyStories.push(mapStory(s)); }
    }
    const playlists = (playlistsRes.data ?? []).map((c: any) => ({ id: c.id, slug: c.slug, title: c.title, description: c.description, story_count: c.collection_items?.[0]?.count ?? 0 }));
    return { saved, following, history: historyStories, playlists };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string; saved: boolean }) => z.object({ storyId: z.string().uuid(), saved: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.saved) {
      await supabase.from("saves").insert({ user_id: userId, story_id: data.storyId });
    } else {
      await supabase.from("saves").delete().eq("user_id", userId).eq("story_id", data.storyId);
    }
    return { ok: true };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { elderId: string; following: boolean }) => z.object({ elderId: z.string().uuid(), following: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.following) {
      await supabase.from("follows").insert({ user_id: userId, elder_id: data.elderId });
    } else {
      await supabase.from("follows").delete().eq("user_id", userId).eq("elder_id", data.elderId);
    }
    return { ok: true };
  });

export const recordPlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string; ms: number }) => z.object({ storyId: z.string().uuid(), ms: z.number().int().nonnegative() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("play_history").insert({ user_id: userId, story_id: data.storyId, ms_listened: data.ms });
    await supabase.rpc("award_listen_point", { _story_id: data.storyId, _listener_id: userId });
    return { ok: true };
  });

export const createPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; description?: string }) =>
    z.object({ title: z.string().trim().min(1).max(120), description: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
    const { data: row, error } = await supabase.from("collections").insert({ title: data.title, description: data.description ?? null, slug, curator_id: userId, is_public: false }).select("id,slug").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addToPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { collectionId: string; storyId: string }) => z.object({ collectionId: z.string().uuid(), storyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("collection_items").upsert({ collection_id: data.collectionId, story_id: data.storyId, position: 0 }, { onConflict: "collection_id,story_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      elderName: z.string().trim().min(1).max(120),
      title: z.string().trim().min(1).max(160),
      region: z.string().max(120).optional(),
      tribe: z.string().max(120).optional(),
      language: z.string().max(120).optional(),
      storyType: z.string().max(60).optional(),
      mood: z.string().max(60).optional(),
      transcript: z.string().max(8000).optional(),
      audioUrl: z.string().max(2000).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { audioUrl, ...payload } = data;
    const { error } = await supabase.from("pending_stories").insert({
      submitter_id: userId,
      payload: payload as any,
      audio_url: audioUrl ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
