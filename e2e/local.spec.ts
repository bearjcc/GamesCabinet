import { expect, test } from '@playwright/test';

test.describe('GamesCabinet smokes', () => {
  test('tic-tac-toe pass and play reaches a local board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-tic-tac-toe').click();
    await page.getByTestId('play-local').click();
    await expect(page.getByTestId('ttt-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('memory pass and play reaches a local board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-memory').click();
    await page.getByTestId('play-local').click();
    await expect(page.getByTestId('memory-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });
});
