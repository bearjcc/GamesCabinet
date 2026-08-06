import type { Browser, Page } from '@playwright/test';

export type OnlinePair = {
  hostPage: Page;
  guestPage: Page;
  close: () => Promise<void>;
};

/** Two isolated browser contexts so host and guest hold separate seats. */
export async function openOnlinePair(browser: Browser): Promise<OnlinePair> {
  const host = await browser.newContext();
  const guest = await browser.newContext();

  return {
    hostPage: await host.newPage(),
    guestPage: await guest.newPage(),
    close: async () => {
      await host.close();
      await guest.close();
    },
  };
}

export async function readRoomCode(page: Page): Promise<string> {
  return (await page.getByTestId('room-code').innerText()).trim();
}
