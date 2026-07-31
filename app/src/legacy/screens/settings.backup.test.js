import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ffExportBackup, ffImportBackup } from './settings.jsx';

// Capture the File that ffExportBackup hands to the Web Share API instead of
// letting it actually try to save anything — this avoids depending on the
// `<a download>` / URL.createObjectURL fallback path in a jsdom environment.
function captureShardFile() {
  let captured = null;
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    canShare: () => true,
    share: vi.fn(async ({ files }) => { captured = files[0]; }),
  });
  return () => captured;
}

describe('encrypted backup export/import round trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('restores identical data after export -> import with the correct password', async () => {
    localStorage.setItem('ff_flows', JSON.stringify([{ kind: 'exp', amount: 100 }]));
    localStorage.setItem('ff_master_data', JSON.stringify({ accounts: [{ name: '國泰銀行' }] }));

    const getFile = captureShardFile();
    await ffExportBackup('correct horse battery staple');
    const exported = await getFile().text();

    localStorage.clear();
    await ffImportBackup(exported, 'correct horse battery staple');

    expect(JSON.parse(localStorage.getItem('ff_flows'))).toEqual([{ kind: 'exp', amount: 100 }]);
    expect(JSON.parse(localStorage.getItem('ff_master_data'))).toEqual({ accounts: [{ name: '國泰銀行' }] });
  });

  it('rejects the wrong password with a clear error instead of silently returning garbage', async () => {
    localStorage.setItem('ff_flows', JSON.stringify([{ kind: 'exp', amount: 100 }]));

    const getFile = captureShardFile();
    await ffExportBackup('correct-password');
    const exported = await getFile().text();

    await expect(ffImportBackup(exported, 'wrong-password')).rejects.toThrow('密碼錯誤');
  });

  it('rejects a file that is not a FinFolio backup', async () => {
    await expect(ffImportBackup('{"not":"a backup"}', 'whatever')).rejects.toThrow('不是 FinFolio 備份檔');
  });

  it('uses a fresh salt and IV on every export, so identical data encrypts differently each time', async () => {
    localStorage.setItem('ff_flows', JSON.stringify([{ kind: 'exp', amount: 1 }]));

    const getFile1 = captureShardFile();
    await ffExportBackup('same-password');
    const blob1 = JSON.parse(await getFile1().text());

    const getFile2 = captureShardFile();
    await ffExportBackup('same-password');
    const blob2 = JSON.parse(await getFile2().text());

    expect(blob1.salt).not.toBe(blob2.salt);
    expect(blob1.iv).not.toBe(blob2.iv);
    expect(blob1.data).not.toBe(blob2.data);
  });
});
