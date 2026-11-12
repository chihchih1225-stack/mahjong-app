# V186 自動計分安全驗收規格（開發分支）

正式基準：V185 / cd378d6815f138039eb88f17603c89ef38224c38
範圍：只修改計分互動與必要的寫入防重機制；不得修改正式 PocketBase 資料。

## 已確認現況
- canAutoRecordCurrentHand() 已存在，但沒有啟動自動提交。
- saveHand() 使用 handSaveInProgress 防止同一執行期間重入。
- saveHand() 先更新本機 balances、hands，再以 void syncRemoteConfirmedHand() 非同步 POST game_hands。
- 遠端失敗只回傳失敗狀態，尚未確認持久重試佇列與伺服器冪等約束。
- 台數使用 addTai(-1/+1/+2/+3) 與 resetTai()，必須允許連續調整，不可第一下即自動提交。

## 待實作（不得直接發布）
1. 胡牌：選胡者、放槍者、明確選台數；自摸：選自摸者、明確選台數。操作順序可變。
2. 台數多次點選需有可預期的提交界線；避免第一下 +1 就提交。0 台必須明確選擇。
3. 一旦提交開始，鎖定同一把的選擇並提供明確回饋；防雙擊及跨裝置重複。
4. 每把生成固定、持久的唯一鍵；遠端使用可驗證的唯一限制或原子去重；避免重試多寫。
5. 本機與遠端失敗狀態可恢復；網路中斷、重新開啟 App 不漏不重。
6. 流局、詐胡另行保留既有流程，不能因胡牌自動記錄而意外提交。
7. 完成後自動清空玩家與台數選擇，並維持莊家／連莊／北四結束規則。
8. 投影頁與手機頁應使用同一提交保護。

## 驗收案例
- 胡牌 0 台、1 台、連續 +1 +2 +3；自摸同樣案例。
- 先選台數／先選玩家；選錯玩家取消重選。
- 重複快速點擊、兩裝置同時操作、網路中斷後重試、重啟恢復。
- 本機 hands、PocketBase game_hands、session hand_number、四人金額相符。
- 16 把與連莊、連打換人、投影同步、復原上一把。
- 只使用隔離測試資料；正式發布必須使用者驗收核准。

## 實作決策與放行條件（2026-11-12）
- 版本基準必須是正式 V185 commit cd378d6815f138039eb88f17603c89ef38224c38；現有 main 落後，與 V186 比較多出 77 commits，不可直接合併 PR #12。
- 每把使用穩定 client_hand_id，且正式 PocketBase 必須先確認欄位、唯一索引、API 權限及資料備份可還原；禁止未經授權更動正式 schema。
- 補送流程須持久化 pending/confirmed/unknown 狀態；逾時或網路錯誤先依 client_hand_id 查詢，不得盲目重新 POST。
- game_sessions 的 hand_number 與 seat_map 更新必須防止舊請求覆蓋新狀態；同時考慮雙裝置寫入。
- 自動提交採可取消的台數調整等待期，但 1200ms 只是開發佔位值，未完成實際操作測試前不得視為產品定案。
- 需要先跑 GitHub CI、隔離 PocketBase 故障注入測試、預覽驗收；未通過則功能旗標保持 false。
- PR #12 是草稿，不得合併；GitHub Issue #11 追蹤伺服器端資料一致性。

狀態：已提交停用中的排程接線、遠端 session 恢復修正及測試程式；尚未確認 CI 通過，尚未完成冪等性與斷線補送，尚未部署。

## 預覽環境注意事項（2026-11-12）
- Vercel 自動建立預覽部署 dpl_6vQBCMBSy5UCifrRefJfy8564s3H，狀態 READY，Git commit de225c8ef793a6a5248e2088cb3ab9463d239d8f；READY 只代表部署成功。
- 尚未核對預覽環境 PocketBase 指向與資料隔離；在確認前，禁止以預覽網址新增、計分、刪除或測試真實牌局。
- 自動計分功能旗標仍為 false，預覽版不應作為 V186 驗收通過證據。

## 本次續作驗證（2026-11-12，取代上方過時進度敘述）

來源：指定分支最新 `875a298c93f9e90dd9043e8f779ca22307d4b84e`、PR #12、commit log 與現有測試；未使用 ZIP。
基線測試 23 項：13 通過、10 失敗（包含 async/default-param 函式截取錯誤、缺少常數與過時斷言）。

已修正：
- 以 Acorn 語法樹抽取完整函式，固定測試依賴並接入 CI Chromium 測試。
- 遠端成功與逾時都依原 ID 讀回，核對所有提交欄位、金額與記錄者。
- 待同步 JSON 損壞時停止同步且保留原始資料，禁止以空佇列覆寫。
- 本頁遠端操作依序執行；凍結 session、房間、記錄者、牌局、座位及金額快照。
- 較早未確認牌局阻擋後續快照寫入，session PATCH 後讀回確認才能清除 pending。
- 發送網路請求前保存本機牌局與快照；本機保存失敗時回復金額、莊家、手數與金流帳本。
- 負台數調整歸零；提交前檢查玩家及台數有效性；心跳不再覆寫 hand_number。
- 預覽顯示開發／唯讀／自動計分停用標示；旗標仍為 false。
- 索引方案與交易入口需求見 [PocketBase 審查方案](pocketbase-review/README.md)。SQL 僅記憶體 SQLite 契約驗證，未部署到 PB。

執行方法：`npm ci --ignore-scripts`、`npm test`、`npx playwright install chromium`、`npm run test:e2e`。
本環境已安裝 Chromium，可用 `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`。
瀏覽器測試封鎖所有外部請求，使用獨立瀏覽器 storage；沒有正式 PB 寫入測試。

### 尚未通過的放行條件

- 未提供隔離 PB 的版本、schema、API rules 與測試帳號；尚未完成真正 PB 整合與故障測試。
- 唯一索引草案未部署；多裝置競爭與 hand/session 原子交易尚未完成。
- 佇列序列化只保護本頁，不能宣稱跨 tab／跨裝置安全。
- 斷線重啟後保留資料；尚未接上可安全自動重送的 UI／online handler。唯讀 audit 函式本身仍未接入恢復 UI。
- 遠端 session 尚未建立時記錄的牌局可能沒有遠端 ID，仍需受控恢復設計。
- undo 目前只還原本機，遠端撤銷、重用 hand_number、結案及換人競爭需交易入口處理。
- 同步不成功仍可能進入既有結算流程，不能把本機金額視為已驗證遠端金額。
- localStorage 本身無跨 tab 交易保證；清除網站資料或裝置儲存損毀不在已證明的保留範圍。
- 登入、房間、歷史、直播的正式遠端流程未做已登入整合驗收；不可宣稱全面無回歸。
- `main` 與正式 V185 基準差異仍存在；PR #12 必須保持草稿，禁止直接合併。

結論：可供 ChatGPT 檢查程式與唯讀預覽；**尚未達到 V186 自動計分完整使用者驗收條件**。

### CI 相容性修正
首次續作推送的 GitHub CI 發現 ubuntu-latest 已為 Ubuntu 26.04，與固定 Playwright 1.56.1 不相容。
已將 runner 固定為 Playwright 支援的 Ubuntu 24.04；保留首次失敗紀錄，後續以新 commit 的 CI 結果為準。
本機最後驗證：40 項 Node/SQLite 契約測試與 7 項 Chromium 瀏覽器測試通過，0 失敗；17 段 inline JavaScript 語法通過。
