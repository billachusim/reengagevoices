# ReEngage Voices — Build Plan (with installable PWA + mobile-app feel)

A Spotify-style audio platform for African elders' stories on this project's **TanStack Start** stack (file-based routing + server functions + Lovable Cloud), warm/earthy visuals, a persistent dark player bar, and **installable PWA** behavior with a native mobile-app feel.

> Stack note: spec mentions Vite + React Router DOM, but this is TanStack Start. Routes map 1:1 to `src/routes/*`; data via `createServerFn` + TanStack Query.

> Open item: send your WhatsApp number — I'll wire a `WHATSAPP_NUMBER` constant with a placeholder until then (one-line change).

## 1. Installable PWA + mobile-app shell
- **Manifest-only installability** (per Lovable PWA guidance — no service worker, since you asked for install/home-screen, not offline): `public/manifest.webmanifest` with name, short_name, `display: "standalone"`, theme/background colors (warm cream + ochre), and icon set (192/512 + maskable + `apple-touch-icon`). Head tags for `manifest`, `theme-color`, `apple-touch-icon`, favicons added in `__root.tsx`.
- App icons generated from the ReEngage logo.
- **Adaptive navigation**: desktop/tablet uses the cream collapsible shadcn Sidebar; **mobile uses a fixed bottom tab bar** (Home · Browse · Search · Library · Contribute) sitting just above the persistent player — the native-app pattern.
- **Tabs & badges**: shadcn `Tabs` for in-page sections (transcript original/English, library sub-views); badge counts on tabs/nav (e.g. Library save count, Following count, unplayed/"new" markers) and tag/status chips throughout.
- Safe-area insets (`env(safe-area-inset-*)`) so bottom tabs + player clear the iPhone home indicator. Dense, scannable, touch-friendly spacing.

## 2. Design foundation
- Tokens in `src/styles.css` (oklch): cream `--background`, ochre `--primary`, terracotta `--accent`, dark `--night` (player bar), `--gradient-warm`, `--shadow-warm`, grain utility, scallop divider.
- Fonts via `@fontsource` (serif display + clean sans), mapped in `@theme`.
- Recreated components: `Waveform`, `ScallopDivider`, `StoryCard`, circular multicolor ReEngage logo, floating WhatsApp button.

## 3. Backend (Lovable Cloud) — enabled first
Schema (migration, GRANTs + RLS per platform rules):
- `profiles`, `user_roles` (+ `app_role` enum + `has_role()` security-definer fn)
- `regions` (self-referential), `tribes`, `languages`, `themes` (`kind`: type|mood)
- `elders`, `elder_languages`
- `stories` (`status`: draft|pending|published, `play_count`, transcripts original+english, audio/cover urls), `story_themes`
- `collections`, `collection_items`
- `saves`, `follows`, `play_history`, `pending_stories`

RLS: published stories + taxonomy readable by `anon`+`authenticated`; user-owned rows scoped to `auth.uid()`; story writes restricted to owner or moderator/admin.

Storage buckets: `story-audio`, `story-covers`, `elder-portraits` (public); `pending-audio` (private).

Server logic: `search-stories` RPC, `increment-play-count`, `submit-story` moderation intake. Auth: email/password + Google (Lovable broker).

Seed (~12 published stories): Yorùbá, Twi/Ashanti, Tamasheq, Zulu; 4 languages, 4 regions (country→region→village), all six themes; generated elder portraits + royalty-free placeholder audio.

## 4. Routes (`src/routes/`)
- `/` editorial home (Featured, Recently added, Continue listening, Editor's picks, Browse-by rails)
- `/browse` faceted grid + sticky filter rail; filters in URL via `validateSearch` (Region hierarchical, Tribe, Language, Type, Mood, Duration, Sort); per-facet empty states
- `/search` shadcn Command palette across stories/elders/regions/tribes/languages/collections/transcripts
- `/stories/$slug` hero, big play→queue related, waveform + chapter markers, transcript tabs, linked chips, elder mini-card, related rails, save/add-to-playlist/share/download-transcript
- `/elders`, `/elders/$slug`
- `/regions/$slug`, `/tribes/$slug`, `/languages/$slug`, `/themes/$slug`
- `/collections`, `/collections/$slug`
- `/_authenticated/library` (Saved, Playlists CRUD, History, Following — as tabs with badge counts)
- `/contribute`, `/_authenticated/contribute/record` (Web Audio → WAV 16kHz mono + metadata form → moderation)
- `/auth`, `/_authenticated/account`

Public routes read via public server fns; signed-in routes under managed `_authenticated/` layout.

## 5. Player
`AudioProvider` context: play/pause, prev/next from queue, shuffle, repeat-one, scrubbable waveform, volume, queue slide-over (Sheet) with reorder/clear, journey mode (continuous playback through a tribe/region/theme), no preview cap. Mini cover+title+elder always visible; mobile player sits above the bottom tab bar.

## 6. Build order (kept runnable at each step)
1. Cloud enable + schema + seed + design tokens/fonts/logo + PWA manifest/icons.
2. Adaptive shell (sidebar + mobile bottom tabs) + routing + AudioProvider + persistent player + seeded home.
3. Browse + filters + story page + elder/region/tribe/language/theme pages (public read).
4. Auth + Library (tabs + badges: saves, playlists, follows, history).
5. Contribute (Agadi page + recorder + moderation) + Search RPC + Collections + queue panel + journey mode + polish.

## Technical notes
- Filters/sort/search via `validateSearch` + `loaderDeps`, not `useState`.
- Reads: loader `ensureQueryData` + `useSuspenseQuery`; mutations via `useServerFn` + `useMutation` + invalidate.
- `play_count` + `submit-story` through server functions; admin/service-role only inside handler bodies.
- PWA is manifest-only (installable, no offline). If you later want true offline caching, that's an added service-worker step.

I'll implement in the order above; you'll have a clickable, installable app early and depth layered on after.