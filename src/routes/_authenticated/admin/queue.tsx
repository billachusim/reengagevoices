import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getModerationQueue, approveSubmission, rejectSubmission, transcribeAudio, type QueueItem } from "@/lib/admin.functions";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  published: "secondary",
  rejected: "destructive",
};

export const Route = createFileRoute("/_authenticated/admin/queue")({
  component: QueuePage,
});

function QueuePage() {
  const { data: items } = useQuery({ queryKey: ["moderation-queue"], queryFn: () => getModerationQueue(), staleTime: 10_000 });
  const [active, setActive] = useState<QueueItem | null>(null);
  const pending = (items ?? []).filter((i) => i.status === "pending");
  const reviewed = (items ?? []).filter((i) => i.status !== "pending");

  return (
    <div className="space-y-6">
      <Section title={`Pending (${pending.length})`} items={pending} onOpen={setActive} />
      {reviewed.length > 0 && <Section title="Reviewed" items={reviewed} onOpen={setActive} />}
      {active && <ReviewDialog item={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function Section({ title, items, onOpen }: { title: string; items: QueueItem[]; onOpen: (i: QueueItem) => void }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => onOpen(i)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-3 text-left hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{i.payload.title ?? "Untitled"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {i.payload.elderName ?? "—"} · by {i.submitter_name ?? "Unknown"}
                </div>
              </div>
              <Badge variant={statusVariant[i.status] ?? "outline"}>{i.status}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewDialog({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const qc = useQueryClient();
  const p = item.payload;
  const [form, setForm] = useState({
    title: p.title ?? "",
    elderName: p.elderName ?? "",
    region: p.region ?? "",
    tribe: p.tribe ?? "",
    language: p.language ?? "",
    storyType: p.storyType ?? "",
    mood: p.mood ?? "",
    transcript: p.transcript ?? "",
    pointAward: 25,
  });
  const [reason, setReason] = useState("");
  const editable = item.status === "pending";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["moderation-queue"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["stories"] });
  };

  const approve = useMutation({
    mutationFn: () =>
      approveSubmission({
        data: {
          pendingId: item.id,
          title: form.title,
          elderName: form.elderName,
          region: form.region,
          tribe: form.tribe,
          language: form.language,
          storyType: form.storyType,
          mood: form.mood,
          transcript: form.transcript,
          pointAward: Number(form.pointAward) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Published & creator credited.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not approve"),
  });

  const reject = useMutation({
    mutationFn: () => rejectSubmission({ data: { pendingId: item.id, reason } }),
    onSuccess: () => {
      toast.success("Submission rejected.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not reject"),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Submitted by {item.submitter_name ?? "Unknown"}</div>
          {item.audio_url && <audio controls src={item.audio_url} className="w-full" />}
          <input disabled={!editable} value={form.title} onChange={set("title")} placeholder="Story title" className={inputCls} />
          <input disabled={!editable} value={form.elderName} onChange={set("elderName")} placeholder="Elder name" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input disabled={!editable} value={form.region} onChange={set("region")} placeholder="Region" className={inputCls} />
            <input disabled={!editable} value={form.tribe} onChange={set("tribe")} placeholder="Tribe" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input disabled={!editable} value={form.language} onChange={set("language")} placeholder="Language" className={inputCls} />
            <input disabled={!editable} value={form.storyType} onChange={set("storyType")} placeholder="Type" className={inputCls} />
            <input disabled={!editable} value={form.mood} onChange={set("mood")} placeholder="Mood" className={inputCls} />
          </div>
          <textarea disabled={!editable} value={form.transcript} onChange={set("transcript")} rows={4} placeholder="Transcript" className={inputCls} />

          {item.status === "rejected" && item.reject_reason && (
            <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">Rejected: {item.reject_reason}</p>
          )}

          {editable && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Points to award</label>
                <input
                  type="number"
                  value={form.pointAward}
                  onChange={set("pointAward")}
                  className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
                />
              </div>
              <button
                disabled={approve.isPending}
                onClick={() => approve.mutate()}
                className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {approve.isPending ? "Publishing…" : "Approve & publish"}
              </button>
              <div className="flex gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason to reject"
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <button
                  disabled={reject.isPending || !reason.trim()}
                  onClick={() => reject.mutate()}
                  className="rounded-full border border-destructive px-4 py-2 text-sm font-medium text-destructive disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
