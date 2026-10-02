# ReEngage Voices

ReEngage Voices — Platform Plan

A separate Lovable project, reusing the marketing site's visual language (warm earthy palette, serif headings, waveform player, mini player, scallop dividers) but rebuilt as a real audio app. Spotify shell with archive depth: a player that follows you everywhere, fast filtered browsing across every dimension, and rich pages for elders, regions, tribes, and themes — with transcripts and provenance underneath each story.

1. Information architecture

/                       Home (editorial + Recently added + For you)
/browse                 All stories, faceted filters (region, tribe, language, type, mood, duration)
/search?q=              Global search (stories, elders, regions, tribes, collections)
/stories/:id            Story page: player, transcript, translation, elder card, related
/elders                 Elders directory
/elders/:slug           Elder profile: bio, photo, all stories, regions/tribes/languages
/regions/:slug          Region page (country/region/village hierarchy)
/tribes/:slug           Tribe / ethnic-group page
/languages/:slug        Language page
/themes/:slug           Theme/type page (folktales, songs, proverbs, history, ritual, lived memory)
/collections            Curated playlists (editorial + user)
/collections/:slug
/library                Signed-in: Saved, Playlists, History, Following (elders)
/contribute             Agadi WhatsApp explainer + in-browser recorder
/contribute/record      Authed recorder + metadata form
/auth                   Sign in / Sign up (optional)
/account                Profile, language preference, notifications

2. Layout (Spotify shell)

┌─────────────────────────────────────────────────────────┐
│ Top bar: logo · search · contribute · sign in / avatar  │
├──────────────┬──────────────────────────────────────────┤
│ Left sidebar │  Main scroll area (route content)        │
│  Home        │                                          │
│  Browse      │                                          │
│  Search      │                                          │
│  Library     │                                          │
│  ─────────   │                                          │
│  Playlists   │                                          │
│  Following   │                                          │
├──────────────┴──────────────────────────────────────────┤
│ Persistent player: cover · title/elder · waveform · ⏯  │
└─────────────────────────────────────────────────────────┘

Collapsible sidebar (shadcn Sidebar, icon-collapse on mobile/tablet).

Persistent bottom player powered by the same AudioProvider pattern as the marketing site, but without the 10-second preview limit and without the upsell dialog. Full waveform, scrub, prev/next from queue, shuffle, repeat-one, volume.

Floating WhatsApp "Share your story" button stays, linking to Agadi.

3. Core features

Browse & filtering

/browse shows a grid of story cards with a sticky filter rail:

Region (country → region → village, hierarchical multiselect)

Tribe / ethnic group (multiselect, searchable)

Language (multiselect)

Story type (folktale, song, proverb, history, ritual, lived memory, lullaby…)

Mood (joyful, mournful, instructive, sacred, playful)

Duration (<3m, 3–10m, 10m+)

Sort (newest, oldest, most played, longest, shortest)

Filters reflect in URL query params (shareable).

Empty state per facet ("No stories yet in this tribe — be the first to contribute").

Story page

Hero with cover, title, elder name, region, tribe, language, duration, play count.

Big play button → loads into persistent player + queues "related stories".

Waveform with chapter markers (if provided).

Transcript pane (original language) + tab for English translation when available.

Elder mini-card linking to /elders/:slug.

Tags (region/tribe/language/type/mood) all linkable to their pages.

Related stories rail ("More from this elder", "More Yorùbá folktales", "More from Ife").

Save, add-to-playlist, share, download-transcript actions.

Elder profile

Portrait, name, region, tribe, languages spoken, short bio.

All stories listed with mini-players.

"Follow" (signed-in) so new recordings notify follower.

Library (signed-in)

Saved stories, Playlists (CRUD), Listening history, Followed elders.

Search

Single search across stories, elders, regions, tribes, languages, collections, transcript text.

Recent + suggested queries.

Contribute (Agadi + web recorder)

