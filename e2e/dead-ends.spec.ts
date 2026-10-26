import { expect, test } from '@playwright/test';

test.describe('cabinet dead ends', () => {
  test('unknown route shows empty shelf', async ({ page }) => {
    await page.goto('/this-route-is-not-in-the-cabinet');
    await expect(page.getByTestId('page-not-found')).toBeVisible();
    await expect(page.getByTestId('empty-shelf-home')).toBeVisible();
  });

  test('bad online room code shows empty table', async ({ page }) => {
    await page.goto('/g/connect-four/NOPE123');
    await expect(page.getByTestId('bad-room')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('empty-shelf-home')).toBeVisible();
  });

  test('unknown game launch shows empty shelf', async ({ page }) => {
    await page.goto('/game/not-a-real-game');
    await expect(page.getByTestId('unknown-game')).toBeVisible();
  });
});
