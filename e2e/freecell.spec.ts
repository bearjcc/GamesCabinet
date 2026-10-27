import { expect, test } from '@playwright/test';
import { openGameFromHome } from './helpers';

test.describe('FreeCell', () => {
  test('solo board mounts with cascades, freecells, and foundations', async ({ page }) => {
    await openGameFromHome(page, 'freecell');
    await expect(page).toHaveURL(/\/play\/freecell/);
    await expect(page.getByTestId('freecell-board')).toBeVisible();
    await expect(page.getByTestId('freecell-cascades')).toBeVisible();
    await expect(page.getByTestId('freecell-freecells')).toBeVisible();
    await expect(page.getByTestId('freecell-foundations')).toBeVisible();
    await page.getByTestId('game-shell-action-scores').click();
    await expect(page.getByTestId('freecell-scores')).toBeVisible();
  });
});