/contribute explains Agadi with a prominent WhatsApp CTA.

/contribute/record (signed-in): record in browser (Web Audio → WAV), enter metadata (elder name, region, tribe, language, story type, mood, optional transcript), submit for moderation.

Submissions land in a pending_stories table; admins approve before publishing.

Player extras

Queue panel (slide-over) with reorder + clear.

"Listening as a journey" mode: continuous playback through a tribe/region/theme.

Sleep timer (nice-to-have).

4. Data model (Lovable Cloud)

profiles(id pk → auth.users, display_name, avatar_url, preferred_language, created_at)
user_roles(user_id, role enum[admin|moderator|user])

regions(id, slug, country, region, village, parent_id nullable)
tribes(id, slug, name, description)
languages(id, slug, name, iso_code)
themes(id, slug, name, kind enum[type|mood])  -- folktale, song, joyful, …

elders(id, slug, name, bio, photo_url, region_id, tribe_id, primary_language_id)
elder_languages(elder_id, language_id)

stories(
  id, slug, title, description,
  elder_id, region_id, tribe_id, language_id,
  audio_url, duration_seconds, cover_url,
  transcript_original, transcript_english,
  play_count, status enum[draft|pending|published], published_at, created_by
)
story_themes(story_id, theme_id)

collections(id, slug, title, description, cover_url, curator_id, is_public)
collection_items(collection_id, story_id, position)

saves(user_id, story_id, created_at)            -- "liked"
follows(user_id, elder_id, created_at)
play_history(user_id, story_id, played_at, ms_listened)

pending_stories(id, submitter_id, payload jsonb, audio_url, status, reviewed_by, reviewed_at)

RLS: published stories readable by anon + authenticated; writes restricted to owner or has_role(auth.uid(),'moderator').

Storage buckets: story-audio (public read), story-covers (public), elder-portraits (public), pending-audio (private).

user_roles + has_role() security-definer function exactly as the platform's role pattern requires.

5. Tech stack & libraries

Vite + React + TS + Tailwind, shadcn/ui (already standard).

shadcn Sidebar, Sheet, Dialog, Command (search), Tabs, Accordion.

React Router (routes above).

TanStack Query for data fetching, server-driven filter URL state.

Lovable Cloud for DB, auth (email/password + Google), storage, edge functions (moderation, play-count increment, search RPC).

Reuse Waveform, useAudioPlayer (strip the 10s cap), StoryCard styles, design tokens, fonts.

6. Visual language

Carry over verbatim from marketing site:

Warm cream background, ochre/terracotta --primary, --accent, bg-gradient-warm, shadow-warm, grain texture, scallop divider.

Serif headings (existing pairing), same body sans.

Reengage logo in sidebar + top bar.

Floating WhatsApp button bottom-left.

Departures from marketing site:

Dark persistent player bar (bg-night) at the bottom of every page.

Denser card grids (gap-4, smaller covers) for browse-style scanning.

Sidebar uses the cream tone, not dark.

7. Phasing

Shell: sidebar, top bar, routing, persistent player, home with seeded data.

Browse + filters + story page + elder page (read-only, public).

Auth + Library (saves, playlists, follows, history).

Contribute: Agadi page + in-browser recorder + moderation queue.

Search (RPC) + Collections + polish (queue panel, journey mode).

8. Ready-to-paste Lovable prompt

Copy this into a new Lovable project:

Build "ReEngage Voices" — a Spotify-style audio platform for African elders' stories, with archive depth.

Vibe & visuals. Reuse the warm, cinematic visual language of our marketing site (reengageafrica.com): cream background, ochre/terracotta primary, serif display headings paired with a clean sans body, soft warm shadows, subtle grain texture, scallop section dividers, and a multicolor circular ReEngage logo. Use the same waveform player aesthetic. Departures: add a dark persistent player bar at the bottom of every page, and denser card grids for browsing.

