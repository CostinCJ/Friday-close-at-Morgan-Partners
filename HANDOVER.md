# Release handover

## Changed

All three reports were real defects:

- **Edit made entry billable (Alex):** the [edit form](src/components/EntryForm.tsx) always started with "Billable" on. It now loads the saved value. Unchanged saves keep their review.
- **Totals and export (Sofia):** both used the whole week. They now use exactly the filtered rows.
- **Corrections and undo (Sofia):** bulk client/billability corrections kept "Reviewed"; they now require review again ([review.ts](src/review.ts)). Undo restored the whole workspace and erased later edits. It now reverts only the entries that action touched, and declines with an explanation if any changed since.

**Friday workflow:** selected rows stayed selected after being filtered out of view, so **Apply** changed records Sofia couldn't see. Now actions affect only visible rows. Changing the view clears the selection and says so. Selected rows are highlighted. A scope line states the effect before applying ("Move to Meridian Foundation: 2 entries (2h 15m) · 1 reviewed entry will need review again"). Undo names the action it reverses.

## Verified

- `npm run check`: 46 tests pass (18 new), build is clean. 16 of the new tests fail on the original code.
- `npm run test:e2e`: 12/12 on desktop and mobile Chromium. This includes the new [pilot-week flow](tests/review.spec.ts).
- Not done: axe checks on the review page; a manual mobile visual check.

## Remaining

- Deferred: dark theme, repeat yesterday, and a needs-review shortcut (the status filter covers it).
- Undo is single-step and lost when you leave the page.
- The CSV has no Reviewed column.
- Selection clears on every search keystroke.

## Release recommendation

Yes for the pilot, noting the undo limits.

## AI use

I used Claude Code for the investigation, fixes and tests. Its tests were written to fail first and rerun against the original code. One correction: its first undo test used a row toggle as the "independent" edit. That toggle replaces the last action, so the test proved nothing; it now simulates an edit-form change.
