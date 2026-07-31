import { test, expect } from '@playwright/test';

// Flow #4 from docs/test.html: 設定 App 鎖 PIN → 重新整理頁面 → 要求輸入 PIN (P1).
test('setting an app-lock PIN requires it again after a reload', async ({ page }) => {
  await page.goto('/');

  await page.getByText('設定', { exact: true }).click();
  await page.getByText('App 密碼鎖', { exact: true }).click();
  await page.getByPlaceholder('輸入密碼').fill('1234');
  await page.getByPlaceholder('再次輸入').fill('1234');
  await page.getByRole('button', { name: '設定密碼' }).click();
  await expect(page.getByText('已設定密碼')).toBeVisible();

  await page.reload();

  // Locked: the dashboard shouldn't be usable, and the PIN keypad should be up.
  await expect(page.getByText('FinFolio 已鎖定')).toBeVisible();

  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }

  await expect(page.getByText('FinFolio 已鎖定')).toHaveCount(0);
  await expect(page.getByText('看板', { exact: true })).toBeVisible();
});

// Flow #5 from docs/test.html: 清除所有歷史資料 → 主檔設定保留、交易紀錄清空 (P1).
test('clearing history data wipes transactions but preserves master data (accounts/categories)', async ({ page }) => {
  await page.goto('/');

  // Record something so there's a transaction to check for removal.
  await page.locator('button:has-text("資產") + button').click();
  await page.getByPlaceholder('0', { exact: true }).fill('150');
  await page.getByRole('button', { name: '儲存支出' }).click();
  await expect(page.getByText('當日無紀錄')).toHaveCount(0);

  await page.getByText('設定', { exact: true }).click();
  await page.getByText('清除所有歷史資料', { exact: true }).click();
  await page.getByPlaceholder('清除', { exact: true }).fill('清除');
  await page.getByRole('button', { name: '永久清除所有歷史資料' }).click();
  await expect(page.getByText('已清除')).toBeVisible();

  await page.waitForTimeout(1200);
  await page.waitForLoadState('networkidle');

  // Transactions are gone.
  await expect(page.getByText('當日無紀錄')).toBeVisible();

  // Master data (account categories) is untouched.
  await page.getByText('資產', { exact: true }).click();
  await expect(page.getByText('銀行', { exact: true })).toBeVisible();
  await expect(page.getByText('信用卡', { exact: true })).toBeVisible();
});
