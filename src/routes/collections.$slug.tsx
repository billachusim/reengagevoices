import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { collectionQuery } from "@/lib/queries";
import { StoryRow } from "@/components/story-card";
import { RouteError, RouteNotFound } from "@/components/route-states";
import { usePlayer } from "@/components/player/audio-provider";
import { coverGradient } from "@/lib/constants";

export const Route = createFileRoute("/collections/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(collectionQuery(params.slug));
    if (!data) throw notFound();
  },
  head: () => ({ meta: [{ title: "Collection — ReEngage Voices" }, { name: "description", content: "A curated collection of elders' stories." }] }),
  component: CollectionPage,
  errorComponent: RouteError,
  notFoundComponent: () => <RouteNotFound message="This collection doesn't exist." />,
});

function CollectionPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(collectionQuery(slug));
  const player = usePlayer();
  if (!data) return <RouteNotFound />;
  const { collection, stories } = data;
  return (
    <div>
      <div className="grain flex flex-col justify-end px-5 py-10 text-white sm:px-8 sm:py-14" style={{ backgroundImage: coverGradient(collection.slug) }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Collection</p>
        <h1 className="font-serif text-3xl font-bold sm:text-5xl">{collection.title}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/90">{collection.description}</p>
      </div>
      <div className="px-5 py-6 sm:px-8">
        {stories.length > 0 && (
          <button onClick={() => player.playStory(stories[0], stories)} className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"><Play className="h-4 w-4" /> Play all</button>
        )}
        <div className="max-w-2xl">
          {stories.map((s, i) => <StoryRow key={s.id} story={s} queue={stories} index={i} />)}
        </div>
      </div>
    </div>
  );
}
