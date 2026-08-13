# Full story management in Admin → Edit

Right now the admin edit panel can change the video link, cover, description, transcripts, people/place metadata and the featured flag — but **not the title and not the audio**. That is why the old title keeps showing everywhere, and why there is no way to replace or remove a story's recording. This adds both, plus a delete action, so a story can be fully managed in one place.

## What gets added

### 1. Editable title (persists everywhere)
- A "Title" field at the top of the edit panel.
- Saving updates the story title used on the homepage hero, cards, story page, player and search.
- The story's web address (slug) **stays the same** so existing shared links and embeds keep working. An optional "Update the link to match the new title" checkbox regenerates the slug when you explicitly want it.

### 2. Audio management
- The panel shows the current recording with a small player and its duration, or "No audio" when empty.
- **Replace / upload audio**: file picker (mp3, m4a, wav, webm, ogg) uploads to the existing private `story-audio` bucket and stores a long-lived signed URL — same approach as the recorder and the cover upload.
- **Remove audio**: clears the recording from the story.
- Duration is read from the uploaded file in the browser and saved, so cards and the player show correct lengths.
- The existing "Transcribe with AI" button becomes usable right after an upload, since it reads the newly saved audio.

### 3. Full-story controls
- **Unpublish / republish** toggle (moves the story between published and draft) so a story can be pulled off the site without deleting it.
- **Delete story** with a confirm step, for genuine mistakes.
- List rows gain a "🎵 audio" marker alongside the existing ★ featured / 🖼 cover / ▶ video markers, so gaps are visible at a glance.

## Backend check and changes

- Extend the `update_story` database function with `_title`, `_slug`, `_audio_url`, `_duration_seconds` and `_status`, keeping every existing argument and behaviour unchanged. Title is trimmed and required to be non-empty; audio URL and cover are cleared when passed empty.
- Add a moderator/admin-guarded `delete_story` function that removes the story and its theme links, saves, history and point events.
- Storage: add insert/update/delete policies on the `story-audio` bucket for admins and moderators (today only the submitter can write there), so staff can replace a recording.
- `listAdminStories` starts returning `duration_seconds` and `status`, and lists drafts as well as published stories so unpublished ones remain reachable.
- `updateStory` server function gains the matching validated fields; a new admin-only `deleteStory` server function wraps the new database function.

## Notes
- Changing the title does not rename the audio or cover files; those are content-addressed and unaffected.
- Where a story shows the video's own title (inside the YouTube player itself), that text comes from YouTube and can only be changed on the YouTube channel — everything rendered by this app uses the story title you set here.
- Migration runs first, then the code changes.
