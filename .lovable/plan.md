# Mobile-ready Admin console and copy correction

## What will change

- Replace the “We pass it on” description with: “Stories travel back to families, schools, and communities, keeping wisdom alive across generations.”
- Keep the existing card appearance and all other homepage content unchanged.
- Make the Admin console tabs easy to reach on phones with a stable, touch-friendly horizontal tab strip and clear active state.
- Refine the story list so titles, status, and media indicators wrap cleanly on narrow screens; keep search and “New story” usable without horizontal overflow.
- Make the story editor fit the phone viewport, respect safe areas, keep its header and save controls reachable, and stack dense field groups where necessary.
- Make elder and collection lists and their add/edit panels fit narrow screens, including image controls, story selection, ordering, delete confirmation, and save actions.
- Preserve all desktop layouts, existing features, colors, typography, and archive data behavior.

## Verification

- Test at a 440px mobile viewport while signed in as the available admin account.
- Confirm an admin can open the story list, open edit and new-story forms, and open new elder and new collection forms.
- Check for horizontal overflow, obscured controls, runtime errors, and a clean build.

## Technical details

- Changes are limited to responsive classes and mobile interaction layout in the existing admin route files, plus the single requested copy string.
- No database, permissions, navigation destinations, or content-management behavior will change.
