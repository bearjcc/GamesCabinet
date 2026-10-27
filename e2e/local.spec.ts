import { expect, test } from '@playwright/test';
import { openGameFromHome, pickHogwartsHero, setTableSeatKind } from './helpers';

test.describe('GamesCabinet smokes', () => {
  test('tic-tac-toe pass and play reaches a local board', async ({ page }) => {
    await openGameFromHome(page, 'tic-tac-toe');
    await page.getByTestId('play-start').click();
    await expect(page.getByTestId('ttt-board')).toBeVisible();
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('memory pass and play reaches a local board', async ({ page }) => {
    await openGameFromHome(page, 'memory');
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

    await setTableSeatKind(page, 1, 'local');
    await page.getByTestId('hogwarts-year-7').click();
    await pickHogwartsHero(page, 0, 'Neville Longbottom');
    await pickHogwartsHero(page, 1, 'Harry Potter');
    await page.getByTestId('play-start').click();

    await expect(page.getByTestId('hb-meta')).toContainText('Game 7');
    await expect(page.getByTestId('hb-hero-0')).toContainText('Neville Longbottom');
    await expect(page.getByTestId('hb-hero-1')).toContainText('Harry Potter');
  });
});
