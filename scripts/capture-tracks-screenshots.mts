/**
 * Capture TRACKS board screenshots for walkthrough artifacts.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = '/opt/cursor/artifacts/tracks-art';
const PORT = Number(process.env.CAPTURE_PORT) || 8765;
const LABEL = process.env.CAPTURE_LABEL || 'after';
const base = `http://127.0.0.1:${PORT}`;

const KINDS = [
  'straight',
  'curve',
  'junction',
  'bridge-start',
  'bridge-mid',
  'tunnel-arch',
  'tunnel-mid',
  'whistlestop',
  'obstacle',
] as const;

async function startServer(cwd: string): Promise<{ kill: () => void }> {
  const { spawn } = await import('node:child_process');
  const child = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 3000));
  return { kill: () => child.kill() };
}

async function openTracksSolo(page: Page) {
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks"]');
  });
  await page.goto(`${base}/game/tracks`);
  await page.getByTestId('play-start').click();
  await page.getByTestId('tracks-draft').locator('button').first().click();
  await page.getByTestId('tracks-play-surface').waitFor();
}

async function screenshotCardSheet(page: Page, file: string) {
  await page.evaluate((kinds) => {
    const host = document.querySelector('[data-testid="tracks-play-surface"]');
    if (!host) return;
    const grid = document.createElement('div');
    grid.setAttribute('data-testid', 'tracks-art-sheet');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3, minmax(5rem, 1fr))';
    grid.style.gap = '12px';
    grid.style.padding = '12px';
    grid.style.maxWidth = '28rem';
    for (const kind of kinds) {
      const cell = document.createElement('div');
      cell.style.textAlign = 'center';
      cell.style.fontSize = '11px';
      const face = document.createElement('div');
      face.style.aspectRatio = '1';
      face.style.borderRadius = '8px';
      face.style.overflow = 'hidden';
      const img = document.createElement('img');
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.src =
        kind === 'straight' ||
        kind === 'curve' ||
        kind === 'tunnel-arch' ||
        kind === 'tunnel-mid'
          ? `/assets/tracks/512/${kind}.webp`
          : '/assets/tracks/512/grass.webp';
      face.appendChild(img);
      const cap = document.createElement('div');
      cap.textContent = kind;
      cell.append(face, cap);
      grid.appendChild(cell);
    }
    host.prepend(grid);
  }, KINDS);
  await page.getByTestId('tracks-art-sheet').screenshot({ path: file });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const root = process.env.CAPTURE_ROOT || path.resolve(import.meta.dirname, '..');
  const server = await startServer(root);
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    channel: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? undefined : 'chrome',
  });
  try {
    for (const [name, viewport] of [
      ['desktop-board', { width: 1280, height: 800 }],
      ['tablet-board', { width: 820, height: 1180 }],
    ] as const) {
      const page = await browser.newPage({ viewport });
      await openTracksSolo(page);
      await page
        .getByTestId('tracks-play-surface')
        .screenshot({ path: path.join(OUT, `${LABEL}-${name}.png`) });
      await page.close();
    }
    const sheetPage = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    await openTracksSolo(sheetPage);
    await screenshotCardSheet(sheetPage, path.join(OUT, `${LABEL}-card-sheet.png`));
    await sheetPage.close();
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`Wrote ${LABEL} screenshots to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
