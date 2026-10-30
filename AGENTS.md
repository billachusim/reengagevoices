<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep archive taxonomy and elder biographies public; user profiles are owner/staff-only, associations follow parent-record RLS, and private cover/document downloads require ownership, staff access, or a published/public reference. This preserves discovery without exposing private records or unused uploads.
- Store contributor audio as object paths and serve published recordings through a no-store, publication-checked streaming endpoint; never persist long-lived recording capabilities. This makes withdrawing a story revoke future playback requests.
- Transcription downloads only validated archive audio object paths through the authenticated storage client, never caller-selected network URLs. This prevents arbitrary outbound requests.
- Archive story creation/publication is staff-only; contributors submit to moderation, and listening rewards bind the listener to auth.uid() with fixed award/verification values. This prevents review bypass and point tampering.
