/**
 * Capture TRACKS before/after screenshots for walkthrough artifacts.
 * Requires: npm run build && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/local/bin/google-chrome
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = '/opt/cursor/artifacts/tracks-art';
const PORT = 8765;
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

async function startServer(): Promise<{ kill: () => void }> {
  const { spawn } = await import('node:child_process');
  const child = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 2500));
  return { kill: () => child.kill() };
}

async function openTracksSolo(page: import('playwright').Page) {
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.setItem('gamescabinet.unlockedGames', '["tracks"]');
  });
  await page.goto(`${base}/game/tracks`);
  await page.getByRole('button', { name: /solo/i }).click();
  await page.getByRole('button', { name: /start/i }).click();
  await page.getByTestId('tracks-draft').locator('button').first().click();
  await page.getByTestId('tracks-board').waitFor();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await startServer();
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
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
      await page.close();
    }

    const sheet = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const tilesHtml = KINDS
      .map(
        (k) =>
          `<figure><img src="/assets/tracks/512/${k}.webp" width="160" height="160" alt=""/><figcaption>${k}</figcaption></figure>`,
      )
      .join('');
    await sheet.setContent(`<!doctype html><html><head><style>
      body{font-family:system-ui;background:#2d5016;margin:1rem;color:#fff}
      h1{font-size:1.25rem}
      .grid{display:grid;grid-template-columns:repeat(5,160px);gap:12px}
      figure{margin:0;text-align:center;font-size:12px}
      img{border-radius:8px;background:#3a6b22}
      .note{grid-column:1/-1;font-size:13px;opacity:.9;margin-top:8px}
    </style></head><body>
    <h1>TRACKS card faces (raster + grass placeholders)</h1>
    <div class="grid">${tilesHtml}
    <p class="note">Raster: straight, curve, tunnel-arch, tunnel-mid. Others: grass + glyph overlay in app.</p>
    </div></body></html>`, { waitUntil: 'load' });
    await sheet.goto(`${base}/assets/tracks/512/straight.webp`);
    await sheet.goto(`data:text/html,${encodeURIComponent(await sheet.content())}`);
    await sheet.screenshot({ path: path.join(OUT, 'card-sheet.png'), fullPage: true });
    await sheet.close();

    const sheet2 = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
    await openTracksSolo(sheet2);
    await sheet2.evaluate((kinds) => {
      const hand = document.querySelector('[data-testid="tracks-hand"]');
      if (!hand) return;
      hand.innerHTML = '';
      for (const kind of kinds) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tracks-hand__card';
        btn.style.width = '6rem';
        const wrap = document.createElement('div');
        wrap.className = `tracks-tile-wrap tracks-tile-wrap--${kind}`;
        wrap.style.width = '5rem';
        wrap.style.height = '5rem';
        if (kind === 'straight' || kind === 'curve' || kind === 'tunnel-arch' || kind === 'tunnel-mid') {
          const img = document.createElement('img');
          img.className = 'tracks-tile tracks-tile--photo';
          img.src = `/assets/tracks/512/${kind}.webp`;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          wrap.appendChild(img);
        } else {
          const grass = document.createElement('img');
          grass.src = '/assets/tracks/512/grass.webp';
          grass.style.width = '100%';
          grass.style.height = '100%';
          grass.style.objectFit = 'cover';
          wrap.appendChild(grass);
        }
        const label = document.createElement('span');
        label.textContent = kind;
        btn.append(wrap, label);
        hand.appendChild(btn);
      }
    }, KINDS);
    await sheet2.screenshot({ path: path.join(OUT, 'card-sheet-in-app.png'), fullPage: false });
    await sheet2.close();
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('Wrote screenshots to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
