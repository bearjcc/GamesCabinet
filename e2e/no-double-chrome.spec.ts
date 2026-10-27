import { expect, test } from '@playwright/test';

test.describe('play routes use a single game shell rail', () => {
  test('vs-bot connect four has no catalogue topbar', async ({ page }) => {
    await page.goto('/vs-bot/connect-four');
    await expect(page.getByTestId('play-viewport')).toBeVisible();
    await expect(page.getByTestId('game-shell-rail')).toHaveCount(1);
    await expect(page.locator('.topbar')).toHaveCount(0);
  });

  test('solo yatzy has no catalogue topbar', async ({ page }) => {
    await page.goto('/play/yatzy');
    await expect(page.getByTestId('game-shell-rail')).toHaveCount(1);
    await expect(page.locator('.topbar')).toHaveCount(0);
  });
});
