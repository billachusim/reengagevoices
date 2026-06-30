import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { storiesQuery, facetsQuery } from "@/lib/queries";
import { StoryCard } from "@/components/story-card";
import { usePlayer } from "@/components/player/audio-provider";
import { coverGradient } from "@/lib/constants";
import type { StoryDTO } from "@/lib/types";

type Dim = "theme" | "region" | "tribe" | "language";

export function TaxonomyPage({ dim, slug }: { dim: Dim; slug: string }) {
  const { data: stories } = useSuspenseQuery(storiesQuery);
  const { data: facets } = useSuspenseQuery(facetsQuery);
  const player = usePlayer();

  let label = slug;
  let kicker = "";
  const match = (s: StoryDTO) => {
    switch (dim) {
      case "theme": return s.themes.some((t) => t.slug === slug);
      case "region": return s.region?.slug === slug;
      case "tribe": return s.tribe?.slug === slug;
      case "language": return s.language?.slug === slug;
    }
  };
  if (dim === "theme") { const t = facets.themes.find((x) => x.slug === slug); label = t?.name ?? slug; kicker = t?.kind === "mood" ? "Mood" : "Story type"; }
  if (dim === "region") { const r = facets.regions.find((x) => x.slug === slug); label = r?.name ?? slug; kicker = "Place"; }
  if (dim === "tribe") { const t = facets.tribes.find((x) => x.slug === slug); label = t?.name ?? slug; kicker = "Tribe"; }
  if (dim === "language") { const l = facets.languages.find((x) => x.slug === slug); label = l?.name ?? slug; kicker = "Language"; }

  const filtered = stories.filter(match);

  return (
    <div>
      <div className="grain flex flex-col justify-end px-5 py-10 text-white sm:px-8 sm:py-14" style={{ backgroundImage: coverGradient(slug) }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">{kicker}</p>
        <h1 className="font-serif text-3xl font-bold sm:text-5xl">{label}</h1>
        <p className="mt-2 text-sm text-white/85">{filtered.length} {filtered.length === 1 ? "story" : "stories"}</p>
      </div>
      <div className="px-5 py-6 sm:px-8">
        {filtered.length > 0 ? (
          <>
            <button onClick={() => player.playStory(filtered[0], filtered)} className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"><Play className="h-4 w-4" /> Play all</button>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((s) => <StoryCard key={s.id} story={s} queue={filtered} />)}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No stories here yet. <Link to="/browse" className="text-primary">Browse the archive</Link>
          </div>
        )}
      </div>
    </div>
  );
}
