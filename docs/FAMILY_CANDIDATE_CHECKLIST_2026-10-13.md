# 家人整合候選版：最終差異與驗收清單

本機分支 `gpt/family-integration`；HEAD 仍為 `bb844f9dd413c6a00e257d6863e2602662da42df`，改動未提交。此為可供審查的候選內容，尚未滿足發布驗收。沒有推送、合併或部署，現有公開版不變。

## 產品差異

- 四張已確認家人原圖，來源 `af25a246bfda0685819b8c8d08e3bdf2f7c8e78f`，原始 bytes 與 manifest SHA-256 均受測試保護。
- 家人 adapter：等比例與腳底基準、載入失敗回退、慢載入重繪、對話取景。爸爸地圖保留 Canvas 坐姿；媽媽與妹妹使用同一靜態正面圖；未來大嫂位於新相簿。
- 標題新增「家人們」入口，四卡片在直式改為兩欄。沒有新 NPC、任務、章節或走路／多表情素材。
- 原 Canvas 爸爸移除未確認的鬍子；方向鍵外觀隱形；第一個手指持有方向鍵直到抬起或取消，第二指不搶走控制。
- 哥哥 22 張素材、既有速度、轉向門檻、碰撞、鞋子對話與進度、結尾保持基準行為。

## 測試與 CI 差異

- CI 從整檔 engine 鎖定改成關鍵行为／資產保護，保留 10 個破壞性 mutation 自測。
- 加入家人單元與真圖瀏覽器測試、手機控制／版面測試、最小頁與遊戲的旋轉對照。所有 HTTP server 綁定 `127.0.0.1` 隨機 port。
- CI 涵蓋家人分支，獨立步驟即使前一測試失敗仍收集其他結果；保留非零退出碼和截圖，不設 `continue-on-error`，不將旋轉失敗改成通過。
- 原始碼為 HTML/CSS/JS，沒有額外打包 build；驗證使用 JS 語法檢查、actionlint、單元／保護與瀏覽器測試。

## 旋轉判定與證據

可重跑 `node tests/viewport-diagnostics.cjs`（需可用 Playwright）。`qa-results/viewport/results.json` 記錄八個案例的 initial、rotated、afterSyntheticEvents、reloaded，以及收到的事件。Windows Playwright 1.56.1 實測：

|目標|獨立初始橫／直式|橫轉直|直轉橫|更改尺寸後重新載入|
|---|---|---|---|---|
|Chromium 最小頁|2/2 通過|通過|通過|2/2 通過|
|Chromium 遊戲／相簿|2/2 通過|通過|通過|2/2 通過|
|WebKit 最小頁|2/2 通過|失敗|通過|2/2 通過|
|WebKit 遊戲／相簿|2/2 通過|失敗|通過|2/2 通過|

失敗時 `innerWidth/innerHeight = 390/844`，但 `documentElement.clientWidth/clientHeight = 844/390`，`matchMedia('(orientation:portrait)') = false`。最小頁只有 viewport meta、fixed body 與方向 CSS，沒有任何遊戲 JavaScript。遊戲的實際 `resize` 與 `orientationchange` 都已收到；額外合成重送 resize、orientationchange、visualViewport.resize 仍不能修正 layout viewport。

現有遊戲 `resize()` 用 `innerHeight` 更新 `--app-h`，按 canvas 實際盒子重設解析度／比例並重畫標題；已有 window resize 與延遲 250ms orientationchange。此次失敗中高度確實更新，舊寬度與方向 media query 留在瀏覽器引擎層。沒有證據支持用 JavaScript 強制寬度或改寫方向 CSS；因此本輪不做這種補償。

目前沒有獨立 visualViewport listener。它可用於處理視覺視窗單獨變動，但不能修正這次 CSS viewport 未更新：遊戲已收到 window resize，手動重送也無效。工具列、鍵盤或 zoom 引發的視覺視窗行為仍須實機驗收，不能以本次測試推斷通過。原手機版面測試的 6/6 僅證明其控制／對話盒斷言通過，不能替代新加入的 layout viewport 與方向斷言。

這些證據支持 **Windows WebKit 自動化視窗調整限制**，不足以宣稱實際 iPhone 遊戲已壞，也不足以證明 iPhone 旋轉正常。診斷總結果仍是 6/8、退出碼 1；家人測試仍為 5/6。

## 發布檢查表

最終完整重跑於 2026-10-13 03:18 UTC 結束：完整流程 8/8、幾何 4/4、手機 6/6、家人 5/6；家人唯一失敗仍為上述 WebKit 橫轉直，重新載入直式通過。另獨立旋轉診斷 6/8；兩個失敗分別是最小頁與遊戲的同一方向。JS 語法、actionlint、family 單元與 10 個保護 mutation、diff whitespace 檢查均通過。本輪只補測試、CI 與文件，沒有因模擬器現象修改產品 resize 邏輯。

- [x] 四張原圖實際檢視、身分／bytes 比對，且沒有覆寫原有未提交變更。
- [x] 哥哥完整流程 8/8、幾何 4/4、22 PNG 不變。
- [x] 家人正常／慢載入／缺圖與比例／頭像檢查；兩引擎獨立初始橫直版面通過。
- [x] Chromium 雙向旋轉通過；WebKit 直轉橫通過，橫轉直失敗完整保留。
- [x] 相簿、地圖、對話截圖已檢視；[Library 橫式預覽](https://chatgpt.com/api/library/files/libfile_89669a558f088191bd2abadc4f80e3fc/download)。
- [ ] iPhone Safari 實機雙向旋轉、工具列高度、安全區、双指與存讀檔。
- [ ] 在 Linux CI 重跑同一候選版，釐清 WebKit 平台差異；未執行遠端 Actions。
- [ ] 取得另行發布授權，再決定提交／推送與部署；本次沒有進行。

細節與其他素材限制見 [真實素材報告](FAMILY_REAL_ASSETS_QA_2026-10-13.md)。本次新證據在 `qa-results/viewport/`，原圖／劇情測試在 `qa-results/`。
