# 手癢就來摸｜同源連線設計（僅測試分支）

## 使用者路徑
玩家從原本誰與爭鋒房間點「手癢了，開摸！」，仍留在**原本 PWA 的網域**，進入 `/practice`。不提供第二套登入、App 或首頁。

## 路由對照（尚未部署）
| PWA 網址路徑 | 轉送到 NAS 練習服務 |
| --- | --- |
| GET /practice | GET /practice |
| GET /mobile.js | GET /mobile.js |
| GET /mobile-room-bridge.mjs | GET /mobile-room-bridge.mjs |
| GET /practice-client.mjs | GET /practice-client.mjs |
| GET /mobile-auth-guard.mjs | GET /mobile-auth-guard.mjs |
| POST /rooms/:roomId/join 等 | POST /rooms/:roomId/join 等 |

注意：`/rooms/*` 可能與既有 PWA 路由衝突，**正式導入前應先在後端新增 `/practice-api/*` 專用前綴並測試**，不可直接套用全域轉送。靜態資源也應移到 `/practice-assets/*`，避免污染既有根路徑。

## 安全與部署阻擋條件
1. 現有 NAS 只綁定 `127.0.0.1:8787`；Cloudflare Tunnel 若在不同容器，**不能假定容器可透過 127.0.0.1 存取 NAS 主機**。先驗證 NAS 本機 / Docker 網路可達性，不能直接公開 8787。
2. `PRACTICE_PUBLIC_ORIGIN` 必須與**瀏覽器實際 Origin**一致；若由正式 PWA 同源代理，不能沿用測試專用網域的 Origin 設定。
3. 原型要求同源 `sessionStorage` 傳遞房間與 token；任何跨網域重新導向都會破壞這個流程。不得將 token 放進 URL。
4. `pb-room-membership.mjs` 透過會員 Bearer token 查詢 `room_members`，要用真實 PB 權限規則驗證「非成員必拒絕」，而非只信任前端按鈕。
5. 未經正式會員驗證、跨房間隔離、四人實測與重連測試，不得啟用測試分支的 `PRACTICE_ROOM_STAGING_ENABLED`，不得合併 main。
6. 練習牌局資料保持獨立 Docker volume；不得寫入正式 games / records / stake / place。

## 已做的實際驗證
- POC 6.9 原始碼的 `multi-room-http.test.mjs` 與 `pb-practice-server.test.mjs` 共 9 項通過（2026-11-05，本地 Node）。
- 這些測試**不代表**已通過真實 PB 或四支手機端對端測試。

## 下一個程式任務
在測試分支做**專用前綴路由**與同源代理設定，配合單獨 preview 部署；先驗證 Origin、會員身分、房間資格與實際網路可達性，再啟用房間按鈕。
