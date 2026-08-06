import { expect, test } from '@playwright/test';

test.describe('Snakes and Ladders', () => {
  test('play vs bot reaches board and accepts a roll', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-snakes-and-ladders').click();
    await page.getByTestId('play-bot').click();
    await expect(page.getByTestId('sal-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('sal-action-roll').click();
    await expect(page.getByTestId('sal-die')).toBeVisible();
  });
});
