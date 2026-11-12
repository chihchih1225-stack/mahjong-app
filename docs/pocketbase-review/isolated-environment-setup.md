# V186 隔離測試環境設定與建立步驟

狀態：規劃文件，尚未建立 PocketBase instance。本次選擇方案 1，只執行本機模擬。
`V186_AUTO_SCORE_ENABLED=false` 維持；本文件不授權正式資料庫、正式 schema 或正式部署變更。

## 需要準備的設定

| 項目 | 要求 |
| --- | --- |
| PocketBase 版本 | 提供正式使用版本號，選用相同精確版本；不得猜測或直接用 latest。記錄下載來源及官方 checksum。 |
| Schema 與 rules | 由管理者提供經審查的 collection schema、API rules、既有 hooks/migrations；只含結構，不含正式 records、帳密、token 或個資。 |
| 獨立服務 | 本機 `127.0.0.1:8090` 或專用測試網域；獨立 process/container、磁碟、資料目錄、管理員及密鑰。 |
| 資料路徑 | 例如 `work/v186-pocketbase/pb_data`；不得掛載正式資料目錄、備份、正式 volume 或遠端檔案系統。 |
| 前端來源 | 專用 localhost port 或測試預覽來源；限定精確 origin。不得更換正式前端設定。 |
| 測試身分 | 兩個記錄者、一般房員、非房員、觀看者及四名虛構玩家；只在隔離 instance 建立。 |
| 憑證 | 新建測試管理員與應用使用者，存環境的機密設定；不得放前端、Git 或聊天。 |
| 外部整合 | SMTP、OAuth、S3、webhooks、排程、備份目的地與 production analytics 全部停用或改測試替身。 |
| 存取限制 | 本機綁 loopback；共享測試環境使用 TLS、限制可存取者及測試來源。不得公開管理介面或取消 API rules。 |
| 可重建 fixtures | 固定的房間、session、players 與測試帳號產生方式；不得複製正式牌局或 auth 記錄。 |
| 產物 | 保存版本、schema checksum、fixture 版本、測試結果；忽略 pb_data、tokens、瀏覽器 auth state、.env。 |

需要的結構至少涵蓋應用實際使用的 `users`、`rooms`、`room_members`、`room_players`、
`game_sessions`、`game_hands` 及其 relation。欄位名之外還需 relation 單／多選、型別、required、
選項、JSON／日期欄位正規化與各 collection 的 list/view/create/update/delete rules。
其他登入、歷史、直播相關 collections 以提供的實際 schema 和程式查核結果為準，不能自行補成寬鬆通用結構。

## 建立順序

1. **盤點，尚不連線正式服務**：收集管理者提供的版本與去識別 schema/rules/hooks，檢查是否含密鑰或正式資料。
   若需要讀取正式管理 API，另列唯讀方案與所需權限；本次不執行。
2. **建立隔離 instance**：在上述全新目錄安裝已核對版本的 PB。檢查工作目錄、掛載與目的地，
   先綁 `127.0.0.1`。命令與 migration API 依該精確版本文件確認後執行。
   啟動時不可沿用正式 `pb_data`、自動執行未審查 hooks 或載入正式憑證。
3. **建立測試結構**：在隔離 instance 匯入結構並逐一核對 rules；建立獨立管理員。
   使用虛構 fixtures 建立四名玩家、房間、會員關係與 active session。
4. **新增伺服器保護（只在隔離服務）**：將 `unique-hand.sql` 草案轉成版本相容的 collection migration，
   再實作 README 所述 hand/session 原子交易入口與直接寫入限制。
   唯一索引本身不是交易入口，不能據此開啟自動計分。
5. **準備隔離前端**：目前 `PB_BASE_URL` 是 HTML 內硬編碼，且 `v186MayWritePocketBase()` 只允許既有正式網域。
   **新增環境變數不會自動生效**。先在專用測試組建完成可審查的 endpoint 接線：
   精確固定測試 API origin 與前端 origin 配對；啟動時遇正式 API 或未知 origin 必須拒絕測試寫入。
   不可用 query string/localStorage 任意覆寫 endpoint，也不可刪除現有預覽寫入防護。
   測試帳號登入測試 instance，前端不得帶入正式 token；旗標仍為 false。
6. **先驗證隔離**：攔截並記錄網路目的地，確認所有資料 API 只到測試 instance。
   對正式 API origin 的 POST/PATCH/DELETE 使用攔截器直接阻斷，不能真的送出探測。
   先跑未登入、無房間權限與觀看者拒寫測試，確認管理憑證未送到瀏覽器。
7. **執行整合矩陣**：見下表。每個案例核對 hand 數、session 進度、四人金額與金流矩陣。
   成功後可刪除／重建的只能是專用測試目錄，fixture 重建工具也必須拒絕正式與未知 endpoint。
8. **報告與驗收**：記錄失敗及不可證明事項。提交 migration、權限差異、回復方案與測試證據供審查。
   正式 schema 變更、正式部署與旗標啟用各自需後續授權；不得由測試成功自動執行。

## PocketBase 整合驗證矩陣（尚未執行）

| 案例 | 必須證明 |
| --- | --- |
| 同 ID 相同內容重送 | 只一筆 hand，回傳一致收據，不二次計入金額 |
| 同 ID 不同金額 | 拒絕衝突，不改原記錄及 session |
| 不同 ID 同 session/hand_number，兩客戶端競爭 | 只一個交易成功；另一個衝突，不覆寫進度 |
| POST 已提交但回應遺失 | 原 ID 查回，重啟重試不新增、不漏算 |
| hand/session 交易中斷、PB 重啟 | 全部提交或全部回復，不出現半套狀態 |
| session 已前進／已結案 | 舊佇列不得回寫舊快照，保留未確認資料供核對 |
| 離線、重新連線、瀏覽器重啟 | 本機原始 ID/內容保留；補送後一致，不能用新 ID 重送 |
| 401/403、過期 token、換帳號 | 不越權；未確認資料不被當成功或清除 |
| undo、結案、換人、心跳與提交競爭 | 版本檢查有效，直播／歷史進度不倒退 |
| 胡牌、自摸、0 台、連莊、16 局、中途登錄 | 金額守恆，莊家與結束規則正確，帶入金額只計一次 |
| 直播、投影、歷史、結算、房間權限 | 讀取結果與交易收據一致，無未授權操作 |

## 目前可直接執行的無 PB 測試

```sh
npm ci --ignore-scripts
npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Chromium 路徑需依本機設定；未安裝瀏覽器時可先使用固定 Playwright 的 `npx playwright install chromium`。
Node 測試使用 stub／記憶體 SQLite；瀏覽器測試封鎖全部外部請求，使用獨立 context/storage。
它們不驗證 PocketBase schema、API rules、跨裝置原子性或正式環境。
