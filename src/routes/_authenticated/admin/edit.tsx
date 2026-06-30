import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Languages, Search } from "lucide-react";
import {
  listAdminStories,
  updateStory,
  transcribeAudio,
  translateToEnglish,
  type AdminStoryRow,
} from "@/lib/admin.functions";
import { youtubeEmbedUrl } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/admin/edit")({
  component: EditStoriesPage,
});

function EditStoriesPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data: stories } = useQuery({
    queryKey: ["admin-stories", search],
    queryFn: () => listAdminStories({ data: { q: search } }),
    staleTime: 10_000,
  });
  const [active, setActive] = useState<AdminStoryRow | null>(null);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); setSearch(q); }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search published stories by title"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Search</button>
      </form>

      <div className="space-y-2">
        {(stories ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No stories found.</p>
        ) : (
          (stories ?? []).map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-3 text-left hover:bg-accent"
            >
              <span className="truncate text-sm font-medium">{s.title}</span>
              {s.youtube_url && <span className="shrink-0 text-xs text-muted-foreground">▶ video</span>}
            </button>
          ))
        )}
      </div>

      {active && <EditPanel story={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function EditPanel({ story, onClose }: { story: AdminStoryRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    youtubeUrl: story.youtube_url ?? "",
    transcriptOriginal: story.transcript_original ?? "",
    transcriptEnglish: story.transcript_english ?? "",
    description: story.description ?? "",
    elderName: story.elder_name ?? "",
    region: story.region_name ?? "",
    tribe: story.tribe_name ?? "",
    language: story.language_name ?? "",
    storyType: story.story_type ?? "",
    mood: story.mood ?? "",
  });
  const [isFeatured, setIsFeatured] = useState(story.is_featured);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
  const embed = youtubeEmbedUrl(form.youtubeUrl);

  const save = useMutation({
    mutationFn: () => updateStory({ data: { storyId: story.id, ...form, isFeatured } }),
    onSuccess: () => {
      toast.success("Story updated.");
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["story"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const transcribe = useMutation({
    mutationFn: () => transcribeAudio({ data: { audioUrl: story.audio_url! } }),
    onSuccess: (res) => { setForm((f) => ({ ...f, transcriptOriginal: res.text })); toast.success("Transcribed."); },
    onError: (e: any) => toast.error(e.message ?? "Could not transcribe"),
  });

  const translate = useMutation({
    mutationFn: () => translateToEnglish({ data: { text: form.transcriptOriginal } }),
    onSuccess: (res) => { setForm((f) => ({ ...f, transcriptEnglish: res.text })); toast.success("Translated."); },
    onError: (e: any) => toast.error(e.message ?? "Could not translate"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border bg-background p-4 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 font-serif text-lg font-bold">{story.title}</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">YouTube link</label>
            <input value={form.youtubeUrl} onChange={set("youtubeUrl")} placeholder="https://youtu.be/…" className={inputCls} />
            {form.youtubeUrl && !embed && <p className="mt-1 text-xs text-destructive">Not a recognizable YouTube link.</p>}
            {embed && (
              <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border bg-black">
                <iframe src={embed} title="Preview" className="h-full w-full" allowFullScreen />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Feature this story on the homepage
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Elder</label>
              <input value={form.elderName} onChange={set("elderName")} placeholder="Elder name" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Region</label>
              <input value={form.region} onChange={set("region")} placeholder="Region" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tribe</label>
              <input value={form.tribe} onChange={set("tribe")} placeholder="Tribe" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Language</label>
              <input value={form.language} onChange={set("language")} placeholder="Language" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Story type</label>
              <input value={form.storyType} onChange={set("storyType")} placeholder="e.g. Folktale" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mood</label>
              <input value={form.mood} onChange={set("mood")} placeholder="e.g. Joyful" className={inputCls} />
            </div>
          </div>


          <div className="flex flex-wrap gap-2">
            {story.audio_url && (
              <button
                type="button"
                disabled={transcribe.isPending}
                onClick={() => transcribe.mutate()}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" /> {transcribe.isPending ? "Transcribing…" : "Transcribe with AI"}
              </button>
            )}
            <button
              type="button"
              disabled={translate.isPending || !form.transcriptOriginal.trim()}
              onClick={() => translate.mutate()}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              <Languages className="h-3.5 w-3.5" /> {translate.isPending ? "Translating…" : "Translate to English"}
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Transcript (original)</label>
            <textarea value={form.transcriptOriginal} onChange={set("transcriptOriginal")} rows={4} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Transcript (English)</label>
            <textarea value={form.transcriptEnglish} onChange={set("transcriptEnglish")} rows={4} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea value={form.description} onChange={set("description")} rows={2} className={inputCls} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-full border py-2.5 text-sm font-medium">Cancel</button>
            <button
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
