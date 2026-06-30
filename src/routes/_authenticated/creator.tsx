import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyCreatorStats } from "@/lib/creator.functions";
import { VerifiedBadge } from "@/components/verified-badge";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/creator")({
  component: CreatorPage,
});

const VERIFY_THRESHOLD = 100;

function tier(points: number) {
  if (points >= 500) return "Guardian";
  if (points >= 100) return "Keeper";
  return "Sprout";
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  published: "secondary",
  rejected: "destructive",
};

function CreatorPage() {
  const { data } = useQuery({ queryKey: ["my-creator-stats"], queryFn: () => getMyCreatorStats(), staleTime: 15_000 });
  const points = data?.points ?? 0;
  const pct = Math.min(100, Math.round((points / VERIFY_THRESHOLD) * 100));

  return (
    <div className="mx-auto max-w-xl px-5 py-8 sm:px-8">
      <h1 className="font-serif text-2xl font-bold sm:text-3xl">Creator program</h1>
      <p className="mt-1 text-sm text-muted-foreground">Record elders, get published, earn points.</p>

      <div className="my-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-3xl font-bold">
              <Sparkles className="h-6 w-6 text-primary" /> {points}
            </div>
            <div className="text-xs text-muted-foreground">points · {tier(points)}</div>
          </div>
          {data?.verified && <VerifiedBadge />}
        </div>
        {!data?.verified && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{Math.max(0, VERIFY_THRESHOLD - points)} points to verification</p>
          </div>
        )}
        <div className="mt-4 text-xs text-muted-foreground">{data?.approved_count ?? 0} stories published</div>
      </div>

      <h2 className="mb-2 text-sm font-semibold">My submissions</h2>
      {data?.submissions.length ? (
        <div className="space-y-2">
          {data.submissions.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{s.elder_name}</div>
                </div>
                <Badge variant={statusVariant[s.status] ?? "outline"}>{s.status}</Badge>
              </div>
              {s.status === "rejected" && s.reject_reason && (
                <p className="mt-2 text-xs text-destructive">Reason: {s.reject_reason}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      )}

      {data?.events.length ? (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold">Points history</h2>
          <div className="space-y-1">
            {data.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm">
                <span className="text-muted-foreground">
                  {e.kind === "approval" ? "Story published" : "Listen"} {e.story_title ? `· ${e.story_title}` : ""}
                </span>
                <span className="font-medium text-primary">+{e.points}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
