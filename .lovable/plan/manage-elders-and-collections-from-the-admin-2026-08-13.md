# Manage elders and collections from the admin

Today the homepage rails pull everything automatically: "Voices to follow" lists every elder alphabetically, and "Collections" lists every public collection by creation date. Neither can be curated, and there is no admin screen for elders or collections at all. This adds full management for both, plus homepage curation.

## What you get

Two new tabs in the admin console, next to Queue / Edit stories / Creators.

**Admin → Elders**
- List of all elders with photo, name, tribe/region/language and story count.
- Create a new elder, edit any elder: name, bio, region, tribe, primary language, photo (upload or URL).
- "Show on homepage" toggle and a display order number.
- Delete an elder (blocked with a clear message if stories are still attached, so nothing orphans).

**Admin → Collections**
- List of all collections with cover, title and story count.
- Create / edit: title, description, cover image (upload or URL), public/private.
- Pick which stories are in the collection and drag-free reordering via up/down controls.
- "Show on homepage" toggle and display order.
- Delete a collection (its story links are cleaned up; the stories themselves stay).

**Homepage behaviour (curated override)**
- Items marked "show on homepage" appear first, in your chosen order.
- The remaining slots auto-fill with the rest, so a rail is never empty.
- Applies to both "Voices to follow" and the "Collections" rail.

## Technical notes

Database migration:
- `elders`: add `is_homepage boolean not null default false`, `sort_order integer not null default 0`, and write GRANTs/policies so admins and moderators can insert/update/delete (currently elders are read-only to everyone).
- `collections`: add the same two columns; add staff insert/update/delete policies alongside the existing owner policy.
- `collection_items`: add staff insert/update/delete policies.
- New security-definer RPCs mirroring the existing `update_story` / `delete_story` pattern, all gated by `has_role(auth.uid(),'admin'|'moderator')`: `upsert_elder`, `delete_elder` (raises if stories reference it), `upsert_collection`, `set_collection_items`, `delete_collection`.
- New private `elder-photos` storage bucket with staff write policies and signed-URL reads, matching how `story-covers` works.

App code:
- `src/lib/admin.functions.ts`: add `listEldersAdmin`, `saveElder`, `deleteElder`, `listCollectionsAdmin`, `saveCollection`, `setCollectionStories`, `deleteCollection` — all `requireSupabaseAuth` server fns calling the RPCs.
- New routes `src/routes/_authenticated/admin/elders.tsx` and `.../collections.tsx`, reusing the form/upload patterns from `admin/edit.tsx`; register both in the admin tab bar.
- `src/lib/catalog.functions.ts`: `getElders` and `getCollections` select the two new columns and order by `is_homepage desc, sort_order asc, name/created_at`; DTOs in `src/lib/types.ts` gain `is_homepage` / `sort_order`.
- `src/routes/index.tsx`: rails sort curated items first, then fill to a cap (8 elders, 8 collections).
