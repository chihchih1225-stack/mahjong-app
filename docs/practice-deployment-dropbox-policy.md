# 手癢就來摸｜無固定電腦部署與 Dropbox 備份規範
日期：2026-11-06
狀態：設計稿（僅 feature/practice-room-staging，尚未啟用）

## 產品邊界
- 原「誰與爭鋒」PWA 房間內附加功能；沿用原登入、原網域、原房間，不能另開獨立 App。
- 正式 PocketBase（games、records、stake、place）不因練習局更新而更動。
- 練習局容器、資料 volume、部署憑證、備份路徑與正式戰績分開。

## 已知部署現況
- NAS Compose 服務 practice-staging，build context ./mahjong_practice_poc_70，127.0.0.1:8787:8787，practice_private_data:/data。
- 目前只看到容器 11/06 重新啟動；不能推定 image 已 build 成 7.0。
- Cloudflare 既有 api.mahjongbattle.app -> http://172.19.0.1:8090，保持原狀。
- 前端 staging feature flag 關閉；vercel.json 尚無 /practice 相關 rewrites。

## 部署方案決策（建議，未授權實作）
1. 優先選 NAS 上獨立、受限權限的 pull-based 更新工作：經 GitHub 測試完成且人工核准後，NAS 只抓取指定、不可變版本，不接收外網 SSH 入站指令。先確認 NAS 是否有可用排程/runner 與權限隔離，再選工具。
2. 部署工作只操作 practice-staging；先備份 compose、程式版本、volume；不能使用 down -v、volume rm、prune、清除資料庫。
3. 每次 build 產生版本資訊（commit SHA、build time、POC version），在容器內提供只讀 health/version 檢查；新容器健康且 API 驗證通過後才視為部署完成。
4. 失敗時停止後續操作，回復前一版映像檔；資料 volume 的還原需另外核准，不可自動覆蓋現有資料。
5. 練習 API 僅用 /practice-api/*，靜態資源僅用 /practice-assets/*，避免與原 PWA 路由衝突；確認 Tunnel 網路拓樸與 Origin、PB 會員驗證後才建立 HTTPS。
6. 需四人手機端測試、跨房間隔離、撤銷權限、重連、未登入拒絕通過後，才可請使用者驗收；main/正式部署需另外明確核准。

## Dropbox 同步備份門檻
每次開發階段完成時，至少保存：
- 原始碼/版本包（檔名包含版本與 Git SHA），可解壓、檢查檔案清單與 SHA-256。
- Compose 與非機密設定（不得保存 Token、密碼、私鑰），保存上一版可回退檔。
- 部署紀錄：時間、Git SHA、映像檔 digest、變更摘要、測試結果、preview URL、正式發布狀態、還原程序。
- 練習資料 volume 的獨立備份，需檢查備份存在、內容完整及實際還原演練；正式 PocketBase 備份另行管理，不得混放。
- 備份成功要有 Dropbox 回傳的檔案路徑、大小、時間，且驗證可讀；失敗明確標示，不得宣稱已備份。

## 已在 Dropbox 確認存在（2026-11-06，僅檔案存在）
路徑：/6. 誰與爭鋒｜Mahjong PWA/線上練習局_獨立開發/
- mahjong_practice_poc_70_tests_fixed.zip（160929 bytes）
- mahjong_practice_poc_69.zip
- compose_poc70.yaml
- compose_poc69_backup.yaml
尚未證明 ZIP 可還原、NAS volume 已同步備份或本文件已存入 Dropbox。

## 目前阻擋
- NAS image build 版本未驗證
- Cloudflare 到練習容器可達性未驗證
- HTTPS、Vercel 同源代理未建立
- 四手機實測未完成
- NAS 無人值守部署及 Dropbox 新版文件同步尚未建立

追蹤：https://github.com/chihchih1225-stack/mahjong-app/issues/1
