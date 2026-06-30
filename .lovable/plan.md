# Make story submissions carry real audio

The `/contribute/record` screen and the admin approval flow already exist and work. The missing piece: **recorded audio is never saved**, so every submission arrives with no playable audio. This plan fixes that and adds a file-upload option. No changes to who can submit (any signed-in user) and transcripts stay manual.

## What happens today (for reference)
- Any signed-in user records/fills the form at `/contribute/record` → `submitStory` inserts a row into `pending_stories` with `status: 'pending'`.
- It does **not** appear in the feed. Admins review it in **Admin → Queue**; approving publishes the story and awards points.
- Bug: the recorder captures audio into a temporary in-browser blob but never uploads it, and `submitStory` is called without `audioUrl`. There is no storage bucket.

## Changes

### 1. Storage bucket for submission audio
- Create a `story-audio` bucket (public, so admins can listen to pending clips and published stories can play).
- RLS on `storage.objects`: authenticated users can upload to their own folder (`{userId}/...`); public read for playback.

### 2. Audio upload helper (client)
- On submit, upload the recorded blob (or a chosen file) to `story-audio` under `{userId}/{timestamp}.{ext}`, get the public URL, and pass it as `audioUrl` to `submitStory` (which already accepts it).

### 3. Recorder screen (`contribute.record.tsx`)
- Keep the live recorder.
- Add a "Upload an audio file instead" input (accepts common audio types, ~20MB cap) as an alternative to recording.
- Block submit until either a recording or an uploaded file is present; show an uploading state.

### 4. Admin queue
- Confirm the queue plays `audio_url` from the pending payload so reviewers can listen before approving. (`approve_pending_story` already copies `audio_url` onto the published story, so playback works post-approval too.)

## Out of scope (per your answers)
- No creator-only gating — submission stays open to any signed-in user.
- No AI auto-transcription — transcript box stays manual/optional.

## Technical notes
- Bucket via the storage tool; policies via migration on `storage.objects` only.
- Upload uses the browser Supabase client (`@/integrations/supabase/client`) so RLS applies as the signed-in user; no new server function needed since `submitStory` already takes `audioUrl`.
- File naming `{auth.uid()}/...` so the owner-folder RLS check passes.
