# ai-game-playground

發布候選差異與旋轉對照：[最終檢查表](docs/FAMILY_CANDIDATE_CHECKLIST_2026-10-13.md)。Windows WebKit 模擬橫轉直仍保留失敗證據；iPhone 實機待驗，未部署。

家人角色本機接入進度：見 [2026-10-13 真實素材驗證](docs/FAMILY_REAL_ASSETS_QA_2026-10-13.md)。四張原圖已由指定 Git commit 取得並接入；公開遊戲尚未更新。
以 HTTP 開啟 [家人素材檢查頁](game/design/family-integration.html)，或在遊戲標題點「家人們」檢視四位角色。
本週剩餘工作與完成標準見 [家人上線路徑](docs/FAMILY_RELEASE_PLAN.md)；方向鍵已在本機改為隱形，測試與限制見 [手機操作驗證](docs/MOBILE_CONTROLS_QA_2026-10-13.md)。

ChatGPT × Claude 協作的手機網頁遊戲專案：**《宅男勇者的人生副本》**。

| 路徑 | 內容 |
|---|---|
| `index.html` | 已確認可在 iPhone 正常點開始的極簡測試版（請勿覆蓋） |
| `game/` | 第一章正式版：橫式 Q 版 RPG「無法通關的新手村」 |
| `docs/HANDOFF.md` | 開發交接報告（Claude → ChatGPT） |

## 第一章怎麼玩

開啟 `game/index.html`（GitHub Pages 網址為 `…/game/`）。

- **iPhone Safari 橫式**優先；直式會出現旋轉提示，也可以選擇直式繼續玩。
- 左下 **方向鍵** 移動：按住連續走、手指滑動換方向；輕點只轉身不移動（方便對準人物）。
- 右下 **A 鍵** 對話／調查；也可以**直接點地圖上的人或物件**，角色會自動走過去並互動，點空地則走到該處。
- 電腦：方向鍵或 WASD 移動，空白鍵／Enter 互動，數字鍵 1–3 選擇選項。
- 右上：🎒 回憶背包、💾 存檔、🔊 音效、🏠 回標題（會自動存檔）。

## 檔案結構

```
game/
├── index.html   畫面結構（標題、客廳、超市、章節完成、對話框）
├── style.css    版面（含 iPhone 瀏海安全區域、直式提示）
├── art.js       Q 版角色與地圖的程式繪圖（暫代美術素材）
├── game.js      引擎：移動、觸控、對話、存讀檔、錯誤顯示
├── story.js     第一章的地圖、台詞、任務、道具（改劇情只要改這裡）
├── ASSETS.md    之後需要補的美術／音效素材清單
└── design/      角色定稿對照圖（characters.html）與 v5 角色模型（cast.js），確認後才整合進遊戲
```

純原生 HTML/CSS/JS，不需要安裝或打包，也沒有外部依賴。
