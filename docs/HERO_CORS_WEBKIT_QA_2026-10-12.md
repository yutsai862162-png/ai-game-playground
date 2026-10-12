# PNG 跨域與 WebKit 崩潰追查（2026-10-12）

## 範圍與版本

- 開始時的 `gpt/hero-art-integration`：`b12b223458bb4d72e4360f6099292009eb71100a`。
- PR #3 保持 open、未合併；它的 head 是 `claude/otaku-hero-game-setup-evxdni`，不是本次修改的分支。
- 本次未修改 `game/`、原始 22 張哥哥 PNG、根目錄 `index.html` 或 main。沒有操作《小公主的放學路》或正式發布設定。
- 22 張 PNG 均符合 `game/assets/bro/manifest.json` 的 SHA-256。`game/game.js`、`game/story.js`、`game/style.css`、根目錄 `index.html` 均與核准版本 `24dbe8f` 逐位元組相同。

## PNG 問題：已有修正，重新驗證通過

原失敗 run [38043239872](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38043239872) 實際預覽的是 `6393797`。圖片由 rawcdn.githack.com 重新導向 raw.githubusercontent.com，普通圖片載入可以成功，Canvas 像素讀取卻會受限。

既有 commit `58e5eecf9a6412a6bf81563cf86ff9ffa27ef3b8` 的最小修正已存在：在 `img.src` **之前**設定 `img.crossOrigin = 'anonymous'`。伺服器回傳 `Access-Control-Allow-Origin: *`，允許這次 CORS 讀取。不需要改圖、不需要改步伐、不需要停用瀏覽器安全機制。

較新的歷史 run [38043546480](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38043546480) 已驗證修正成功。2026-10-12 的 run [38197681368](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38197681368) 再對當時最新提交 `5c061ed49e1ffdb3cf58346ef0d9e71000f2da52` 的實際 HTTPS 預覽驗收，兩個瀏覽器均通過：

| 檢查 | Chromium | WebKit |
|---|---|---|
| 原始 PNG 載入 | 22/22 | 22/22 |
| `walkingReady` | true | true |
| `geometryError` | null | null |
| 開始、開場對話、移動 | 通過 | 通過 |
| 背包、手動存檔 | 通過 | 通過 |
| 遊戲未捕捉 JS 錯誤 | 0 | 0 |

遠端與 checkout renderer SHA-256 均為 `f204d5812b9eb797870696484786c862ae02eef3a5ca7c9d89b0ac7720e13147`。

固定版本預覽：<https://rawcdn.githack.com/yutsai862162-png/ai-game-playground/5c061ed49e1ffdb3cf58346ef0d9e71000f2da52/game/index.html>。預覽商可能先顯示 **Open the page** 確認頁。

## 本次修正的是驗收入口及診斷

1. `hero-public-preview.cjs` 的預設 ref 原本仍是修正前的 `6393797`。現在預設讀取 `git rev-parse HEAD`；CI 使用 `${{ github.sha }}`，並在 `game/**` 變更時重新測試。
2. 首輪新預覽 run [38197311847](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38197311847) 中，兩引擎 PNG 狀態皆正常，但 WebKit 收到預覽商確認頁 carbonads.net 廣告的跨域錯誤。這不是哥哥 PNG 的 `getImageData` 錯誤。
3. 測試現在完成可見的確認操作後，在同一 context 開新分頁測遊戲；確認頁錯誤記在 `providerErrors`，新遊戲頁所有 `pageerror` 仍會使測試失敗。沒有攔截或替換遠端圖片，沒有偽造 cookie，也沒有依錯誤字串悄悄忽略遊戲錯誤。後續 2/2 通過，providerErrors 仍保存廣告錯誤。
4. 整合測試記錄 `page-crash`、頁面/context 關閉、browser disconnect、是否正在清理、最後路線位置、素材狀態、引擎版本和失敗 trace。
5. 步伐幾何測試獨立執行，不再因完整流程先失敗而整組略過。完整流程的 assertions、移動與互動方式保留。

## WebKit：獨立重現

run [38197311853](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38197311853)，測試程式 commit `0118d26`，Playwright 1.56.1 / Linux WebKit 26.0：

- 最新遊戲：原有 8 項整合測試 7 過、1 失敗；4 項幾何與缺圖測試全部通過。
- Chromium 完成 NPC、鞋子支線、背包、存讀檔、超市、第一章結局及回標題流程。
- WebKit 在鞋子支線中失敗；最後路線為前往 `(13,4)`，`stage: 2`、`shoe: 2`，PNG 仍為 22/22、walkingReady true、geometryError null。
- 明確捕捉 `page-crash`，不是正常清理；瀏覽器主程序仍 connected，後續新的 WebKit context 可完成其他三項測試。不能將通用 TargetClosed 訊息直接解讀為整個瀏覽器主程序退出。
- 同一測試另服務 CORS 修正前的 `6393797` 原始 `game/`，也在 22/22 PNG、walkingReady true 時發生 page-crash（開場後截圖階段）。兩邊都使用 loopback 同源 HTTP，沒有公開預覽的圖片跨域重新導向。
- 因此，WebKit 崩潰可獨立於 PNG CORS 問題重現；不能歸因於新增 crossOrigin。崩潰位置不固定，也不能據此宣稱某段劇情有錯。
- launcher stderr 有 EGL/Mesa、音訊裝置警告，但沒有指出造成此次 crash 的 native stack。這些警告本身不足以判定是 GPU、音訊、OOM 或特定上游 bug。

