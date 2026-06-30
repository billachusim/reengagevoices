## Goal

1. Let admins set a story's cover/header image directly from the admin edit screen — by pasting an image URL **or** uploading a file — so headers no longer fall back to the gradient/elder placeholder.
2. Resolve the second ask: yes, a small shared rule is worth extracting. The story card and detail header currently re-implement the same "cover → elder portrait → gradient" precedence inline, and the detail page separately decides when a thumbnail is redundant. One helper makes that a single source of truth.

## Part 1 — Cover image field in admin edit

### Database
- Extend the existing `update_story` RPC with a new optional `_cover_url text` parameter that writes `cover_url = NULLIF(trim(...), '')` on the story. (Recreate the function with the extra arg; all current behavior unchanged.)

### Storage
- Create a public `story-covers` storage bucket for uploaded cover images (covers must be publicly readable to render as `<img src>`).
- Add RLS policies on `storage.objects`: public read for the bucket; insert/update/delete limited to admins/moderators (reuse the `has_role` check).

### Server functions (`src/lib/admin.functions.ts`)
- Add `cover_url` to `AdminStoryRow` and to the `listAdminStories` select.
- Add `coverUrl: z.string().max(1000).optional()` to the `updateStory` validator and pass `_cover_url` to the RPC.
- Add an admin-only `uploadStoryCover` server function (uses `requireSupabaseAuth` + staff check) that accepts the file, stores it in `story-covers`, and returns the public URL. (Mirrors the existing audio-upload approach.)

### UI (`src/routes/_authenticated/admin/edit.tsx`)
- Add a "Cover image" field to the edit panel with:
  - A URL text input (`coverUrl`) wired into `form`.
  - A file picker that uploads via `uploadStoryCover` and fills the URL on success (with an uploading state).
  - A small live preview thumbnail of the current cover, and a "Remove" action that clears it.
- Include `coverUrl` in the existing `updateStory` save mutation. Invalidate `stories`/`story` queries so the new header shows immediately.
- Show a "🖼 cover" marker in the story list row when a story already has a cover (next to the existing ★/▶ markers).

## Part 2 — Shared thumbnail-vs-background rule (refactor)

### The single rule (in `src/lib/constants.ts`)
Add a helper that encodes the precedence and the "is a separate thumbnail needed" decision once:

```text
storyImage(story):
  primary   = coverImage(story) ?? elderPortrait(elder.slug) ?? null
  isCover   = !!coverImage(story)            // real cover photo
  isPortrait= !isCover && !!elderPortrait    // elder fallback
```

Rule shared by both surfaces: **if a cover exists it is the background/primary image and no extra thumbnail is rendered; otherwise the elder portrait fills the same slot; otherwise the gradient alone.**

### Apply it
- `src/components/story-card.tsx` (Card + Row): replace the duplicated `cover`/`portrait` branching with the helper, keeping the current look (cover = full-cover image; portrait = luminosity-blended fallback; gradient otherwise).
- `src/routes/stories.$slug.tsx` header: use the helper so the thumbnail box renders only when the primary image is the portrait fallback (cover stays background-only) — same behavior as today, now driven by the shared rule instead of an inline `!cover && portrait` check.

No visual change is intended from Part 2; it removes the divergent inline copies so future tweaks happen in one place.

## Notes
- Migration runs first (schema + RPC + bucket policies); typed client regenerates after approval, then the code changes land.
- Cover precedence everywhere stays: explicit cover → elder portrait → warm gradient.
