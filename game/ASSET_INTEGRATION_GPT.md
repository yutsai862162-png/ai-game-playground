# 哥哥角色 PNG 素材整合說明（GPT 接手）

狀態：已製作獨立素材包，尚未整合進遊戲，不能視為已完成實機驗收。

素材命名：
- 四方向各四影格：bro_down_0.png … bro_down_3.png、bro_up_0..3、bro_left_0..3、bro_right_0..3，每張 96×160 RGBA PNG，腳底置底中央。
- 六種立繪：bro_relax.png、bro_laugh.png、bro_smug.png、bro_nagged.png、bro_panic.png、bro_gentle.png，每張 512×512 RGBA PNG。

角色採用總監確認的胖胖 Q 版哥哥。此為素材 v1，仍需視覺檢查各格動作是否流暢與角色一致。

整合原則：
1. 不改動 game/game.js 的虛擬搖桿、觸控、移動速度或碰撞。
2. 在 game/art.js 的人物繪圖接口引入圖片，載入失敗時退回 Canvas 舊版。
3. 根據腳底錨點將每格圖片繪於地圖；移動影格按方向與走路進度切換。
4. 對話立繪沿用既有角色表情 key；需對照每種別名映射。
5. 先在獨立分支測試，PR 驗收後才允許合併 main。

注意：PNG 尚在 ChatGPT 產出的素材包內，**尚未上傳此 GitHub 分支**。接入前需將素材放入 game/assets/bro/。不得聲稱已完成整合。
