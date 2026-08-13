# FinFolio — 專案規格（回顧現況）

> 本文件如實記錄 `app/`（前端）與 `worker/`（股價服務）目前的實際狀態，作為之後開發的參考基礎。不包含 `project/` 資料夾內的設計原型（詳見 Further Notes）。撰寫時間：2026-07-31。

## Problem Statement

使用者想要一套個人資產管理工具，能：

- 記錄日常收支、帳戶間轉帳、股票買賣
- 同時管理多個帳戶（現金、銀行、信用卡、電子支付、儲值卡）與多個證券戶
- 看到即時的淨資產、月度/年度收支統計、投資組合損益
- 資料完全留在自己的裝置上，不上傳到任何雲端服務
- 用語音快速記一筆帳，而不用每次都打開表單手動輸入
- （規劃中）有一個 AI 顧問可以根據資產配置給建議

## Solution

FinFolio 是一個純前端的 PWA 風格 App（React 18 + Vite），所有資料（收支、持倉、設定）都存在瀏覽器 `localStorage`，不經過任何後端資料庫。唯一對外的網路呼叫是一個 Cloudflare Worker（`finfolio-prices`），只負責查股價/匯率，**只傳股票代號出去，不傳任何持倉、金額、身分資訊**。

App 分四個主要分頁（底部 TabBar）＋一個全螢幕設定頁：

- **看板（Dashboard）**：月度收支摘要、消費分類圓餅圖、12個月/多年收支走勢、逐日交易記錄
- **資產（Accounts）**：淨資產總覽、7 大帳戶分類、帳戶明細；點淨資產可開「資產配置與目標」明細頁（資產配置圓餅圖＋負債明細／財務目標追蹤兩個頁籤）
- **記帳（Accounting）**：收支/轉帳/股票買賣表單，含語音輸入
- **投資（Invest）**：依證券戶分頁的持倉列表、FIFO 損益計算、投資組合明細
- **設定（Settings）**：主檔管理、AI 金鑰（BYOK）、初始餘額、加密備份匯出入

還有一個**已寫好但目前對使用者隱藏**的「AI 顧問」分頁（`SHOW_ADVISOR=false`），程式碼會在之後版本繼續開發後才開放。

## User Stories

**看板**
1. As a 使用者, I want to 一眼看到本月的總收入與總支出（換算成台幣）, so that 我知道這個月花超過還是省下來
2. As a 使用者, I want to 點開本月收支摘要，在「支出」或「收入」分頁自由切換「月/年」聚合單位，看該期間的大類圓餅圖（支出含投資損失，即總支出；圓餅圖進場時有展開動畫）與大類清單、下鑽子分類，並跟上一期（上月/去年）比較增減, so that 我能用同一套畫面看月支出、年支出、月收入、年收入，知道錢花在哪個類別最多
3. As a 使用者, I want to 切到「趨勢」分頁選「月」看某一年 12 個月的收支走勢圖（各收入大類/投資損益/消費支出），折線進場有畫出動畫，且能點圖例單獨隱藏/顯示某一條線, so that 我能看出收支的季節性變化，也能只留下我想比較的那幾條線
4. As a 使用者, I want to 切到「趨勢」分頁選「年」看多年（每頁 10 年）的收支走勢, so that 我能評估長期的財務趨勢
5. As a 使用者, I want to 點圖表上任一根柱子/任一列看細項彈窗, so that 我能追查某個月/某年為什麼特別高或低
6. As a 使用者, I want to 點開「資產淨額明細」看現金/存款/各投資分類的圓餅圖與負債明細, so that 我知道淨資產的組成
7. As a 使用者, I want to 用日期列左右滑動或點日曆挑選任一天, so that 我能回顧某一天發生了什麼交易
8. As a 使用者, I want to 看到選定那天的收支、轉帳、股票買賣（分三個區塊列出）, so that 我能快速確認當天的記帳內容
9. As a 使用者, I want to 系統自動產生的紀錄（如股票交割的 T+2 轉帳）標示「系統自動」且不能誤觸編輯, so that 我不會不小心改壞自動產生的對帳資料

**資產**
10. As a 使用者, I want to 在資產頁頂端看到總淨資產金額（帳戶淨值＋投資市值）, so that 我一眼掌握目前身家
11. As a 使用者, I want to 依信用卡/現金/銀行/證券戶/儲值卡/電子支付/其他 7 個分類收合查看帳戶, so that 資訊不會太雜亂
12. As a 使用者, I want to 看到信用卡的額度使用率進度條, so that 我知道快不快刷爆
13. As a 使用者, I want to 點進單一帳戶看該帳戶當月的交易明細與月份切換, so that 我能追蹤特定帳戶的資金流向

**記帳**
14. As a 使用者, I want to 記一筆支出（金額/兩層分類/帳戶/日期/備註）, so that 花費被正確歸類統計
15. As a 使用者, I want to 記一筆收入（金額/分類/帳戶/日期/備註）, so that 收入被正確記錄
16. As a 使用者, I want to 在兩個帳戶間記一筆轉帳（含手續費由轉出帳戶扣除、一鍵互換轉入轉出）, so that 帳戶餘額正確反映資金移動
17. As a 使用者, I want to 記一筆股票買進（自動帶出手續費、依券商設定的費率/折扣計算）, so that 我不用自己算手續費
18. As a 使用者, I want to 記一筆股票賣出（依資產類別自動帶出證交稅預設稅率，仍可手動覆蓋）, so that 損益計算含稅後淨額
19. As a 使用者, I want to 長按中央的記帳按鈕開啟語音輸入, so that 我不用打開表單就能快速記帳
20. As a 使用者, I want to 用語音說「午餐花了120用悠遊卡」之類的話, so that 系統自動解析出金額/分類/帳戶並帶入表單讓我確認
21. As a 使用者, I want to 語音辨識失敗或裝置不支援時能改用文字輸入同一段話, so that 我仍然能用同一套解析邏輯記帳
22. As a 使用者, I want to 編輯或刪除一筆已存在的記錄, so that 打錯的資料可以修正
22a. As a 使用者, I want to 選到某個分類時自動帶入我上次記這個分類用的帳戶, so that 常態性的「餐飲刷現金、薪資進某銀行」不用每次重選帳戶

