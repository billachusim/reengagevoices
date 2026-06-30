## Goal

Make collection cards carry the same warm cover artwork that browse and story cards use, instead of a plain gradient — so the look stays consistent across the app. Where a collection has no usable artwork yet, it keeps the current gradient so nothing looks broken.

## Approach

Each collection groups several stories that already have cover images. Rather than commissioning a separate piece of art per collection, derive the card image from the collection's own stories: use the cover of the first member story that has one. This keeps the artwork on-brand and automatic — when stories get covers, their collections light up too. A gradient remains the fallback when no member story has a cover.

(The `collections` table already has a `cover_url` column, so this also respects an explicit cover when one is ever set — explicit `cover_url` wins, then first member-story cover, then gradient.)

## Changes

1. **Data (`catalog.functions.ts` → `getCollections`)**
   - Extend the query to pull each collection's member story covers (e.g. `collection_items(story:stories(cover_url))`, ordered by position).
   - Compute a `cover_url` per collection: the collection's own `cover_url` if set, else the first member story's non-empty `cover_url`, else `null`.
   - Return `cover_url` on each collection.

2. **Type (`src/lib/types.ts` → `CollectionDTO`)**
   - Add `cover_url: string | null`.

3. **Collections grid (`src/routes/collections.index.tsx`)**
   - When `cover_url` exists, render it as the card's background image (object-cover) with a dark gradient overlay so the white title/description stay legible; otherwise keep the current `coverGradient(slug)` background. Reuse the `coverImage()` helper from `constants.ts`.

4. **Saved playlists grid (`src/routes/_authenticated/library.tsx`)**
   - Apply the same cover-or-gradient treatment to the playlist cards so the two grids match. (Requires the library's collections source to include `cover_url` — confirm/extend `getLibrary` similarly; gradient fallback if absent.)

## Scope notes

- Collection detail header (`collections.$slug.tsx`) keeps its gradient for now — this request is specifically about the cards. Easy to extend later if you want the header to match.
- No new assets generated and no schema change — artwork is reused from existing story covers.

## Technical notes

- Overlay pattern: a relatively-positioned card with the `<img>` absolutely filling it, a `bg-black/30`-style gradient layer above the image, and the text content on top — mirroring how the homepage hero handles cover legibility.
