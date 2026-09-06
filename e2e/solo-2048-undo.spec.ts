import { expect, test } from '@playwright/test';

test.describe('2048 undo', () => {
  test('undo control restores after a successful swipe', async ({ page }) => {
    await page.goto('/play/2048');
    await expect(page.getByTestId('g2048-board')).toBeVisible();
    await expect(page.getByTestId('animated-counter')).toBeVisible();

    const undo = page.getByTestId('g2048-action-undo');
    await expect(undo).toBeDisabled();

    const before = await page.getByTestId('g2048-board').innerText();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      await page.keyboard.press(key);
      if (await undo.isEnabled()) break;
    }
    await expect(undo).toBeEnabled();

    await undo.click();
    await expect.poll(async () => page.getByTestId('g2048-board').innerText()).toBe(before);
    await expect(undo).toBeDisabled();
  });

  test('redo control restores after undo', async ({ page }) => {
    await page.goto('/play/2048');
    await expect(page.getByTestId('g2048-board')).toBeVisible();

    const undo = page.getByTestId('g2048-action-undo');
    const redo = page.getByTestId('g2048-action-redo');
    await expect(redo).toBeDisabled();

    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      await page.keyboard.press(key);
      if (await undo.isEnabled()) break;
    }
    const afterMove = await page.getByTestId('g2048-board').innerText();

    await undo.click();
    await expect.poll(async () => page.getByTestId('g2048-board').innerText()).not.toBe(afterMove);
    await expect(redo).toBeEnabled();

    await redo.click();
    await expect.poll(async () => page.getByTestId('g2048-board').innerText()).toBe(afterMove);
    await expect(redo).toBeDisabled();
  });
});

test.describe('2048 polish', () => {
  test('new game resets the board during play', async ({ page }) => {
    await page.goto('/play/2048');
    await expect(page.getByTestId('g2048-board')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    const afterMove = await page.getByTestId('g2048-board').innerText();
    await page.getByTestId('g2048-new-game').click();
    await expect.poll(async () => page.getByTestId('g2048-board').innerText()).not.toBe(afterMove);
    await expect(page.getByTestId('g2048-action-undo')).toBeDisabled();
  });

  test('WASD moves tiles', async ({ page }) => {
    await page.goto('/play/2048');
    await expect(page.getByTestId('g2048-board')).toBeVisible();
    const before = await page.getByTestId('g2048-board').innerText();
    await page.keyboard.press('d');
    await expect.poll(async () => page.getByTestId('g2048-board').innerText()).not.toBe(before);
  });

  test('best score persists in local storage', async ({ page }) => {
    await page.goto('/play/2048');
    await expect(page.getByTestId('g2048-best')).toHaveText('0');
    await page.evaluate(() => {
      localStorage.setItem('gamescabinet.best.2048', '512');
    });
    await page.reload();
    await expect(page.getByTestId('g2048-best')).toHaveText('512');
  });
});