**投資**
23. As a 使用者, I want to 依證券戶分頁查看我的持倉，並在分頁下方看到該券商的總市值與未實現損益小結, so that 我能區分不同券商的部位，也不用自己心算加總
24. As a 使用者, I want to 點進單一持倉看即時股價、市值、均價、未實現損益（金額與百分比）, so that 我知道這檔股票賺賠多少
25. As a 使用者, I want to 看到該持倉完整的買賣歷史（FIFO 先進先出配對成本）, so that 我能理解均價是怎麼算出來的
26. As a 使用者, I want to 點頂端市值圓餅圖看「投資組合明細」——全部券商加總的持倉分布, so that 我能看整體資產配置
27. As a 使用者, I want to 切到「投資收益」分頁看各年度的股息/債息/操作損益長條圖, so that 我能評估投資的長期報酬
28. As a 使用者, I want to 進「追蹤」頁看追蹤標的的本益比與本益成長比（PEG）, so that 我能判斷目前價格相對於獲利成長是偏貴還是偏便宜
29. As a 使用者, I want to 自己手動把想追蹤的標的加進清單（持股不會自動帶入）, so that 清單上只有我真的想比較的候選標的
30. As a 使用者, I want to 手動覆寫某檔的成長率, so that 我能用自己的預估值取代財報回推的歷史成長率

**設定**
31. As a 使用者, I want to 新增/編輯/刪除記帳分類（收入/支出/轉帳/資產類別），支出/收入分類底下的「大類」本身也能新增/編輯/刪除, so that 分類符合我自己的記帳習慣
32. As a 使用者, I want to 系統阻擋我刪除「仍有記錄在用」的分類或帳戶、阻擋我刪除「底下還有子分類」的大類，並讓幾個系統預設大類（支出：餐飲/交通/日常/投資損失；收入：主動/被動/投資收入）永遠不能被刪除, so that 我不會不小心弄出對不上帳的孤兒資料，也不會刪光系統賴以統計的基礎大類
33. As a 使用者, I want to 重新命名帳戶/券商時，所有既有紀錄自動改用新名稱, so that 歷史資料不會斷掉
34. As a 使用者, I want to 新增一般帳戶（銀行/信用卡/現金/電子支付/儲值卡/其他）, so that 我能追蹤名下所有帳戶
35. As a 使用者, I want to 新增證券戶（含手續費率、折扣、交割帳戶、T+2 設定）, so that 股票買賣的手續費/交割能自動算對
36. As a 使用者, I want to 設定每個帳戶的初始餘額, so that 淨資產計算從正確的起點開始
37. As a 使用者, I want to 貼上自己的 Gemini/OpenAI/Claude API 金鑰並選一個當預設模型, so that 我能用 BYOK 方式使用 AI 相關功能（金鑰只存在我自己裝置上）
38. As a 使用者, I want to 用密碼把所有資料加密匯出成一個備份檔, so that 我能自行保存或搬到別的裝置
39. As a 使用者, I want to 用同一組密碼把備份檔還原回來, so that 換裝置或清資料後不會遺失歷史
40. As a 使用者, I want to App 在背景自動做一份未加密的本機快照（開/關 App 時）, so that 意外的 App 狀態問題也有救援手段（但清瀏覽器資料時這份快照救不回來）
41. As a 使用者, I want to 用「清除所有歷史資料」功能只清掉交易紀錄, so that 我能重新開始記帳但保留帳戶/分類等主檔設定
42. As a 使用者, I want to 設定 App 鎖定 PIN 或生物辨識, so that 別人拿到我的手機也看不到資產資料
43. As a 使用者, I want to 開啟「隱藏金額」開關把畫面上的數字都用遮罩蓋住, so that 在別人面前也能安心操作
44. As a 使用者, I want to 設定「自動轉帳」（任意帳戶→任意帳戶，固定金額）或「定期支出」規則，每月到期自動補記入帳, so that 房租、Netflix、定期定額投資不用每次手動記
45. As a 使用者, I want to 在月曆上看到哪幾天有排定的自動轉帳/定期支出（小點標記，每月重複顯示，不分過去未來），並且切到「未來」某一天時在看板當日顯示「預定」提示（金額不算入當日/當月收支，要等到當天真的執行才算數）, so that 我一眼就知道這個月哪幾天會有自動扣款，也不會被還沒發生的支出誤導

**AI 顧問（目前隱藏，未來版本開發）**
46. As a 使用者, I want to （未來）在 AI 顧問分頁跟我自己選的 AI 模型對話討論資產配置, so that 我能得到客製化的理財建議
47. As a 使用者, I want to （未來）看到系統依股票/債券/現金占比算出的健康度評分與提示, so that 我知道目前配置是否偏股或偏保守

**系統層級**
48. As a 使用者, I want to App 發生未預期錯誤時顯示可重試的錯誤畫面而不是白屏, so that 我不會因為一個小 bug 就完全用不了 App
49. As a 使用者, I want to 資料結構升級時自動做 migration, so that 舊版本存的資料在新版 App 上不會壞掉

**財務目標（資產配置與目標頁面的「財務目標」頁籤）**
50. As a 使用者, I want to 設定多種類型的財務目標（淨資產於指定年月達標／單一帳戶餘額達標／收入目標／收支結餘），後兩種可選以月、季或年為單位、固定金額或跟上一期比成長%, so that 我能同時追蹤不同面向的財務計劃
47b. As a 使用者, I want to 收入目標可指定追蹤範圍——任一收入大類（含自訂新增的大類）或「總收入」, so that 我能單獨追蹤主動/被動/投資等某一類收入，而不是只能追蹤被動收入
51. As a 使用者, I want to 目標達成時卡片出現金色邊框＋彩紙動畫慶祝（只播一次，之後常駐金色邊框與勳章）, so that 我能清楚感受到達成的成就感
52. As a 使用者, I want to 週期性目標（收入/結餘/股票損益）顯示近幾期的達成率小圓點, so that 我能看出自己是不是穩定達標
53. As a 使用者, I want to 目標卡片依完成率由高到低排序（已達成 100% 的固定排最下面）、「新增目標」按鈕固定在最上方, so that 我能一眼看到最接近達成的目標，且新增入口不會隨清單長度移動位置

