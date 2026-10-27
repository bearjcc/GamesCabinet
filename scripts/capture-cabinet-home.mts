/**
 * Cabinet home review shots at desktop, tablet, and phone widths.
 * Requires: npm run build && PORT=8000 npx tsx server/index.ts
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const systemChrome = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
].find((candidate) => candidate && existsSync(candidate));

const OUT = '/cursor/stores/self/cabinet/home';
const PORT = Number(process.env.CAPTURE_PORT) || 8000;
const base = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { name: 'home-desktop', width: 1280, height: 800 },
  { name: 'home-tablet', width: 820, height: 1180 },
  { name: 'home-phone', width: 390, height: 844 },
] as const;

async function focusConnectFour(page: Page) {
  await page.goto(`${base}/`);
  await page.getByTestId('cabinet-home').waitFor();
  await expectFocus(page, 'Connect Four');
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function expectFocus(page: Page, name: string) {
  await page.getByTestId('cabinet-focus-strip').getByRole('heading', { name }).waitFor();
}

async function capture(page: Page, file: string) {
  const filePath = path.join(OUT, `${file}.png`);
  await page.screenshot({ path: filePath, fullPage: file === 'home-desktop-full' });
  console.log('wrote', filePath);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(
    systemChrome ? { executablePath: systemChrome } : undefined,
  );
  const context = await browser.newContext({ reducedMotion: 'reduce' });

  for (const viewport of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await focusConnectFour(page);
    await capture(page, viewport.name);
    if (viewport.name === 'home-desktop') {
      await capture(page, 'home-desktop-full');
    }
    await page.close();
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
