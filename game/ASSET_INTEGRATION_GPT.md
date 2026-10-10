# 哥哥角色 PNG 素材整合與核對紀錄

## 目前狀態

**22 張 PNG 已在 `gpt/hero-art-integration` 分支的 `game/assets/bro/`，不需要使用者重新下載或上傳。**

匯入提交：`565b088159b4fefc3770efeca94ccb178d0e3896`，提交訊息為 `Import 22 approved hero PNG assets with verified original bytes`。

原先本文件的「尚未上傳」已過時，本次只更新核對紀錄，沒有改動 main、遊戲控制或碰撞程式。

## 檔案身分核對

核對來源：本對話的 `哥哥_22張完整上傳包_行走v3.zip`。

逐檔使用 Git blob SHA-1（包含 blob 長度標頭）與 GitHub tree `1b5ed8d1631510f65dbcffdeb9a8ced70748d3ce` 比對：**22 / 22 完全一致**。

- 行走：`bro_down_0..3.png`、`bro_up_0..3.png`、`bro_left_0..3.png`、`bro_right_0..3.png`，共 16 張，全部為 96 × 160 RGBA PNG。
- 表情：`bro_relax.png`、`bro_laugh.png`、`bro_smug.png`、`bro_nagged.png`、`bro_panic.png`、`bro_gentle.png`，共 6 張，全部為 512 × 512 RGBA PNG。
- 所有 PNG 均可完整解碼，alpha 最小值 0、最大值 255。

這證明 GitHub 上的檔案就是上述修正版素材包的原始位元組，不代表美術或動畫已通過最終驗收。

## 已執行的測試

1. 對從 GitHub 讀取的 `hero-assets.js` 載圖與繪圖邏輯執行 Node 語法檢查：通過。
2. 使用 Chromium 建立隔離的角色繪圖測試。因本次環境的瀏覽器導覽受到限制，PNG 透過記憶體注入；圖片位元組已先與 GitHub 雜湊核對，原有角色繪圖接口以測試替身提供。
3. 對 `Art.chibi` 呼叫四方向各四格，以及對 `Art.portrait` 呼叫六種表情：22 張不同 PNG 均成功解碼並經 drawImage 繪出；舊版回退次數 0；JavaScript 錯誤 0。

**測試範圍僅為素材與隔離載圖／繪圖組件。不是完整遊戲、公開預覽網址、iPhone 硬體或 Safari 相容性測試。**

## 尚未完成

- 完整遊戲的標題、地圖、對話、超市等場景整合實測。
- 四方向連續動畫的步伐、腳底錨點、角色比例與邊緣視覺驗收。
- 圖片失敗或慢速載入時的完整遊戲回退与重繪測試。
- 真正的 iPhone Safari 遊玩驗收。

## 保持不動

- `game/game.js` 的搖桿、觸控、移動速度、碰撞和既有順手操作。
- 已修正的鞋子支線與既定人物設定。
- `main` 正式版；未經使用者確認不合併、不發布。
