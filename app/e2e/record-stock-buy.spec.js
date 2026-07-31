import { test, expect } from '@playwright/test';

// Flow #2 from docs/test.html: 記一筆股票買進 → 投資頁出現新持倉、手續費金額正確顯示 (P0).
//
// Deliberately does NOT assert on 市值/未實現損益 in the Invest tab — those come
// from a live price quote fetched from the deployed Cloudflare Worker (real
// market data), so they change every trading day and would make this test
// flaky. The fee, on the other hand, is a pure cost-basis calculation
// (gross + fee) independent of any live price, so it's what this test checks.
test('recording a stock buy shows the holding on the Invest tab with the correct fee-inclusive cost', async ({ page }) => {
  await page.goto('/');

  await page.locator('button:has-text("資產") + button').click();
  await page.getByText('股票買賣', { exact: true }).click();

  // Filling both explicitly rather than relying on the app's name-from-code
  // autofill, which depends on an async TW stock list fetch and is flaky
  // under parallel test load.
  await page.getByPlaceholder('2330').fill('2330'); // 代號
  await page.getByPlaceholder('台積電').fill('台積電'); // 名稱

  // exact:true matters — the 代號 field's placeholder is "2330", which
  // contains "0" and would otherwise match a non-exact getByPlaceholder('0').
  await page.getByPlaceholder('0', { exact: true }).first().fill('1000'); // 股數
  await page.getByPlaceholder('0', { exact: true }).nth(1).fill('500'); // 成交價

  // 1000 股 * 500 = 500,000 gross + 712 auto fee (0.1425%, min 20) = 500,712 net.
  await expect(page.getByText('500,712')).toBeVisible();

  await page.getByRole('button', { name: '儲存買進紀錄' }).click();

  // Dashboard's daily view shows the debit at the fee-inclusive amount.
  // (name span -> up 3 ancestors -> the row div that also has the amount)
  const dashboardRow = page.getByText('台積電', { exact: true }).locator('xpath=../../..');
  await expect(dashboardRow).toContainText('-500,712');

  // Invest tab shows the new holding (name + share count only — see comment above).
  await page.getByText('投資', { exact: true }).click();
  const holdingRow = page.getByText('台積電', { exact: true }).locator('xpath=../..');
  await expect(holdingRow).toContainText('1,000 股');
});
