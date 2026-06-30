import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mic, Square } from "lucide-react";
import { useRef } from "react";
import { submitStory } from "@/lib/library.functions";
import { facetsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/contribute/record")({
  component: RecordPage,
});

function RecordPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: facets } = useQuery(facetsQuery);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [form, setForm] = useState({ elderName: "", title: "", region: "", tribe: "", language: "", storyType: "", mood: "", transcript: "" });

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { toast.error("Microphone access was denied."); }
  };
  const stop = () => { mediaRef.current?.stop(); setRecording(false); };

  const mut = useMutation({
    mutationFn: () => submitStory({ data: { ...form } }),
    onSuccess: () => { qc.invalidateQueries(); toast.success("Submitted for review. Thank you!"); navigate({ to: "/library" }); },
    onError: (e: any) => toast.error(e.message ?? "Could not submit"),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const types = facets?.themes.filter((t) => t.kind === "type") ?? [];
  const moods = facets?.themes.filter((t) => t.kind === "mood") ?? [];

  return (
    <div className="mx-auto max-w-xl px-5 py-8 sm:px-8">
      <h1 className="font-serif text-2xl font-bold sm:text-3xl">Record a story</h1>
      <p className="mt-1 text-sm text-muted-foreground">Capture the audio, add the details, and we'll review it before it joins the archive.</p>

      <div className="my-6 flex flex-col items-center gap-3 rounded-2xl border bg-card p-6">
        {!recording ? (
          <button onClick={start} className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"><Mic className="h-7 w-7" /></button>
        ) : (
          <button onClick={stop} className="grid h-16 w-16 animate-pulse place-items-center rounded-full bg-destructive text-destructive-foreground"><Square className="h-6 w-6" /></button>
        )}
        <p className="text-xs text-muted-foreground">{recording ? "Recording… tap to stop" : audioUrl ? "Recording captured" : "Tap to start recording"}</p>
        {audioUrl && <audio controls src={audioUrl} className="w-full" />}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
        <input required placeholder="Elder's name" value={form.elderName} onChange={set("elderName")} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" />
        <input required placeholder="Story title" value={form.title} onChange={set("title")} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Region / village" value={form.region} onChange={set("region")} className="rounded-lg border bg-background px-3 py-2.5 text-sm" />
          <input placeholder="Tribe" value={form.tribe} onChange={set("tribe")} className="rounded-lg border bg-background px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input placeholder="Language" value={form.language} onChange={set("language")} className="rounded-lg border bg-background px-3 py-2.5 text-sm" />
          <select value={form.storyType} onChange={set("storyType")} className="rounded-lg border bg-background px-3 py-2.5 text-sm"><option value="">Type</option>{types.map((t) => <option key={t.slug} value={t.name}>{t.name}</option>)}</select>
          <select value={form.mood} onChange={set("mood")} className="rounded-lg border bg-background px-3 py-2.5 text-sm"><option value="">Mood</option>{moods.map((t) => <option key={t.slug} value={t.name}>{t.name}</option>)}</select>
        </div>
        <textarea placeholder="Transcript or summary (optional)" value={form.transcript} onChange={set("transcript")} rows={4} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" />
        <button disabled={mut.isPending} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{mut.isPending ? "Submitting…" : "Submit for review"}</button>
      </form>
    </div>
  );
}