## Implementation Decisions

**資料層（全部存在 localStorage，`ff_` 前綴）**

| Key | 內容 |
|---|---|
| `ff_flows` | 收支/轉帳紀錄陣列 |
| `ff_trades` | 股票買賣紀錄陣列 |
| `ff_master_data` | 分類/帳戶/券商/交割戶/資產類別主檔 |
| `ff_init_bal` | 各帳戶初始餘額 |
| `ff_recurring` | 自動轉帳/定期支出規則（`type:'expense'`\|`'transfer'`） |
| `ff_last_acct_by_cat` | 每個分類上次使用的帳戶，key 為 `kind:分類名`（見下方「分類記住上次的帳戶」章節） |
| `ff_ai_keys` / `ff_default_model` | BYOK AI 金鑰與預設模型 |
| `ff_lock_pin` / `ff_lock_salt` / `ff_lock_bio` / `ff_lock_cred` | App 鎖 PIN（雜湊存放，不存明碼）與生物辨識憑證 |
| `ff_auto_snapshot` / `ff_last_auto_backup` | 未加密的本機自動快照 |
| `ff_savings_goals` | 財務目標陣列，每筆依 `type` 有不同欄位（見下方「財務目標」章節）；舊版單一目標 `ff_savings_goal` 讀取時自動遷移進來 |
| `ff_watchlist` | 追蹤頁的自選清單 `[{code, name}]`（未持有但想追蹤的標的） |
| `ff_valuation_override` | 追蹤頁手動覆寫的成長率 `{代號: {cagr, yoy, fwd}}` |
| `ff_fundamentals` | Worker `/fundamentals` 回來的 EPS 快取 `{items, month, v}`，跨月或 `v` 不符才重抓 |
| `ff_schema_version` | schema migration 版本號（目前 `SCHEMA_VERSION=5`） |

備份/還原、自動快照、清除功能都是**掃描所有 `ff_*` 開頭的 key**來運作，之後新增任何 `ff_*` key 會自動被納入，不需要額外改動備份邏輯。

**支出/收入分類的「大類」**
- `cat_exp`/`cat_inc` 每個項目除了 `name` 還有 `group` 欄位；大類清單本身另外存在 `ff_master_data` 的 `exp_groups`/`inc_groups`（`{name, color}` 陣列），使用者可在設定頁新增/編輯（改名會連動更新底下所有子分類的 `group`）/刪除大類。
- 刪除規則：大類底下還有子分類就擋下；以下幾個系統預設大類永遠不可刪除——支出：餐飲/交通/日常/投資損失；收入：主動/被動/投資收入。
- 排序規則：不可刪除的大類固定排最前面，「其他」固定排最後，其餘大類維持原本相對順序；每次啟動 App 都會冪等校正既有資料的順序。
- 舊資料沒有 `exp_groups`/`inc_groups` 欄位時，`migrateSchema()` 會自動補上目前使用的預設大類與顏色。

**分類記住上次的帳戶**（`last-account.js`）
- 存在 `ff_last_acct_by_cat`：`{ 'exp:早餐': {account}, 'inc:薪資': {account}, 'xfer:繳卡費': {fromAccount, toAccount} }`。key 加 `kind` 前綴，避免收入/支出的同名分類互相污染；值直接是可以丟給表單 `update()` 的 patch。
- 記憶粒度到**項目層**（早餐/午餐各自獨立），不是大類；轉帳同時記轉出與轉入兩個帳戶。
- 寫入時機：`handleSaved()`（app.jsx）存下每一筆 flow 時順便記，「儲存」與「再記一筆」都會經過。
- 套用時機：開啟記一筆表單時（依預設分類）、切換分類時、切換記帳類型導致分類改變時。**編輯既有紀錄不套用**（要維持原紀錄的帳戶），語音已解析出的帳戶欄位也不覆蓋。
- 記住的帳戶若已從主檔刪除，讀取時會被過濾掉、維持目前選擇，不會帶入不存在的帳戶。
- 這個 key **不列入**「清除所有歷史資料」的 `FF_CLEAR_KEYS`——它屬於使用習慣設定，不是交易紀錄。

**股票類別配色**（`asset-class-color.js`）
- 同一個股票類別在資產配置圓餅、投資主頁持倉卡、投資配置頁三處是同一個顏色。顏色依類別在 `ff_master_data.asset_class` 裡的**順序**指派（`ffAssetClassColorMap`），不看市值——市值排名會隨報價變動，顏色會跟著跳。
- 呼叫端統一用「主檔順序在前、只出現在持倉裡的類別接在後面」組類別清單，所以新增/刪除類別會讓顏色重新指派，但三個頁面永遠一致。
- 調色盤用 token key（`orange/indigo/red/teal/gold2/blue/inv5/green2`）搭配 hex fallback：Design System 頁改 token 會連動，測試環境沒有 `window.TOKENS` 也能跑。刻意避開資產配置圓餅裡固定的 現金（綠）/ 存款（深藍）。
- 投資配置頁的圓餅是**逐檔個股**，每檔的顏色 = 所屬類別的基準色 + 類別內深淺（`ffClassShade`，類別內市值最大的用基準色，其餘往亮的方向漸層、最多混 55% 白），所以圓餅切片跟清單的類別徽章對得上。
- 券商分頁的顏色（`invest.jsx` 的 `TAB_COLORS_INV`）是另一條分類軸，不走這套。

