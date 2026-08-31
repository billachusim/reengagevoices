# Owner admin for reengageafrica@gmail.com + avatar tap fix

## 1. Make reengageafrica@gmail.com an admin

- The account exists (currently has the `user` role).
- Insert an `admin` row into `user_roles` for that user (idempotent upsert), same as was done for nachusim@gmail.com.

## 2. Fix avatar/name tap signing the user out

- In `src/components/app-shell.tsx` (TopBar), the avatar button currently calls `signOut()` on click — that's why tapping the profile/name logs the user out.
- Change it to navigate to `/account` instead, where the existing "Sign out" button already lives. Add `title="Account"`.

## Notes

- No UI redesign; just the two targeted changes.
- Verify: build OK, and sign-out only happens from the Account page button.
