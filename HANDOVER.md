# Release handover

## Changed

Each report traced to a root cause and fixed with a regression test:

- **Alex – edit made entry billable:** the [edit form](src/components/EntryForm.tsx) started "Billable" as `true` instead of the saved value. Unchanged saves now keep review.
- **Sofia – totals/export:** both read the whole week, not the filtered rows. Both now use the visible rows.
- **Sofia – corrections/undo:** bulk client/billability changes never reset "Reviewed"; they now follow the edit form's rule ([review.ts](src/review.ts)). Undo restored a whole-workspace snapshot, erasing later edits. It now reverts only the touched entries, and declines with an explanation if any changed since.

**Friday review, before:** "Apply to N selected" could change rows hidden by filters, with no way to tell which. **After:**

- Actions touch only visible, highlighted rows.
- A scope line states the effect ("Move to Meridian Foundation: 2 entries (2h 15m) · 1 reviewed entry will need review again").
- Filters deselect rows they hide, with a notice; search keeps picks, so a typo loses nothing.
- "Show N needing review" jumps to what is left.
- Also: a Reviewed column in Export view, undo survives page changes, and the page and week survive a refresh.

## Verified

- `npm run check`: 57 unit tests (29 new) and the build pass. 23 of the 26 measured new tests fail on the original code.
- `npm run test:e2e`: 16/16 on desktop and mobile Chromium, including the [pilot-week flow](tests/review.spec.ts) and axe, which caught a contrast regression from my row highlight (fixed).
- Manual: every report path, the CSV contents, and the layout at 375px. CI gates every PR into `main`.
- Not established: real Safari/iOS, the CSV opened in Excel, two tabs editing during an undo.

## Remaining

Deferred dark theme and repeat-yesterday; neither helps the Friday close. Undo is single-step and in memory.

## Release recommendation

Yes for the pilot, noting single-step undo.

## AI use

Claude Code wrote most of the code and tests; I set scope and tested in the browser. I caught its search design dropping selections on a typo, and it fixed that with a regression test. It also ran the new tests against the original code to show they fail.
