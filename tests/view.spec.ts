import { test, expect } from '@playwright/test';

test('page and chosen weeks survive a refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await page.getByRole('button', { name: 'Replace and restore' }).click();

  // Time entries: move to the previous week (4 entries), then refresh.
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(4);

  // Weekly review: choose the previous week, visit another page, refresh.
  await page
    .getByRole('button', { name: 'Weekly review', exact: true })
    .click();
  await expect(page.getByLabel('Review week', { exact: true })).toHaveValue(
    '2026-09-28',
  );
  await page.getByRole('button', { name: 'Previous review week' }).click();
  await page.getByRole('button', { name: 'Clients', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Your clients.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Weekly review', exact: true })
    .click();
  await expect(page.getByLabel('Review week', { exact: true })).toHaveValue(
    '2026-09-21',
  );
});
