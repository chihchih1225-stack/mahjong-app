# 給非工程人員：安全取得 V186 測試所需 PocketBase 資訊

本指南只收集版本、資料結構、權限規則及伺服器擴充程式。**不需要密碼、Token、正式會員或牌局資料，也不需要資料庫備份。**
不必更改正式 PocketBase；沒有管理權限時，將本文交給目前的網站／伺服器管理者即可。

## 先知道這次缺什麼

2026-11-12 檢查指定 V186 分支及可用本機 Git 歷史的結果：

| 資訊 | 專案現況 |
| --- | --- |
| PocketBase 精確版本號 | 未找到版本鎖定、執行檔版本紀錄或部署設定 |
| Collections schema | 未找到 `pb_schema.json` 或其他結構匯出 |
| API Rules | 未找到可核對的正式規則設定 |
| Hooks／伺服器擴充 | 未找到 `pb_hooks`、`.pb.js`、Go module 或相關擴充原始碼；不能據此判定伺服器沒有 Hooks |
| migrations | 未找到實際 PB migration；`unique-hand.sql` 是尚未部署的審查草案，不代表目前索引 |
| 前端 API 線索 | `index.html` 使用 8 個 Collections，並硬編碼正式 API URL；不是伺服器結構的權威來源 |

前端引用的 Collections：`users`、`rooms`、`room_members`、`room_players`、`game_sessions`、`game_hands`、`room_presence`、`chat_messages`。
若這些 Collections 還引用其他 Collections，也需要提供那些結構。不要只提供 `game_hands`。
舊 README 寫「資料尚未串接雲端」，與目前程式不同，不能作為部署現況證據。

## 操作時的原則

- 使用你自己既有的管理帳號登入；不必把帳密交給 ChatGPT。
- 只查看、複製文字、擷取設定畫面或使用明確標示的「匯出結構」。
- 不按儲存、匯入、刪除、重設、套用 migration、升級或還原。
- 不進入備份下載流程，不匯出 records，不下載 `pb_data`、`data.db`、`auxiliary.db` 或完整伺服器封裝。
- 截圖只保留設定區，裁去瀏覽器網址列中的登入參數、帳號資訊及資料列。
- 不確定按鈕是否會改資料或包含正式內容時，停止該步，把按鈕名稱告訴管理者確認。

## 第一步：取得版本

1. 開啟你平常使用的 PocketBase 管理後台。
2. 查看側欄底部或「設定／關於」等版本資訊位置。不同版本位置可能不同。
3. 抄下完整版本號，例如 `0.x.y`，並註明是在後台看到的；不要把範例當實際版本。
4. 若畫面沒有版本，請伺服器管理者提供目前執行中的 PocketBase 版本、是否自訂 Go build，以及部署所用 image tag/digest（若有）。不必更換執行檔或重啟服務。

只提供版本文字即可，不需要主機登入帳密、環境變數或整份啟動紀錄。

## 第二步：取得 Collections 結構

### 優先方式：由管理者整理「僅結構」匯出

1. 若後台有「Settings／設定 → Export collections／匯出 Collections」或相似功能，請先確認是結構匯出，**不是資料列、備份或整個 instance 匯出**。
2. 將下載的 JSON 先留在自己電腦，不直接上傳公開 GitHub。
3. 請管理者檢查匯出內容，只保留 collection 名稱／ID／類型、fields、relations、indexes、API Rules 及必要的不含機密的 auth 設定。
4. 某些版本的 collection 匯出可能包含 auth/OAuth 或其他安全設定。移除密碼、token／簽章 secret、OAuth client secret、API key、SMTP/S3 憑證、真實 email、正式網域以外的私人連線資訊等機密值，改以 `[REDACTED]` 標示。
   **不要刪除一般結構欄位**，例如 `tokenKey` 的機密值應遮蔽，但 token 有效期間等非機密規則可保留。
5. 保留 collection ID 及 relation 目標 ID，方便核對關係；它們不是登入憑證。
6. 將整理後檔案命名為 `collections-schema-sanitized.json`，註明版本與取得日期。這是供審查的結構資料，不能直接當可匯入設定；遮蔽的測試機密要在隔離環境重新產生。

若無法確認匯出是否含機密，使用下方逐頁截圖方式，不要傳未審查的原始 JSON。

### 替代方式：只截取設定畫面

對上述 8 個 Collections 及其 relation 目標逐一操作：

