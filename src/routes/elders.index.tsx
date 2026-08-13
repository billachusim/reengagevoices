import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eldersQuery } from "@/lib/queries";
import { RouteError } from "@/components/route-states";
import { coverGradient, elderImage } from "@/lib/constants";

export const Route = createFileRoute("/elders/")({
  head: () => ({ meta: [{ title: "Elders — ReEngage African Voices" }, { name: "description", content: "Meet the elders whose voices carry these stories across Africa." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(eldersQuery); },
  component: Elders,
  errorComponent: RouteError,
});

function Elders() {
  const { data: elders } = useSuspenseQuery(eldersQuery);
  return (
    <div className="px-5 py-6 sm:px-8">
      <h1 className="mb-5 font-serif text-2xl font-bold sm:text-3xl">Elders</h1>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {elders.map((e) => (
          <Link key={e.id} to="/elders/$slug" params={{ slug: e.slug }} className="text-center">
            <div className="mx-auto aspect-square w-full overflow-hidden rounded-full shadow-warm" style={{ backgroundImage: coverGradient(e.slug) }}>
              {elderImage(e) && <img src={elderImage(e)} alt={e.name} loading="lazy" className="h-full w-full object-cover" />}
            </div>
            <p className="mt-3 font-serif text-base font-semibold">{e.name}</p>
            <p className="text-xs text-muted-foreground">{e.tribe?.name} · {e.story_count} stories</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
