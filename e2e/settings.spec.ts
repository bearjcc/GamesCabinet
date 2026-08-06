import { expect, test } from '@playwright/test';

test.describe('Settings', () => {
  test('opens from shell and persists nickname and seat colour', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('shell-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByTestId('settings-nickname').fill('Bear');
    await page.getByTestId('settings-seat-colour-#c0392b').click();

    await page.goto('/');
    await page.getByTestId('shell-settings').click();
    await expect(page.getByTestId('settings-nickname')).toHaveValue('Bear');
    await expect(page.getByTestId('settings-seat-colour-#c0392b')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
