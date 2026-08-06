import { expect, test } from '@playwright/test';

test.describe('Chess', () => {
  test('play vs bot reaches a playable board and accepts a legal move', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-chess').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('chess-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();

    // White pawn e2 (cell 52) to e4 (cell 36).
    await page.getByTestId('chess-cell-52').click();
    await page.getByTestId('chess-cell-36').click();
    await expect(page.getByTestId('chess-cell-52')).toBeEmpty();
    await expect(page.getByTestId('chess-cell-36').locator('img')).toBeVisible();
  });
});
