import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Heart, Plus, Share2, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { storyQuery } from "@/lib/queries";
import { getMyActivity, toggleSave } from "@/lib/library.functions";
import { usePlayer } from "@/components/player/audio-provider";
import { Waveform } from "@/components/waveform";
import { StoryCard } from "@/components/story-card";
import { Section, Rail } from "@/components/rail";
import { RouteError, RouteNotFound } from "@/components/route-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { coverGradient, elderPortrait, formatDuration } from "@/lib/constants";

export const Route = createFileRoute("/stories/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(storyQuery(params.slug));
    if (!data) throw notFound();
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `Story — ReEngage Voices` },
      { name: "description", content: "Listen to this story from an African elder, with transcript and provenance." },
      { property: "og:title", content: params.slug },
    ],
  }),
  component: StoryPage,
  errorComponent: RouteError,
  notFoundComponent: () => <RouteNotFound message="This story doesn't exist or isn't published yet." />,
});

function SaveButton({ storyId }: { storyId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["activity", user?.id], queryFn: () => getMyActivity(), enabled: !!user });
  const saved = data?.savedIds.includes(storyId) ?? false;
  const mut = useMutation({
    mutationFn: (next: boolean) => toggleSave({ data: { storyId, saved: next } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activity"] }); qc.invalidateQueries({ queryKey: ["library"] }); },
  });
  if (!user) return <Link to="/auth" className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium"><Heart className="h-4 w-4" /> Save</Link>;
  return (
    <button onClick={() => mut.mutate(!saved)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium">
      <Heart className={saved ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} /> {saved ? "Saved" : "Save"}
    </button>
  );
}

function StoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(storyQuery(slug));
  const player = usePlayer();
  const [tab, setTab] = useState("english");
  if (!data) return <RouteNotFound />;
  const { story, related } = data;
  const isCurrent = player.current?.id === story.id;
  const portrait = elderPortrait(story.elder?.slug);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: story.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };

  return (
    <div>
      <div className="grain relative overflow-hidden px-5 py-8 sm:px-8 sm:py-12" style={{ backgroundImage: coverGradient(story.slug) }}>
        <div className="relative z-10 flex flex-col gap-5 text-white sm:flex-row sm:items-end">
          <div className="h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-black/20 shadow-warm sm:h-48 sm:w-48">
            {portrait && <img src={portrait} alt="" className="h-full w-full object-cover opacity-80 mix-blend-luminosity" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Story</p>
            <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl">{story.title}</h1>
            <p className="mt-2 text-sm text-white/90">
              {story.elder && <Link to="/elders/$slug" params={{ slug: story.elder.slug }} className="underline-offset-2 hover:underline">{story.elder.name}</Link>}
              {" · "}{story.tribe?.name} · {story.language?.name} · {formatDuration(story.duration_seconds)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => (isCurrent ? player.toggle() : player.playStory(story, [story, ...related]))} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-foreground shadow">
                {isCurrent && player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {isCurrent && player.isPlaying ? "Pause" : "Play"}
              </button>
              <button onClick={() => { player.addToQueue(story); toast.success("Added to queue"); }} className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-sm font-medium"><Plus className="h-4 w-4" /> Queue</button>
              <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-sm font-medium"><Share2 className="h-4 w-4" /> Share</button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <SaveButton storyId={story.id} />
          {story.themes.map((t) => (
            <Link key={t.slug} to="/themes/$slug" params={{ slug: t.slug }}><Badge variant="secondary">{t.name}</Badge></Link>
          ))}
        </div>

        {/* Waveform */}
        <div className="mb-6 rounded-xl border bg-card p-4">
          <div className="h-16 text-foreground"><Waveform seed={story.slug} progress={isCurrent ? player.progress : 0} bars={120} onSeek={isCurrent ? player.seek : undefined} /></div>
        </div>

        {story.description && <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{story.description}</p>}

        {/* Transcript */}
        <Section title="Transcript">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="english">English</TabsTrigger>
              <TabsTrigger value="original">{story.language?.name ?? "Original"}</TabsTrigger>
            </TabsList>
            <TabsContent value="english">
              <article className="mt-3 max-w-2xl whitespace-pre-line font-serif text-[15px] leading-relaxed text-foreground/90">
                {story.transcript_english || "Transcript coming soon."}
              </article>
            </TabsContent>
            <TabsContent value="original">
              <article className="mt-3 max-w-2xl whitespace-pre-line font-serif text-[15px] leading-relaxed text-foreground/90">
                {story.transcript_original || "Transcript coming soon."}
              </article>
            </TabsContent>
          </Tabs>
        </Section>

        {/* Provenance */}
        <div className="mb-8 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          Recorded in {story.region?.name ?? "an unrecorded place"} · {story.play_count.toLocaleString()} plays
        </div>

        {related.length > 0 && (
          <Section title="Related stories">
            <Rail>{related.map((s) => <div key={s.id} className="w-40 shrink-0 sm:w-44"><StoryCard story={s} queue={related} /></div>)}</Rail>
          </Section>
        )}
      </div>
    </div>
  );
}
