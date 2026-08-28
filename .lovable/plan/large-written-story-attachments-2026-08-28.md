# Large written-story attachments

## Goal
Allow admins to upload full-length manuscripts without transcript-size blockers, while keeping story pages fast and readable.

## What will change
- Add a secure story-document attachment to each story, storing the original uploaded file and its filename.
- When a document exceeds 20,000 characters, place the first 20,000 characters in the editable on-page transcript preview and retain the complete file as the full manuscript.
- Keep shorter documents working as they do now, with their complete parsed text displayed on the page.
- Show admins whether a full manuscript is attached and allow them to replace or remove it while editing.
- On story pages, show the readable preview first and an **Open full story** action for signed-in readers. It will open the original document in a new tab, where the browser can display or download it.
- Keep the existing sign-in prompt for guests so unrestricted full-document access follows the platform’s current content-access rule.

## Technical details
- Create a private `story-documents` storage bucket with staff upload/update/delete access and authenticated read access.
- Add nullable manuscript URL/name fields to stories and extend the existing create/update RPCs.
- Upload the original `.txt`, `.md`, `.doc`, `.docx`, `.pdf`, `.html`, or `.rtf` file from the unified admin form; parsing remains browser-side for the excerpt.
- Increase server validation enough that uploads and pasted long-form text are not rejected before the excerpt/attachment flow can handle them.
- Extend story DTO/query mapping and the detail-page transcript component with attachment metadata and the signed-in full-story action.
- Verify admin creation/editing, public preview behavior, signed-in access, and responsive story-page rendering.
