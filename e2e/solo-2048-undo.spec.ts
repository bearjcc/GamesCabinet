import { expect, test } from '@playwright/test';

test.describe('2048 undo', () => {
  test('undo control restores after a successful swipe', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-game-2048').click();
    await page.getByTestId('play-solo').click();
    await expect(page.getByTestId('g2048-board')).toBeVisible();
    await expect(page.getByTestId('animated-counter')).toBeVisible();

    const undo = page.getByTestId('g2048-action-undo');
    await expect(undo).toBeDisabled();

    const before = await page.getByTestId('g2048-board').innerText();
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      await page.getByTestId(`g2048-action-${dir}`).click();
      if (await undo.isEnabled()) break;
    }
    await expect(undo).toBeEnabled();

    await undo.click();
    await expect.poll(async () => page.getByTestId('g2048-board').innerText()).toBe(before);
    await expect(undo).toBeDisabled();
  });
});
