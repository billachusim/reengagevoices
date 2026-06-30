# Admin Console + Creator Program

Build the moderation + creator loop on top of the existing `pending_stories`, `user_roles`, and `has_role()` foundation. Young "creators" record elders and submit; admins review a queue and approve (which publishes the story to the archive); approved creators earn points and can be verified.

## How it works (the loop)

```text
Creator records elder ──► submit ──► pending_stories (status: pending)
                                            │
                          Admin console (review queue)
                                  │approve            │reject
                                  ▼                   ▼
                    create elder + story         status: rejected
                    (status: published)          (with reason)
                                  │
                    award creator points (approval)
                                  │
                    plays accrue ──► listen points
                                  │
                    points threshold ──► auto-verify  (admin can also grant/revoke)
```

## 1. Database changes (migration)

**`creator_stats` table** — one row per creator, tracks the program.
- `user_id` (PK, FK auth.users), `points int default 0`, `approved_count int default 0`, `verified bool default false`, `verified_at`, `verified_by`, timestamps.
- RLS: a creator reads only their own row (`auth.uid() = user_id`); admins/mods read all via `has_role`. No client writes — all mutations go through admin/security-definer paths.

**`point_events` table** — audit log of every point award (so listen points aren't double-counted and the dashboard can show history).
- `id`, `user_id`, `story_id`, `kind` (`approval` | `listen`), `points int`, `created_at`. Unique index on `(story_id, kind)` for `approval`, and `(story_id, user_id, kind)` bucketed for listens.
- RLS: owner + admin read; no client writes.

**Link approved stories back to their creator:** add `submitted_by uuid` to `stories` (nullable, FK auth.users) so listen points know who to credit.

**Reject support on `pending_stories`:** add `reject_reason text` (status enum already has `draft|pending|published` — we'll add `rejected` to the `story_status` enum, or reuse `draft` for rejected; plan uses adding `rejected` to the enum for clarity).

**First admin:** seed your account as `admin` in `user_roles` by email lookup against `auth.users` in the migration. (Tell me which email — the account you sign in with.)

**Points config (constants in code, not DB):** approval = 25 pts, listen = 1 pt per qualifying play, verification threshold = 100 pts.

**Security-definer functions:**
- `approve_pending_story(_pending_id, _point_award)` — admin/mod only; creates/upserts the elder + taxonomy refs, inserts the published `stories` row with `submitted_by`, marks pending `published`, inserts an `approval` `point_event`, and bumps `creator_stats.points/approved_count`. Auto-sets `verified=true` when points cross the threshold.
- `reject_pending_story(_pending_id, _reason)` — admin/mod only; sets status `rejected` + reason.
- `award_listen_point(_story_id)` — credits the story's `submitted_by` creator 1 point, guarded by `point_events` uniqueness so a story only yields listen points up to a cap (e.g. 1 per distinct listener). Called from the existing play-recording path.
- Extend the existing role model with an `admin`-only ability to grant/revoke roles and toggle `verified` (security-definer `set_user_role` / `set_creator_verified`).

All new public tables get explicit GRANTs (authenticated + service_role; no anon).

## 2. Server functions (`src/lib/admin.functions.ts`)

All use `requireSupabaseAuth` and verify `has_role(userId, 'admin'|'moderator')` inside the handler:
- `getModerationQueue` — pending submissions with submitter + payload + audio.
- `approveSubmission({ pendingId, edits })` — lets the admin tweak title/elder/taxonomy before publishing, then calls `approve_pending_story`.
- `rejectSubmission({ pendingId, reason })`.
- `getAdminOverview` — counts (pending, published this week, creators, points awarded) for the console home.
- `listCreators` / `setCreatorVerified` / `setUserRole` — admin-only management.

`src/lib/creator.functions.ts` (creator-facing, own data only):
- `getMyCreatorStats` — points, tier, verified status, approved count, recent point events, and the status of my own submissions (pending/published/rejected + reason).

Wire `award_listen_point` into the existing `recordPlay` flow in `library.functions.ts`.

## 3. Admin console UI (`src/routes/_authenticated/admin/`)

A gated sub-area. Since `_authenticated` only checks "signed in", admin routes add a role check (redirect non-admins to `/` with a toast). Uses existing shadcn Tabs/Table/Dialog/Badge and the warm design tokens.
- `admin/route.tsx` — layout + role guard + sub-nav (Queue · Creators · Settings).
- `admin/index.tsx` — overview cards.
- `admin/queue.tsx` — review table; each row opens a Dialog with audio player, editable metadata (title, elder name, region/tribe/language, type/mood, transcript), and Approve / Reject (with reason) actions.
- `admin/creators.tsx` — creator list with points, verified toggle, role promote/demote.

Admin entry appears in the sidebar/nav only when the signed-in user has the admin/mod role (role exposed via `use-auth`).

## 4. Creator dashboard (private)

`src/routes/_authenticated/creator.tsx` — the creator's own program page:
- Points total + tier badge (e.g. Sprout < 100, Keeper 100–499, Guardian 500+), verified checkmark when earned.
- "My submissions" list with status chips (Pending / Published / Rejected + reason).
- Points history from `point_events`.
- Link reachable from the account page. Kept private per your choice — no public leaderboard yet (easy to flip on later).

The existing `contribute/record` submission flow stays as-is; on approval it now flows through the new points pipeline.

## 5. Verification display

A small verified badge component shown on the creator's own dashboard/account now (private). The data (`creator_stats.verified`) is in place so we can surface "Recorded by [verified creator]" credits publicly whenever you want.

## Technical notes

- Approval must atomically create elder/taxonomy + story + points; done inside one security-definer function to avoid partial writes and to keep RLS strict (no broad client write access to `stories`/`elders`).
- Listen points are abuse-resistant via `point_events` uniqueness rather than trusting the client.
- Role exposure: `use-auth` will fetch the user's roles (cached) so nav and guards can react; route guards still re-check server-side in each admin server function.
- No new third-party services; all within Lovable Cloud.

## Open item

Confirm the **email address** of the account you want seeded as the first admin, and I'll bake it into the migration. Everything else is decided.
