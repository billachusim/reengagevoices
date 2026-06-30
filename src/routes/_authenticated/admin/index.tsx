import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/lib/admin.functions";
import { Inbox, Users, Mic, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview(), staleTime: 30_000 });
  const cards = [
    { label: "Pending review", value: data?.pendingCount ?? 0, icon: Inbox },
    { label: "Published stories", value: data?.publishedCount ?? 0, icon: Mic },
    { label: "Creators", value: data?.creatorCount ?? 0, icon: Users },
    { label: "Points awarded", value: data?.totalPoints ?? 0, icon: Sparkles },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border bg-card p-4">
          <c.icon className="h-5 w-5 text-primary" />
          <div className="mt-3 text-2xl font-bold">{c.value}</div>
          <div className="text-xs text-muted-foreground">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
