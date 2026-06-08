import type { MasterData } from './types';

export const DEFAULT_MASTER_DATA: MasterData = {
  cat_exp: ['餐飲', '交通', '生活雜貨', '娛樂', '醫療', '住房', '教育', '其他'],
  cat_inc: ['薪資', '獎金', '股利', '紅利回饋', '其他'],
  cat_xfer: ['日常轉帳', '投資轉入', '繳卡費'],
  asset_class: ['股票', '債券', '市值 ETF', '主動 ETF', '特別股'],
  accounts: [
    { name: '主要存款帳戶', kind: '銀行' },
    { name: '郵局帳戶', kind: '銀行' },
    { name: '數位帳戶', kind: '銀行' },
    { name: '信用卡 A', kind: '信用卡' },
    { name: '信用卡 B', kind: '信用卡' },
    { name: '現金 (錢包)', kind: '現金' },
    { name: 'LINE Pay', kind: '電子支付' },
    { name: '街口支付', kind: '電子支付' },
  ],
  brokers: [
    { name: '主要券商', sub: '富邦證券 · ••• 8832' },
    { name: '副券商', sub: '元大證券 · ••• 1024' },
    { name: '複委託', sub: '國泰證券 · ••• 2207' },
  ],
  settle: [
    { name: '券商交割戶', sub: '對應主要券商' },
    { name: '複委託交割戶', sub: '對應複委託 · 美股' },
    { name: '主要存款帳戶', sub: '部分券商可直接交割' },
  ],
};
