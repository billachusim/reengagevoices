import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { storiesQuery, facetsQuery } from "@/lib/queries";
import { StoryCard } from "@/components/story-card";
import { RouteError } from "@/components/route-states";
import { DURATION_BUCKETS, SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BrowseSearch {
  region?: string; tribe?: string; language?: string; type?: string; mood?: string; duration?: string; sort?: string;
}

export const Route = createFileRoute("/browse")({
  validateSearch: (s: Record<string, unknown>): BrowseSearch => ({
    region: typeof s.region === "string" ? s.region : undefined,
    tribe: typeof s.tribe === "string" ? s.tribe : undefined,
    language: typeof s.language === "string" ? s.language : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
    mood: typeof s.mood === "string" ? s.mood : undefined,
    duration: typeof s.duration === "string" ? s.duration : undefined,
    sort: typeof s.sort === "string" ? s.sort : "newest",
  }),
  head: () => ({ meta: [{ title: "Browse — ReEngage African Voices" }, { name: "description", content: "Browse the full archive of African elders' stories by region, tribe, language, type and mood." }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storiesQuery);
    context.queryClient.ensureQueryData(facetsQuery);
  },
  component: Browse,
  errorComponent: RouteError,
});

function FacetGroup({ label, options, value, onChange }: { label: string; options: { slug: string; name: string }[]; value?: string; onChange: (v?: string) => void }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.slug}
            onClick={() => onChange(value === o.slug ? undefined : o.slug)}
            className={cn("rounded-full border px-3 py-1 text-xs", value === o.slug ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent hover:text-accent-foreground")}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Browse() {
  const { data: stories } = useSuspenseQuery(storiesQuery);
  const { data: facets } = useSuspenseQuery(facetsQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const set = (patch: Partial<BrowseSearch>) => navigate({ search: (prev: BrowseSearch) => ({ ...prev, ...patch }) });

  const villages = facets.regions.filter((r) => r.village);
  const types = facets.themes.filter((t) => t.kind === "type");
  const moods = facets.themes.filter((t) => t.kind === "mood");

  let filtered = stories.filter((s) => {
    if (search.region && s.region?.slug !== search.region) return false;
    if (search.tribe && s.tribe?.slug !== search.tribe) return false;
    if (search.language && s.language?.slug !== search.language) return false;
    if (search.type && !s.themes.some((t) => t.slug === search.type)) return false;
    if (search.mood && !s.themes.some((t) => t.slug === search.mood)) return false;
    if (search.duration) {
      const bucket = DURATION_BUCKETS.find((b) => b.value === search.duration);
      if (bucket && !bucket.test(s.duration_seconds)) return false;
    }
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    switch (search.sort) {
      case "most-played": return b.play_count - a.play_count;
      case "longest": return b.duration_seconds - a.duration_seconds;
      case "shortest": return a.duration_seconds - b.duration_seconds;
      default: return 0;
    }
  });

  const hasFilters = !!(search.region || search.tribe || search.language || search.type || search.mood || search.duration);

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Browse</h1>
        <select value={search.sort} onChange={(e) => set({ sort: e.target.value })} className="rounded-full border bg-card px-3 py-1.5 text-sm">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {hasFilters && <button onClick={() => set({ region: undefined, tribe: undefined, language: undefined, type: undefined, mood: undefined, duration: undefined })} className="mb-3 text-xs font-medium text-primary">Clear filters</button>}
          <FacetGroup label="Village" options={villages} value={search.region} onChange={(v) => set({ region: v })} />
          <FacetGroup label="Tribe" options={facets.tribes} value={search.tribe} onChange={(v) => set({ tribe: v })} />
          <FacetGroup label="Language" options={facets.languages} value={search.language} onChange={(v) => set({ language: v })} />
          <FacetGroup label="Type" options={types} value={search.type} onChange={(v) => set({ type: v })} />
          <FacetGroup label="Mood" options={moods} value={search.mood} onChange={(v) => set({ mood: v })} />
          <FacetGroup label="Duration" options={DURATION_BUCKETS.map((b) => ({ slug: b.value, name: b.label }))} value={search.duration} onChange={(v) => set({ duration: v })} />
        </aside>
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "story" : "stories"}</p>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              No stories match these filters. <Link to="/browse" className="text-primary">Reset</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((s) => <StoryCard key={s.id} story={s} queue={filtered} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
