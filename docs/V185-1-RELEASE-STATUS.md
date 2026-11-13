# 誰與爭鋒 V185-1｜單一版本驗收紀錄

更新：2026-11-13

## 唯一版本
- 正式可用版本：V185，commit `cd378d6815f138039eb88f17603c89ef38224c38`。不得在未核准前更動。
- 唯一待驗收版本：V185-1，branch `release/v185-1-candidate`。GitHub 草稿 PR #16，禁止直接合併。
- 舊草稿 PR #15 已關閉，未合併。
- 另行開發的線上練習 POC、V186 計分冪等性，不納入 V185-1。

## 已確認
- GitHub Actions PR #16，run 43352780593，job 131647582786：兩項 Node 測試成功，包含 4 種下一將／換人成功與儲存失敗模擬。
- Vercel Preview `77cfed3c` 建置 READY；建置完成不等於實機驗收。

## 發布阻擋事項
1. 記錄者選擇、胡牌／自摸／台數／連莊完整操作測試未完成。
2. iPhone LIVE／橫向投影畫面尚未實機驗收。
3. `index.html` 使用固定 `PB_BASE_URL`；Preview 可能連到正式 PocketBase，未隔離前禁止在 Preview 建立、修改、結算或刪除牌局。
4. Dropbox 尚未驗證有完整 V185 正式程式碼、V185-1 候選程式碼及可還原備份。
5. GitHub `main` 與正式部署 commit 不一致；不能直接將候選分支合併 `main`。
6. 正式發布需要使用者明確核准。

## 版本清理規則
- 先確保正式版與候選版可還原，才清理分支與舊部署。
- 保留正式版、單一候選版、獨立還原點；其餘分支先逐一確認是否有未合併功能，不盲刪。
- 每次修改後重新執行測試，正式發布後驗證正式站、確認 Dropbox 備份完整。

## 2026-11-13 追加查核
- GitHub 程式碼還原點已建立：`backup/v185-production-verified-20261113`，固定於正式版 `cd378d6`。
- GitHub 比較顯示 V185-1 候選版相對此還原點 ahead 13、behind 0；僅變動 `index.html`、兩個測試、CI workflow 及本紀錄。
- 預覽站 `pbRequest` 非 GET/HEAD/OPTIONS 請求已加阻擋，CI run `43353209302` 通過；此保護不等同完整資料庫隔離。
- Vercel 最新預覽建置 `7ccea2f` READY，尚未完成實機功能驗收。
- Dropbox 主程式資料夾僅查到 `mahjong_V185_production_manifest_2026-11-12.txt`，**完整程式備份尚未驗證**。
- GitHub 還原點是程式碼保護，不等同 PocketBase 資料庫備份；正式發布仍暫停。
