import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getLibrary } from "@/lib/library.functions";
import { getMyCreatorStats, type MySubmission } from "@/lib/creator.functions";
import { StoryRow } from "@/components/story-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { coverGradient, coverImage, elderPortrait } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const { data: creator } = useQuery({ queryKey: ["creator-stats"], queryFn: () => getMyCreatorStats() });
  if (isLoading || !data) return <div className="px-5 py-10 text-sm text-muted-foreground sm:px-8">Loading your library…</div>;
  const { saved, following, history, playlists } = data;
  const submissions = creator?.submissions ?? [];

  return (
    <div className="px-5 py-6 sm:px-8">
      <h1 className="mb-5 font-serif text-2xl font-bold sm:text-3xl">Your library</h1>
      <Tabs defaultValue="saved">
        <TabsList>
          <TabsTrigger value="saved">Saved {saved.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{saved.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="playlists">Playlists {playlists.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{playlists.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="following">Following {following.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{following.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="submissions">Submissions {submissions.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{submissions.length}</Badge>}</TabsTrigger>

        </TabsList>

        <TabsContent value="saved" className="mt-4 max-w-2xl">
          {saved.length === 0 ? <Empty text="Stories you save will appear here." /> : saved.map((s) => <StoryRow key={s.id} story={s} queue={saved} />)}
        </TabsContent>
        <TabsContent value="playlists" className="mt-4">
          {playlists.length === 0 ? <Empty text="You haven't created any playlists yet." /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((c) => (
                <Link key={c.id} to="/collections/$slug" params={{ slug: c.slug }} className="grain flex aspect-[16/9] flex-col justify-end rounded-xl p-4 text-white shadow-warm" style={{ backgroundImage: coverGradient(c.slug) }}>
                  <h3 className="font-serif text-lg font-semibold">{c.title}</h3>
                  <p className="text-xs text-white/80">{c.story_count} stories</p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="following" className="mt-4">
          {following.length === 0 ? <Empty text="Follow elders to keep up with their stories." /> : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {following.map((e) => (
                <Link key={e.id} to="/elders/$slug" params={{ slug: e.slug }} className="text-center">
                  <div className="mx-auto aspect-square w-full overflow-hidden rounded-full shadow-warm" style={{ backgroundImage: coverGradient(e.slug) }}>
                    {elderPortrait(e.slug) && <img src={elderPortrait(e.slug)} alt={e.name} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <p className="mt-2 text-sm font-medium">{e.name}</p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4 max-w-2xl">
          {history.length === 0 ? <Empty text="Your listening history will show up here." /> : history.map((s) => <StoryRow key={s.id} story={s} queue={history} />)}
        </TabsContent>
        <TabsContent value="submissions" className="mt-4 max-w-2xl space-y-3">
          {submissions.length === 0 ? (
            <Empty text="Stories you record or upload will appear here while they await review." />
          ) : (
            submissions.map((s) => <SubmissionRow key={s.id} sub={s} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending review", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  published: { label: "Approved", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive" },
};

function SubmissionRow({ sub }: { sub: MySubmission }) {
  const status = STATUS_STYLES[sub.status] ?? { label: sub.status, className: "bg-muted text-muted-foreground" };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{sub.title}</h3>
          <p className="text-xs text-muted-foreground">Elder: {sub.elder_name} · {new Date(sub.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
      </div>
      {sub.status === "rejected" && sub.reject_reason && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="font-semibold">Admin note:</span> {sub.reject_reason}
        </p>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">{text}</div>;
}

