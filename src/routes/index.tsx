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
import { coverGradient, elderImage, storyImagery } from "@/lib/constants";
import { youtubeId } from "@/lib/youtube";
import heroElder from "@/assets/hero-elder.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReEngage African Voices — African elders' stories, in their own voices" },
      { name: "description", content: "Listen to folklore, songs, proverbs and lived memory from elders across Africa. Browse by region, tribe, language and theme." },
      { property: "og:title", content: "ReEngage African Voices" },
      { property: "og:description", content: "An audio archive of African elders' stories, in their own voices." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(storiesQuery),
      context.queryClient.ensureQueryData(collectionsQuery),
      context.queryClient.ensureQueryData(eldersQuery),
      context.queryClient.ensureQueryData(facetsQuery),
    ]);
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
  const { image: featuredImage } = storyImagery(featured);
  const mostPlayed = [...stories].sort((a, b) => b.play_count - a.play_count).slice(0, 8);
  const recent = stories.slice(0, 8);
  // Curated first (admin "show on homepage" + order), then auto-fill.
  const homeElders = elders.slice(0, 8);
  const homeCollections = collections.slice(0, 8);

  return (
    <div>
      {/* Landing hero */}
      <section className="relative isolate overflow-hidden bg-night px-5 py-14 text-night-foreground sm:px-8 sm:py-28">
        <img src={heroElder} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/80 via-night/85 to-night" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-4xl font-bold leading-[1.1] sm:text-6xl">
            Every voice holds a lifetime of meaning
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-night-foreground/80 sm:mt-6 sm:text-base">
            Welcome to ReEngage Voices, an archive of African heritage stories, oral histories, and lived
            experiences. Explore interviews, audio recordings, and writings that keep our past alive.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-9">
            <Link to="/browse" className="inline-flex items-center gap-2 rounded-full bg-gradient-warm px-7 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-warm">
              Explore stories <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/contribute" className="inline-flex items-center gap-2 rounded-full border border-night-foreground/25 px-7 py-3 text-xs font-medium uppercase tracking-[0.15em] text-night-foreground/80 hover:border-night-foreground/40 hover:text-night-foreground">
              Submit your voice
            </Link>
          </div>
        </div>
      </section>

      {/* Featured story */}
      {featured && (
        <section className="grain bg-secondary/40 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-warm">
            <div className="grid gap-0 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div className="p-6 sm:p-8">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                  Featured story
                </span>

                <h2 className="mt-4 font-serif text-2xl font-bold leading-tight sm:text-4xl">{featured.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{featured.description}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {[featured.elder?.name, featured.tribe?.name, featured.language?.name].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => player.playStory(featured, stories)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow"
                  >
                    <Play className="h-4 w-4" /> Play audio
                  </button>
                  {youtubeId(featured.youtube_url) && (
                    <Link to="/stories/$slug" params={{ slug: featured.slug }} hash="watch" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
                      <Video className="h-4 w-4" /> Watch video
                    </Link>
                  )}
                  <Link to="/stories/$slug" params={{ slug: featured.slug }} className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
                    Details
                  </Link>
                </div>
              </div>
              <div className="p-6 sm:p-8 md:p-10">
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted shadow-sm">
                  {featuredImage ? (
                    <img
                      src={featuredImage}
                      alt={featured.elder?.name ?? featured.title}
                      className="h-full w-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: coverGradient(featured.slug) }}
                      role="img"
                      aria-label={featured.elder?.name ?? featured.title}
                    />
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      )}
      <ScallopDivider />

      <div className="px-5 py-6 sm:px-8">
        <Section title="Recently added">
          <Rail>{recent.map((s) => <div key={s.id} className="w-40 shrink-0 sm:w-44"><StoryCard story={s} queue={recent} /></div>)}</Rail>
        </Section>

        <Section title="Collections" action={<Link to="/collections" className="text-xs font-medium text-muted-foreground hover:text-foreground">See all</Link>}>
          <Rail>
            {homeCollections.map((c) => (
              <Link key={c.id} to="/collections/$slug" params={{ slug: c.slug }} className="w-48 shrink-0 sm:w-56 md:w-64">
                <div className="grain relative flex aspect-video flex-col justify-end overflow-hidden rounded-xl p-4 text-white shadow-warm">
                  {c.cover_url ? (
                    <img
                      src={c.cover_url}
                      alt={c.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 -z-10 h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 -z-10 bg-cover bg-center"
                      style={{ backgroundImage: coverGradient(c.slug) }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" aria-hidden="true" />
                  <h3 className="relative z-10 font-serif text-lg font-semibold leading-tight">{c.title}</h3>
                  <p className="relative z-10 text-xs text-white/80">{c.story_count} {c.story_count === 1 ? "story" : "stories"}</p>
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

       {/* The Voices Archive CTA */}
       <section className="bg-night px-5 py-14 sm:px-8 sm:py-20">
         <div className="mx-auto max-w-5xl">
           <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-clay">
             The Voices Archive
           </p>
           <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold leading-[1.1] text-night-foreground sm:text-5xl">
             Every story, every format.
           </h2>
            <Link
              to="/browse"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-warm px-7 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-warm"
            >
              Browse the archive <ArrowRight className="h-3.5 w-3.5" />
            </Link>
         </div>
       </section>


      <HowItWorks />
      <SiteFooter />
    </div>
  );
}
