import { expect, test } from '@playwright/test';

test.describe('GamesCabinet smokes', () => {
  test('letter-walker solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-letter-walker').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('lw-board')).toBeVisible();
    await page.getByTestId('lw-row-left-0').click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('lw-tab-scores').click();
    await expect(page.getByTestId('lw-scores')).toBeVisible();
  });

  test('2048 solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-2048').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('g2048-board')).toBeVisible();
    await page.getByTestId('g2048-left').click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('g2048-tab-scores').click();
    await expect(page.getByTestId('g2048-scores')).toBeVisible();
  });

  test('yatzy solo play can roll and open scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-yatzy').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('yatzy-dice')).toBeVisible();
    await expect(page.getByTestId('action-surface')).toBeVisible();
    await expect(page.getByTestId('play-table-actions')).toBeVisible();
    await page.getByTestId('yatzy-roll').click();
    await page.getByTestId('yatzy-score-chance').click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('yatzy-tab-scores').click();
    await expect(page.getByTestId('yatzy-scores')).toBeVisible();
  });

  test('klondike solo play reaches a playable board and scores tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-klondike').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('klondike-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByTestId('klondike-tab-scores').click();
    await expect(page.getByTestId('klondike-scores')).toBeVisible();
  });
});
