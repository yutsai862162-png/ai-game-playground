# 隱形方向鍵與手機回歸（台灣時間 2026-10-13）

使用者明確要求左下角方向鍵隱形。本機 `gpt/family-integration` 工作樹已實作，未提交、推送、合併或部署；先前家人配置完整保留。

## 實際修改

- `game/style.css`：只將 `#dpad .dpad-vis` 設為 `opacity: 0`。箭頭、底座、搖桿頭與按下亮起效果都在此層內，因此完全隱形。外層 `#dpad` 的原始尺寸、位置、`pointer-events:auto`、touch-action 與事件監聽不變。右邊 A 鍵維持原樣。
- `game/game.js`：當第一根手指持有方向區時，忽略第二根手指在方向區內發生的 pointerdown。第一根仍可移動控制、鬆開或取消；第二根不搶走 ownership。沒有改速度、方向遲滯、轉身延遲、地圖碰撞或鞋子劇情。
- 修改前新增的測試在兩引擎三尺寸均重現第二指搶方向：原本 `Input.pad` 從 down 變 left。證據 `qa-results/mobile/before-multitouch-fix.json`。修正後 6/6 通過。

## 驗證結果

Windows / Playwright 1.56.1 / Chromium 141.0.7390.37 / WebKit 26.0。

|檢查|結果與界線|
|---|---|
|`tests/mobile-layout.cjs`|6/6 通過：568×320、844×390、390×844，兩引擎皆測。844×390 額外注入左右 47px、底部 21px 的安全區測試值，並非量測真機瀏海。|
|方向區|確定可見層 opacity=0、觸控層 pointer-events=auto；輕點轉身不位移、放開 Input.pad 歸零。|
|按住／取消／不黏住|對 production handler 注入 pointerdown 與 pointerup、pointercancel、lostpointercapture；按住確實位移，每種結束事件後停止且後續不繼續走。|
|多指|兩引擎的 pointer 事件測試通過。另以 Chromium CDP 注入瀏覽器雙指觸控：第一指控制、第二指按下與放開都不抢方向，最後 cancel 清空。不是 iPhone 硬體觸控；WebKit 僅測 pointer 事件。|
|對話及比例|長文字和三選項用隔離測試內容，沒有寫入正式 story.js。文字／頭像／選項皆在畫面內，選項高度 44–46 CSS px，可 touch tap 選擇；旋轉與高度縮小後畫面可用，角色位置不變。|
|`tests/hero-integration.cjs`|修改後重新跑 8/8 通過：兩瀏覽器完整流程、按住／放開、鞋子、採買、背包、存讀檔、章節完成、慢圖／缺圖／禁用儲存。|
|語法及素材邏輯|`node --check game/game.js`、`node --check tests/mobile-layout.cjs`、`node tests/family-assets.cjs`、`git diff --check` 通過。|

原手機 UI 基準在方向鍵修改前已 6/6 通過，因此目前不需要額外調整對話 CSS 或地圖比例。隱形後的完整遊戲與版面截圖已實際檢視：

- `qa-results/mobile/webkit-small-landscape-invisible-pad.png`：地圖左下無方向鍵遮擋。
- `qa-results/mobile/chromium-small-landscape-choices.png`：小手機橫式的文字及三選項。
- `qa-results/mobile/results.json`：最新 6/6 結果。
- `qa-results/results.json`：修改後完整遊戲 8/8 結果。commit 欄仍是基底 `bb844f9`，測試對象是未提交工作樹。

重跑：設定 `NODE_PATH` 為 repo 外 `../qa-deps/node_modules`，執行 `node tests/mobile-layout.cjs` 與 `node tests/hero-integration.cjs`。完整劇情測試不注入任務狀態；手機版面測試則明確使用 UI 文字 fixture，兩者不要混稱。

## 尚未驗收

真 iPhone Safari 的雙指、來電／切背景觸控取消、瀏覽器工具列伸縮、音效、連續長時間玩；本輪無新圖可讀，四位新圖仍未整合。使用者說目前手機可玩屬於既有公開版的回報。先前 Linux WPE 原生崩潰並未因此判定修好。

公開固定版 `5c061ed` 另在本次以 Chromium / WebKit 外部 HTTPS 測試 2/2 通過，兩邊均 22 PNG loaded、walkingReady=true、geometryError=null；沒有更換公開網址指向或發布新版本。最初測試曾被本地 CRLF 與遠端 LF 的位元組雜湊差異擋下，後改在隔離目錄使用 `git show 5c061ed:game/hero-assets.js` 的原始 blob 核對，未修改遠端 renderer。最終證據在 repo 同層 `../preview-check/preview-results/results.json`。
