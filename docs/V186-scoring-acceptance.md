# V186 計分改版驗收清單（基於 V185-1）
母版：39f6a568034b1013ba9c828d40ebccd0aaae99e3
開發分支：feature/v186-scoring-from-v185-1-20261113

## 已查證的程式現況
- saveHand() 先在本機計分、加入 hands，接著以非同步方式呼叫 syncRemoteConfirmedHand()。
- syncRemoteConfirmedHand() 以 POST 新增 game_hands，再 PATCH game_sessions。
- POST 成功但 PATCH 失敗時，回傳 session_snapshot_failed；沒有具備伺服器唯一鍵的冪等保護。
- canAutoRecordCurrentHand() 目前只檢查條件，未啟用自動觸發。
- 手機及投影頁仍有「記錄這一把」按鈕。

## 發布前必須完成
- [ ] 設計遠端每把唯一識別（session + hand_number）與後端唯一性約束，先確認既有資料是否重複。
- [ ] 同步失敗後重試時不能建立第二筆相同的 game_hands。
- [ ] 多次快速按下計分按鈕只能記錄一把。
- [ ] 胡牌：胡牌 → A 胡者 → B 放槍 → 台數，操作完成自動記錄；允許先選台數時應有明確的防誤送規則。
- [ ] 自摸：選自摸者 → 台數 → 自摸，最後點自摸才提交；不能在未完成選擇前提交。
- [ ] 特殊牌型、流局、詐胡與復原上一把須單獨驗收。
- [ ] 四組底台、連莊、北4結束、換人跨將、直播投影、歷史紀錄、XP 不回歸。
- [ ] 在隔離測試資料庫做端到端測試；不得在正式 PocketBase 建立測試牌局。
- [ ] Vercel Preview 測試、使用者驗收後才能發布正式版。
- [ ] 確認 V185-1 後續正式部署的變動，合併必要修正以免覆蓋。
- [ ] 備份 GitHub Commit、Dropbox 發布紀錄及必要程式檔；驗證備份可讀。

## 狀態
目前未啟用自動提交；未驗證遠端冪等性；未完成預覽部署與正式發布。
