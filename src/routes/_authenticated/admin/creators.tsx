import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCreators, setCreatorVerified, setUserRole } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/creators")({
  component: CreatorsPage,
});

function CreatorsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: creators } = useQuery({ queryKey: ["admin-creators"], queryFn: () => listCreators(), staleTime: 10_000 });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-creators"] });

  const verify = useMutation({
    mutationFn: (v: { userId: string; verified: boolean }) => setCreatorVerified({ data: v }),
    onSuccess: () => { toast.success("Updated."); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const role = useMutation({
    mutationFn: (v: { userId: string; role: "moderator" | "admin"; grant: boolean }) => setUserRole({ data: v }),
    onSuccess: () => { toast.success("Role updated."); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (!creators?.length) return <p className="text-sm text-muted-foreground">No creators yet.</p>;

  return (
    <div className="space-y-2">
      {creators.map((c) => (
        <div key={c.user_id} className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {c.display_name ?? "Creator"}
              {c.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
              {c.is_admin && <Badge variant="secondary" className="text-[10px]">admin</Badge>}
              {c.is_moderator && !c.is_admin && <Badge variant="outline" className="text-[10px]">mod</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">{c.points} pts · {c.approved_count} approved</div>
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-3 sm:border-0 sm:pt-0">
            <button
              onClick={() => verify.mutate({ userId: c.user_id, verified: !c.verified })}
              className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              {c.verified ? "Unverify" : "Verify"}
            </button>
            {isAdmin && (
              <button
                onClick={() => role.mutate({ userId: c.user_id, role: "moderator", grant: !c.is_moderator })}
                className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                {c.is_moderator ? "Remove mod" : "Make mod"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
