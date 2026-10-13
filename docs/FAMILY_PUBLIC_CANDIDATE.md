# 家人整合：公開草稿候選版

已依使用者明確批准推送至 `gpt/family-integration`，並建立 [草稿 PR #4](https://github.com/yutsai862162-png/ai-game-playground/pull/4)，目標為既有 `gpt/hero-art-integration`，集中呈現家人整合差異。沒有合併 main／hero，沒有更改 Pages 或原公開版本。

首次公開 commit：`2b9716ce7a24c1308ee4b6f669c570c5d7de7881`。

[固定版本試玩](https://rawcdn.githack.com/yutsai862162-png/ai-game-playground/2b9716ce7a24c1308ee4b6f669c570c5d7de7881/game/index.html)。若出現服務商提示，點「Open the page」。已在實際遠端 Chromium／WebKit 開啟並驗證：四張家人原 PNG 和核心 JS/CSS/HTML 與指定 commit 相符；家人狀態全 ready；哥哥 22 圖載入且 walkingReady；相簿與新遊戲可開啟；方向鍵 opacity=0、觸控層 pointer-events=auto；無遊戲 JavaScript 錯誤。這不是 iPhone 實機驗收。

## 遠端 CI 發現

首次 push run [38343554036](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38343554036) 與 PR run [38343600740](https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38343600740) 均保留完整矩陣。已完成工作的日誌顯示：

- Linux WebKit 也重現橫轉直後 CSS layout viewport 留在 844×390；最小頁和遊戲一致。獨立初始直／橫與重新載入通過，Chromium 雙向旋轉通過。因此先前報告只限 Windows 的證據現已擴展到 Linux 自動化；不能因此推定 iPhone 會失敗或已通過。
- 既有 WebKit 缺圖流程出現 `page-crash`／`Target crashed`，與歷史不穩定現象相似；本次未修改哥哥 loader 或停用音效來掩蓋它。不能把同名錯誤當成已證實相同 native 根因。
- 部分新增家人測試在瀏覽器無回應時停滯。因此補上每案例即時記錄、crash 事件、最多兩秒的失敗診斷取樣；原始斷言不變。CI 的獨立測試指令另設 180 秒（旋轉診斷 120 秒）時限，超時保持失敗並繼續收集證據。整體 job 20 分鐘，允許後续診斷及 artifacts 上傳。
- kernel 尾端亦輸出至 CI 日誌，方便核對 native crash，不必把普通 TargetClosed 直接當作原生崩潰證明。

後續提交只改善上述測試／CI 診斷及文件，遊戲程式與四張 PNG 保持首次公開候選版內容。最終 run 結果以 PR checks 為準；此草稿沒有宣稱 CI 全綠。

## 尚未解除的發布門檻

仍需 iPhone Safari 實測雙向旋轉、工具列伸縮、安全區、雙指與存讀檔；家人仍為單張靜態圖，爸爸地圖保留原坐姿。沒有新走路動畫、多方向或多表情原圖。合併或正式部署需要另行授權。

其他 `2026-10-13` 本機 QA 文件是發布前快照，其中「未推送」等描述保留歷史時間點；目前公開候選狀態以本文件與草稿 PR 為準。Windows 失敗原始證據仍保留於 `docs/evidence/windows-viewport-2026-10-13.json`。
