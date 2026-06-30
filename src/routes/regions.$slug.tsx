import { createFileRoute } from "@tanstack/react-router";
import { storiesQuery, facetsQuery } from "@/lib/queries";
import { TaxonomyPage } from "@/components/taxonomy-page";
import { RouteError } from "@/components/route-states";

export const Route = createFileRoute("/regions/$slug")({
  head: () => ({ meta: [{ title: "Region — ReEngage African Voice" }, { name: "description", content: "Stories from a region or village." }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(storiesQuery); context.queryClient.ensureQueryData(facetsQuery); },
  component: () => { const { slug } = Route.useParams(); return <TaxonomyPage dim="region" slug={slug} />; },
  errorComponent: RouteError,
});
