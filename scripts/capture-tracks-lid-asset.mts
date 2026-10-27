/**
 * Renders a real TRACKS grass board in Playwright and crops a cabinet lid asset.
 * Run after build: npm run build && PORT=8000 npx tsx server/index.ts
 * Then: npx tsx scripts/capture-tracks-lid-asset.mts
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/assets/lids');
const OUT_PNG = path.join(OUT_DIR, 'tracks-lid.png');
const OUT_WEBP = path.join(OUT_DIR, 'tracks-lid.webp');
const REVIEW_DIR = '/cursor/stores/self/cabinet/home-polish';
const PORT = Number(process.env.CAPTURE_PORT) || 8000;
const base = `http://127.0.0.1:${PORT}`;

/** Connected run from START: straight, straight, curve north, straight up. */
export const TRACKS_LID_TILES = [
  { row: 1, col: 0, key: 'straight', rot: 1 },
  { row: 1, col: 1, key: 'straight', rot: 1 },
  { row: 1, col: 2, key: 'curve', rot: 3 },
  { row: 0, col: 2, key: 'straight', rot: 0 },
] as const;

async function openTracksBoard(page: Page) {
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks"]');
  });
  await page.goto(`${base}/play/tracks?seats=1&variant=solo`);
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (
      await page
        .getByTestId('tracks-grass-field')
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }
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
  await page.getByTestId('tracks-grass-field').waitFor({ timeout: 5_000 });
  await page.getByTestId('tracks-board').waitFor();
}

async function placeLidRun(page: Page) {
  for (const { row, col, key, rot } of TRACKS_LID_TILES) {
    const cell = page.getByTestId(`tracks-cell-${row}-${col}`);
    await cell.evaluate(
      (el, payload) => {
        el.classList.add('is-filled');
        el.replaceChildren();
        const wrap = document.createElement('div');
        wrap.className = 'tracks-tile-wrap';
        wrap.style.transform = `rotate(${payload.rot * 90}deg)`;
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        const img = document.createElement('img');
        img.className = 'tracks-tile tracks-tile--photo';
        img.src = `/assets/tracks/512/${payload.key}.webp`;
        img.decoding = 'sync';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        wrap.appendChild(img);
        el.appendChild(wrap);
      },
      { key, rot },
    );
  }
  await page.waitForTimeout(400);
}

async function hideChrome(page: Page) {
  await page.addStyleTag({
    content: `
      .topbar,
      [data-testid="tracks-hand"],
      [data-testid="tracks-pew"],
      [data-testid="tracks-hint"],
      .game-shell-rail,
      .match-chrome__info,
      .tracks-terminal__sign { display: none !important; }
    `,
  });
}

async function lidClip(page: Page) {
  return page.evaluate(() => {
    const start = document.querySelector('[data-testid="tracks-terminal-start"]');
    const rowMid = document.querySelector('[data-testid="tracks-cell-1-0"]');
    const rowEnd = document.querySelector('[data-testid="tracks-cell-1-3"]');
    if (!start || !rowMid || !rowEnd) {
      throw new Error('TRACKS lid crop anchors missing');
    }
    const cellH = rowMid.getBoundingClientRect().height;
    const left = start.getBoundingClientRect().left;
    const right = rowEnd.getBoundingClientRect().right;
    const midY = rowMid.getBoundingClientRect().top + cellH / 2;
    const top = midY - cellH * 1.25;
    return {
      x: Math.floor(left),
      y: Math.floor(top),
      width: Math.ceil(right - left),
      height: Math.ceil(cellH * 2.5),
    };
  });
}

function toWebp(pngPath: string, webpPath: string) {
  execSync(`ffmpeg -y -loglevel error -i "${pngPath}" -c:v libwebp -quality 88 "${webpPath}"`, {
    stdio: 'inherit',
  });
}

function writeZoom4x(pngPath: string, outPath: string) {
  execSync(`ffmpeg -y -loglevel error -i "${pngPath}" -vf scale=iw*4:ih*4 "${outPath}"`, {
    stdio: 'inherit',
  });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(REVIEW_DIR, { recursive: true });

  const chrome =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (await import('node:fs').then((fs) =>
      ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p)),
    ));

  const browser = await chromium.launch(
    chrome ? { executablePath: chrome } : { channel: 'chrome' },
  );
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await openTracksBoard(page);
  await placeLidRun(page);
  await hideChrome(page);
  const clip = await lidClip(page);
  await page.screenshot({ path: OUT_PNG, clip, type: 'png' });
  toWebp(OUT_PNG, OUT_WEBP);
  writeZoom4x(OUT_PNG, path.join(REVIEW_DIR, 'tracks-lid-4x.png'));

  await browser.close();
  console.log('wrote', OUT_PNG);
  console.log('wrote', OUT_WEBP);
  console.log('wrote', path.join(REVIEW_DIR, 'tracks-lid-4x.png'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
