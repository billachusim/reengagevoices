# Fix featured story card alignment

## Problem
The featured story card currently lays out as: **cover image on the left, white text card on the right**. Because the cover image has the elder woman prominently on the right with dark space on the left, the text card on the right overlaps/sits beside the busiest part of the artwork, and the text reads awkwardly against it.

## Fix
Swap the two columns in the featured section of `src/routes/index.tsx` so the **white text card sits on the LEFT** and the **cover image sits on the RIGHT** (where the elder woman is).

### Change (lines 76–109)
- Reorder the grid children: text block (`<div className="p-6 sm:p-8">…`) **first**, image panel (`<div … bg-cover …>`) **second**.
- Adjust the column ratio to `md:grid-cols-[1fr_1.1fr]` so the image keeps the larger panel (the portrait).
- Keep everything else identical: the "Editor's pick" chip, title, description, elder line, Play audio / Watch video / Details buttons, and the `grain bg-secondary/40` section wrapper + scallop divider below.
- On mobile (stacked) the text card appears above the image, which is the expected reading order.

This is a layout-only reorder confined to the featured block; no data, asset, or other route changes.

## Technical notes
- Single edit in `src/routes/index.tsx` lines 76–109.
- No changes to `coverImage`/`elderImage` rules in `src/lib/constants.ts`.
