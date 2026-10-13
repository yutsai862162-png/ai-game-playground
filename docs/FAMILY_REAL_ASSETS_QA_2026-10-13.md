# 四位家人真實素材接入（2026-10-13，本機候選版）

後續旋轉定位、最小重現與發布檢查表見 [候選版最終摘要](FAMILY_CANDIDATE_CHECKLIST_2026-10-13.md)。

工作目錄為 `game` checkout，分支 `gpt/family-integration`，基底 `bb844f9dd413c6a00e257d6863e2602662da42df`。變更尚未提交、推送、合併或部署。公開遊戲不是這份候選版。

## 原圖來源與接入範圍

已 fetch `origin/gpt/family-assets-20261013`，確認來源 commit 為 `af25a246bfda0685819b8c8d08e3bdf2f7c8e78f`；只取出以下四個原始 PNG，未 checkout 或覆蓋工作區既有變更。四張皆為 1024 × 1536 RGBA，已實際開圖檢視，並逐位元組比對來源 Git blob。SHA-256 記錄在 `game/assets/family/manifest.json`。

|原圖|目前遊戲呈現|尚未提供|
|---|---|---|
|`dad.png`|標題站姿、爸爸對話頭像、家人相簿；無眼鏡、無鬍子|地圖仍用既有 Canvas 坐姿，沒有新坐姿圖|
|`mom.png`|標題、地圖靜態站姿、媽媽對話頭像、相簿|沒有走路動畫、多方向或多表情原圖|
|`sister.png`|標題、地圖靜態站姿、妹妹對話頭像、相簿|沒有走路動畫、多方向或多表情原圖|
|`sister-in-law.png`|標題「家人們」入口中的「未來大嫂」相簿卡片|沒有新增 NPC、台詞、任務或章節|

PNG 不裁切、不重繪；地圖使用透明內容邊界等比例縮放並對齊腳底。頭像僅在 Canvas 繪製時取景，不修改原檔。媽媽與妹妹在邏輯轉向時繼續使用同一站姿，避免轉向就突然切回舊圖。所有對話表情目前共用原圖，不能宣稱已完成多表情。

`family-assets.js` 接在既有哥哥 adapter 後，保持哥哥原有 22 張圖片、鞋子劇情、移動速度與轉向規則。載入失敗會回退既有 Canvas；相簿會標示圖片無法載入。慢速載入完成時重繪標題及可見頭像。

## 實測結果

Windows、本機 HTTP、Playwright 1.56.1；Chromium 141 與 WebKit 26 手機模擬。不是 iPhone 實機 Safari。

|檢查|結果與證據|
|---|---|
|哥哥完整整合流程|8/8 通過，`qa-results/results.json`|
|哥哥走路幾何與原圖|4/4 通過，22 張 PNG 未變，`qa-results/hero-walk-results.json`|
|手機控制與對話版面|6/6 通過，`qa-results/mobile/results.json`；含 Chromium CDP 雙指、pointer 取消與抬起|
|家人真圖、缺圖、慢載入|5/6 完整案例通過；WebKit 正常載入案例的圖片、比例、地圖及三位頭像檢查通過，但橫轉直檢查失敗，`qa-results/family-results.json`|
|操作／故事保護|基準比較與 10 個破壞性 mutation 自測通過；未改動的鞋子流程及結尾受到保護|
|靜態檢查|所有遊戲與測試 JS 語法、family-assets 單元測試、actionlint、git diff --check 通過|

**仍有 WebKit 旋轉阻礙。** `setViewportSize(390×844)` 後 `innerWidth/innerHeight` 已更新，CSS layout viewport 與方向 media query 卻仍保留 844×390，相簿因而維持橫式寬度。測試保留 failed 與非零退出碼，沒有跳過或當作成功。重新載入直式頁面的檢查另行記錄；不能拿重新載入代替旋轉通過。CI 尚未在 Linux runner 執行，不能聲稱遠端 CI 綠燈。

補充隔離結果：不載入任何遊戲程式的最小 HTML 頁也重現 Windows WebKit 同一落差（inner 390×844、layout 844×390、portrait=false）。因此有瀏覽器模擬層面的證據，仍不等於 iPhone 無問題。重新載入後的真圖直式相簿檢查已通過（`freshPortrait: passed`），畫面為 `family-webkit-gallery-portrait-reloaded.png`。

## 防火牆提示核查

臨時診斷 `../debug-resize.cjs` 曾以 `listen(0)` 未指定 host 啟動，可能因此触發 Windows Node.js 防火牆提示；沒有提示事件與 PID 證據，無法斷言。此程序已正常結束，診斷腳本已改用 `127.0.0.1`。四支正式 HTTP 測試一律明確綁定 `127.0.0.1`、由作業系統選擇空閒 port。最後唯讀確認：本輪測試程序 0、全機 Node LISTEN port 0。不需要公開／私人網路入站授權；可取消提示。未更改防火牆或終止他人程序。

## 可檢視證據

- Library 橫式相簿：`libfile_89669a558f088191bd2abadc4f80e3fc`，檔名 `family-chromium-gallery-landscape.png`。
- [Library 截圖下載](https://chatgpt.com/api/library/files/libfile_89669a558f088191bd2abadc4f80e3fc/download)。
- 本機 `qa-results/family-chromium-gallery-landscape.png`、`family-chromium-gallery-portrait.png`。
- 地圖：`qa-results/family-chromium-map-landscape.png`。
- 對話：`qa-results/family-chromium-dad-dialogue.png`、`family-chromium-mom-dialogue.png`、`family-chromium-sis-dialogue.png`。
- 失敗畫面：`qa-results/family-webkit-loaded-failure.png`。
- 透過本機 HTTP 開啟 `/game/`，標題點「家人們」；`/game/design/family-integration.html` 可檢查個別角色。

Library 上傳已成功；官方 helper 寫入 Windows 本機 xattr 仍因 `os.setxattr` 不存在而失敗。已保留 Library 身分，不修改 helper，也未讀取先前失敗的下載產物。此次原圖走已授權公開的 Git 資產來源，材料取得不再被 Library 下載限制阻擋。

## 發布前剩餘事項

1. 釐清 Windows WebKit 模擬旋轉與真實 iPhone 行為，通過相簿及遊戲的旋轉驗收。
2. iPhone Safari 實測橫式、瀏海安全區、雙指、瀏覽器工具列變高低、點擊與存檔。現有安全區及觸控測試只屬模擬。
3. 如後續需要爸爸新坐姿、家人走路或多表情，另行製作素材；本輪沒有生成或付费。
4. 取得另行授權後才提交／推送候選版或部署；本輪未合併 PR、未正式發布。
