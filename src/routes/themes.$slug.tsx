import { createFileRoute } from "@tanstack/react-router";
import { storiesQuery, facetsQuery } from "@/lib/queries";
import { TaxonomyPage } from "@/components/taxonomy-page";
import { RouteError } from "@/components/route-states";

export const Route = createFileRoute("/themes/$slug")({
  head: () => ({ meta: [{ title: "Theme — ReEngage Voices" }, { name: "description", content: "Stories grouped by theme and mood." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(storiesQuery); context.queryClient.ensureQueryData(facetsQuery); },
  component: () => { const { slug } = Route.useParams(); return <TaxonomyPage dim="theme" slug={slug} />; },
  errorComponent: RouteError,
});
