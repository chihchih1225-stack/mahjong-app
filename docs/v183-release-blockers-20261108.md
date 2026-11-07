# V183 發布前阻擋項目（2026-11-08）
狀態：靜態程式檢查；尚未執行瀏覽器整合測試，不可視為驗收通過。

## 已查證
- `continueNextMatch()` 會保留 balances 裡的離場者，並把新玩家設為 0。
- `showSeriesSettlement()` 會從 balances 的所有玩家建立總結算並核對總額。
- `v183MidgameEntry()` 驗證四筆整數合計 0、局數 1～16、連莊 0～99；接手前不生成 hands。
- `activeGameSnapshot()` 和 `resumeActiveGame()` 可保存及恢復 balances、sessionOpeningBalances、seriesId 等欄位。

## 阻擋正式發布的風險
1. `continueNextMatch()` 在換人後呼叫 `clearActiveGame()`，直到下一將選好莊家並 `confirmDealer()` 才重新持久化。若此時 iPhone PWA 被關閉，累計金額與已離場者可能無法恢復。
2. 換人流程在清除本機紀錄前，沒有確保上一將的雲端保存已成功，必須驗證失敗重試及避免重複寫入。
3. 中途接手 opening 金額與 session nets、歷史統計及跨將累計的關係尚未端到端驗證。
4. PocketBase 的資料結構、正式部署版本、Dropbox 備份尚未核實。

## 必須通過的測試
- 4→5→6 人輪換、離場再回桌、重新抽位、各將獨立歷史。
- 換人提示按取消、輸入錯誤、選位前關閉 PWA、下一將進行中關閉 PWA。
- 中途接手 +500/-200/-100/-200，東南西北各局、連莊、後續金額及勝率。
- 每將完成與今晚總結算區隔，所有參與者列示、收付總和 0。
- PocketBase 保存失敗、網路斷線與重試、iPhone 更新提示。
- 舊牌局、直播、投影、提款機、連打歷史與正式資料不回歸。

發布原則：先修復阻擋項目並在隔離環境測試，取得正式發布確認後才更新 main / Vercel，並驗證 Dropbox 程式及資料備份。