**自動轉帳 / 定期支出**
- 規則存在 `ff_recurring`：`{ id, type:'expense'|'transfer', name, enabled, dayOfMonth(1-28), lastRun:'YYYY-MM', ... }`；`expense` 額外有 `amount/category/account`，`transfer` 額外有 `fromAccount/toAccount/amount`（任意帳戶對任意帳戶，只支援固定金額，沒有「信用卡全額繳清」這種特殊模式）。
- 執行時機：`ffRunRecurring()`（app.jsx）每次開 App 時檢查所有規則，把「上次產生之後、到本月為止且已過扣款日」的月份補記成真正的 `flow` 紀錄（`auto:true`），之後跟手動記帳資料走同一套渲染路徑。
- 月曆標記：只要某天的「幾號」符合已啟用規則的 `dayOfMonth`，該天下方就顯示小點——每月重複顯示，不論該月是過去或未來。
- 看板「預定」提示：切到「今天以後」的未來日期時，若當天符合某規則的 `dayOfMonth`，看板當日視圖會顯示一張「預定」卡片（名稱、帳戶、金額），但這個金額**不會**算入當日/當月的收支總計——要等到那天真的到期、被 `ffRunRecurring()` 寫成真實紀錄才算數。

**統計圖表動畫與圖例互動**（`StatDonut`／`ComboChart`，dashboard.jsx）
- 純 CSS `@keyframes`（`fillArc`/`drawLine`/`growBar`/`fadeInStat`，定義在 index.html），沒有用任何動畫函式庫。
- 折線用 SVG `pathLength="1"` 技巧：把整條線正規化成 0–1，`stroke-dashoffset` 從 1 動畫到 0 做「畫出來」效果；虛線（消費支出，本身已有 dash 花紋）改用單純淡入，避免兩種 dasharray 互相干擾。
- 圓餅圖用 CSS 自訂屬性（`--arcFrom`/`--arcTo`）讓每段弧線各自動畫到自己的 `stroke-dashoffset` 終點。
- 折線圖圖例可點擊：`MonthlyStatsSheet` 用 `hiddenSeries`（Set）記錄被隱藏的線，`ComboChart` 依可見的線重新計算 Y 軸範圍（隱藏掉大數值的線後，其餘線會自動放大顯示）；圖表容器加了 `key`（依 `unit`＋期間年份），切換單位/期間時整組圖表會重新掛載、動畫重播一次。「餘額」柱狀雖然不在 `CHART_SERIES` 裡，一樣是 `hiddenSeries` 的成員、也一起納入 Y 軸重算。曾有一條「去年同期」消費支出參考線（僅月檢視），已整個移除。

**收支統計的三大頁籤與月/年單位**（`MonthlyStatsSheet`，dashboard.jsx）
- 頁籤是 `tab`（`exp`／`inc`／`trend`），聚合單位是 `unit`（`month`／`year`），兩者自由組合共 6 種。但**期間軸只有三種粒度**：`scaleOf(tab, unit)` 把支出/收入直接映射到 `unit`，趨勢頁的「月」是看一整年的 12 個月、「年」是看十年，各往上推一級（`year`／`decade`）。因此只需要**一個** `offset` state（0=當期，只會是 0 或負數），`canNext` 就是單一的 `offset < 0`，期間文字與前後切換全部只認 `scale`、不認 `tab`/`unit`。
- 切換的唯一入口是 `pick(tab, unit)`：**期間粒度沒變就保留期間**（例如支出↔收入可以對照同一個月），粒度變了才把 `offset` 歸零。
- 下鑽狀態（`expanded`）**只在換頁籤時清掉**——大類名在支出/收入之間不通用（「投資損失」在收入頁不存在）。切月/年單位、前後翻期間都留在同一個大類裡，讓使用者能在某個大類內比較各期間的子分類變化；該期間該大類沒紀錄時就顯示空狀態文案，不自動退回上一層。`selIdx`（趨勢頁的選取）在任何切換都重設，因為它是 `curData` 的索引，12 ↔ 10 長度不同。`hiddenSeries` 刻意跨頁籤/單位保留，因為圖例選擇只屬於趨勢頁，且 `CHART_SERIES` 的 key 在月/年兩種單位下完全相同。
- 支出頁與收入頁**共用同一份 JSX**，差異全走 derived 變數（`amtColor`/`amtSign`/`totalLabel`/`kindWord`/`periodWord`/`cmpWord`/`deltaColor`）。**刻意不抽成元件內的子元件**——`StatDonut` 有自己的 state 與進場動畫，父層每次 render 產生新的元件型別會讓它整個卸載重掛（跟財務目標表單那個手機鍵盤 bug 同一個根因）。
- 聚合一律走模組層級的 `ffCatTotals(savedFlows, masterData, kind, year, month, group)`：支出/收入 × 月/年 × 大類/子分類 8 種組合同一支函式，`month=null` 代表整年，帶 `group` 就切到該大類底下依實際 `cat` 名稱彙總的第二層。上一期比較不用另寫日期算術，直接把 `offset - 1` 丟給 `ffStatsPeriod`；無資料時不顯示比較，避免出現 `Infinity%`。`ffCatGroupOf` 是「cat → 大類」的 resolver factory（回傳 closure，逐筆掃 flows 時不重複建表）。
- 配色：大類用 `masterData.exp_groups`／`inc_groups` 裡使用者自己設定的 `color`（與設定頁、趨勢頁折線同色，不另設色盤；主檔已刪除但仍有歷史紀錄的大類 fallback 到 `TOKENS.gray3`）；下鑽的子分類用 `ffClassShade` 對母大類顏色做深淺漸層。金額語意：支出用 `TOKENS.red`、增加=紅（壞）；收入用 `TOKENS.incBlue`、增加=綠（好），由 `deltaColor(up)` 一行涵蓋四種情形。
- **總支出的定義**：支出頁圓餅總額 ≡ 趨勢頁 aggregate 的 `a.exp` ≡ StatTable 的「總支出」欄 ≡ SelPopup 的「消費支出＋投資損失」，四處一致（投資損失已納入支出分析，不再像舊版「消費分析」那樣排除）。但趨勢圖那條**「消費支出」虛線刻意是 `exp − investLoss`**，不等於支出頁的總支出——那條線的用途是看消費趨勢，混進賣股虧損會失真。這是設計而非 bug。
- 既有邊界特性：`offset = 0` 是**未過完的當期**，跟完整的上一期比會偏低（月/年皆然），沿用改版前「當月 vs 上整月」的行為。

