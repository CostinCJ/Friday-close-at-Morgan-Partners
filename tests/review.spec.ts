import { test, expect } from '@playwright/test';

test('pilot week: filtered totals, re-review after correction, edit keeps billability', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await page
    .getByRole('button', { name: 'Weekly review', exact: true })
    .click();
  await expect(page.getByLabel('Review week', { exact: true })).toHaveValue(
    '2026-09-28',
  );

  // Sofia: totals follow the client filter.
  await page
    .getByLabel('Review client', { exact: true })
    .selectOption('meridian');
  await expect(page.locator('.review-row')).toHaveCount(5);
  await expect(page.getByTestId('review-total')).toHaveText('6h 30m');

  // Sofia: a client correction on a reviewed entry needs review again.
  await page
    .getByRole('checkbox', { name: 'Select Shareholder agreement review' })
    .check();
  await page.getByLabel('Bulk action', { exact: true }).selectOption('client');
  await page
    .getByLabel('Destination client', { exact: true })
    .selectOption('foundation');
  await expect(page.getByTestId('action-scope')).toContainText(
    '1 reviewed entry will need review again',
  );
  await page.getByRole('button', { name: 'Apply to 1 selected' }).click();
  await page.getByLabel('Review client', { exact: true }).selectOption('all');
  await expect(
    page.getByRole('button', { name: 'Review Shareholder agreement review' }),
  ).toHaveText(/Needs review/);

  // Alex: editing only the description keeps the entry non-billable.
  await page
    .getByRole('button', { name: 'Edit review entry: Weekly team planning' })
    .click();
  await page.getByLabel(/Description/).fill('Weekly team planning (internal)');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const row = page.locator('.review-row', {
    hasText: 'Weekly team planning (internal)',
  });
  await expect(row.locator('.status-tag')).toHaveText('Non-billable');

  // Undo of the earlier client move keeps Alex's newer edit.
  await page.getByRole('button', { name: /Undo: Moved 1 entry/ }).click();
  await expect(row).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Reopen Shareholder agreement review' }),
  ).toBeVisible();
});
