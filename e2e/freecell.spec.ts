import { expect, test } from '@playwright/test';

test.describe('FreeCell', () => {
  test('solo board mounts with cascades, freecells, and foundations', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-freecell').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('freecell-board')).toBeVisible();
    await expect(page.getByTestId('freecell-cascades')).toBeVisible();
    await expect(page.getByTestId('freecell-freecells')).toBeVisible();
    await expect(page.getByTestId('freecell-foundations')).toBeVisible();
    await page.getByTestId('freecell-tab-scores').click();
    await expect(page.getByTestId('freecell-scores')).toBeVisible();
  });
});
