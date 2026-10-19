import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT) || 8000;
const baseURL = `http://127.0.0.1:${port}`;

const systemChrome = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
].find((path) => path && existsSync(path));

const chromiumUse = systemChrome
  ? { ...devices['Desktop Chrome'], channel: 'chrome' as const }
  : { ...devices['Desktop Chrome'] };

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: chromiumUse }],
  webServer: {
    command: 'npx tsx server/index.ts',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(port),
    },
  },
});