Shell. App-shell layout with a collapsible left sidebar (Home, Browse, Search, Library, divider, Playlists, Following), a top bar (logo, global search, "Share your story" WhatsApp link, Sign in/avatar), and a persistent bottom audio player that follows the user across routes. Floating green WhatsApp button bottom-left linking to our Agadi chatbot (https://wa.me/



) — placeholder for now.



Routes.
/ editorial home (Featured story, Recently added, Continue listening, Editor's picks, Browse by tribe/region/theme rails).
/browse faceted browse: sticky filter rail with Region (hierarchical country→region→village), Tribe, Language, Story type (folktale, song, proverb, history, ritual, lullaby, lived memory), Mood (joyful, mournful, instructive, sacred, playful), Duration (<3m, 3–10m, 10m+), Sort (newest, most played, longest, shortest). Filters reflect in URL query params.
/search global search across stories, elders, regions, tribes, languages, collections, and transcript text. Use shadcn Command palette UX.
/stories/:slug story page with hero (cover, title, elder, region, tribe, language, duration), big play button that loads into the persistent player and queues related stories, waveform scrubber with chapter markers, transcript pane (tabs: original language / English translation), linked tag chips, elder mini-card, "More from this elder / region / theme" rails, save/add-to-playlist/share/download-transcript actions.
/elders, /elders/:slug directory + profile (portrait, bio, region, tribe, languages, all stories, Follow button).
/regions/:slug, /tribes/:slug, /languages/:slug, /themes/:slug index pages — header + filtered story grid.
/collections, /collections/:slug curated playlists.
/library (signed-in): Saved, Playlists (CRUD), History, Following.
/contribute Agadi WhatsApp explainer with prominent CTA.
/contribute/record (signed-in) in-browser recorder (Web Audio API → WAV, 16 kHz mono) with a metadata form (elder name, region, tribe, language, story type, mood, optional transcript) that submits to a moderation queue.
/auth, /account.

Player. Custom React audio context (no 10-second limit), with: play/pause, prev/next from queue, shuffle, repeat-one, scrubbable waveform, volume, queue slide-over with reorder, "journey mode" continuous playback through a tribe/region/theme. Mini cover + title + elder always visible on the persistent bar.

Auth. Optional accounts via Lovable Cloud (email/password + Google). Listening is fully public; saves, playlists, follows, history, and contributing require sign-in.

Data (Lovable Cloud). Tables: profiles, user_roles (with app_role enum and has_role() security-definer function), regions (self-referential hierarchy), tribes, languages, themes (kind: type|mood), elders, elder_languages, stories (status: draft|pending|published, play_count, transcripts original + english), story_themes, collections, collection_items, saves, follows, play_history, pending_stories. RLS: published stories readable by anon + authenticated; writes scoped to owner or moderators/admins. Storage buckets: story-audio, story-covers, elder-portraits (public), pending-audio (private). Edge functions: submit-story (moderation intake), increment-play-count, search-stories (RPC over title/elder/transcript).

Seed. Seed ~12 stories across at least 4 tribes (Yorùbá, Twi/Ashanti, Tamasheq, Zulu), 4 languages, 4 regions, and all six themes, with realistic elder portraits and royalty-free audio placeholders, so the home, browse, and detail pages feel populated immediately.

Stack. Vite + React + TypeScript + Tailwind + shadcn/ui, React Router, TanStack Query, Lovable Cloud (DB + auth + storage + edge functions). Use shadcn Sidebar, Sheet, Dialog, Tabs, Accordion, Command.

Build order. (1) Shell + routing + persistent player + seeded home. (2) Browse + filters + story page + elder page (public read). (3) Auth + Library. (4) Contribute (Agadi page + recorder + moderation). (5) Search + Collections + queue panel + journey mode + polish.

Make it feel like a real consumer audio app — fast, dense, scannable — while honoring the warmth and dignity of the elders whose voices it carries.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://reengagevoices.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd90d570-8e5a-44a3-bbcf-c9d88f78ff2c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
