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

export async function pickHogwartsHero(
  page: Page,
  seatIndex: number,
  heroName: string,
): Promise<void> {
  const button = page.getByTestId(`hogwarts-hero-${seatIndex}`);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if ((await button.innerText()) === heroName) return;
    await button.click();
  }
  throw new Error(`Could not select ${heroName} for seat ${seatIndex}`);
}
