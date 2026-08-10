import { describe, it, expect } from 'vitest';
import { ffDropdownPlacement } from './accounting.jsx';

// 預設情境：欄位在捲動容器中間，上下都很寬裕
const place = (over) => ffDropdownPlacement({
  fieldTop: 100, fieldBottom: 146, boundsTop: 0, boundsBottom: 800, scale: 1, ...over });

describe('ffDropdownPlacement', () => {
  it('往下開時最高只到捲動容器底緣，不會超出被按鈕列裁掉', () => {
    // 實測數字：欄位底 522、捲動容器底 797（＝按鈕列上緣）
    const { up, maxH } = place({ fieldTop: 476, fieldBottom: 522, boundsBottom: 797 });
    expect(up).toBe(false);
    expect(maxH).toBe(259); // 797 - 522 - 16；舊邏輯量到視窗底部會得到 336，多出的 67px 就是被裁掉的量
    expect(522 + maxH).toBeLessThanOrEqual(797);
  });

  it('下方空間不足且上方較大時改成往上開', () => {
    const { up } = place({ fieldTop: 600, fieldBottom: 646, boundsTop: 0, boundsBottom: 700 });
    expect(up).toBe(true);
  });

  it('下方空間不足但上方更小時仍然往下開', () => {
    const { up } = place({ fieldTop: 60, fieldBottom: 106, boundsTop: 0, boundsBottom: 280 });
    expect(up).toBe(false);
  });

  it('畫面有縮放時換算回畫布 px（iPhone 安裝版 k≈1.07）', () => {
    const scale = 1.07;
    const { maxH } = place({ fieldTop: 476, fieldBottom: 522, boundsBottom: 797, scale });
    // 面板實際佔的螢幕高度 = maxH * scale，必須塞得進容器
    expect(maxH * scale).toBeLessThanOrEqual(797 - 522);
    expect(maxH).toBeCloseTo(259 / scale, 5);
  });

  it('空間很大時夾在上限 340', () => {
    expect(place({ boundsBottom: 2000 }).maxH).toBe(340);
  });

  it('上下空間都很小時夾在下限 160', () => {
    const { maxH } = place({ fieldTop: 60, fieldBottom: 106, boundsTop: 50, boundsBottom: 180 });
    expect(maxH).toBe(160);
  });

  it('沒給 scale 時當作 1，不會除以 0', () => {
    const { maxH } = ffDropdownPlacement({
      fieldTop: 476, fieldBottom: 522, boundsTop: 0, boundsBottom: 797, scale: 0 });
    expect(maxH).toBe(259);
  });
});
