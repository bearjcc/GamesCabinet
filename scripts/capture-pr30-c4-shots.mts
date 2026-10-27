/**
 * PR #30 review: setup + play Connect Four at phone and desktop widths.
 * Requires server on :8000 with fresh build.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = '/cursor/stores/self/cabinet/seat-colours';
const PORT = Number(process.env.CAPTURE_PORT) || 8000;
const base = `http://127.0.0.1:${PORT}`;

const shots = [
  {
    file: 'setup-connect-four',
    run: async (page: Page) => {
      await page.goto(`${base}/game/connect-four`);
      await page.getByTestId('table-seat-0').waitFor();
    },
  },
  {
    file: 'play-connect-four',
    run: async (page: Page) => {
      await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot&colours=0,2`);
      await page.getByTestId('c4-board').waitFor();
      for (const col of [0, 1, 2, 1, 0, 2, 3, 2, 1, 3]) {
        const target = page.getByTestId(`c4-col-${col}`);
        if (!(await target.isEnabled({ timeout: 800 }).catch(() => false))) continue;
        await target.click();
        await page.waitForTimeout(500);
        const discs = await page.locator('[data-testid^="c4-disc-"]').count();
        if (discs >= 7 && discs <= 14) break;
      }
    },
  },
] as const;

const viewports = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 },
] as const;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
  });
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    for (const shot of shots) {
      await shot.run(page);
      await page.waitForTimeout(250);
      const file = path.join(OUT, `${shot.file}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log('wrote', file);
    }
    await context.close();
  }
  await browser.close();
}

main();
