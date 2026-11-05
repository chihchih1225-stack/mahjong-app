# 手癢就來摸｜房間內附加功能（測試分支）
> 本檔只存在 feature/practice-room-staging；不可視為正式版已完成整合。

## 不可改動
- main / V170 正式網站、PocketBase 正式戰績、徽章與計分、現有 Cloudflare Tunnel。
- 不建立另一套會員、獨立 App 或首頁入口。
- 練習成績與正式戰績完全隔離。

## 已確認
- NAS staging 容器監聽 8787；容器內 HTTP / 回傳 404，表示服務有回應，不表示遊戲已通過實測。
- POC 6.9 有 /practice 頁面及房間操作路由；原型 launcher 使用同源 /practice，尚未接入正式 PWA。
- NAS 映射 127.0.0.1:8787:8787，尚無對外 HTTPS 可用入口。
- 原型 launcher 在通過前端房間檢查後把 token 寫入 sessionStorage；後端必須獨立驗證每次請求，不能只信任前端。

## 下一步實作順序
1. 核對 main 最新房間詳情頁 DOM、登入 token 來源、房間權限檢查與導航生命週期。
2. 在此分支新增「手癢了，開摸！」按鈕，先以 feature flag 隱藏，禁止預設開啟。
3. 決定 /practice 同源代理與 NAS 後端 API 的路由；完成 Cloudflare HTTPS 與服務端授權驗證後才允許對外測試。
4. 測試未登入、非房間成員、權限撤銷、切換帳號、同房四人、跨房間隔離、重連與手機瀏覽器。
5. 通過測試後另行審查、合併與部署；不可自動修改 main。

## 尚未驗證
- 真實 PocketBase 成員資格與撤銷。
- 四支真實手機的完整牌局。
- V170 正式房間入口與同源路由整合。
