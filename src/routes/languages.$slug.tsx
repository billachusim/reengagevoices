import { createFileRoute } from "@tanstack/react-router";
import { storiesQuery, facetsQuery } from "@/lib/queries";
import { TaxonomyPage } from "@/components/taxonomy-page";
import { RouteError } from "@/components/route-states";

export const Route = createFileRoute("/languages/$slug")({
  head: () => ({ meta: [{ title: "Language — ReEngage Voices" }, { name: "description", content: "Stories told in a language." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(storiesQuery); context.queryClient.ensureQueryData(facetsQuery); },
  component: () => { const { slug } = Route.useParams(); return <TaxonomyPage dim="language" slug={slug} />; },
  errorComponent: RouteError,
});