**財務目標**（`NetWorthSheet` 的「財務目標」頁籤，dashboard.jsx）
- `GOAL_TYPES` 設定陣列驅動類型選單與表單欄位：`networth`（淨資產於指定年月達標）、`account`（單一帳戶餘額達標，無期限）、`passive_income`／`balance`（收入目標／收支結餘，皆為週期性目標）。新增目標先選類型、再依類型顯示對應欄位；類型建立後不可更改，要換類型只能刪除重建。`passive_income` 這個 key 沿用舊資料的 `type` 值沒有改名，只有 UI 上的 label 改叫「收入目標」。
- 週期性目標（`recurring: true` 的兩種）沒有目標年月欄位，改成 `periodUnit: 'month'|'quarter'|'year'` 讓使用者自選，以及 `targetMode: 'amount'|'percent'`：固定金額直接比 `amount`；%成長模式比對象是「上一期實際值」（`percentValue`，例如 4 代表比上一期成長 4%），基準每期自動滾動往前推進，上一期沒資料時顯示「尚無上一期資料可比較」。三種單位的聚合函式（`ffIncomeForYear/Month/Quarter`、`ffYearlyBalance`/`ffMonthlyBalance`/`ffQuarterlyBalance`）透過 `PERIOD_METRIC_GETTERS` 對照表查表呼叫，不用為月/季/年各寫一次判斷；季度用 `Math.ceil(month/3)` 換算成 1-4，歷史圓點的期間序列由 `ffQuarterSeries` 產生（往回抓 9 期，約 2 年）。
- 收入目標（`passive_income` 類型）的追蹤範圍：一個下拉選單（`<select>`），`goal.incomeGroup` 存的是**實際大類名稱**（`masterData.inc_groups` 的 `name`，例如 `被動`、`投資收入`）或 sentinel 值 `'total'`（不分大類，全部收入加總）。選單清單動態產生自 `masterData.inc_groups`（使用者可自訂新增/刪除/改名大類，新增的大類會自動出現在選單裡），最前面固定加一個「總收入」。舊資料沒有 `incomeGroup` 欄位時，`ffIncomeForYear/Month` 的第 4 個參數預設 `'被動'`，維持改版前「固定只算被動收入」的行為。schema v5 之前存的是舊的顯示名（`被動收入`），由 `migrateSchema` 一次性改寫回實際大類名。
- 股票已實現損益曾是第三種週期性目標，後來整個拿掉（`GOAL_TYPES` 移除該項、`ffRealizedPnlForYear/Month` 一併刪除，未保留過渡相容），現在只剩收入目標／收支結餘兩種週期性目標。
- 歷史達成率（週期性目標專屬）：對每個「有資料的過去期間」重新解析當期目標值（%模式一樣滾動跟上一期比），畫成小圓點列＋「近N期達成X次」文字；不需要另外儲存歷史快照，全部即時從 `savedFlows` 現算，向前推算的期數受 `savedFlows` 最早一筆記錄裁剪，避免對沒有資料的期間生出假的「未達成」圓點。
- `account` 類型的進度計算：一般帳戶直接用 `computedAcctGroups` 裡的 `amountTWD`；若選到的是證券戶（比對 `masterData.brokers`），要額外加上 `computedHoldings` 裡 `broker` 相符的持倉市值加總，否則只會看到交割戶現金、少算股票市值。帳戶選單排除信用卡群組（負債，拿來當餘額目標語意不合）。
- 達成慶祝：目標 `done` 時卡片邊框恆常變金色＋掛勳章；`celebrated` 旗標（存在目標紀錄裡）記錄是否已經播過一次彩紙噴發動畫（CSS keyframe `confettiBurst`/`goalGoldGlow`，定義在 index.html），確保只在第一次偵測到達成時播放，重開 App/sheet 不會重播。
- 舊資料相容：更早版本的目標紀錄沒有 `type`/`celebrated` 欄位，`ffGetSavingsGoals()` 讀取時一律補上預設值（`type:'networth'`），不用另外寫遷移程式。
- 排序與新增按鈕位置：渲染前先對每筆目標算好 `computeGoalProgress`，依「未達成的依 `pct` 由高到低、已達成（`done`）固定排最後」排序（純渲染層排序，不落地存檔，`ff_savings_goals` 原始陣列順序不變）；「新增目標」卡片固定在清單最上方，不隨目標數量變動位置。
- `networth` 目標的副標題顯示絕對目標年月：`targetYear`/`targetMonth` 都有填且尚未到期時顯示「西元 X 年 X 月達成目標」，目標年月已過則顯示「已到期」；只填年或月其中一個、或都沒填，就照原樣拼「YYYY 年」「M 月」，都沒填顯示「未設定目標年月」。
- **`GoalEditForm`/`GoalTypePicker` 必須是模組層級元件，不能定義在 `NetWorthSheet` 內部**（已修正過一次真實的手機 bug）：一開始把這兩個表單用 `const GoalEditForm = () => {...}` 寫在 `NetWorthSheet` 函式裡面，結果每次父層 render（打一個字、`setDraftField` 觸發一次 state 更新）都會產生新的函式參考，React 判定成不同元件整個卸載重掛，手機上打第一個字鍵盤就收起來、完全無法輸入。修法是把這兩個元件搬到模組層級、draft 狀態透過 props（`draft`/`setDraftField`）傳入，而不是靠 closure 捕捉一堆 `draftXxx` state。之後在這類 bottom sheet 裡新增子表單元件都要留意這點。
- 週期性目標的「固定金額／%成長」「以月／以季／以年」切換鈕比照 `segBtn`（見上面的圖表圖例章節與頁籤切換）視覺——白底+陰影＝選中、透明+淡字＝未選，跟 App 其他分段選擇器一致，不要另外做純黑底的樣式。

**追蹤（PEG 估值）**（`valuation.js` + `screens/valuation.jsx`）
- 入口在投資頁市值卡下方，開的是全螢幕 overlay（`window.ValuationSheet`），不是新分頁——底部五個主分頁維持不變。
- **清單完全由使用者手動加入（`ff_watchlist`），不自動帶入持股**：想追蹤的標的跟持有的部位是兩件事，
  持股要看的是投資頁的持倉。每一列都有垃圾桶可從追蹤移除。現價一律來自 `livePrices`
  （`/quotes` 的查詢代號已含 watchlist），沒有現價就算不出本益比與 PEG。
