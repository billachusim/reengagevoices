## Goal

Populate `youtube_url` on two existing published stories with `https://www.youtube.com/watch?v=N5JPva-XnL4` so the "Watch" video embed shows up live and you can get the feel.

Everything needed to render the embed already exists:
- `youtube_url` column on `stories`
- `youtubeEmbedUrl()` helper in `src/lib/youtube.ts`
- `stories.$slug.tsx` already renders a "Watch" section with an `<iframe>` when `youtube_url` is set

So this is purely a data change — no UI or code changes required.

## Plan

1. Run a small data migration that sets `youtube_url = 'https://www.youtube.com/watch?v=N5JPva-XnL4'` on two stories:
   - `anansi-and-the-wisdom-pot` (the homepage featured story)
   - `the-river-that-remembers` (a second well-known story, for variety)

```sql
update public.stories
set youtube_url = 'https://www.youtube.com/watch?v=N5JPva-XnL4'
where slug in ('anansi-and-the-wisdom-pot', 'the-river-that-remembers');
```

2. After it runs, open those two story pages and confirm the "Watch" section renders the embedded video.

## Notes

- This is demo/preview data only — you can clear or change it anytime from the admin Edit story screen.
- If you'd rather pick different stories, tell me which slugs and I'll target those instead.
