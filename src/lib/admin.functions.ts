import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { audioObjectPath } from "./audio-storage";

async function assertStaff(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
  ]);
  if (!isAdmin && !isMod) throw new Error("Not authorized");
  return { isAdmin: !!isAdmin };
}

export interface QueueItem {
  id: string;
  status: string;
  created_at: string;
  audio_url: string | null;
  reject_reason: string | null;
  submitter_id: string | null;
  submitter_name: string | null;
  payload: Record<string, any>;
}

export const getModerationQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QueueItem[]> => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const { data, error } = await supabase
      .from("pending_stories")
      .select("id,status,created_at,audio_url,reject_reason,submitter_id,payload")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const ids = [...new Set(rows.map((r: any) => r.submitter_id).filter(Boolean))];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,display_name").in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.display_name]));
    }
    return rows.map((r: any) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      audio_url: r.audio_url,
      reject_reason: r.reject_reason,
      submitter_id: r.submitter_id,
      submitter_name: r.submitter_id ? names[r.submitter_id] ?? null : null,
      payload: (r.payload ?? {}) as Record<string, any>,
    }));
  });

export const approveSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        pendingId: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        elderName: z.string().trim().min(1).max(120),
        region: z.string().max(120).optional(),
        tribe: z.string().max(120).optional(),
        language: z.string().max(120).optional(),
        storyType: z.string().max(60).optional(),
        mood: z.string().max(60).optional(),
        transcript: z.string().max(200000).optional(),
        description: z.string().max(2000).optional(),
        youtubeUrl: z.string().max(500).optional(),
        pointAward: z.number().int().min(0).max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const { data: storyId, error } = await supabase.rpc("approve_pending_story", {
      _pending_id: data.pendingId,
      _title: data.title,
      _elder_name: data.elderName,
      _region: data.region || undefined,
      _tribe: data.tribe || undefined,
      _language: data.language || undefined,
      _story_type: data.storyType || undefined,
      _mood: data.mood || undefined,
      _transcript: data.transcript || undefined,
      _description: data.description || undefined,
      _youtube_url: data.youtubeUrl || undefined,
      _point_award: data.pointAward ?? 25,
    });
    if (error) throw new Error(error.message);
    return { ok: true, storyId };
  });

export const rejectSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ pendingId: z.string().uuid(), reason: z.string().trim().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const { error } = await supabase.rpc("reject_pending_story", { _pending_id: data.pendingId, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const [pending, creators, points, published] = await Promise.all([
      supabase.from("pending_stories").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("creator_stats").select("user_id", { count: "exact", head: true }),
      supabase.from("point_events").select("points"),
      supabase.from("stories").select("id", { count: "exact", head: true }).eq("status", "published"),
    ]);
    const totalPoints = (points.data ?? []).reduce((sum: number, r: any) => sum + (r.points ?? 0), 0);
    return {
      pendingCount: pending.count ?? 0,
      creatorCount: creators.count ?? 0,
      publishedCount: published.count ?? 0,
      totalPoints,
    };
  });

export interface CreatorRow {
  user_id: string;
  display_name: string | null;
  points: number;
  approved_count: number;
  verified: boolean;
  is_admin: boolean;
  is_moderator: boolean;
}

export const listCreators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorRow[]> => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const { data: stats, error } = await supabase
      .from("creator_stats")
      .select("user_id,points,approved_count,verified")
      .order("points", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = stats ?? [];
    const ids = rows.map((r: any) => r.user_id);
    let names: Record<string, string> = {};
    let roles: Record<string, string[]> = {};
    if (ids.length) {
      const [{ data: profs }, { data: rl }] = await Promise.all([
        supabase.from("profiles").select("id,display_name").in("id", ids),
        supabase.from("user_roles").select("user_id,role").in("user_id", ids),
      ]);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.display_name]));
      for (const r of rl ?? []) (roles[r.user_id] ??= []).push(r.role);
    }
    return rows.map((r: any) => ({
      user_id: r.user_id,
      display_name: names[r.user_id] ?? null,
      points: r.points,
      approved_count: r.approved_count,
      verified: r.verified,
      is_admin: (roles[r.user_id] ?? []).includes("admin"),
      is_moderator: (roles[r.user_id] ?? []).includes("moderator"),
    }));
  });

