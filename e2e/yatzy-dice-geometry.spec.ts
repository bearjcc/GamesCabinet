import { expect, test } from '@playwright/test';

test.describe('Yatzy dice faces', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/yatzy?seats=1');
    await expect(page.getByTestId('yatzy-dice')).toBeVisible();
  });

  test('idle dice show full Kenney faces inside each tile', async ({ page }) => {
    const dice = page.locator('.yatzy-dice .tt-die');
    await expect(dice).toHaveCount(5);

    for (let i = 0; i < 5; i++) {
      const die = dice.nth(i);
      const img = die.locator('img.tt-die__img');
      await expect(img).toBeVisible();

      const geom = await die.evaluate((tile, index) => {
        const image = tile.querySelector('img.tt-die__img') as HTMLImageElement | null;
        if (!image) throw new Error('die img missing');
        const tileBox = tile.getBoundingClientRect();
        const imgBox = image.getBoundingClientRect();
        const padX = (tileBox.width - imgBox.width) / 2;
        const padY = (tileBox.height - imgBox.height) / 2;
        return {
          index,
          tileW: tileBox.width,
          tileH: tileBox.height,
          imgW: imgBox.width,
          imgH: imgBox.height,
          padX,
          padY,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          complete: image.complete,
          src: image.currentSrc || image.src,
        };
      }, i);

      expect(geom.complete).toBe(true);
      expect(geom.naturalWidth).toBeGreaterThan(0);
      expect(geom.naturalHeight).toBeGreaterThan(0);
      expect(geom.imgW).toBeGreaterThan(geom.tileW * 0.55);
      expect(geom.imgH).toBeGreaterThan(geom.tileH * 0.55);
      expect(geom.padX).toBeGreaterThanOrEqual(-1);
      expect(geom.padY).toBeGreaterThanOrEqual(-1);
      expect(geom.imgW).toBeLessThanOrEqual(geom.tileW + 1);
      expect(geom.imgH).toBeLessThanOrEqual(geom.tileH + 1);
      expect(geom.src).toMatch(/dice_\d\.svg/);
    }
  });

  test('rolled dice still fit the tile after a roll', async ({ page }) => {
    await page.getByTestId('yatzy-roll').click();
    await page.waitForTimeout(400);
    const die = page.locator('.yatzy-dice .tt-die').first();
    const ratio = await die.evaluate((tile) => {
      const image = tile.querySelector('img') as HTMLImageElement;
      const t = tile.getBoundingClientRect();
      const i = image.getBoundingClientRect();
      return (i.width * i.height) / (t.width * t.height);
    });
    expect(ratio).toBeGreaterThan(0.35);
  });
});
