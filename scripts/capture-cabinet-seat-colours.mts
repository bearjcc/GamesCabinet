/**
 * Seat-colour PR review shots: C4, TRACKS, Yatzy, connect-four setup at three viewports.
 * Requires: npm run build && PORT=8000 npx tsx server/index.ts
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = '/cursor/stores/self/cabinet/seat-colours';
const PORT = Number(process.env.CAPTURE_PORT) || 8000;
const base = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '390x844', width: 390, height: 844 },
] as const;

type Shot = {
  file: string;
  run: (page: Page) => Promise<void>;
};

async function unlockTracks(page: Page) {
  await page.goto(`${base}/`);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks"]');
  });
}

async function playConnectFourMid(page: Page) {
  await page.goto(`${base}/`);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.nickname', 'Bear');
  });
  await page.goto(`${base}/vs-bot/connect-four?kinds=local,bot`);
  await page.getByTestId('c4-board').waitFor();
  const pattern = [0, 1, 2, 1, 0, 2, 3, 2, 1, 3];
  for (const col of pattern) {
    const target = page.getByTestId(`c4-col-${col}`);
    if (!(await target.isEnabled({ timeout: 1500 }).catch(() => false))) continue;
    await target.hover();
    await target.click();
    await page.waitForTimeout(650);
    const discs = await page.locator('[data-testid^="c4-disc-"]').count();
    if (discs >= 7 && discs <= 14) break;
  }
}

async function playTracksSolo(page: Page) {
  await unlockTracks(page);
  await page.goto(`${base}/play/tracks?seats=1&variant=solo`);
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (
      await page
        .getByTestId('tracks-grass-field')
        .isVisible()
        .catch(() => false)
    )
      break;
    if (
      await page
        .getByTestId('tracks-draft')
        .isVisible()
        .catch(() => false)
    ) {
      await page.getByTestId('tracks-draft').locator('button').first().click();
      continue;
    }
    await page.waitForTimeout(250);
  }
  await page.getByTestId('tracks-grass-field').waitFor({ timeout: 15_000 }).catch(() => undefined);
}

async function playYatzyVsBot(page: Page) {
  await page.goto(`${base}/vs-bot/yatzy?kinds=local,bot`);
  await page.getByTestId('yatzy-dice').waitFor();
  await page.getByTestId('yatzy-roll').click();
  await page.waitForTimeout(400);
}

const shots: Shot[] = [
  {
    file: 'setup-connect-four',
    run: async (page) => {
      await page.goto(`${base}/game/connect-four`);
      await page.getByTestId('table-seat-0').waitFor();
    },
  },
  {
    file: 'play-connect-four',
    run: playConnectFourMid,
  },
  {
    file: 'play-tracks',
    run: playTracksSolo,
  },
  {
    file: 'play-yatzy',
    run: playYatzyVsBot,
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
  });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    for (const shot of shots) {
      await shot.run(page);
      await page.waitForTimeout(300);
      const file = path.join(OUT, `${shot.file}-${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log('wrote', file);
    }
    await context.close();
  }

  await browser.close();
}

main();