export const setCreatorVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ userId: z.string().uuid(), verified: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("set_creator_verified", { _user_id: data.userId, _verified: data.verified });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "moderator", "user"]), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("set_user_role", { _user_id: data.userId, _role: data.role, _grant: data.grant });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1";

function extFromType(type: string) {
  const t = type.split(";")[0];
  return ({ "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/aac": "aac", "audio/m4a": "m4a" } as Record<string, string>)[t] ?? "webm";
}

// Admin-only: transcribe a story's audio with Lovable AI speech-to-text.
export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ audioUrl: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    await assertStaff(context.supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const path = audioObjectPath(data.audioUrl, process.env.SUPABASE_URL);
    if (!path) throw new Error("Transcription requires audio uploaded to this archive.");
    const { data: blob, error } = await context.supabase.storage.from("story-audio").download(path);
    if (error || !blob) throw new Error("Could not download the audio file.");
    const type = blob.type || "audio/webm";

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `audio.${extFromType(type)}`);

    const res = await fetch(`${LOVABLE_GATEWAY}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (res.status === 429) throw new Error("AI is rate-limited right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`Transcription failed (${res.status}).`);
    const json: any = await res.json();
    const text = json?.text ?? "";
    if (!text) throw new Error("No speech was detected in the audio.");
    return { text };
  });

// Admin-only: translate transcript text to English with Lovable AI.
export const translateToEnglish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ text: z.string().trim().min(1).max(200000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    await assertStaff(context.supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const res = await fetch(`${LOVABLE_GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a translator. Translate the user's text into clear, natural English. Return only the translation, with no preamble or notes." },
          { role: "user", content: data.text },
        ],
      }),
    });
    if (res.status === 429) throw new Error("AI is rate-limited right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`Translation failed (${res.status}).`);
    const json: any = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Could not translate the text.");
    return { text: text.trim() };
  });

export interface AdminStoryRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  audio_url: string | null;
  duration_seconds: number;
  youtube_url: string | null;
  transcript_original: string | null;
  transcript_english: string | null;
  manuscript_url: string | null;
  manuscript_filename: string | null;
  description: string | null;
  is_featured: boolean;
  elder_name: string | null;
  region_name: string | null;
  tribe_name: string | null;
  language_name: string | null;
  story_type: string | null;
  mood: string | null;
  cover_url: string | null;
}

