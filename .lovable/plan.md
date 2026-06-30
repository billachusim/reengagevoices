## Finish applying official logo and brand name

Most of this is already done in the previous turn. Remaining work plus one correction (brand name should be **ReEngage African Voices**, plural).

### Already completed
- Official logo saved to `src/assets/logo.png` (used in header, sidebar, auth screen).
- Generated `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, and `public/favicon.ico` from the official logo.
- Added favicon `<link>` to `src/routes/__root.tsx`.
- `public/manifest.webmanifest` name updated.

### Remaining / correction
1. **Fix brand name to "ReEngage African Voices"** (add the "s"). Previous edits set it to "ReEngage African Voice" across:
   - `src/routes/__root.tsx` (title, author, og:title)
   - All route `head()` titles (`browse`, `stories.$slug`, `elders.*`, `search`, `collections.*`, `themes`, `regions`, `tribes`, `languages`, `auth`, `contribute.index`, `index`)
   - `public/manifest.webmanifest`
   - `src/components/app-shell.tsx` brand text — second line currently "African Voice" → "African Voices"
2. **Verify** the build/typecheck passes and the header + favicon render with the new logo.

### Notes
- No logic changes; this is branding/assets only.
- `short_name` stays "ReEngage" for the installed PWA tile.
