# Release handover

## Changed

All three reports were real defects:

- **Edit made entry billable (Alex):** the [edit form](src/components/EntryForm.tsx) always started with "Billable" on. It now loads the saved value. Unchanged saves keep their review.
- **Totals and export (Sofia):** both used the whole week. They now use exactly the filtered rows.
- **Corrections and undo (Sofia):** bulk client/billability corrections kept "Reviewed"; they now require review again ([review.ts](src/review.ts)). Undo restored the whole workspace and erased later edits. It now reverts only the entries that action touched, and declines with an explanation if any changed since.

**Friday workflow:** selected rows stayed selected when filtered out of view, so **Apply** changed records Sofia couldn't see. Now:

- Actions only touch visible, highlighted rows.
- Filters deselect only rows they hide, with a notice; search keeps hidden picks (reported), so a typo loses nothing.
- A scope line states the effect first ("Move to Meridian Foundation: 2 entries (2h 15m) · 1 reviewed entry will need review again").
- Undo names the action it reverses and survives leaving the page.
- "Show N needing review" filters to what is left; "Nothing left to review" marks a view ready for billing.
- Export view adds a Reviewed column; the page and chosen weeks survive a refresh. (Footer logo aligned.)

## Verified

- Unit tests: 57 pass, 29 new. Re-run against the original code, 23 of 26 fail; the other 3 are guards.
- Browser tests: 16/16 on desktop and mobile, including the [pilot-week flow](tests/review.spec.ts) and an axe check, which caught a contrast regression from the row highlight (fixed).
- Manual: each report path walked through; the exported CSV matched the view; no sideways scroll at 375px.
- CI runs all of these on every PR; `main` requires them to pass.

## Remaining

- Deferred: dark theme and repeat yesterday. Neither helps the Friday close.
- Undo is single-step and lost on reload.

## Release recommendation

Yes for the pilot, noting that undo is single-step.

## AI use

I used Claude Code, and checked it with failing-first tests and my own browser walkthrough. Correction: its first undo test used a row toggle as the "independent" edit, which proved nothing; it now simulates an edit-form change.
