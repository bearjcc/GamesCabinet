import { expect, test } from '@playwright/test';

test.describe('GamesCabinet smokes', () => {
  test('tic-tac-toe pass and play reaches a local board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-tic-tac-toe').click();
    await page.getByTestId('play-start').click();
    await expect(page.getByTestId('ttt-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('memory pass and play reaches a local board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-memory').click();
    await page.getByTestId('play-start').click();
    await expect(page.getByTestId('memory-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('Hogwarts Battle accepts a year and unique hero setup', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gamescabinet.unlockedGames', '["hogwarts-battle"]');
    });
    await page.goto('/game/hogwarts-battle');
    await expect(page.getByTestId('table-seat-0')).toBeVisible();

    await page.getByTestId('table-seat-1-kind-local').click();
    await page.getByTestId('hogwarts-year').selectOption('7');
    await page.getByTestId('hogwarts-hero-0').selectOption('neville');
    await page.getByTestId('hogwarts-hero-1').selectOption('harry');
    await page.getByTestId('play-start').click();

    await expect(page.getByTestId('hb-meta')).toContainText('Game 7');
    await expect(page.getByTestId('hb-hero-0')).toContainText('Neville Longbottom');
    await expect(page.getByTestId('hb-hero-1')).toContainText('Harry Potter');
  });
});
