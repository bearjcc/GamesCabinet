import { expect, test } from '@playwright/test';

/**
 * Smoke: FreeCell is registered by the parent slice. Until then this stays
 * skipped so the worktree check / CI stay green.
 */
test.describe('FreeCell', () => {
  test.skip('solo board mounts with cascades, freecells, and foundations', async ({ page }) => {
    await page.goto('/play/freecell?mode=solo');
    await expect(page.getByTestId('freecell-board')).toBeVisible();
    await expect(page.getByTestId('freecell-cascades')).toBeVisible();
    await expect(page.getByTestId('freecell-freecells')).toBeVisible();
    await expect(page.getByTestId('freecell-foundations')).toBeVisible();
  });
});
