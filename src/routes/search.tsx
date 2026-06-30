import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { searchQuery } from "@/lib/queries";
import { StoryRow } from "@/components/story-card";
import { RouteError } from "@/components/route-states";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({ meta: [{ title: "Search — ReEngage Voices" }, { name: "description", content: "Search stories, elders, tribes and transcripts across the archive." }] }),
  component: SearchPage,
  errorComponent: RouteError,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [value, setValue] = useState(q);
  useEffect(() => setValue(q), [q]);

  // debounce into the URL
  useEffect(() => {
    const t = setTimeout(() => { if (value !== q) navigate({ search: { q: value } }); }, 300);
    return () => clearTimeout(t);
  }, [value]);

  const { data: results = [], isFetching } = useQuery({ ...searchQuery(q), enabled: q.trim().length > 0 });

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
      <h1 className="mb-4 font-serif text-2xl font-bold sm:text-3xl">Search</h1>
      <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-3">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Stories, elders, tribes, transcripts…" className="flex-1 bg-transparent text-sm outline-none" />
      </div>
      <div className="mt-5">
        {q.trim().length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Start typing to search the archive.</p>
        ) : isFetching ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Searching…</p>
        ) : results.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No results for “{q}”. <Link to="/browse" className="text-primary">Browse instead</Link></p>
        ) : (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{results.length} results</p>
            {results.map((s) => <StoryRow key={s.id} story={s} queue={results} />)}
          </div>
        )}
      </div>
    </div>
  );
}
