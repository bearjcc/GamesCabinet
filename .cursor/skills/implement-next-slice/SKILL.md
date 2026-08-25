---
name: implement-next-slice
description: Implements the next AFK vertical slice from docs/slices.md. Use when the user says implement next slice, next slice, continue the queue, or pick up the next GamesCabinet slice.
---

# Implement next slice

## Pick

1. Read [`docs/slices.md`](../../../docs/slices.md).
2. Take the **first** unchecked item whose type is **AFK**.
3. If that item is **HITL**, stop. Name the slice and wait for Bear.
4. If the slice notes **WIP in the working tree**, finish and verify that work. Do not restart it from transcripts.
5. Read the files listed on that slice. Follow existing seams.

## Do

- One slice only. Do not start the next checkbox in the same turn unless Bear says so.
- TDD: failing Vitest (rules/lib) or Playwright (user flow) first.
- Shared-mechanics gate. Player-facing copy. `npm run check` before claiming done.
- Do not commit unless asked.

## Close

When the slice is done:

1. Tick its checkbox in `docs/slices.md`.
2. If a **Next** line is written on that slice, leave it for the following session.
3. Reply with: slice id/title, what shipped, `npm run check` outcome.

## Do not

- Invent a new game or platform seam because the ladder is empty. Add a checkbox in `docs/slices.md` first, with Bear.
- Hunt `agent-transcripts` or `~/.cursor/plans` unless `docs/slices.md` has no AFK slice left.
