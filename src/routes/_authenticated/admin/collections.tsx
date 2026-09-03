import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, Trash2, Plus, ArrowUp, ArrowDown, Search } from "lucide-react";
import {
  listAdminCollections,
  saveCollection,
  deleteCollection,
  listAdminStories,
  type AdminCollectionRow,
  type AdminStoryRow,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";

const URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export const Route = createFileRoute("/_authenticated/admin/collections")({
  component: AdminCollectionsPage,
});

function AdminCollectionsPage() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => listAdminCollections(),
    staleTime: 10_000,
  });
  const [active, setActive] = useState<AdminCollectionRow | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Build collections, pick their stories, and choose which appear on the homepage.
        </p>
        <button
          onClick={() => setActive("new")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New collection
        </button>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {(collections ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c)}
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-accent"
          >
            <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {c.cover_url && <img src={c.cover_url} alt="" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{c.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{c.story_ids.length} stories</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {!c.is_public && <span className="text-destructive">private</span>}
              {c.is_homepage && <span className="text-primary">★ homepage</span>}
            </span>
          </button>
        ))}
        {!isLoading && (collections ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No collections yet.</p>
        )}
      </div>

      {active && (
        <CollectionPanel collection={active === "new" ? null : active} onClose={() => setActive(null)} />
      )}
    </div>
  );
}

function CollectionPanel({ collection, onClose }: { collection: AdminCollectionRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: collection?.title ?? "",
    description: collection?.description ?? "",
    coverUrl: collection?.cover_url ?? "",
  });
  const [isPublic, setIsPublic] = useState(collection?.is_public ?? true);
  const [isHomepage, setIsHomepage] = useState(collection?.is_homepage ?? false);
  const [sortOrder, setSortOrder] = useState(collection?.sort_order ?? 0);
  const [storyIds, setStoryIds] = useState<string[]>(collection?.story_ids ?? []);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: stories } = useQuery({
    queryKey: ["admin-stories", search],
    queryFn: () => listAdminStories({ data: { q: search } }),
    staleTime: 10_000,
  });

  const byId = useMemo(() => {
    const m = new Map<string, AdminStoryRow>();
    (stories ?? []).forEach((s) => m.set(s.id, s));
    return m;
  }, [stories]);

  const move = (i: number, dir: -1 | 1) => {
    setStoryIds((ids) => {
      const next = ids.slice();
      const j = i + dir;
      if (j < 0 || j >= next.length) return ids;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;
    if (!raw.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    setUploading(true);
    try {
      const file = await compressImage(raw, "cover");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `collections/${collection?.id ?? "new"}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("story-covers").upload(path, file, {
        cacheControl: "31536000",
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("story-covers").createSignedUrl(path, URL_TTL);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not create URL");
      setForm((f) => ({ ...f, coverUrl: signed.data.signedUrl }));
      toast.success("Cover uploaded. Save to apply.");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-collections"] });
    qc.invalidateQueries({ queryKey: ["collections"] });
    qc.invalidateQueries({ queryKey: ["collection"] });
  };

  const save = useMutation({
    mutationFn: () => {
      if (!form.title.trim()) throw new Error("Title cannot be empty.");
      return saveCollection({
        data: {
          collectionId: collection?.id,
          title: form.title.trim(),
          description: form.description,
          coverUrl: form.coverUrl,
          isPublic,
          isHomepage,
          sortOrder,
          storyIds,
        },
      });
    },
    onSuccess: () => {
      toast.success(collection ? "Collection updated." : "Collection created.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const remove = useMutation({
    mutationFn: () => deleteCollection({ data: { collectionId: collection!.id } }),
    onSuccess: () => {
      toast.success("Collection deleted.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not delete"),
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 backdrop-blur sm:p-8">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border bg-card p-5 shadow-warm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-xl font-bold">{collection ? "Edit collection" : "New collection"}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <label className="block text-sm font-medium">
          Title
          <input value={form.title} onChange={set("title")} className={`mt-1 ${inputCls}`} />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea value={form.description} onChange={set("description")} rows={3} className={`mt-1 ${inputCls}`} />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Cover image</p>
          <div className="flex items-center gap-3">
            <span className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
              {form.coverUrl.trim() && <img src={form.coverUrl} alt="" className="h-full w-full object-cover" />}
            </span>
            <div className="flex-1 space-y-2">
              <input value={form.coverUrl} onChange={set("coverUrl")} placeholder="Paste an image URL" className={inputCls} />
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={onCoverFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
                </button>
                {form.coverUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, coverUrl: "" }))}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stories in this collection */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Stories in this collection</p>
          {storyIds.length === 0 && <p className="text-xs text-muted-foreground">None yet — add some below.</p>}
          <div className="space-y-1">
            {storyIds.map((id, i) => (
              <div key={id} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{byId.get(id)?.title ?? "Story"}</span>
                <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-accent"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-accent"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  onClick={() => setStoryIds((ids) => ids.filter((x) => x !== id))}
                  className="rounded p-1 text-destructive hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="flex items-center gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stories to add" className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm" />
            </div>
            <button className="rounded-full border px-3 py-2 text-sm font-semibold">Search</button>
          </form>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {(stories ?? [])
              .filter((s) => !storyIds.includes(s.id))
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStoryIds((ids) => [...ids, s.id])}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card p-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{s.title}</span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isHomepage} onChange={(e) => setIsHomepage(e.target.checked)} />
            Show on homepage
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            Order
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            {collection && (confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" /> {remove.isPending ? "Deleting…" : "Confirm delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm text-muted-foreground">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete collection
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm font-semibold">Cancel</button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
