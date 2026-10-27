/**
 * Cabinet #28 review screenshots at three viewports.
 * Requires: npm run build && PORT=8000 npx tsx server/index.ts
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = '/cursor/stores/self/cabinet/28';
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
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks","hogwarts-battle"]');
  });
}

const shots: Shot[] = [
  {
    file: 'home',
    run: async (page) => {
      await page.goto(`${base}/`);
      await page.getByTestId('catalogue-group-solo').waitFor();
    },
  },
  {
    file: 'setup-connect-four',
    run: async (page) => {
      await page.goto(`${base}/game/connect-four`);
      await page.getByTestId('table-seat-0').waitFor();
    },
  },
  {
    file: 'play-connect-four',
    run: async (page) => {
      await page.goto(`${base}/vs-bot/connect-four`);
      await page.getByTestId('game-shell-turn-plate').waitFor();
    },
  },
  {
    file: 'play-tracks',
    run: async (page) => {
      await unlockTracks(page);
      await page.goto(`${base}/game/tracks?seats=1`);
      await page.getByTestId('play-start').click();
      await page.getByTestId('tracks-draft').locator('button').first().click();
      await page.getByTestId('tracks-grass-field').waitFor();
    },
  },
  {
    file: 'play-klondike',
    run: async (page) => {
      await page.goto(`${base}/play/klondike?seats=1`);
      await page.getByTestId('klondike-board').waitFor();
    },
  },
  {
    file: 'play-yatzy',
    run: async (page) => {
      await page.goto(`${base}/play/yatzy?seats=1`);
      await page.getByTestId('yatzy-dice').waitFor();
    },
  },
  {
    file: 'setup-hogwarts',
    run: async (page) => {
      await unlockTracks(page);
      await page.goto(`${base}/game/hogwarts-battle`);
      await page.getByTestId('hogwarts-year-1').waitFor();
    },
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
