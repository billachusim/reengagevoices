# Admin tools, audio intro & YouTube embeds

Three features, scoped to what the runtime supports. (Note: heavy server-side audio denoising isn't possible on this hosting runtime, so per your choice we're doing **AI transcription now and skipping noise removal**.)

## 1. Admin AI transcription

Give admins/moderators a one-click "Transcribe with AI" action on a submission's audio, so they don't have to type the transcript by hand.

- New server function `transcribeAudio` (staff-only, reuses the existing `assertStaff` check) that:
  - Takes a story-audio path/URL, downloads the bytes server-side, and sends them to Lovable AI's speech-to-text endpoint (`openai/gpt-4o-mini-transcribe`).
  - Returns the transcript text.
- In the **admin review dialog** (`admin/queue.tsx`): add a "Transcribe with AI" button next to the audio player. Result fills the transcript field, which the admin can edit before approving. Optionally a second pass to translate the transcript to English (using the chat model) populating a separate English field.
- Errors (rate limit / no credits) surface as clear toasts.

## 2. Prerecorded intro before every story

A short branded intro clip plays first, then the story audio — non-destructive (the stored files are untouched, and the intro can be swapped any time).

- Add an intro audio asset (you provide the clip; until then a placeholder). Stored as a static asset served with the app.
- Update the audio player (`audio-provider.tsx`) so that when a story starts, it first plays the intro clip once, then automatically continues into the story audio. Skipping/seeking the story still works normally; the intro is only at the very start of playback for a story, not between queued tracks unless desired.
- Applies globally to every story automatically.

## 3. YouTube video embeds (replaces direct video upload)

Stories can have an associated YouTube video. Only admins add the link (creators submit audio only, as today).

- **Schema:** add a `youtube_url` text column to `stories` (and accept it during approval). Stored value validated as a YouTube URL; we extract the video ID for embedding.
- **Contribute flow:** unchanged — creators still submit audio only. (We confirm there's no creator-facing video upload to remove; submission stays audio-based.)
- **Admin approval** (`admin/queue.tsx`): add an optional "YouTube link" field in the review dialog; passed through `approveSubmission` → `approve_pending_story` to set `youtube_url`.
- **Edit existing stories:** new staff-only `updateStory` server function + a small admin "Edit story" screen (search/pick a published story, edit YouTube link, transcript, English transcript, description). This is also where the AI transcription button is reused for already-published stories.
- **Story detail page** (`stories.$slug.tsx`): when `youtube_url` is set, render a responsive embedded YouTube player (privacy-friendly `youtube-nocookie` embed) in the story body. Audio playback remains available alongside it.

## Technical notes

- Server work uses `createServerFn` with `requireSupabaseAuth` + the existing `has_role` staff check — no new edge functions.
- Transcription calls Lovable AI (no new API key needed); audio is fetched server-side via a signed URL and sent as the request body.
- `approve_pending_story` RPC gets a new `_youtube_url` parameter; a new lightweight `update_story` RPC (or direct authorized update) handles edits to published stories.
- `StoryDTO` and the story query gain `youtube_url`.
- Migration adds `stories.youtube_url` and updates the two RPCs. GRANTs unchanged (column on existing table).

## Open item

For "other things admins can do" beyond transcription — e.g. editing elder/region metadata, re-ordering, or featuring stories — tell me which you want and I'll fold them into the admin edit screen. Noise removal can be added later via an external audio-cleanup service if you decide to pay for one.