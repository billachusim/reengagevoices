# Admin: create stories + automatic story formats

## Where things stand

- The admin console has Overview, Queue, Edit stories, Elders, Collections, Creators. There is **no way to create a story from scratch** — stories only appear by approving a creator submission from the Queue. Editing works fully (title, elder, taxonomy, cover, audio, YouTube, transcripts, featured, publish, delete).
- There is **no format concept** in the data or UI. The Audio / Video / Written collections exist only as hand-curated lists: an admin must add each story to the right collection manually, and nothing keeps them in sync when a story gains audio or a video link.
- Written-only stories are technically possible today (a story with transcript and no audio) but nothing labels them, and the story page/player assumes there is something to play.

## What to build

### 1. "New story" in the admin

Add a **New story** button on the Edit stories tab that opens the same panel already used for editing, but empty. One form, one workflow, regardless of format:

- Title, description
- Elder (name — creates the elder if new), region, tribe, language, story type, mood
- Cover image: upload or URL
- Audio: upload or URL (duration read automatically)
- YouTube link
- Transcript (original) and English translation, with the existing AI transcribe/translate buttons
- Featured toggle, Published/draft toggle

Nothing is required except a title and an elder. Save creates the story and reopens it in edit mode.

### 2. Format is derived, never chosen

The system infers the format from what was filled in:

```text
audio + video        -> Full story
audio only           -> Audio story
video only           -> Video story
neither, transcript  -> Written story
nothing yet          -> Draft / incomplete
```

The format shows as a badge in the admin list, on the story card, and on the story detail page. No dropdown, no separate workflows.

### 3. Format collections stay in sync automatically

The Audio stories / Video stories / Written stories collections become format-driven: when a story is created or edited, it is placed in the collection matching its derived format and removed from the others. Full stories appear in both Audio and Video. Hand-curated collections (themed picks) are untouched.

### 4. Written stories read properly

For a written story the detail page leads with the elder's portrait and the transcript, hides the play/queue controls, and the homepage/browse cards show a "Read" action instead of "Play". Existing signed-out gating on transcript length stays as it is.

## Technical notes

- New `create_story` security-definer function mirroring `update_story` (staff-only, find-or-create elder/region/tribe/language, slug generation), plus a `createStory` server function in `src/lib/admin.functions.ts`.
- Extract the current `EditPanel` in `src/routes/_authenticated/admin/edit.tsx` into a shared form component driven by an optional story, so create and edit share one UI.
- Add `storyFormat(story)` to `src/lib/constants.ts` returning `full | audio | video | written | empty`, used by admin list, story cards, and the detail page.
- Format-collection sync runs inside the story create/update function against the three collections resolved by slug; the tables and grants already exist.