// Admin-only: list stories for editing (newest first, optional search).
export const listAdminStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ q: z.string().max(120).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<AdminStoryRow[]> => {
    await assertStaff(context.supabase, context.userId);
    let query = context.supabase
      .from("stories")
      .select(
        "id,slug,title,status,audio_url,duration_seconds,youtube_url,cover_url,transcript_original,transcript_english,manuscript_url,manuscript_filename,description,is_featured,elder:elders(name),region:regions(name),tribe:tribes(name),language:languages(name),story_themes(theme:themes(name,kind))",
      )
      .in("status", ["published", "draft"])
      .order("published_at", { ascending: false })
      .limit(50);
    if (data.q && data.q.trim()) query = query.ilike("title", `%${data.q.trim()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any): AdminStoryRow => {
      const themes = (r.story_themes ?? []).map((st: any) => st.theme).filter(Boolean);
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        status: r.status,
        audio_url: r.audio_url,
        duration_seconds: r.duration_seconds ?? 0,
        youtube_url: r.youtube_url,
        transcript_original: r.transcript_original,
        transcript_english: r.transcript_english,
        manuscript_url: r.manuscript_url,
        manuscript_filename: r.manuscript_filename,
        description: r.description,
        is_featured: r.is_featured ?? false,
        elder_name: r.elder?.name ?? null,
        region_name: r.region?.name ?? null,
        tribe_name: r.tribe?.name ?? null,
        language_name: r.language?.name ?? null,
        story_type: themes.find((t: any) => t.kind === "type")?.name ?? null,
        mood: themes.find((t: any) => t.kind === "mood")?.name ?? null,
        cover_url: r.cover_url ?? null,
      };
    });
  });

// Admin-only: update a story's editable fields.
export const updateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        storyId: z.string().uuid(),
        title: z.string().trim().min(1).max(160).optional(),
        regenerateSlug: z.boolean().optional(),
        audioUrl: z.string().max(2000).optional(),
        durationSeconds: z.number().int().min(0).max(86400).optional(),
        status: z.enum(["published", "draft"]).optional(),
        youtubeUrl: z.string().max(500).optional(),
        transcriptOriginal: z.string().max(200000).optional(),
        transcriptEnglish: z.string().max(200000).optional(),
        manuscriptUrl: z.string().max(2000).optional(),
        manuscriptFilename: z.string().max(255).optional(),
        description: z.string().max(2000).optional(),
        elderName: z.string().max(120).optional(),
        region: z.string().max(120).optional(),
        tribe: z.string().max(120).optional(),
        language: z.string().max(120).optional(),
        storyType: z.string().max(60).optional(),
        mood: z.string().max(60).optional(),
        isFeatured: z.boolean().optional(),
        coverUrl: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("update_story", {
      _story_id: data.storyId,
      _title: data.title ?? undefined,
      _regenerate_slug: data.regenerateSlug ?? false,
      _audio_url: data.audioUrl ?? undefined,
      _duration_seconds: data.durationSeconds ?? undefined,
      _status: data.status ?? undefined,
      _youtube_url: data.youtubeUrl ?? undefined,
      _transcript_original: data.transcriptOriginal ?? undefined,
      _transcript_english: data.transcriptEnglish ?? undefined,
      _manuscript_url: data.manuscriptUrl ?? undefined,
      _manuscript_filename: data.manuscriptFilename ?? undefined,
      _description: data.description ?? undefined,
      _elder_name: data.elderName ?? undefined,
      _region: data.region ?? undefined,
      _tribe: data.tribe ?? undefined,
      _language: data.language ?? undefined,
      _story_type: data.storyType ?? undefined,
      _mood: data.mood ?? undefined,
      _is_featured: data.isFeatured ?? undefined,
      _cover_url: data.coverUrl ?? undefined,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin-only: create a story from scratch. Format (audio / video / full /
// written) is derived from whichever media fields are filled in.
export const createStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        title: z.string().trim().min(1).max(160),
        elderName: z.string().max(120).optional(),
        description: z.string().max(2000).optional(),
        region: z.string().max(120).optional(),
        tribe: z.string().max(120).optional(),
        language: z.string().max(120).optional(),
        storyType: z.string().max(60).optional(),
        mood: z.string().max(60).optional(),
        coverUrl: z.string().max(2000).optional(),
        audioUrl: z.string().max(2000).optional(),
        durationSeconds: z.number().int().min(0).max(86400).optional(),
        youtubeUrl: z.string().max(500).optional(),
        transcriptOriginal: z.string().max(200000).optional(),
        transcriptEnglish: z.string().max(200000).optional(),
        manuscriptUrl: z.string().max(2000).optional(),
        manuscriptFilename: z.string().max(255).optional(),
        isFeatured: z.boolean().optional(),
        status: z.enum(["published", "draft"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ storyId: string }> => {
    await assertStaff(context.supabase, context.userId);
    const { data: id, error } = await (context.supabase as any).rpc("create_story", {
      _title: data.title,
      _elder_name: data.elderName ?? null,
      _description: data.description ?? null,
      _region: data.region ?? null,
      _tribe: data.tribe ?? null,
      _language: data.language ?? null,
      _story_type: data.storyType ?? null,
      _mood: data.mood ?? null,
      _cover_url: data.coverUrl ?? null,
      _audio_url: data.audioUrl ?? null,
      _duration_seconds: data.durationSeconds ?? 0,
      _youtube_url: data.youtubeUrl ?? null,
      _transcript_original: data.transcriptOriginal ?? null,
      _transcript_english: data.transcriptEnglish ?? null,
      _manuscript_url: data.manuscriptUrl ?? null,
      _manuscript_filename: data.manuscriptFilename ?? null,
      _is_featured: data.isFeatured ?? false,
      _status: data.status ?? "published",
    });
    if (error) throw new Error(error.message);
    return { storyId: id as string };
  });

// Admin-only: permanently delete a story and its links.
export const deleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ storyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await (context.supabase as any).rpc("delete_story", { _story_id: data.storyId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });



/* ---------------- Elders ---------------- */

export interface AdminElderRow {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  region_name: string | null;
  tribe_name: string | null;
  language_name: string | null;
  story_count: number;
  is_homepage: boolean;
  sort_order: number;
}

export const listAdminElders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminElderRow[]> => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("elders")
      .select(
        "id,slug,name,bio,photo_url,is_homepage,sort_order,region:regions(name),tribe:tribes(name),language:languages!primary_language_id(name),stories(count)",
      )
      .order("is_homepage", { ascending: false })
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      bio: r.bio ?? null,
      photo_url: r.photo_url ?? null,
      region_name: r.region?.name ?? null,
      tribe_name: r.tribe?.name ?? null,
      language_name: r.language?.name ?? null,
      story_count: r.stories?.[0]?.count ?? 0,
      is_homepage: r.is_homepage ?? false,
      sort_order: r.sort_order ?? 0,
    }));
  });

export const saveElder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        elderId: z.string().uuid().optional(),
        name: z.string().trim().max(120).optional(),
        bio: z.string().max(4000).optional(),
        photoUrl: z.string().max(2000).optional(),
        region: z.string().max(120).optional(),
        tribe: z.string().max(120).optional(),
        language: z.string().max(120).optional(),
        isHomepage: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: id, error } = await (context.supabase as any).rpc("upsert_elder", {
      _elder_id: data.elderId ?? undefined,
      _name: data.name ?? undefined,
      _bio: data.bio ?? undefined,
      _photo_url: data.photoUrl ?? undefined,
      _region: data.region ?? undefined,
      _tribe: data.tribe ?? undefined,
      _language: data.language ?? undefined,
      _is_homepage: data.isHomepage ?? undefined,
      _sort_order: data.sortOrder ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const deleteElder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ elderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await (context.supabase as any).rpc("delete_elder", { _elder_id: data.elderId });
    // Expected refusals (e.g. the elder still has stories) come back as a
    // result, not a thrown error, so the admin sees a toast instead of a crash.
    if (error) return { ok: false as const, message: error.message.replace(/^.*?Cannot delete:/, "Cannot delete:") };
    return { ok: true as const, message: "" };
  });

/* ---------------- Collections ---------------- */

export interface AdminCollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  is_homepage: boolean;
  sort_order: number;
  story_ids: string[];
}

export const listAdminCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCollectionRow[]> => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("collections")
      .select("id,slug,title,description,cover_url,is_public,is_homepage,sort_order,collection_items(story_id,position)")
      .order("is_homepage", { ascending: false })
      .order("sort_order")
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description ?? null,
      cover_url: c.cover_url ?? null,
      is_public: c.is_public ?? true,
      is_homepage: c.is_homepage ?? false,
      sort_order: c.sort_order ?? 0,
      story_ids: (c.collection_items ?? [])
        .slice()
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        .map((i: any) => i.story_id),
    }));
  });

export const saveCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        collectionId: z.string().uuid().optional(),
        title: z.string().trim().max(160).optional(),
        description: z.string().max(2000).optional(),
        coverUrl: z.string().max(2000).optional(),
        isPublic: z.boolean().optional(),
        isHomepage: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
        storyIds: z.array(z.string().uuid()).max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: id, error } = await (context.supabase as any).rpc("upsert_collection", {
      _collection_id: data.collectionId ?? undefined,
      _title: data.title ?? undefined,
      _description: data.description ?? undefined,
      _cover_url: data.coverUrl ?? undefined,
      _is_public: data.isPublic ?? undefined,
      _is_homepage: data.isHomepage ?? undefined,
      _sort_order: data.sortOrder ?? undefined,
    });
    if (error) throw new Error(error.message);
    if (data.storyIds) {
      const { error: e2 } = await (context.supabase as any).rpc("set_collection_items", {
        _collection_id: id,
        _story_ids: data.storyIds,
      });
      if (e2) throw new Error(e2.message);
    }
    return { id: id as string };
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ collectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await (context.supabase as any).rpc("delete_collection", { _collection_id: data.collectionId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