## 瀏覽器版本對照

run [38197681424](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38197681424)，commit `5c061ed`。兩組使用相同遊戲和測試，只更換 Playwright 及其配套瀏覽器；所有失敗證據均保留。

| 環境 | 原有 8 項整合 | 4 項幾何／缺圖 | 尚未通過項目 |
|---|---|---|---|
| Playwright 1.56.1 | 8/8 通過 | 3/4 通過 | WebKit 單張圖片缺失時的流程，TargetClosed |
| Playwright 1.57.0 | 7/8 通過 | 4/4 通過 | WebKit 完整流程，在章末對話中 page-crash |

這證明問題是間歇出現，不能用一次完整流程通過宣稱修好了。1.57.0 也未解決，因此沒有將升級當作修復。兩組的實際腳底基線、角色比例、16 個方向影格槽及步伐序列檢查均通過；1.56.1 的第四項失敗是缺圖情境中的頁面關閉，不是幾何數值錯誤。

### 已定位的原生崩潰證據

下載兩組 Actions artifacts，讀取 `kernel.log` 後確認：

```text
1.56.1 / 2026-10-12 02:58:24 UTC:
eadedCompositor[5745]: segfault ... in libWPEWebKit-2.0.so.1.7.0

1.57.0 / 2026-10-12 02:58:09 UTC:
traps: WPEWebProcess[5425] trap invalid opcode ... in libWPEWebKit-2.0.so.1.7.0
```

1.56.1 的崩潰執行緒名稱在核心日誌中被截短為 `eadedCompositor`。因此已知這兩次失敗包含 **Linux WPE WebKit 原生程序／合成器崩潰**，並非只有 JavaScript 的普通 CORS 例外或測試正常關閉頁面。瀏覽器 launcher 沒有斷線不能排除其子程序崩潰。

已擷取的核心日誌未見 OOM kill；測後可用 RAM 約 14 GB，`/dev/shm` 使用約 300 KB。這是測後快照，不是全程記憶體峰值監測，不能用它完全排除所有資源因素。

**仍未修復的部分：** 尚無 native core dump／符號化 backtrace，無法判定是哪個 WebKit assertion、記憶體生命週期或繪圖路徑觸發。也沒有證據把它對應到某一個已知上游 issue，或宣稱真實 iPhone Safari 一定會／不會發生。保留測試失敗與兩版本比較；未停用音效、繪圖、安全限制或縮短遊戲路線來製造綠燈。

Artifacts（GitHub 保留 7 天；關鍵結果已記錄於本文）：

- `11724341765`：`hero-integration-evidence-1.56.1`，含 kernel.log、memory.txt、結果、截圖、測試原始碼。
- `11724745592`：`hero-integration-evidence-1.57.0`，另含失敗 WebKit trace。

後續最有用的診斷是對相同路線擷取 WPEWebProcess native core/backtrace，再建立最小重現；不是再修改已驗證的 PNG CORS loader。

上游 [Playwright #37766](https://github.com/microsoft/playwright/issues/37766) 記錄了 1.56 的另一個 WebKit reload crash，維護者說明於 1.57 修正。它是選擇相鄰版本對照的依據，**尚非本專案崩潰的根因證明**；本次觀察並非都發生於 reload。

## 重現指令與驗收界線

以下在 checkout 根目錄執行；依賴安裝在專案外。Linux runner 需能安裝瀏覽器系統依賴。1.57.0 對照只需把安裝版本改成 `playwright@1.57.0`；不能把任一版本的結果當作另一版本通過。

```bash
git switch gpt/hero-art-integration
git pull --ff-only
QA_DEPS=$(mktemp -d)
npm install --prefix "$QA_DEPS" --no-save --package-lock=false playwright@1.56.1
"$QA_DEPS/node_modules/.bin/playwright" install --with-deps chromium webkit
export NODE_PATH="$QA_DEPS/node_modules"
node --check game/hero-assets.js
node tests/hero-public-preview.cjs
DEBUG=pw:browser node tests/hero-integration.cjs
# 前一命令失敗仍應獨立執行：
node tests/hero-walk-geometry.cjs
```

只跑 WebKit 完整流程：

```bash
HERO_QA_ENGINES=webkit HERO_QA_CASE=full-game DEBUG=pw:browser node tests/hero-integration.cjs
```

比較修正前原始遊戲（不覆蓋目前 checkout）：

```bash
QA_BASELINE=$(mktemp -d)
git archive 6393797c212effd7a8cbac46559fcfe5e5399601 game | tar -x -C "$QA_BASELINE"
HERO_QA_GAME_ROOT="$QA_BASELINE" HERO_QA_GAME_REF=6393797c212effd7a8cbac46559fcfe5e5399601 HERO_QA_ENGINES=webkit HERO_QA_CASE=full-game DEBUG=pw:browser node tests/hero-integration.cjs
```

所有瀏覽器測試都是 Linux runner 的手機模擬；真正 iPhone Safari 的觸控手感、音效、工具列伸縮與長時間遊玩仍待實機驗證。既有左向鏡像、比例、步伐時間和缺圖 fallback 均保留，沒有重新設計哥哥。
