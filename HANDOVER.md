# Release handover

## Changed

All three reports were real defects:

- **Edit made entry billable (Alex):** the [edit form](src/components/EntryForm.tsx) always started with "Billable" on. It now loads the saved value. Unchanged saves keep their review.
- **Totals and export (Sofia):** both used the whole week. They now use exactly the filtered rows.
- **Corrections and undo (Sofia):** bulk client/billability corrections kept "Reviewed"; they now require review again ([review.ts](src/review.ts)). Undo restored the whole workspace and erased later edits. It now reverts only the entries that action touched, and declines with an explanation if any changed since.

**Friday workflow:** selected rows stayed selected after being filtered out of view, so **Apply** changed records Sofia couldn't see. Now:

- Actions only touch visible rows.
- Narrowing the view keeps selected rows still shown and deselects hidden ones, with a notice.
- Selected rows are highlighted.
- A scope line states the effect first ("Move to Meridian Foundation: 2 entries (2h 15m) · 1 reviewed entry will need review again").
- Undo names the action it reverses.

## Verified

- Unit tests: 48 pass, 20 of them new. 17 of the new tests fail on the original code; the other 3 are guards.
- Browser tests: 14/14 on desktop and mobile, including the [pilot-week flow](tests/review.spec.ts) and an axe check of Weekly review. That axe check found a contrast regression from my row highlight, now fixed.
- Manual: each report path walked through in the browser; the exported CSV matched the view exactly; checked at 375px with no sideways scroll.
- CI checks formatting, tests, build and browser tests on every push and PR. Merging into `main` requires the checks to pass.

## Remaining

- Deferred: dark theme, repeat yesterday, and a needs-review shortcut (the status filter already does this).
- Undo is single-step and lost when you leave the page.
- The CSV has no Reviewed column.

## Release recommendation

Yes for the pilot, noting the undo limits.

## AI use

I used Claude Code, and checked its work with failing-first tests and my own browser checks. Corrections:

- Its first undo test used a row toggle as the "independent" edit, which proved nothing; it now simulates an edit-form change.
- The axe check caught a contrast regression its highlight introduced.
