import { createFileRoute } from "@tanstack/react-router";
import { storiesQuery, facetsQuery } from "@/lib/queries";
import { TaxonomyPage } from "@/components/taxonomy-page";
import { RouteError } from "@/components/route-states";

export const Route = createFileRoute("/tribes/$slug")({
  head: () => ({ meta: [{ title: "Tribe — ReEngage African Voice" }, { name: "description", content: "Stories from a tribe's tradition." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(storiesQuery); context.queryClient.ensureQueryData(facetsQuery); },
  component: () => { const { slug } = Route.useParams(); return <TaxonomyPage dim="tribe" slug={slug} />; },
  errorComponent: RouteError,
});
