import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, UserPlus, UserCheck } from "lucide-react";
import { elderQuery } from "@/lib/queries";
import { getMyActivity, toggleFollow } from "@/lib/library.functions";
import { StoryRow } from "@/components/story-card";
import { RouteError, RouteNotFound } from "@/components/route-states";
import { usePlayer } from "@/components/player/audio-provider";
import { useAuth } from "@/hooks/use-auth";
import { coverGradient, elderPortrait } from "@/lib/constants";

export const Route = createFileRoute("/elders/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(elderQuery(params.slug));
    if (!data) throw notFound();
  },
  head: () => ({ meta: [{ title: "Elder — ReEngage African Voices" }, { name: "description", content: "An elder's profile and recorded stories." }] }),
  component: ElderPage,
  errorComponent: RouteError,
  notFoundComponent: () => <RouteNotFound message="We couldn't find this elder." />,
});

function FollowButton({ elderId }: { elderId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["activity", user?.id], queryFn: () => getMyActivity(), enabled: !!user });
  const following = data?.followingIds.includes(elderId) ?? false;
  const mut = useMutation({
    mutationFn: (next: boolean) => toggleFollow({ data: { elderId, following: next } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activity"] }); qc.invalidateQueries({ queryKey: ["library"] }); },
  });
  if (!user) return <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"><UserPlus className="h-4 w-4" /> Follow</Link>;
  return (
    <button onClick={() => mut.mutate(!following)} className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium">
      {following ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
    </button>
  );
}

function ElderPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(elderQuery(slug));
  const player = usePlayer();
  if (!data) return <RouteNotFound />;
  const { elder, stories } = data;

  return (
    <div>
      <div className="grain relative flex flex-col items-center gap-4 px-5 py-10 text-center text-white sm:flex-row sm:items-end sm:text-left sm:px-8" style={{ backgroundImage: coverGradient(elder.slug) }}>
        <div className="h-36 w-36 overflow-hidden rounded-full shadow-warm">
          {elderPortrait(elder.slug) && <img src={elderPortrait(elder.slug)} alt={elder.name} className="h-full w-full object-cover" />}
        </div>
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Elder</p>
          <h1 className="font-serif text-3xl font-bold sm:text-5xl">{elder.name}</h1>
          <p className="mt-1 text-sm text-white/90">{elder.tribe?.name} · {elder.region?.name} · {elder.language?.name}</p>
        </div>
      </div>
      <div className="px-5 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {stories.length > 0 && (
            <button onClick={() => player.playStory(stories[0], stories)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"><Play className="h-4 w-4" /> Play all</button>
          )}
          <FollowButton elderId={elder.id} />
        </div>
        {elder.bio && <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{elder.bio}</p>}
        <h2 className="mb-2 font-serif text-xl font-semibold">Stories</h2>
        <div className="max-w-2xl">
          {stories.map((s, i) => <StoryRow key={s.id} story={s} queue={stories} index={i} />)}
        </div>
      </div>
    </div>
  );
}
