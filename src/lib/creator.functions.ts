import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MySubmission {
  id: string;
  status: string;
  created_at: string;
  reject_reason: string | null;
  title: string;
  elder_name: string;
}

export interface PointEvent {
  id: string;
  kind: string;
  points: number;
  created_at: string;
  story_title: string | null;
}

export interface CreatorStats {
  points: number;
  approved_count: number;
  verified: boolean;
  submissions: MySubmission[];
  events: PointEvent[];
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    return (data ?? []).map((r: any) => r.role);
  });

export const getMyCreatorStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorStats> => {
    const { supabase, userId } = context;
    const [statsRes, subsRes, eventsRes] = await Promise.all([
      supabase.from("creator_stats").select("points,approved_count,verified").eq("user_id", userId).maybeSingle(),
      supabase
        .from("pending_stories")
        .select("id,status,created_at,reject_reason,payload")
        .eq("submitter_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("point_events")
        .select("id,kind,points,created_at,story:stories(title)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const submissions: MySubmission[] = (subsRes.data ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      reject_reason: r.reject_reason,
      title: r.payload?.title ?? "Untitled",
      elder_name: r.payload?.elderName ?? "—",
    }));
    const events: PointEvent[] = (eventsRes.data ?? []).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      points: r.points,
      created_at: r.created_at,
      story_title: r.story?.title ?? null,
    }));
    return {
      points: statsRes.data?.points ?? 0,
      approved_count: statsRes.data?.approved_count ?? 0,
      verified: statsRes.data?.verified ?? false,
      submissions,
      events,
    };
  });