- 加入追蹤走頁首的放大鏡按鈕（按了才展開搜尋列並自動聚焦），不常駐佔一張卡的高度。
- 每股盈餘的年/季切換沿用收支統計月/年切換的視覺（`dashboard.jsx` 的 `unitBtn`）：淺灰底容器、
  選中的按鈕白底加陰影。全 App 的單位切換器維持同一種長相。
- **PEG = 本益比 ÷ EPS 成長率(%)**。並列三個成長率，各自看不同的東西：
  - **預估成長率** = 分析師共識的下年度 EPS 成長（Yahoo `earningsTrend`），唯一真正前瞻的一個
  - 歷史成長率 = 近 3 年「年度 EPS」的年化成長率（CAGR）
  - 近期成長率 = 近四季 EPS（TTM）相對前一個 TTM 的年增率，反應最近的動能
  - 三者都可被使用者手動覆寫（存 `ff_valuation_override`，`{cagr, yoy, fwd}`）
- **主數字的優先序：預估 > 歷史 > 近期**，由 `ffValuationRow()` 收斂成 `pegMain` + `pegBasis`，
  排序（`ffComparePeg`）也用同一個值——畫面上那個大數字跟排序依據必須是同一個，否則
  「PEG 由低到高」看起來會像亂排。`pegBasis` 讓畫面標示得出「預估 PEG／歷史 PEG」，
  沒有分析師覆蓋的標的則標「無法人預估」：兩者基準不同，不標的話跨標的比較會被誤讀。
- **預估本益比用「本年度預估 EPS」、成長率用「下年度相對本年度」**，分子的基準年與分母的
  成長區間才對得上。拿 trailing EPS 配預估成長率會系統性高估便宜程度。
- 分析師家數會顯示出來，少於 3 位時額外標「家數少，參考性有限」——一兩個人的看法跟
  三十幾位的共識不是同一回事。點這一行進**法人預估明細頁**（`EstimatesSheet`，疊在估值頁上的
  `zIndex:90` overlay）。
- **明細頁做在 App 內而不是外連 Yahoo**，理由有三：台灣版 Yahoo 根本沒有分析師預估頁（只有
  「估價」，且是 VIP 付費、內容也不是分析師預估）；國際版只有英文；而且 `settings.jsx:2266`
  記錄過 standalone 模式把控制權交給 Safari 會讓 App 視窗被永久降級成瀏覽器分頁。
- 明細頁的重點是**區間而不是平均值**：實測 2330 明年預估平均 138.43、區間卻是 93.3～159.67，
  同一個「預估 PEG 0.78」照最低估值算會變成 1.2。只給平均值等於把不確定性藏起來，所以
  低～高區間、分析師家數、以及「30／90 天前的預估值與近 30 天調升／調降家數」都要攤開。
- **Worker 只回原始 EPS，本益比與 PEG 都在前端算**：現價本來就在前端手上（`livePrices`），而且覆寫要有單一計算點。這也讓 Worker 不必再多抓 TWSE `BWIBBU_ALL` / TPEx 本益比兩份全市場總表。
- 起點 EPS ≤ 0（由虧轉盈）算不出有意義的 CAGR、EPS ≤ 0 沒有本益比、成長率 ≤ 0 沒有 PEG——這些一律回 `null` 顯示「—」，不硬算出天文數字。ETF 與債券 ETF 本來就沒有 EPS，顯示「無 EPS 資料」。
- 展開的個股明細可切「年/季」看每股盈餘：年度圖看長期趨勢，單季圖看轉折。舊快取沒有 `epsQuarters` 時不顯示切換鈕，免得切過去是一片空白。
- 分區門檻 PEG < 1 偏低 / 1～2 合理 / > 2 偏高，文案一律用「偏低／合理／偏高」，不用「買進／賣出」；頁尾註明是估值參考、非投資建議。
- 關注清單的代號會**併進 `/quotes` 的查詢**（`fetchLivePrices`）——沒有現價就算不出本益比。
- 手動覆寫的輸入框 `OverrideInput` 必須留在**模組層級**，理由同下方「子元件不可定義在父元件內」的既有教訓。

**核心計算邏輯**
- `computeAccounts()`：從各帳戶初始餘額出發，依收支/轉帳/股票交易逐筆計算目前餘額；未來日期的紀錄不計入；信用卡類帳戶以「負債」方式顯示餘額。
- `computeHoldings()`：依交易時間排序，用 **FIFO（先進先出）** 配對買賣成本，算出目前持股數量、均價、市值、未實現損益。
- 開發者隱藏個股：`excludeHiddenHoldings()` 以「代號+券商」為 key（跟 `computeHoldings()` 內部分組 key 一致），同一檔股票在不同券商可以各自獨立隱藏，互不影響。
- `sumHoldingsByBroker()`：依券商加總市值/成本/未實現損益（台幣），供投資分頁下方的券商小結卡片使用；缺 `broker` 的持倉歸到「未分類」。

**Worker API 合約（`finfolio-prices`）**
- `GET /quotes?codes=...` → `{date, prices, fx, source}`：台股走 TWSE MIS 即時報價，缺的再補 TWSE/TPEx 收盤價；美股先查 Finnhub（需設定 `FINNHUB_KEY`），沒設定或查不到就 fallback 到 Yahoo Finance（不需金鑰）。
- `GET /stocks` → 台股 + 美股清單。台股來自 TWSE ISIN（Big5 HTML，上市/上櫃/興櫃三份），
  含 ETF、債券 ETF、ETN、TDR、特別股，**但排除權證**——權證有三萬八千多檔，混進來會讓清單
  肥到 2.8MB，手機上等清單載入的空窗期打代號會一筆都搜不到，載進來後搜尋也被權證洗版。
  排除靠的是分類標題，而 ISIN 那頁的標題是 `<B> 股票 <B>`：**兩個開頭標籤、沒有收尾標籤**，
  正則不能要求 `</b>`。
