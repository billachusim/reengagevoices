import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, Trash2, Plus } from "lucide-react";
import { listAdminElders, saveElder, deleteElder, type AdminElderRow } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { elderPortrait } from "@/lib/constants";

const URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export const Route = createFileRoute("/_authenticated/admin/elders")({
  component: AdminEldersPage,
});

function AdminEldersPage() {
  const { data: elders, isLoading } = useQuery({
    queryKey: ["admin-elders"],
    queryFn: () => listAdminElders(),
    staleTime: 10_000,
  });
  const [active, setActive] = useState<AdminElderRow | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage elder profiles and choose who appears in “Voices to follow” on the homepage.
        </p>
        <button
          onClick={() => setActive("new")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New elder
        </button>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {(elders ?? []).map((e) => {
          const img = e.photo_url?.trim() || elderPortrait(e.slug);
          return (
            <button
              key={e.id}
              onClick={() => setActive(e)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-accent"
            >
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                {img && <img src={img} alt={e.name} className="h-full w-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{e.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[e.tribe_name, e.region_name, e.language_name].filter(Boolean).join(" · ") || "No details yet"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {e.is_homepage && <span className="text-primary">★ homepage</span>}
                <span>{e.story_count} stories</span>
              </span>
            </button>
          );
        })}
        {!isLoading && (elders ?? []).length === 0 && <p className="text-sm text-muted-foreground">No elders yet.</p>}
      </div>

      {active && (
        <ElderPanel
          elder={active === "new" ? null : active}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function ElderPanel({ elder, onClose }: { elder: AdminElderRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: elder?.name ?? "",
    bio: elder?.bio ?? "",
    photoUrl: elder?.photo_url ?? "",
    region: elder?.region_name ?? "",
    tribe: elder?.tribe_name ?? "",
    language: elder?.language_name ?? "",
  });
  const [isHomepage, setIsHomepage] = useState(elder?.is_homepage ?? false);
  const [sortOrder, setSortOrder] = useState(elder?.sort_order ?? 0);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${elder?.id ?? "new"}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("elder-photos").upload(path, file, {
        cacheControl: "31536000",
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("elder-photos").createSignedUrl(path, URL_TTL);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not create URL");
      setForm((f) => ({ ...f, photoUrl: signed.data.signedUrl }));
      toast.success("Photo uploaded. Save to apply.");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-elders"] });
    qc.invalidateQueries({ queryKey: ["elders"] });
    qc.invalidateQueries({ queryKey: ["stories"] });
  };

  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) throw new Error("Name cannot be empty.");
      return saveElder({
        data: {
          elderId: elder?.id,
          name: form.name.trim(),
          bio: form.bio,
          photoUrl: form.photoUrl,
          region: form.region.trim() || undefined,
          tribe: form.tribe.trim() || undefined,
          language: form.language.trim() || undefined,
          isHomepage,
          sortOrder,
        },
      });
    },
    onSuccess: () => {
      toast.success(elder ? "Elder updated." : "Elder created.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const remove = useMutation({
    mutationFn: () => deleteElder({ data: { elderId: elder!.id } }),
    onSuccess: () => {
      toast.success("Elder deleted.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not delete"),
  });

  const preview = form.photoUrl.trim() || elderPortrait(elder?.slug);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 backdrop-blur sm:p-8">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border bg-card p-5 shadow-warm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-xl font-bold">{elder ? "Edit elder" : "New elder"}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <label className="block text-sm font-medium">
          Name
          <input value={form.name} onChange={set("name")} className={`mt-1 ${inputCls}`} placeholder="Elder's name" />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Region
            <input value={form.region} onChange={set("region")} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm font-medium">
            Tribe
            <input value={form.tribe} onChange={set("tribe")} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm font-medium">
            Language
            <input value={form.language} onChange={set("language")} className={`mt-1 ${inputCls}`} />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Bio
          <textarea value={form.bio} onChange={set("bio")} rows={4} className={`mt-1 ${inputCls}`} />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Photo</p>
          <div className="flex items-center gap-3">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
              {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
            </span>
            <div className="flex-1 space-y-2">
              <input value={form.photoUrl} onChange={set("photoUrl")} placeholder="Paste an image URL" className={inputCls} />
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={onPhotoFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
                </button>
                {form.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border p-3">
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
            {elder && (confirmDelete ? (
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
                <Trash2 className="h-4 w-4" /> Delete elder
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
