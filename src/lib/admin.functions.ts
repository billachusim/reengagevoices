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