1. 開啟該 Collection 的「設定／編輯結構」畫面，不截取 Records 資料列表。
2. 提供 collection 名稱、ID、類型（Base／Auth／View）。View collection 另提供去除敏感內容後的查詢定義。
3. 提供每個欄位名稱、型別、是否必填、唯一性及限制（例如整數、最小／最大值、選項）。
4. Relation 欄位需提供連到哪個 Collection、單選／多選、最少／最多選取與刪除關聯行為。
5. JSON、日期、數值欄位需包含型別及限制；Indexes 頁面需提供目前的索引定義。
6. 如果要按「儲存」才能拿到資訊，不要儲存；請管理者協助只讀檢視。完成後關閉設定視窗。

## 第三步：取得 API Rules

1. 開啟各 Collection 的「API Rules／權限規則」。
2. 複製或截圖 List、View、Create、Update、Delete 的完整規則與鎖定狀態。
3. Auth collection（例如 users）另提供該版本顯示的 Manage、Auth 等規則與非機密登入限制；不同版本可能沒有全部項目，註明「此版本無此項」即可。
4. **保留三種差別**：鎖住／僅管理者、空白／公開、以及有條件表達式。不能把鎖住與空白都寫成「沒有規則」。JSON 的 `null` 與 `""` 不可混成相同值。
5. 不點選解鎖、不修改條件、不按儲存。不需要提供任何會員 records。

也可用下列格式逐個 Collection 填寫：

```text
Collection 名稱：
List：鎖住／空白／完整條件
View：鎖住／空白／完整條件
Create：鎖住／空白／完整條件
Update：鎖住／空白／完整條件
Delete：鎖住／空白／完整條件
其他 Auth／Manage 規則（若有）：
```

## 第四步：確認 Hooks 與自訂伺服器程式

通常無法只靠 Collections 匯出取得 Hooks，這一步請伺服器管理者處理：

1. 確認實際啟動參數有沒有自訂 hooks 路徑，並檢查預設 `pb_hooks` 或指定路徑。
2. 提供相關 `.pb.js` 檔與其依賴程式；先檢查、遮蔽硬編碼密碼、金鑰、token、私人 webhook URL 或正式個資。
3. 若使用自訂 Go 執行檔，提供註冊的 hooks／routes／middleware 原始碼及依賴版本；不需要整個伺服器或執行檔。
4. 既有 migration 若是理解目前結構所必需，只提供去除正式資料與機密後的相關定義；本次不建立或執行正式 migration。
5. 若沒有 Hooks，請管理者明確回覆「已檢查實際啟動路徑，沒有 JS Hooks／自訂 Go 擴充」。沒找到檔案但不知道實際部署方式時，填「尚未確認」，不要填「沒有」。

## 可以交付的資料清單

- `pocketbase-version.txt`：精確版本、是否自訂 build、取得日期。
- `collections-schema-sanitized.json`，或上述純設定截圖；包含 relation 與 indexes。
- 各 Collection 的完整 API Rules（若 schema 已完整保留則不需重複）。
- 經審查且移除機密的 Hooks／相關自訂伺服器原始碼，或管理者確認沒有的文字。
- 一小段說明：還有哪些設定無法確認。不要為了補齊資料而開放正式權限。

請只提供以上整理後資料。不要提供帳密、登入連結、Authorization header、Token、瀏覽器 HAR、
原始 `.env`、正式會員／聊天／牌局資料、資料庫備份或未經審查的伺服器檔案。帳密不必透過聊天傳送。

## 收到資料後的下一步

1. 核對版本、schema、rules、hooks 完整性與機密遮蔽；不連線修改正式服務。
2. 選用相同精確版本，在獨立資料目錄／測試網域啟動 PB，建立新的測試憑證。
3. 只使用虛構 fixtures；外部整合停用或替換為測試服務。
4. 接線專用測試前端並限制 endpoint/origin，確認不能寫入正式 API。
5. 在隔離 instance 實作及驗證唯一性、原子交易及安全補送；正式 migration 仍不建立。
6. 跑跨裝置競爭、斷線／重啟、權限及既有功能整合驗證，再提出驗收報告。

完整工程步驟見 [隔離環境建置說明](isolated-environment-setup.md)。在驗證與後續授權完成前，
V185 不變，V186 自動計分旗標持續 false，不合併 main、不正式發布。
