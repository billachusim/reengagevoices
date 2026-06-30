## Goal

Give the featured story a real cover image, make the app actually render story cover images where they exist, and surface the YouTube video so it's easy to find (hero + detail header), not buried down the page.

## 1. Render `cover_url` everywhere (the missing wiring)

Right now `cover_url` is stored but never displayed. Add a small helper and use `cover_url` as the primary image, falling back to the existing gradient + elder portrait when it's empty. This means any story (now or future) with a cover photo shows it automatically.

Places to update:
- **Story cards** (`story-card.tsx`) — show `cover_url` as the square image when present.
- **Story detail header** (`stories.$slug.tsx`) — use `cover_url` for the thumbnail and, when present, as a soft background.
- **Featured hero** (`index.tsx`) — when the featured story has a `cover_url`, use it as the hero background image with a dark overlay for text legibility; otherwise keep the current warm gradient.

## 2. Create and attach a cover image for the featured story

- Generate an Anansi-themed cover (African folktale / spider-and-wisdom motif, warm painterly style) and host it as a CDN asset.
- Set that image as `cover_url` on `anansi-and-the-wisdom-pot` so the featured hero and its card immediately show a real cover.
- (Optional, your call) Generate one for `the-river-that-remembers` too, so both featured/demo stories look complete.

## 3. Make the video easy to find

- Add a **"Watch video"** button:
  - In the **featured hero** (only when the story has a `youtube_url`).
  - In the **story detail header** action row (next to Play / Queue / Share).
  - Both smooth-scroll to the existing "Watch" section (which gets an anchor id). On the detail page the embedded player already plays inline there.
- Keep the existing inline "Watch" embed section as-is.

## 4. Collections cards — recommendation

I recommend **leaving the collection cards as the clean gradient** look. Collections group many stories, so a single cover photo tends to feel arbitrary, and the current gradients keep that grid calm and consistent. I'll leave them unchanged unless you'd like me to add covers there too.

## Technical notes

- Add a `coverImage(story)` helper returning `cover_url` or `undefined`; components fall back to `coverGradient(slug)` + `elderPortrait` as today.
- The featured hero switches from `bg-gradient-warm` to an inline `backgroundImage` of the cover (with an overlay layer) when a cover exists.
- Cover image generated via image generation, uploaded through `lovable-assets`, and the resulting URL written to `stories.cover_url` via a data update.
- No schema change needed — `cover_url` already exists.
