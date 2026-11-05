# 線上練習局 Preview 部署門檻（2026-11-05）

## 目前連線狀態
- GitHub 測試分支：feature/practice-room-staging
- Vercel connector get_git_deployment_context：teams=[]，目前沒有可管理的專案上下文；**不可假裝已部署**。
- 原有 vercel.json 只有 manifest Content-Type 和 sw.js Cache-Control headers；沒有 practice 相關 rewrites。
- NAS POC 6.9 維持原狀；POC 7.0 測試包已備份 Dropbox，但尚未更新 NAS。

## 必須先完成
1. 使用者在 ChatGPT 的 Vercel 連線中授權正確 Vercel 帳號／團隊，或確認專案所屬帳號。
2. 取得實際可管理的 Vercel 專案，確認 Preview 與 Production branch 設定。
3. 檢查 Cloudflare Tunnel 網路拓樸，另設專用練習 upstream；不可直接公開 NAS 8787，也不可改動既有 PocketBase tunnel。
4. 確定 `/practice`、`/practice-assets/*`、`/practice-api/*` 與 POC 7.0 的精確映射；不得覆蓋原本房間路由。
5. 在獨立 Preview 驗證 sessionStorage 上下文格式、PB token、房間會員驗證、撤銷、CORS/Origin、錯誤與斷線情況。
6. 以上完成前，維持 PRACTICE_ROOM_STAGING_ENABLED=false，不合併 main。

## 不能宣稱
- 不可把 283 項本地測試當作真實四人手機測試。
- 不可把 GitHub commit 當作 NAS 已更新或 Vercel 已部署。
