import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
        transcript: z.string().max(8000).optional(),
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
  .inputValidator((d: any) => z.object({ audioUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    await assertStaff(context.supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const audioRes = await fetch(data.audioUrl);
    if (!audioRes.ok) throw new Error("Could not download the audio file.");
    const blob = await audioRes.blob();
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
  .inputValidator((d: any) => z.object({ text: z.string().trim().min(1).max(8000) }).parse(d))
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
  audio_url: string | null;
  youtube_url: string | null;
  transcript_original: string | null;
  transcript_english: string | null;
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

// Admin-only: list published stories for editing (newest first, optional search).
export const listAdminStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ q: z.string().max(120).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<AdminStoryRow[]> => {
    await assertStaff(context.supabase, context.userId);
    let query = context.supabase
      .from("stories")
      .select(
        "id,slug,title,audio_url,youtube_url,cover_url,transcript_original,transcript_english,description,is_featured,elder:elders(name),region:regions(name),tribe:tribes(name),language:languages(name),story_themes(theme:themes(name,kind))",
      )
      .eq("status", "published")
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
        audio_url: r.audio_url,
        youtube_url: r.youtube_url,
        transcript_original: r.transcript_original,
        transcript_english: r.transcript_english,
        description: r.description,
        is_featured: r.is_featured ?? false,
        elder_name: r.elder?.name ?? null,
        region_name: r.region?.name ?? null,
        tribe_name: r.tribe?.name ?? null,
        language_name: r.language?.name ?? null,
        story_type: themes.find((t: any) => t.kind === "type")?.name ?? null,
        mood: themes.find((t: any) => t.kind === "mood")?.name ?? null,
      };
    });
  });

// Admin-only: update a published story's editable fields.
export const updateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        storyId: z.string().uuid(),
        youtubeUrl: z.string().max(500).optional(),
        transcriptOriginal: z.string().max(8000).optional(),
        transcriptEnglish: z.string().max(8000).optional(),
        description: z.string().max(2000).optional(),
        elderName: z.string().max(120).optional(),
        region: z.string().max(120).optional(),
        tribe: z.string().max(120).optional(),
        language: z.string().max(120).optional(),
        storyType: z.string().max(60).optional(),
        mood: z.string().max(60).optional(),
        isFeatured: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("update_story", {
      _story_id: data.storyId,
      _youtube_url: data.youtubeUrl ?? undefined,
      _transcript_original: data.transcriptOriginal ?? undefined,
      _transcript_english: data.transcriptEnglish ?? undefined,
      _description: data.description ?? undefined,
      _elder_name: data.elderName ?? undefined,
      _region: data.region ?? undefined,
      _tribe: data.tribe ?? undefined,
      _language: data.language ?? undefined,
      _story_type: data.storyType ?? undefined,
      _mood: data.mood ?? undefined,
      _is_featured: data.isFeatured ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

