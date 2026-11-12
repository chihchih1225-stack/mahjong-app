# V186 PocketBase 變更審查方案（未部署）

這個目錄不是 `pb_migrations`，不會由 PocketBase 或 CI 自動套用。
正式 PocketBase **未連線寫入、未修改 schema、未刪除任何資料**。

## 唯一性

固定 record ID 只保護同一客戶端同一 ID 的重送。兩裝置不同 ID 仍可能建立同一 session 的同一把。
`unique-hand.sql` 是 `(session, hand_number)` 唯一索引草案；已用記憶體 SQLite 驗證重複拒絕與既有重複保留。
這不是 PocketBase migration 或整合測試。須取得實際 PB 版本、collection 匯出與 API rules 後，
以該版本支援的 migration API 將索引註冊到 collection.indexes，先部署獨立測試 instance。

正式套用前只讀查詢：

```sql
SELECT session, hand_number, COUNT(*) AS copies
FROM game_hands WHERE session != '' AND hand_number > 0
GROUP BY session, hand_number HAVING COUNT(*) > 1;
```

若有重複，停止並列出人工核對方案；不得自動清除、合併或改號。
索引建立前須檢查 relation 是否單選、hand_number 是否整數且正值，以及現有資料是否符合約束。

## 索引不足以解決的原子性

現有 REST 先 POST hand 再 PATCH session，兩個操作不是交易。唯一索引不能防止舊 session 快照覆寫新快照。
需要獨立的、已驗證的伺服器交易入口，並在伺服器封鎖繞過入口的詳細計分直接寫入。
建議入口契約（尚未實作）：

1. 驗證登入身分、房間權限、session recorder、active 狀態與 schema。
2. 在同一交易內讀取 session 進度與版本，檢查 expected hand_number/version。
3. 相同 record ID + 相同完整內容回傳原收據；相同 ID 不同內容回傳 409。
4. 不同 ID、相同 `(session, hand_number)` 回傳 409，不能以新 ID 重試。
5. 伺服器核算付款、莊家及下一把狀態；插入 hand、更新 session、版本遞增與收據一起提交或一起回復。
6. 還原上一把需獨立版本化交易；現有 undo 不能只還原本機後重用場次編號。
7. 心跳不可更新計分進度；換人、結案、直播、final-only 需明確的相容權限與交易路徑。

在隔離 PB 驗證兩裝置競爭、POST 回應遺失、transaction 中斷、重啟重送、401/403/409、
undo/結案/換人競爭後，才可接上前端的自動補送。正式 schema 變更仍須使用者另行授權。
目前不得開啟自動計分或宣稱伺服器原子性完成。

## 第二階段資料準備

目前 Repository 沒有可確認的 PB 版本、schema/rules 匯出或 Hooks 實作；前端使用線索不代表實際設定。
請依 [非工程人員安全資訊取得指南](safe-information-collection-guide.md) 收集去除機密後的必要資訊，
再依 [隔離環境建置說明](isolated-environment-setup.md) 建立全新測試 instance。
