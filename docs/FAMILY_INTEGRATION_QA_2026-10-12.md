> 2026-10-13 更新：四張原圖已取得並接入；以下為先前規劃／阻礙紀錄，最新範圍與測試請看 [真實素材驗證](FAMILY_REAL_ASSETS_QA_2026-10-13.md)。

# 家人角色接入：本機進度與驗證

後續更新：依使用者新要求完成隱形方向鍵與第二指防搶控制，詳見 `MOBILE_CONTROLS_QA_2026-10-13.md`；本文件所述「輸入不變」是較早階段的範圍。家人原圖仍未整合。剩餘工作與時程見 `FAMILY_RELEASE_PLAN.md`。

本次在 Windows 建立獨立 checkout，分支 `gpt/family-integration`，基底為遠端 `gpt/hero-art-integration` 的 `bb844f9dd413c6a00e257d6863e2602662da42df`。原工作目錄為空，沒有覆蓋使用者改動。GitHub REST API 已確認 [PR #3](https://github.com/yutsai862162-png/ai-game-playground/pull/3) 仍為 open、merged=false；美術分支不在 main 歷史中。沒有合併、推送或正式部署。

## 實際完成

- `game/family-assets.js` 建立爸爸、媽媽、妹妹、未來大嫂的素材登記與載入 adapter。名稱來自 Library 正式回傳，沒有猜測檔名。
- 所有 `src` / `bounds` 保持 null，狀態為 `pending-material`，不送出不存在的圖片請求。失敗、無效幾何或未取得素材時使用原本 Canvas。
- 為未來已檢視的素材提供等比例、腳底中心對齊；建議可見高度爸爸 53、媽媽 49、妹妹 51、未來大嫂 49 邏輯像素，**仍待圖檔實際校準**。不做像素讀取，不重開 getImageData/CORS 問題。
- 站姿只用於靜止正面，不冒充四向行走、坐姿或對話立繪。保留哥哥 renderer、22 張 PNG、輸入、碰撞、鞋子劇情、存檔和全部台詞。
- 移除原 Canvas 爸爸未經確認的小鬍子，符合 HANDOFF 第 6 節；爸爸仍不戴眼鏡。
- 新增 `game/design/family-integration.html`，清楚顯示現有暫代图與四位新素材未整合狀態。未來大嫂沒有現成可用圖，顯示文字空位。

## 素材阻礙（未完成）

透過目前 Library skill 的 `prepare_materialize` 與原版 bundled transfer helper，爸爸圖正式 materialization 重現：`AttributeError: module 'os' has no attribute 'setxattr'`。沒有修改 helper、讀取失敗產物或自行繞過下載；其他三位同樣需要這個尚不相容的流程，所以沒有重複下載。四張新素材均未能合法完成本機材料取得，**未檢視、未整合**。Repo 只有哥哥 22 張 PNG 與舊 v5 character sheet，沒有上述四張圖。

|角色|正式檔名|Library ID|
|---|---|---|
|爸爸|爸爸_站姿預覽.png|libfile_b9c282fd2a948191b12e1cd266f8de66|
|媽媽|媽媽_站姿預覽.png|libfile_0e8be7ede19c8191bc5a028b3d06e73e|
|妹妹|妹妹_站姿預覽.png|libfile_8bca3328e2288191b7f80bc583c9d10f|
|未來大嫂|未來大嫂_站姿預覽.png|libfile_97693d700dac8191b5e577865a763fd8|

後續先在支援正式流程的環境取得、確認可讀並逐張看圖，再填入相對 `family-assets.js` 的 `src` 和實測可見 `bounds: {x,y,width,height}`。確認背景透明、全身與腳底未裁切，不能將未檢視的站姿直接當作對話頭像。先爸媽，再妹妹／未來大嫂。家宴、搞笑開頭和感人結尾的既有方向不變；本次沒有擅自新增婚禮劇情。

## 本次驗證

環境：Windows、Node 24.21.0、Playwright 1.56.1、Chromium 141.0.7390.37、WebKit 26.0。依賴位於 repo 外 `../qa-deps`。專案為原生 HTML/CSS/JS，無 package.json、lint 或 build 指令；執行所有 `game/*.js` 語法檢查及 `git diff --check`。

|檢查|結果|
|---|---|
|`node tests/family-assets.cjs`|通過：缺圖無請求、哥哥委派、先設定 CORS、相對路徑、載入失敗、錯誤 bounds、等比例脚底與姿勢回退|
|`tests/family-browser.cjs`|Chromium / WebKit 2/2 通過：四位狀態、直式無橫向溢出、哥哥素材可用、無 pageerror|
|`tests/hero-integration.cjs`|8/8 通過：兩瀏覽器完整劇情、方向鍵、鞋子支線、採買、背包、存讀檔、章節完成；慢圖／缺圖／停用儲存|
|`tests/hero-walk-geometry.cjs`|4/4 通過；22 張已確認素材 SHA-256 未變|

`qa-results/results.json` 的 commit 欄是基底 HEAD，測的是本次未提交工作樹；`game/hero-assets.js` 自基底完全未改。完整遊戲測試之後只修正家人檢查頁 Canvas 等比例 CSS 及未啟用素材的相對路徑解析，並重跑家人測試。

截圖與 JSON 在本機 `qa-results/`，未發布到網站或 Library：

- `family-chromium.png` / `family-webkit-portrait.png`：家人檢查頁（已人工檢視）。
- `chromium-map.png`：目前遊戲畫面（已人工檢視）。
- `chromium-chapter-clear.png` / `webkit-chapter-clear.png`：章節結尾。
- `results.json`、`hero-walk-results.json`、`family-results.json`：機器可讀紀錄。

PowerShell 重跑：

```powershell
$env:NODE_PATH = (Resolve-Path ../qa-deps/node_modules).Path
node tests/family-assets.cjs
node tests/family-browser.cjs
node tests/hero-integration.cjs
node tests/hero-walk-geometry.cjs
```

**驗收界線：**這次 Windows WebKit 完整流程未崩潰，不能推論先前 Linux WPE 原生崩潰已修復。沒有重跑外部 CDN 預覽，也沒有真正 iPhone Safari、Android 或實際手機觸控驗收。家人新圖、走路動畫、坐姿與對話立繪仍待整合與視覺驗收。