- `GET /fundamentals?codes=...` → `{date, items: {代號: {epsAnnual, epsQuarters, epsTTM, epsTTMPrev, source}}, missing, partial}`：台股走 FinMind `TaiwanStockFinancialStatements`（免金鑰，給的是**單季** EPS）；美股走 SEC EDGAR `companyconcept`（免金鑰，但 User-Agent 必須是「名稱 + 聯絡 email」格式，否則 403）。
  - 台股與美股共用同一支 `aggregateEps()`：單季 EPS → 年度 EPS（只收湊滿四季的年份）+ TTM（四季首尾須相距約九個月，缺季就回 `null`）。
  - 美股的 10-Q 只涵蓋前三個會計季，第四季只出現在 10-K 的全年數字裡，所以季序列固定缺一季，用「全年 − 已知三季」補回來，TTM 才算得出來。
  - `epsQuarters` 是最近 12 季的單季 EPS，供前端圖表切「年/季」；再往前的季資料細到看不出趨勢。
  - `forward: { eps0y, eps1y, analysts, symbol }` 是分析師共識預估，來自 Yahoo `quoteSummary?modules=earningsTrend`。
    台股要試 `.TW`（上市）與 `.TWO`（上櫃）兩個後綴——實測 2330 只有 `.TW` 有、5274 只有 `.TWO` 有，
    猜錯後綴的 404 跟「沒有分析師覆蓋」長得一模一樣。
  - Yahoo 的 quoteSummary 需要 cookie + crumb（非正規管道，隨時可能被關掉），所以整條路徑是
    **best-effort**：拿不到就只是少一個 `forward` 欄位，EPS 主資料完全不受影響。cookie + crumb
    在扇出前取一次共用並快取 6 小時——每個代號各取一次會把 Yahoo 的限流打爆。
  - 回應帶 `forwardSource`（`yahoo` / `unavailable`），用來分辨「Yahoo 沒回」與「這檔沒人覆蓋」：
    兩者在畫面上都是沒有預估，但一個要修、一個是正常的。
  - **EPS 走月快取（`fund/vN`）、預估走日快取（`fwd/vN`），刻意分開**：分析師隨時在調預估，而且
    Yahoo 偶爾抽風；綁在同一份月快取裡的話，一次暫時性失敗會讓這檔整整一個月都沒有預估，
    而且使用者從前端按刷新也救不回來（那只清得掉前端快取）。
  - 財報是季頻資料，逐檔快取一個月。**回傳欄位改變時兩邊的快取版本都要 bump**（Worker 的 `fund/vN` key 與前端的 `FUND_CACHE_V`），否則使用者要等到下個月才看得到新欄位。
- `GET /estimates?code=2330` → `{date, code, symbol, currency, periods, target, ratings, source}`：分析師預估明細，
  同樣走 Yahoo `quoteSummary`（modules 加上 `financialData` 與 `recommendationTrend`）。
  - `periods` 是 `0q`／`+1q`／`0y`／`+1y` 四期的 `{avg, low, high, analysts, yearAgo, growth, trend:{current,d30,d90}, revisions:{up30,down30}}`
  - `target` 是目標價（均值／高／低／家數／評等），`ratings` 是評等分布，兩者拿不到就是 `null`，不影響 `periods`
  - 單一代號用 `?code=`（詳情用途），與 `/quotes`、`/fundamentals` 的 `?codes=` 批次語意刻意不同
  - 快取一天；Yahoo 不可用時不寫快取，避免把「暫時拿不到」記成「今天沒有」
  - 後綴 fallback 與 `/fundamentals` 的預估共用 `yahooQuoteSummary()`，`.TW` → `.TWO` 的邏輯只留一份
- 兩個機密設定都是選用：`FINNHUB_KEY`（美股報價）與 `SEC_CONTACT`（美股 EPS 的聯絡信箱；repo 是公開的所以不寫死在程式碼裡，**沒設定就完全不打 SEC**，美股一律回報查無 EPS）。其餘資料源皆為公開、免金鑰。
- 只傳股票代號，不傳使用者的持倉/金額/身分資訊。

**AI 顧問架構決定（明確記錄，因為涉及資料安全）**
- BYOK 金鑰存在 `ff_ai_keys`（明碼存在 localStorage）。
- API 呼叫**直接從瀏覽器發往 Gemini / Anthropic / OpenAI**，沒有經過任何後端代理（Claude 呼叫甚至帶了 `anthropic-dangerous-direct-browser-access: true` header）。
- 這代表：金鑰外洩風險等同於「使用者裝置被存取」，且金鑰/對話內容會被瀏覽器層級的擴充功能等看到（因為是明碼直接發出）。目前此分頁整個被 `SHOW_ADVISOR=false` 隱藏，尚未對使用者開放。

**加密備份的正確範圍（文案有誇大之嫌，需注意）**
- 加密（AES-256-GCM，金鑰經 PBKDF2 15萬次迭代 + 隨機 salt/IV 導出）**只套用在「匯出的備份檔」上**。
- 平常存在 `localStorage` 的資料**是明碼 JSON，沒有加密**。
- Settings 頁面「🔒 本機加密盾」文案容易讓人誤以為日常資料本身就是加密的，實際上只有「資料不上雲」是對的，「加密」僅限匯出檔案那一刻。之後如果要修文案或加強（例如加密 at-rest），這是已知落差。

**已知但沒接上線的死程式碼（開發不夠嚴謹的具體例子，建議之後清理）**
- `portfolio.jsx` 整個檔案（`ASSET_GROUPS`、`INVEST_HOLDINGS`、`computePortfolio`）——沒有任何畫面真的呼叫，是舊設計留下的骨架。
- `dashboard.jsx` 的 `DashWidget` 元件——定義了但沒被渲染。
- `accounts.jsx` 的 `MonthlyFlowHero` 元件——同上，沒被渲染。
- `accounting.jsx` 的 `VOICE_SCENARIOS`/`FLOW_EXAMPLES`/`STOCK_EXAMPLES`——匯出到 `window` 但沒人讀取。
- `invest.jsx` 的 `INV_TABS`——定義了但實際分頁是動態依券商產生，沒用到這個常數。
- AI 金鑰清單裡的「Ollama 本機」選項——UI 上可選，但沒有對應的 fetch 呼叫，選了也不會動作。

## Testing Decisions

