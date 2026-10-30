import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audioObjectPath } from "@/lib/audio-storage";

export const Route = createFileRoute("/api/audio/$id")({
  server: { handlers: { GET: async ({ params, request }) => {
    if (!z.string().uuid().safeParse(params.id).success) return new Response("Not found", { status: 404 });
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: story, error } = await sb.from("stories").select("audio_url").eq("id", params.id).eq("status", "published").maybeSingle();
    if (error || !story?.audio_url) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    const path = audioObjectPath(story.audio_url, process.env.SUPABASE_URL);
    if (!path) return new Response("Not found", { status: 404 });
    // Privileged file access only after public RLS confirms this story is published.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from("story-audio").createSignedUrl(path, 30);
    if (!signed) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    const range = request.headers.get("Range");
    if (range && /^bytes=\d*-\d*$/.test(range)) headers.set("Range", range);
    const audio = await fetch(signed.signedUrl, { headers, redirect: "error" });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]) {
      const value = audio.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(audio.body, { status: audio.status, headers: responseHeaders });
  } } },
});