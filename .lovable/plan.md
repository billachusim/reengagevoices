# Admin & Creator Program

Building two connected things: an **admin console** to review submissions, and a **creator program** where young people record elders, earn in-app points on approval, and can become verified.

## My take (what I'd recommend)

- **Reuse what's there.** `pending_stories`, `user_roles`, and `has_role()` already exist. We don't rebuild — we add an admin review surface and a points ledger.
- **Points as a ledger, not a single number.** Store every award as a row (reason, amount, related story). That way the profile total is always auditable, you can adjust rules later, and "why do I have X points?" is answerable. A cached total lives on the profile for fast display.
- **Verification = a flag earned by milestones.** Start simple: a `verified` boolean on the profile, granted by an admin (manually) or auto-suggested once a creator hits N approved stories. No identity docs for now — just a trust badge.
- **Approval is the moment everything happens.** When an admin approves a `pending_story`: it becomes a real published `story`, the elder gets created/linked, the creator gets points, and they get notified. One clean transaction.
- **Keep moderation honest.** Reject needs a reason (shown to the creator so they can resubmit). Track who reviewed and when (columns already exist).

## What gets built

### 1. Database (one migration)

- **`points_ledger`** — `user_id`, `amount`, `reason` (enum: `story_approved`, `bonus`, `adjustment`), `story_id` (nullable), `note`, `created_at`. RLS: creators read their own rows; admins read all; only server/admin writes.
- **`profiles`** additions: `points` (int, cached total), `is_verified` (bool), `creator_since` (timestamp).
- **`pending_stories`** additions: `review_note` (text, rejection reason), plus the proposed-taxonomy fields are already captured in `payload`.
- **`app_notifications`** (optional but recommended) — lightweight in-app notices: `user_id`, `type`, `title`, `body`, `read`, `created_at`, so creators see "Your story was approved (+50 pts)".
- Helper function `approve_pending_story(...)` (security definer) OR do the same work inside a server function — I'll keep the logic in a server function with the admin client so it's easier to evolve.
- GRANTs + RLS on every new table.

### 2. Server functions (`src/lib/admin.functions.ts`)

All gated by `requireSupabaseAuth` + an `has_role(uid,'admin'/'moderator')` check inside the handler:
- `getPendingStories` — the review queue with submitter info.
- `approveStory` — creates/links elder + taxonomy, inserts published `story`, awards points (default **50 pts/approved story**, configurable constant), writes a notification.
- `rejectStory` — sets status + `review_note`, notifies submitter.
- `getCreators` / `setVerified` / `adjustPoints` — admin management of creators.
- `grantRole` — promote a user to moderator/admin (admin-only).
- Creator-facing: `getMyCreatorStats` (points, ledger, submission statuses), `getMyNotifications`.

### 3. Routes

- **`/_authenticated/admin/`** — dashboard: counts (pending, published this week, creators), recent activity. Gated by an admin role layout.
- **`/_authenticated/admin/queue`** — review queue: play the submitted audio, edit/confirm metadata, pick/create elder + taxonomy, Approve or Reject (with reason).
- **`/_authenticated/admin/creators`** — list creators, points, approved counts, verify toggle, manual point adjust, role grant.
- **`/_authenticated/admin/route.tsx`** — pathless gate that redirects non-admins (checks role via a server fn).
- **Creator dashboard** added to `/_authenticated/library` (or a new `/contribute/dashboard`): your points, verified badge, submission statuses with rejection reasons, resubmit link.

### 4. UI touches

- Verified badge (small check) shown on creator names and in account.
- Points chip in the top bar / account page.
- Notification bell with unread count (uses badges, matches the existing mobile-app feel).
- Admin nav entry appears only for admins.

## Build order

1. Migration: ledger, profile fields, notifications, RLS/GRANTs.
2. Admin server functions + admin route gate.
3. Admin queue (approve/reject → publish + points + notify).
4. Admin creators management (verify, adjust, roles).
5. Creator dashboard + verified badge + notifications.
6. Seed: grant your account `admin` so you can test immediately.

## Open questions (defaults I'll use if you don't weigh in)

- **Points per approved story:** default **50**. Bonus when verified? (default: no, keep flat for now.)
- **Verification:** admin-granted manually, with an auto-suggestion at **5 approved stories**. OK?
- **Who's the first admin?** I'll grant admin to the account you're signed in with so you can test.

## Technical notes

- Approval logic lives in a server function using the admin client (loaded inside the handler), after verifying the caller's admin role — never trust client claims.
- Points total on `profiles` is a cache; the `points_ledger` is the source of truth.
- Notifications are in-app only for now (no email/push), matching "just points for now".
- No identity verification / KYC — `is_verified` is a trust flag only.