> 本節先前記錄為「完全沒有任何自動化測試」，已過期——`app/` 目前已有 vitest 單元測試（`compute.test.js`／`voice-parse.test.js`／`recurring.test.js`／`schema-migration.test.js`／`settings.backup.test.js`／`last-account.test.js`／`accounting.dropdown.test.js`／`asset-class-color.test.js`）與 Playwright e2e（`e2e/*.spec.js`）。`dashboard.jsx` 的圖表/UI 邏輯目前仍未涵蓋在內，沿用「只測純計算函式」的既有慣例，驗證靠手動操作畫面。

已涵蓋的純計算函式：
- `computeAccounts()` / `computeHoldings()`（compute.js）——輸入輸出明確，已有單元測試
- `parseUtterance()`（voice-parse.js 的語音解析）——規則多、邊界案例多，已有單元測試
- 分類→帳戶記憶的讀寫與失效過濾（`last-account.js`，`last-account.test.js`）——`ffRememberAccount`／`ffLastAccountFor`
- 股票類別配色（`asset-class-color.js`，`asset-class-color.test.js`）——`ffAssetClassColorMap`／`ffClassShade`／`ffMixHex`／`ffAssetClassPalette`
- 估值指標（`valuation.js`，`valuation.test.js`）——`ffEpsCagr`／`ffTtmYoy`／`ffForwardGrowth`／`ffUpside`／`ffPe`／`ffPeg`／`ffPegZone`／`ffValuationRow`／`ffComparePeg`，重點在「算不出來時要回 null」的各種邊界（EPS ≤ 0、起點虧損、成長率 ≤ 0、年數不足）、主數字的優先序（預估 > 歷史 > 近期）與覆寫優先序
- Worker 的 `/fundamentals`（`worker/index.test.js`）——季 EPS 聚合、季序列上限 12 季、缺季不算 TTM、SEC 缺季補算、大小寫攤回、沒設 `SEC_CONTACT` 時不打 SEC、上游失敗仍回 200
- Worker 的 `/estimates`（`worker/index.test.js`）——四期欄位對應（重點驗低～高區間有帶出來）、`.TW` → `.TWO` fallback、缺 `financialData`／`recommendationTrend` 時 `periods` 仍完整、無覆蓋時回 200 空殼、Yahoo 被限流時不寫快取
- Worker 的法人預估路徑——`.TW` → `.TWO` 後綴 fallback、整批只取一次 crumb、缺 `+1y` 不算預估、Yahoo 掛掉不影響 EPS 主資料、**暫時性失敗不會被寫進快取**（測試會連跑「Yahoo 掛掉」與「Yahoo 恢復」兩次）
- 註：Worker 測試的 `ctx.waitUntil` 必須收下 promise 並在 `afterEach` 等它落地，且要清掉 Yahoo 的 cookie/crumb 快取；不做的話背景寫快取會在下一個測試進行中才完成，變成「單獨跑會過、整批跑會紅」的偶發污染
- 下拉面板的展開方向與高度（`accounting.jsx`，`accounting.dropdown.test.js`）——`ffDropdownPlacement`；DOM 量測留在 `DropField` 裡，純幾何計算抽出來測
- 收支統計的分類聚合與期間計算（`dashboard.jsx`，`dashboard.stats.test.js`）——`ffCatTotals`（含「投資損失有被納入支出」與「同名 cat 在收入/支出間不互相污染」兩條回歸防護）、`ffStatsPeriod`（跨年/十年邊界、上一期＝`offset-1`）、`ffGroupColorMap`、`ffCatGroupOf`；`MonthlyStatsSheet` 的 UI 渲染（期間列排版、`pick()` 的 reset 行為、圓餅實際顏色）仍靠手動操作驗證
- 財務目標的聚合/進度計算（`dashboard.jsx`，`dashboard.goals.test.js`）——`ffIncomeForYear/Month`、`ffMonthlyBalance`/`ffYearlyBalance`、`ffResolvePeriodTarget`、`ffAchievementHistory`、`computeGoalProgress`；這些函式雖然定義在一個沒有任何 `export` 的「legacy 全域腳本」檔案裡，但 `dashboard.jsx` 本身仍是可以被 import 的 ES module（檔案開頭有 `import`），所以照樣可以個別加 `export` 讓測試檔案匯入，不用像 `compute.js` 一樣整個抽成獨立檔案。`dashboard.jsx` 其餘的圖表/UI 渲染邏輯仍未涵蓋，沿用手動操作驗證。

完整的測試涵蓋範圍與優先順序，另外開一份 `docs/test.md` 規劃，不在本文件展開。

## Out of Scope

- `project/` 資料夾內的設計原型（`FinFolio.html`、`Design System Editor.html` 等）——非本 spec 範圍，也非實際上線程式碼
- AI 顧問分頁的實際上線與功能開發（目前 `SHOW_ADVISOR=false`，程式碼已存在但尚未對使用者開放）
- 配色微調（收入類別降低彩度）
- 賣股自動分錄的視覺標示
- 初始餘額改用穩定 id（目前用帳戶名稱字串比對，改名會 migration，但機制不夠穩固）
- 上述「已知死程式碼」的實際清理／移除（本文件只記錄現況，不在此規劃清理時程）

## Further Notes

- **README 的待辦清單已經過期，請勿照抄**：README 列的 7 項待辦裡，「加密備份匯出入」與「真實每日收盤市價」其實都已經做完了；「資料版本/migration」已經有基礎機制（`SCHEMA_VERSION=5`）但可能還不完整；只有配色、賣股標示、初始餘額 id、AI 顧問正式上線這幾項是真的還沒做。建議找時間更新 README，避免之後又照著舊清單重工。
- `project/` 資料夾是另存的設計原型，跟 `app/` 的實際程式碼是兩條線，兩邊如果之後要同步視覺設計，需要人工比對，沒有自動化的設計稿轉程式碼流程。
- 本文件依照 `mattpocock/skills` 的 `to-spec` 模板搭配 `/grill-me` 質詢流程產出，撰寫過程中的關鍵決策記錄在對話紀錄中（範圍、AI 顧問處理方式、README 落差的處理方式等）。
