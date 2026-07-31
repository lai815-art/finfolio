import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Flow #3 from docs/test.html: 加密備份匯出 → 清除所有資料 → 用密碼匯入 → 資料與匯出前一致 (P0).
// This is the only safety net in a "never uploads to the cloud" app — if this
// breaks, a cleared/lost device means real data loss.
test('an encrypted backup restores identical data after local storage is wiped', async ({ page }) => {
  await page.goto('/');

  // Record one expense so there's user data to check for after restore.
  await page.locator('button:has-text("資產") + button').click();
  await page.getByPlaceholder('0', { exact: true }).fill('150');
  await page.getByRole('button', { name: '儲存支出' }).click();

  // Go export a backup.
  await page.getByText('設定', { exact: true }).click();
  await page.getByText('加密備份 / 還原', { exact: true }).click();
  await page.getByPlaceholder('設定新密碼').fill('test-password-1234');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '加密匯出備份檔' }).click();
  const download = await downloadPromise;
  const backupPath = path.join(__dirname, '.tmp-backup-download.finfolio');
  await download.saveAs(backupPath);

  // Wipe all local data — simulates a cleared device / fresh install.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('當日無紀錄')).toBeVisible();

  // Restore from the exported file.
  await page.getByText('設定', { exact: true }).click();
  await page.getByText('加密備份 / 還原', { exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await page.getByPlaceholder('輸入此備份檔的密碼').fill('test-password-1234');
  await page.getByRole('button', { name: '還原此備份（會覆蓋目前資料）' }).click();

  // The app reloads itself ~900ms after a successful restore.
  await expect(page.getByText('還原成功')).toBeVisible();
  await page.waitForTimeout(1200);
  await page.waitForLoadState('networkidle');

  await page.getByText('資產', { exact: true }).click();
  const bankRow = page.locator('button', { hasText: '銀行' });
  await expect(bankRow).toContainText('-150');
});
