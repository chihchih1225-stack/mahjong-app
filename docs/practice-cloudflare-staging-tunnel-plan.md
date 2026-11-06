# 手癢就來摸｜Cloudflare 練習局測試連線實施方案

> 狀態：設計完成，尚未變更 Cloudflare、NAS、Vercel 或正式 API。2026-11-06 使用者已同意以不修改既有正式 API 路由為前提，規劃及協助設定專用測試連線。

## 已知事實
- 正式 PocketBase：api.mahjongbattle.app，既有 Cloudflare Tunnel 規則不可修改。
- NAS 練習局容器：mahjong-practice-practice-staging-1，服務 port 8787，Docker network mahjong-practice_default，容器 IP 會變。
- NAS host 的 compose port mapping：127.0.0.1:8787:8787；此 loopback 只對 NAS 主機有效，不代表 Cloudflare Tunnel 容器能訪問。
- 練習容器的 PRACTICE_PUBLIC_ORIGIN=https://practice.mahjongbattle.app 是環境變數，不代表網域已連線。
- Vercel 預覽受 SSO 保護；vercel.json 尚未有 /practice rewrites。
- NAS image 是否真正重建為 POC7.0 尚未確認。

## 推薦安全架構
- 正式使用者入口仍是原本的「誰與爭鋒」PWA，登入與房間權限由 PocketBase 控制。
- 練習 API 先用專用測試 hostname，例如 practice-staging.mahjongbattle.app（需先確認 DNS / Cloudflare zone 管理權，不能假設已存在）。
- 由**獨立的 cloudflared 測試 tunnel 容器**與練習服務加入同一個專用 Docker network，透過 Docker DNS service name practice-staging:8787 連線。這避免變更現有正式 tunnel 容器及 api.mahjongbattle.app 規則；但要核實 Docker Compose network 與容器名稱解析，並評估資源及權限。
- 另一可行方案是由已存在 tunnel 新增 hostname 並讓其連接練習容器網路，但涉及正式 tunnel 的網路修改，風險較高，需另行核准。
- 測試 tunnel token 應放在 NAS 私有 secrets / 受限 env 檔，不可上傳 GitHub 或 Dropbox Paper；不可在聊天中傳送。
- 公開 API 前必須檢查：Origin allowlist、PocketBase token、房間成員驗證、非成員拒絕、CORS / WebSocket、rate limiting、TLS。
- 正式版只在通過測試後，經使用者批准再發布；不修改正式 PB 資料與戰績。

## 實施順序（目前未執行）
1. 唯讀確認 Cloudflare zone 是否管理 mahjongbattle.app、是否已有測試 tunnel/hostname、現有正式 tunnel 路由（不得改動）。
2. 唯讀確認 NAS POC7.0 image 版本、practice 服務健康與日誌。
3. 先建立 practice data volume 備份並驗證可還原，保存程式碼與部署設定至 Dropbox；備份未通過不進行高風險操作。
4. 建立獨立 cloudflared 測試 tunnel，僅路由測試 hostname 至 practice-staging:8787，避免硬編碼容器 IP。
5. 先測 HTTPS、未登入拒絕、非成員拒絕、同房四人與斷線重連。
6. 再設定 Vercel staging 同源 /practice、/practice-api、/practice-assets，檢查 token 不出現在 URL。
7. 用四支 iPhone 完成一局測試，最後取得正式發布核准。

## 未決問題
- 無 Cloudflare / NAS 可直接操作的已連接工具，不能聲稱 tunnel 已建立。
- 若獨立 tunnel 方案需要新 token、DNS 及 NAS Container Manager 設定，必須使用者在其受信任介面完成敏感步驟；不得請使用者貼 token。
- 不可把 staging 服務直接開放到公網或改綁 0.0.0.0:8787 作為捷徑。
