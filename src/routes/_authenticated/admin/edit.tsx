import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Languages, Search, Upload, X, Trash2 } from "lucide-react";
import {
  listAdminStories,
  updateStory,
  deleteStory,
  transcribeAudio,
  translateToEnglish,
  type AdminStoryRow,
} from "@/lib/admin.functions";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { supabase } from "@/integrations/supabase/client";

const COVER_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) ? Math.round(el.duration) : 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    el.src = url;
  });
}

function fmtDuration(s: number) {
  if (!s) return "unknown length";
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}



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
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{s.status !== "published" && <span className="text-destructive">draft</span>}{s.is_featured && <span className="text-primary">★ featured</span>}{s.cover_url && <span>🖼 cover</span>}{s.audio_url && <span>🎵 audio</span>}{s.youtube_url && <span>▶ video</span>}</span>

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
    title: story.title,
    youtubeUrl: story.youtube_url ?? "",
    coverUrl: story.cover_url ?? "",
    audioUrl: story.audio_url ?? "",
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
  const [published, setPublished] = useState(story.status === "published");
  const [duration, setDuration] = useState(story.duration_seconds ?? 0);
  const [regenerateSlug, setRegenerateSlug] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
  const embed = youtubeEmbedUrl(form.youtubeUrl);

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${story.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("story-covers").upload(path, file, {
        cacheControl: "31536000",
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("story-covers").createSignedUrl(path, COVER_URL_TTL);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not create URL");
      setForm((f) => ({ ...f, coverUrl: signed.data.signedUrl }));
      toast.success("Cover uploaded.");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/")) { toast.error("Please choose an audio file."); return; }
    setUploadingAudio(true);
    try {
      const secs = await readDuration(file);
      const ext = file.name.split(".").pop() || "mp3";
      const path = `${story.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("story-audio").upload(path, file, {
        cacheControl: "31536000",
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("story-audio").createSignedUrl(path, COVER_URL_TTL);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not create URL");
      setForm((f) => ({ ...f, audioUrl: signed.data.signedUrl }));
      setDuration(secs);
      toast.success("Audio uploaded. Save to apply.");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingAudio(false);
    }
  };

  const remove = useMutation({
    mutationFn: () => deleteStory({ data: { storyId: story.id } }),
    onSuccess: () => {
      toast.success("Story deleted.");
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not delete"),
  });




  const save = useMutation({
    mutationFn: () => {
      if (!form.title.trim()) throw new Error("Title cannot be empty.");
      return updateStory({
        data: {
          storyId: story.id,
          ...form,
          title: form.title.trim(),
          isFeatured,
          regenerateSlug,
          durationSeconds: duration,
          status: published ? "published" : "draft",
        },
      });
    },
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
    mutationFn: () => transcribeAudio({ data: { audioUrl: form.audioUrl } }),
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input value={form.title} onChange={set("title")} placeholder="Story title" className={inputCls} />
            {form.title.trim() !== story.title && (
              <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={regenerateSlug} onChange={(e) => setRegenerateSlug(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                Update the link to match the new title (breaks existing shared links)
              </label>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Audio</label>
            {form.audioUrl ? (
              <div className="space-y-2 rounded-lg border bg-card p-2">
                <audio src={form.audioUrl} controls className="w-full" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{fmtDuration(duration)}</span>
                  <button
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, audioUrl: "" })); setDuration(0); }}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No audio attached.</p>
            )}
            <input ref={audioRef} type="file" accept="audio/*" onChange={onAudioFile} className="hidden" />
            <button
              type="button"
              disabled={uploadingAudio}
              onClick={() => audioRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" /> {uploadingAudio ? "Uploading…" : form.audioUrl ? "Replace audio" : "Upload audio"}
            </button>
          </div>

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

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cover image</label>
            <div className="flex gap-2">
              <input value={form.coverUrl} onChange={set("coverUrl")} placeholder="Paste an image URL…" className={inputCls} />
              <input ref={fileRef} type="file" accept="image/*" onChange={onCoverFile} className="hidden" />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
            {form.coverUrl && (
              <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <img src={form.coverUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, coverUrl: "" }))}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                  aria-label="Remove cover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Used as the story header. Leave empty to fall back to the elder portrait / gradient.</p>
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
            {form.audioUrl && (
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

          <div className="pt-1">
            {confirmDelete ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
                <span className="flex-1">Delete this story permanently?</span>
                <button onClick={() => setConfirmDelete(false)} className="rounded-full border px-3 py-1 font-medium">No</button>
                <button
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                  className="rounded-full bg-destructive px-3 py-1 font-semibold text-destructive-foreground disabled:opacity-60"
                >
                  {remove.isPending ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete story
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
