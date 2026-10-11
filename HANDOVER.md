# Release handover

## Changed

All three reports were real defects:

- **Edit made entry billable (Alex):** the [edit form](src/components/EntryForm.tsx) always started with "Billable" on. It now loads the saved value. Unchanged saves keep their review.
- **Totals and export (Sofia):** both used the whole week. They now use exactly the filtered rows.
- **Corrections and undo (Sofia):** bulk client/billability corrections kept "Reviewed"; they now require review again ([review.ts](src/review.ts)). Undo restored the whole workspace and erased later edits. It now reverts only the entries that action touched, and declines with an explanation if any changed since.

**Friday workflow:** selected rows stayed selected when filtered out of view, so **Apply** changed records Sofia couldn't see. Now:

- Actions only touch visible, highlighted rows.
- Narrowing deselects only hidden rows, and says so.
- A scope line states the effect first ("Move to Meridian Foundation: 2 entries (2h 15m) · 1 reviewed entry will need review again").
- Undo names the action it reverses.

## Verified

- Unit tests: 48 pass, 20 new. 17 of the new ones fail on the original code.
- Browser tests: 14/14 on desktop and mobile, including the [pilot-week flow](tests/review.spec.ts) and an axe check of Weekly review. That check caught a contrast regression from the row highlight, now fixed.
- Manual: each report path walked through; the exported CSV matched the view; no sideways scroll at 375px.
- CI runs formatting, tests, build and browser tests on every push and PR, and `main` requires them to pass.

## Remaining

- Deferred: dark theme, repeat yesterday, and a needs-review shortcut (the status filter covers it).
- Undo is single-step and lost when you leave the page.
- The CSV has no Reviewed column.

## Release recommendation

Yes for the pilot, noting the undo limits.

## AI use

I used Claude Code, and checked it with failing-first tests and my own browser walkthrough. Correction: its first undo test used a row toggle as the "independent" edit, which proved nothing; it now simulates an edit-form change.
