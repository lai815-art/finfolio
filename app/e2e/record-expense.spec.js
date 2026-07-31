import { test, expect } from '@playwright/test';

// Flow #1 from docs/test.html: 記一筆支出 → 資產頁餘額正確扣掉 (P0).
// No test-ids exist in the legacy screens yet, so this locates the record
// button structurally (the button right after the "資產" tab in the bottom
// nav) rather than by role/label — fragile if the tab bar order changes,
// but there's nothing more stable to hook into today.
test('recording an expense updates the account balance shown on the Assets tab', async ({ page }) => {
  await page.goto('/');

  await page.locator('button:has-text("資產") + button').click();
  await expect(page.getByText('記一筆', { exact: true })).toBeVisible();

  await page.getByPlaceholder('0').fill('150');
  await page.getByRole('button', { name: '儲存支出' }).click();

  await page.getByText('資產', { exact: true }).click();

  const netWorthLabel = page.getByText('總資產淨額', { exact: true });
  const netWorthValue = netWorthLabel.locator('xpath=following-sibling::div[1]');
  await expect(netWorthValue).toHaveText('-150');

  const bankRow = page.locator('button', { hasText: '銀行' });
  await expect(bankRow).toContainText('-150');
});
