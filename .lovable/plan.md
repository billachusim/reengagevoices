# ReEngage African Voices — homepage, media switching & access rules

## Brand
- Replace the logo everywhere (header, sidebar, mobile bar, favicon, PWA icons, OG image) with the new mic-in-Africa emblem.
- WhatsApp number becomes +234 916 841 0880 across the FAB, top bar and contribute page.

## Home page
- New dark hero at the top: full-bleed dark background with an elder photo behind it, warm serif headline "Every voice holds a lifetime of meaning", the welcome paragraph, and two pill buttons — Explore stories / Submit your voice. The featured story block moves below the hero and keeps its play + watch actions.
- Near the bottom, three horizontal cards: "We listen", "We preserve", "We pass it on", each with an orange rounded icon tile, a big faded number (01/02/03), title and body copy — matching the reference.
- New dark footer: logo + "ReEngage Voices", tagline, Archive column (All stories, Contributors), Project column (About, Submit a story, ReEngage Africa), copyright line.
- Dark sections use clear white text; the mid-page rails and "Browse by theme" stay on the light warm background.

## Collections → three story formats
- Collections becomes three fixed, admin-curated collections: **Audio stories**, **Video stories**, **Written stories**, with the nav label changed accordingly. Admin keeps full control of which stories sit in each.
- Written stories: stories can be published with no audio — text body plus the elder's photo. The story page renders a reading layout (elder portrait + text, no player) when there is no audio.

## Media switching on the story page
- The header Play button plays audio instantly (as today) and now also smooth-scrolls down to the media block.
- The media block holds one container with a two-button segmented control: **Audio | Video**. Choosing Video pauses audio and shows the YouTube embed; choosing Audio pauses the video and resumes audio — Spotify/YouTube-Music style. If a story only has one format, only that button shows.

## Access rules (preview only)
- Signed-out visitors can browse, search and open story pages.
- Audio/video playback is capped at a 30-second preview; when it hits the cap the player pauses and a "Sign in to keep listening" prompt appears.
- Transcripts and written-story bodies are truncated with a sign-in prompt below the fold.
- Signed-in users get everything unchanged.

## Navigation & interaction fixes
- Bottom tab "Share" renamed to **Record**.
- Fix the scroll bug: the mobile top bar and bottom tabs must stay fixed while only the page body scrolls (currently the whole page, including nav, scrolls on the contribute/share page).
- The WhatsApp FAB becomes draggable — you can move it anywhere on screen, it stays put, and a tap (no drag) still opens WhatsApp.

## Featured page copy
- "Play story" button label becomes "Play audio".

## Technical notes
- New `stories.body` text column (or reuse `transcript_english`) plus allowing empty `audio_url` for written stories; three collections seeded via the existing `upsert_collection`/`set_collection_items` RPCs.
- Playback gating enforced client-side in `AudioProvider` (time cap + prompt) and by truncating transcript text server-side for anonymous readers so full text isn't shipped to signed-out clients.
- Dark surfaces use new semantic tokens in `src/styles.css` (`--night` family already exists) — no hardcoded colours.
- Logo added via Lovable Assets; favicon written as a real file in `public/`.
