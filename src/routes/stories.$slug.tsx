import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Heart, Plus, Share2, FileText, Video, Headphones, Lock, ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
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
import { coverGradient, elderImage, formatDuration } from "@/lib/constants";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/stories/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(storyQuery(params.slug));
    if (!data) throw notFound();
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `Story — ReEngage African Voices` },
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

const PREVIEW_CHARS = 700;

function GatedText({ text, signedIn, id }: { text: string | null; signedIn: boolean; id?: string }) {
  if (!text || !text.trim()) return <p className="mt-3 text-sm text-muted-foreground">Coming soon.</p>;
  const gated = !signedIn && text.length > PREVIEW_CHARS;
  const shown = gated ? text.slice(0, PREVIEW_CHARS) + "…" : text;
  return (
    <div id={id} className="scroll-mt-24">
      <article className="mt-3 max-w-2xl space-y-4 font-serif text-[16px] leading-[1.85] text-foreground/90">
        {shown
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, i) => (
            <p key={i} className="whitespace-pre-line first:first-letter:float-left first:first-letter:mr-2 first:first-letter:mt-1 first:first-letter:font-bold first:first-letter:text-5xl first:first-letter:leading-[0.85] first:first-letter:text-primary">
              {p}
            </p>
          ))}
      </article>
      {gated && (
        <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border bg-muted/50 p-4">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <p className="flex-1 text-sm text-muted-foreground">Sign in free to read the whole story and listen without limits.</p>
          <Link to="/auth" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Sign in</Link>
        </div>
      )}
    </div>
  );
}

function StoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(storyQuery(slug));
  const player = usePlayer();
  const [tab, setTab] = useState("english");
  const [mode, setMode] = useState<"audio" | "video">("audio");
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const { user } = useAuth();
  const [openingManuscript, setOpeningManuscript] = useState(false);
  if (!data) return <RouteNotFound />;
  const { story, related } = data;
  const isCurrent = player.current?.id === story.id;
  const heroImage = elderImage(story.elder);
  const embedUrl = youtubeEmbedUrl(story.youtube_url);
  const hasAudio = !!story.audio_url;
  const isWritten = !hasAudio && !embedUrl;
  const activeMode: "audio" | "video" = !hasAudio && embedUrl ? "video" : mode;

  const scrollToWatch = () => {
    document.getElementById("watch")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const command = (func: "playVideo" | "pauseVideo") => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  };

  const playAudio = () => {
    setMode("audio");
    command("pauseVideo");
    if (isCurrent) player.toggle();
    else player.playStory(story, [story, ...related].filter((s) => s.audio_url));
    setTimeout(scrollToWatch, 50);
  };

  const showVideo = () => {
    setMode("video");
    if (isCurrent && player.isPlaying) player.toggle();
    setTimeout(() => { command("playVideo"); scrollToWatch(); }, 50);
  };

  const primaryPlay = () => (hasAudio ? playAudio() : embedUrl ? showVideo() : scrollToWatch());

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: story.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };

  const openManuscript = async () => {
    if (!story.manuscript_url) return;
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setOpeningManuscript(true);
    try {
      const { data: signed, error } = await supabase.storage
        .from("story-documents")
        .createSignedUrl(story.manuscript_url, 60 * 10, { download: false });
      if (error || !signed?.signedUrl) throw error ?? new Error("Could not open the document.");
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the full story.");
    } finally {
      setOpeningManuscript(false);
    }
  };

  return (
    <div>
      <div className="grain relative overflow-hidden px-5 py-8 sm:px-8 sm:py-12" style={{ backgroundImage: coverGradient(story.slug) }}>
        <div className="relative z-10 flex flex-col gap-5 text-white sm:flex-row sm:items-end">
          {heroImage && (
            <div className="h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-black/20 shadow-warm sm:h-48 sm:w-48">
              <img src={heroImage} alt="" className="h-full w-full object-cover opacity-80 mix-blend-luminosity" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Story</p>
            <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl">{story.title}</h1>
            <p className="mt-2 text-sm text-white/90">
              {story.elder && <Link to="/elders/$slug" params={{ slug: story.elder.slug }} className="underline-offset-2 hover:underline">{story.elder.name}</Link>}
              {" · "}{story.tribe?.name} · {story.language?.name} · {formatDuration(story.duration_seconds)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={primaryPlay} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-foreground shadow">
                {isWritten ? <FileText className="h-4 w-4" /> : isCurrent && player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isWritten ? "Read story" : isCurrent && player.isPlaying ? "Pause" : "Play"}
              </button>
              {hasAudio && <button onClick={() => { player.addToQueue(story); toast.success("Added to queue"); }} className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-sm font-medium"><Plus className="h-4 w-4" /> Queue</button>}
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

        {story.description && <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{story.description}</p>}

        {/* Media: audio / video */}
        {!isWritten && (
          <div id="watch" className="mb-8 max-w-2xl scroll-mt-24 overflow-hidden rounded-2xl border bg-card">
            {embedUrl && (
              <div className={activeMode === "video" ? "aspect-video w-full bg-black" : "aspect-video w-full bg-black opacity-90"}>
                <iframe
                  ref={frameRef}
                  src={`${embedUrl}?enablejsapi=1&rel=0`}
                  title={`${story.title} — video`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            )}
            {hasAudio && activeMode === "audio" && (
              <div className="p-5">
                <div className="h-20 text-foreground"><Waveform seed={story.slug} progress={isCurrent ? player.progress : 0} bars={120} onSeek={isCurrent ? player.seek : undefined} /></div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t bg-muted/50 p-3">
              {hasAudio && (
                <button
                  onClick={playAudio}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${activeMode === "audio" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background"}`}
                >
                  <Headphones className="h-4 w-4" /> Audio
                </button>
              )}
              {embedUrl && (
                <button
                  onClick={showVideo}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${activeMode === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background"}`}
                >
                  <Video className="h-4 w-4" /> Video
                </button>
              )}
            </div>
          </div>
        )}

        {/* Transcript */}
        <Section title={isWritten ? "The story" : "Transcript"}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="english">English</TabsTrigger>
              <TabsTrigger value="original">{story.language?.name ?? "Original"}</TabsTrigger>
            </TabsList>
            <TabsContent value="english">
              <GatedText text={story.transcript_english} signedIn={!!user} id={isWritten ? "watch" : undefined} />
            </TabsContent>
            <TabsContent value="original">
              <GatedText text={story.transcript_original} signedIn={!!user} />
            </TabsContent>
          </Tabs>
          {story.manuscript_url && (
            <div className="mt-6 max-w-2xl border-t pt-5">
              <button
                type="button"
                onClick={openManuscript}
                disabled={openingManuscript}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <ExternalLink className="h-4 w-4" />
                {openingManuscript ? "Opening…" : "Open full story"}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                {user
                  ? `${story.manuscript_filename || "Full manuscript"} opens in a new tab and can be downloaded there.`
                  : "Sign in free to open or download the complete manuscript."}
              </p>
            </div>
          )}
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
