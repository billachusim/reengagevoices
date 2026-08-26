import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Play, Video, ArrowRight } from "lucide-react";
import { storiesQuery, collectionsQuery, eldersQuery, facetsQuery } from "@/lib/queries";
import { StoryCard } from "@/components/story-card";
import { Section, Rail } from "@/components/rail";
import { ScallopDivider } from "@/components/scallop-divider";
import { HowItWorks } from "@/components/how-it-works";
import { SiteFooter } from "@/components/site-footer";
import { usePlayer } from "@/components/player/audio-provider";
import { coverGradient, coverImage, elderImage } from "@/lib/constants";
import { youtubeId } from "@/lib/youtube";
import heroElder from "@/assets/hero-elder.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReEngage African Voices — African elders' stories, in their own voices" },
      { name: "description", content: "Listen to folktales, songs, proverbs and lived memory from elders across Africa. Browse by region, tribe, language and theme." },
      { property: "og:title", content: "ReEngage African Voices" },
      { property: "og:description", content: "An audio archive of African elders' stories, in their own voices." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storiesQuery);
    context.queryClient.ensureQueryData(collectionsQuery);
    context.queryClient.ensureQueryData(eldersQuery);
    context.queryClient.ensureQueryData(facetsQuery);
  },
  component: Home,
});

function Home() {
  const { data: stories } = useSuspenseQuery(storiesQuery);
  const { data: collections } = useSuspenseQuery(collectionsQuery);
  const { data: elders } = useSuspenseQuery(eldersQuery);
  const { data: facets } = useSuspenseQuery(facetsQuery);
  const player = usePlayer();

  const featured = stories.find((s) => s.is_featured) ?? stories[0];
  const mostPlayed = [...stories].sort((a, b) => b.play_count - a.play_count).slice(0, 8);
  const recent = stories.slice(0, 8);
  // Curated first (admin "show on homepage" + order), then auto-fill.
  const homeElders = elders.slice(0, 8);
  const homeCollections = collections.slice(0, 8);

  return (
    <div>
      {/* Hero */}
      {featured && (
        <div
          className="relative grain overflow-hidden bg-gradient-warm px-5 py-10 text-white sm:px-8 sm:py-14"
          style={coverImage(featured) ? { backgroundImage: `url(${coverImage(featured)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {coverImage(featured) && <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35" />}
          <div className="relative z-10 max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/80">Featured story</p>
            <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl">{featured.title}</h1>
            <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">{featured.description}</p>
            <p className="mt-2 text-sm text-white/80">{featured.elder?.name} · {featured.tribe?.name} · {featured.language?.name}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => player.playStory(featured, stories)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-foreground shadow"
              >
                <Play className="h-4 w-4" /> Play story
              </button>
              {youtubeId(featured.youtube_url) && (
                <Link to="/stories/$slug" params={{ slug: featured.slug }} hash="watch" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold">
                  <Video className="h-4 w-4" /> Watch video
                </Link>
              )}
              <Link to="/stories/$slug" params={{ slug: featured.slug }} className="inline-flex items-center rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold">
                Details
              </Link>
            </div>
          </div>
        </div>
      )}
      <ScallopDivider />

      <div className="px-5 py-6 sm:px-8">
        <Section title="Recently added">
          <Rail>{recent.map((s) => <div key={s.id} className="w-40 shrink-0 sm:w-44"><StoryCard story={s} queue={recent} /></div>)}</Rail>
        </Section>

        <Section title="Collections" action={<Link to="/collections" className="text-xs font-medium text-muted-foreground hover:text-foreground">See all</Link>}>
          <Rail>
            {homeCollections.map((c) => (
              <Link key={c.id} to="/collections/$slug" params={{ slug: c.slug }} className="w-52 shrink-0">
                <div className="grain flex aspect-[4/3] flex-col justify-end rounded-xl p-4 text-white shadow-warm" style={c.cover_url ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.15)), url(${c.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundImage: coverGradient(c.slug) }}>
                  <h3 className="font-serif text-lg font-semibold leading-tight">{c.title}</h3>
                  <p className="text-xs text-white/80">{c.story_count} stories</p>
                </div>
              </Link>
            ))}
          </Rail>
        </Section>

        <Section title="Most played">
          <Rail>{mostPlayed.map((s) => <div key={s.id} className="w-40 shrink-0 sm:w-44"><StoryCard story={s} queue={mostPlayed} /></div>)}</Rail>
        </Section>

        <Section title="Voices to follow" action={<Link to="/elders" className="text-xs font-medium text-muted-foreground hover:text-foreground">See all</Link>}>
          <Rail>
            {homeElders.map((e) => (
              <Link key={e.id} to="/elders/$slug" params={{ slug: e.slug }} className="w-32 shrink-0 text-center sm:w-36">
                <div className="mx-auto aspect-square w-full overflow-hidden rounded-full shadow-warm" style={{ backgroundImage: coverGradient(e.slug) }}>
                  {elderImage(e) && <img src={elderImage(e)} alt={e.name} loading="lazy" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{e.name}</p>
                <p className="truncate text-xs text-muted-foreground">{e.tribe?.name}</p>
              </Link>
            ))}
          </Rail>
        </Section>

        <Section title="Browse by theme">
          <div className="flex flex-wrap gap-2">
            {facets.themes.map((t) => (
              <Link key={t.slug} to="/themes/$slug" params={{ slug: t.slug }} className="rounded-full border bg-card px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                {t.name}
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
