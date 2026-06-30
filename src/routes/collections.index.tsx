import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { collectionsQuery } from "@/lib/queries";
import { RouteError } from "@/components/route-states";
import { coverGradient, coverImage } from "@/lib/constants";

export const Route = createFileRoute("/collections/")({
  head: () => ({ meta: [{ title: "Collections — ReEngage African Voices" }, { name: "description", content: "Curated collections of African elders' stories." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(collectionsQuery); },
  component: Collections,
  errorComponent: RouteError,
});

function Collections() {
  const { data: collections } = useSuspenseQuery(collectionsQuery);
  return (
    <div className="px-5 py-6 sm:px-8">
      <h1 className="mb-5 font-serif text-2xl font-bold sm:text-3xl">Collections</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Link key={c.id} to="/collections/$slug" params={{ slug: c.slug }}>
            <div className="grain flex aspect-[16/9] flex-col justify-end rounded-xl p-5 text-white shadow-warm" style={{ backgroundImage: coverGradient(c.slug) }}>
              <h2 className="font-serif text-xl font-semibold">{c.title}</h2>
              <p className="text-xs text-white/85">{c.description}</p>
              <p className="mt-1 text-xs text-white/70">{c.story_count} stories</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
