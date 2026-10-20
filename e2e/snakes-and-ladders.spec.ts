import { expect, test } from '@playwright/test';
import { setTableSeatKind } from './helpers';

test.describe('Snakes and Ladders', () => {
  test('play vs bot reaches board and accepts a roll', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-snakes-and-ladders').click();
    await setTableSeatKind(page, 1, 'bot');
    await page.getByTestId('play-start').click();
    await expect(page.getByTestId('sal-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('sal-die-roll').click();
    await expect(page.getByTestId('sal-die')).toBeVisible();
  });
});
