# Featured story cover + elder portrait

## 1. New featured cover image
The current featured cover is an uploaded graphic full of baked-in text, so the overlaid title/description are unreadable.

- Take the existing cover of "Why Frogs Do Not Have Tails" as the source and produce a clean version: the elder woman prominently framed on the right, deep dark background, warm rim light, **no text or logos**, left side kept intentionally empty so the headline sits on clean darkness.
- Upload the new image to the story-covers bucket and point the story's cover to it (the old file stays untouched in storage).

## 2. Elder portrait for Oriaku Elochukwu Andeh
- Crop/derive a square portrait of the same woman from that cover artwork, warm dark backdrop, head-and-shoulders.
- Store it and set it as her photo so she appears in "Voices to follow", her elder page, and story credits instead of a plain gradient.

## 3. Clear hero vs featured separation
Right now the dark landing hero flows straight into a dark featured banner and they read as one block.

- Featured section becomes a distinct card: warm parchment band with generous padding, an "Editor's pick" eyebrow chip, the cover art as a rounded image panel beside the text on desktop (stacked on mobile) rather than a full-bleed background behind the copy.
- Text sits on a solid warm surface, so legibility no longer depends on the artwork.
- Keep the existing Play audio / Watch video / Details actions and the scallop divider below.

## Technical notes
- Image work: `imagegen--edit_image` from the current cover, then upload via storage tools; update `stories.cover_url` and `elders.photo_url` with SQL.
- Layout change is confined to the featured block in `src/routes/index.tsx`; no changes to `coverImage`/`elderImage` rules in `src/lib/constants.ts`.
