/* =========================================================
 * story.js — 第一章劇情、地圖、道具資料
 * 想改台詞或任務，只需要改這個檔案。
 *
 * 可用的演出函式（定義在 game.js）：
 *   await say(角色, 台詞, 表情)   表情：normal happy angry shock deadpan soft
 *   await narr(旁白)
 *   await choose(角色, 問題, [選項...]) → 回傳選項索引
 *   emote(角色id 或 'player', '❗')   頭上冒出表情
 *   shake()  畫面震動     await phone(角色, 訊息)  手機群組訊息
 *   await itemGet(道具id) 放入回憶背包     unlock(成就id)
 *   toast(文字)  saveGame(true) 自動存檔     await card(標題, 副標)
 * ========================================================= */
'use strict';

const Story = (() => {
  /* ---------- 地圖 ----------
   * #牆  .木地板  ,廚房地板  _玄關
   * C流理台 F冰箱 B哥哥房門 V電視 K公仔櫃 S沙發 T餐桌 P盆栽 R鞋櫃 E大門 */
  const MAP = [
    '####################',
    '#CCCCF##B####V###KK#',
    '#,,,,,,............#',
    '#,,,,,,............#',
    '#,,,,,,.....SSSS...#',
    '#,,,,,,............#',
    '#..TTT..........P..#',
    '#..TTT.............#',
    '#..................#',
    '###______###########',
    '#R______E###########',
    '####################',
  ];
  const OBJ_BY_CHAR = { C: 'counter', F: 'fridge', B: 'myroom', V: 'tv', K: 'shelf', S: 'sofa', T: 'table', P: 'plant', R: 'shoerack', E: 'door' };

  const NPCS = [
    { id: 'mom', look: 'mom', x: 2, y: 3, dir: 'down' },
    { id: 'dad', look: 'dad', x: 13, y: 4, dir: 'up', sitting: true, noTurn: true },
    { id: 'sis', look: 'sis', x: 6, y: 6, dir: 'left' },
  ];

  const SPEAKERS = {
    bro: { name: '哥哥', look: 'bro', icon: '🤓' },
    mom: { name: '媽媽', look: 'mom', icon: '👩' },
    dad: { name: '爸爸', look: 'dad', icon: '👨' },
    sis: { name: '妹妹', look: 'sis', icon: '👧' },
    narr: { name: '', look: null, cls: 'narr' },
    sys: { name: '系統', look: null, cls: 'sys' },
  };

  const ITEMS = {
    list: { icon: '📝', name: '媽媽的購物清單', desc: '・醬油：要上次那罐（綠色標籤）\n・蔥：要直的，不要有想法的\n・雞蛋：一盒，每一顆都要很有精神\n背面寫著：「十五分鐘內回來。」' },
    shoebox: { icon: '📦', name: '神秘鞋盒', desc: '在沙發底下找到。盒子上寫著「勿動．重要的日子用」。\n裡面的紙條：「平常穿那雙舊的就好，這雙留著，重要的日子要穿好鞋。——媽」' },
    pudding: { icon: '🍮', name: '給媽媽的布丁', desc: '媽媽每次都說「不用買啦」，但每次都吃最快。' },
    bag: { icon: '🛍️', name: '戰利品購物袋', desc: '醬油、直的蔥、很有精神的雞蛋。\n勇者人生中第一次「全員到齊」的採買。' },
  };

  const ACH = {
    shoes: { name: '神秘裝備回收', desc: '找回消失的鞋子' },
    perfect: { name: '把我兒子還來', desc: '採買零失誤', hint: '採買時一次都不要選錯' },
    pudding: { name: '孝親布丁', desc: '順手買了媽媽的布丁', hint: '結帳前看看冷藏櫃' },
    distance: { name: '距離產生美感', desc: '', hint: '將在後續章節解鎖', hidden: true },
  };

  const S = () => G.state;

  /* ---------- 任務提示 ---------- */
  function objective(st) {
    const met = Object.keys(st.met).length;
    let main = '';
    if (st.stage === 0) main = '跟家人打招呼（' + met + '/3）';
    else if (st.stage === 1) main = '到廚房找媽媽';
    else if (st.stage === 2) main = '出門採買：前往玄關大門';
    else if (st.stage === 3) main = '把東西交給廚房的媽媽';
    else main = '第一章完成！敬請期待第二章';
    if (st.shoe >= 1 && st.shoe < 4) {
      const hint = ['', '問問妹妹？', '問問爸爸？', '調查沙發底下'][st.shoe];
      main += '\n支線：消失的鞋子（' + hint + '）';
    }
    return main;
  }

  /* ---------- 開場 ---------- */
  async function intro() {
    await card('第一章', '無法通關的新手村');
    await narr('週六早上十點。\n勇者在名為「家」的新手村醒來了。');
    await narr('根據勇者多年的經驗——\n週末的新手村，從來沒有人能順利通關。');
    shake(); emote('player', '❗'); emote('mom', '💢', 2000);
    await say('mom', '哥哥——！起床了沒——！', 'angry');
    await say('bro', '（媽媽的呼喚。等級 99 的音量，附帶穿牆效果。）', 'shock');
    await say('bro', '……先去跟大家打個招呼好了。');
    await say('sys', '用左下的方向鍵移動，靠近家人後按右下的 A 鍵互動。\n（電腦可用方向鍵／WASD 移動，空白鍵互動）');
    saveGame(true);
  }

  /* ---------- 打招呼計數 ---------- */
  async function greet(id) {
    const st = S();
    if (st.met[id]) return;
    st.met[id] = true;
    refreshHUD();
    if (Object.keys(st.met).length >= 3 && st.stage === 0) {
      st.stage = 1;
      await wait(250);
      shake(); emote('mom', '❗'); emote('player', '❗');
      await say('mom', '哥哥——！打完招呼就過來廚房！我有「重要任務」！', 'angry');
      await say('bro', '（來了。主線任務的氣息。）', 'deadpan');
      saveGame(true);
    }
  }

  /* ---------- 媽媽 ---------- */
  async function giveList() {
    const st = S();
    await say('mom', '來，任務。', 'normal');
    await say('mom', '去巷口超市幫我買東西。清單在這裡。');
    await itemGet('list');
    await say('bro', '（清單上寫滿了附註，比我的畢業論文還長。）', 'deadpan');
    const c = await choose('bro', '……媽，這個「蔥要直的，不要有想法的」是什麼意思？', [
      '蔥……要怎麼看有沒有想法？',
      '收到！保證完成任務！',
      '可以叫妹妹去嗎？',
    ]);
    if (c === 0) {
      await say('mom', '你看久了就知道。', 'deadpan');
      await say('bro', '（這是什麼禪學問題。）', 'shock');
    } else if (c === 1) {
      await say('mom', '很好。上次你也這樣說，結果買了一箱芒果回來。', 'happy');
      await say('bro', '那次是芒果在特價……', 'deadpan');
    } else {
      emote('sis', '💢');
      await say('sis', '我聽到了喔。', 'angry');
      await say('mom', '你妹在讀書。');
      emote('sis', '📱');
      await say('sis', '對，我在讀書。（滑手機）', 'deadpan');
    }
    await say('mom', '快去快回。十五分鐘。超過一分鐘，晚餐少一塊肉。', 'angry');
    await say('bro', '（三十幾歲了還在被晚餐威脅……但這招真的有效。）', 'deadpan');
    st.stage = 2;
    saveGame(true);
  }

  async function mom() {
    const st = S();
    if (st.stage === 0) {
      if (!st.met.mom) {
        await say('mom', '終於起床了！你知道現在幾點嗎？', 'angry');
        const c = await choose('bro', '（要怎麼回答……）', ['早安媽！今天也很美！', '現在……是假日的早上？', '（假裝夢遊，走回房間）']);
        if (c === 0) {
          await say('mom', '……少來這套。', 'deadpan');
          await say('mom', '嘴巴這麼甜，等一下一定有事要你做。', 'happy');
        } else if (c === 1) {
          emote('mom', '💢');
          await say('mom', '假日也是日！太陽都曬到屁股了！', 'angry');
        } else {
          shake(); emote('mom', '💢');
          await say('mom', '給我站住。', 'angry');
          await say('bro', '（逃跑失敗。媽媽的控制技能：「定身術」。）', 'shock');
        }
        const others = st.met.dad && st.met.sis;
        st.met.mom = true;
        refreshHUD();
        if (others) {
          st.stage = 1;
          await say('mom', '你爸跟你妹都打過招呼了？很好，那正好。');
          return giveList();
        }
        await say('mom', '先去跟你爸、你妹打招呼，等一下我有重要任務給你。');
        return;
      }
      return say('mom', '去打招呼啊，站在這幹嘛？要我幫你打嗎？', 'angry');
    }
    if (st.stage === 1) return giveList();
    if (st.stage === 2) {
      if (st.shoe >= 1 && st.shoe < 4) {
        await say('bro', '媽，妳有看到我的鞋子嗎？');
        emote('mom', '💦');
        await say('mom', '……你自己的東西，自己找。', 'deadpan');
        await say('bro', '（剛剛媽媽的眼神，是不是飄了一下？）', 'shock');
        return;
      }
      return say('mom', '還在這裡？蔥都要老了。', 'angry');
    }
    if (st.stage === 3) return finale();
    return say('mom', '今天辛苦了。下一章的事，下一章再說。', 'soft');
  }

  /* ---------- 爸爸 ---------- */
  async function dad() {
    const st = S();
    if (st.shoe === 2 || (st.shoe === 3 && !st.flags.dadPointed)) {
      await say('bro', '爸，你有看到我的鞋子嗎？');
      await say('dad', '……', 'deadpan');
      await narr('爸爸的眼睛沒有離開電視。\n但是，他緩緩舉起遙控器——指向了沙發底下。');
      emote('dad', '👇', 2200);
      await say('bro', '（不愧是爸爸。全家情報量最多的隱藏 NPC。）', 'happy');
      st.shoe = 3; st.flags.dadPointed = true;
      saveGame(true);
      return;
    }
    if (!st.met.dad) {
      await narr('爸爸正在看電視。\n螢幕上是《深海釣魚大全》第 87 集。');
      await say('bro', '爸，早安。');
      await say('dad', '……', 'deadpan');
      await wait(400);
      await say('dad', '嗯。');
      await say('bro', '（爸爸的對話選項只有兩種：「……」和「嗯」。\n今天抽到了「嗯」，是好日子。）', 'happy');
      return greet('dad');
    }
    const lines = ['……', '……嗯。', '（爸爸把電視音量調大了一格。）', '（爸爸默默把遙控器換到另一隻手。）'];
    st.flags.dadTalk = (st.flags.dadTalk || 0) + 1;
    const line = lines[st.flags.dadTalk % lines.length];
    if (line.startsWith('（')) return narr(line);
    return say('dad', line, 'deadpan');
  }

  /* ---------- 妹妹 ---------- */
  async function sis() {
    const st = S();
    if (st.shoe === 1) {
      await say('bro', '妳有看到我的鞋子嗎？');
      await say('sis', '你的鞋子？上次不是在冰箱裡找到的嗎。', 'deadpan');
      await say('bro', '那次是意外！', 'shock');
      await say('sis', '那你去問爸啊。他整天坐在那，什麼都看在眼裡。', 'happy');
      st.shoe = 2;
      saveGame(true);
      return;
    }
    if (!st.met.sis) {
      await say('sis', '喔，哥你醒了。我還以為你今天要直接睡到第二章。', 'deadpan');
      const c = await choose('bro', '……', ['妳在幹嘛？', '我今天可是很忙的。']);
      if (c === 0) {
        await say('sis', '在看你上次被媽唸的影片。三萬次觀看。', 'happy');
        shake();
        await say('bro', '妳有拍？！', 'shock');
        await say('sis', '家族群組置頂。', 'deadpan');
      } else {
        await say('sis', '忙著睡覺跟忙著充電，都不算忙。', 'deadpan');
      }
      await say('sis', '快去找媽啦，她剛剛在廚房列清單，列了三張。', 'happy');
      await say('bro', '三張？！', 'shock');
      return greet('sis');
    }
    const lines = {
      0: '快去跟爸媽打招呼啦，NPC 都在等你觸發劇情。',
      1: '媽在叫你了。我幫你倒數：三、二……',
      2: '快去買啦，我在等媽煮的晚餐。',
      3: st.mistakes > 0 ? '你剛剛買錯的過程，我已經轉播到家族群組了。' : '全部一次買對？我不信。',
      4: '第二章在哪？作者還在寫嗎？',
    };
    return say('sis', lines[st.stage] || lines[4], 'deadpan');
  }

  /* ---------- 場景物件 ---------- */
  const OBJ = {
    async counter() {
      await narr('流理台。媽媽的領域。');
      await narr('未經允許碰觸的話，會觸發媽媽的被動技能：「你在幹嘛？」');
    },
    async fridge() {
      const st = S();
      if (st.shoe >= 1 && st.shoe < 4 && !st.flags.fridgeShoe) {
        st.flags.fridgeShoe = true;
        await narr('勇者打開冰箱——');
        await narr('上次在冰箱找到鞋子的傳說，今天並沒有重演。');
        await say('bro', '……很好，至少這次不是在冰箱。', 'deadpan');
        return;
      }
      await narr('冰箱裡有一盒布丁，上面貼著紙條：「哥哥不准吃」。');
      await say('bro', '（是媽媽的布丁。她每次都說不用買，結果每次都吃最快。）', 'happy');
      st.flags.sawPudding = true;
    },
    async myroom() {
      if (S().stage >= 4) return narr('哥哥的房間。模型們整齊地排排站，好像在等待下一章的冒險。');
      await narr('哥哥的房間。模型們正用期待的眼神看著你。');
      await say('bro', '等我回來，我的孩子們。', 'soft');
    },
    async tv() {
      await narr('電視正在播《深海釣魚大全》第 87 集。');
      await narr('爸爸已經看了四次。每次看到魚上鉤，他的眉毛都會動一毫米。');
    },
    async shelf() {
      await narr('限定版勇者公仔。');
      await say('bro', '（媽媽說，再買一隻就要開始跟我收房租。）', 'deadpan');
    },
    async table() {
      await narr('餐桌。上面放著妹妹的課本，看起來已經三天沒有翻開了。');
    },
    async plant() {
      await narr('一盆塑膠盆栽。');
      await narr('媽媽每天還是會幫它澆水。');
      await say('bro', '（……這大概就是愛吧。）', 'soft');
    },
    async shoerack() {
      const st = S();
      if (st.shoe === 0) {
        await narr('鞋櫃。勇者的鞋子……不在它應該在的位置。');
        shake();
        await say('bro', '嗯？我的鞋子呢？', 'shock');
        return startShoeQuest();
      }
      if (st.shoe < 4) return narr('鞋櫃。妹妹的鞋有八雙，爸爸兩雙，媽媽的……不能說。\n勇者的：零雙。');
      return narr('鞋櫃。世界恢復了和平。');
    },
    async sofa() {
      const st = S();
      if (st.shoe === 3) {
        await narr('勇者趴下來，往沙發底下看——');
        emote('player', '❗');
        await narr('一個鞋盒！盒子上用麥克筆寫著：「勿動．重要的日子用」。');
        await itemGet('shoebox');
        await say('bro', '裡面是我的鞋子……而且被擦得超亮。還有一張紙條。', 'shock');
        await narr('紙條：「平常穿那雙舊的就好，這雙留著，重要的日子要穿好鞋。——媽」');
        await say('bro', '……重要的日子？', 'normal');
        await say('bro', '（不知道為什麼，心裡有點暖暖的。……但我現在就要穿。）', 'soft');
        st.shoe = 4; st.flags.shoes = true;
        toast('✅ 支線完成：神秘消失的裝備', 2600);
        unlock('shoes');
        saveGame(true);
        return;
      }
      if (st.shoe === 4) return narr('沙發底下已經沒有秘密了。只剩下薯條。');
      await narr('沙發底下有：一枚十元硬幣、三根不知道哪一年的薯條、一個遙控器電池蓋。');
      if (st.shoe >= 1) await say('bro', '……沒有鞋子。也許該先問問看家人。', 'deadpan');
    },
    async door() {
      const st = S();
      if (st.stage < 2) {
        await narr('大門。');
        await say('bro', '（現在出門的話，媽媽會發動「哥哥——你要去哪——」把我召喚回來。）', 'deadpan');
        return;
      }
      if (st.stage === 2) return goShopping();
      if (st.stage === 3) return say('bro', '（東西都買好了，先拿給廚房的媽媽吧。）');
      return say('bro', '（外面的世界……就留到下一章吧。）', 'soft');
    },
  };

  async function startShoeQuest() {
    const st = S();
    st.shoe = 1;
    toast('📜 支線開啟：神秘消失的裝備', 2600);
    refreshHUD();
    saveGame(true);
  }

  /* ---------- 主線：出門採買 ---------- */
  async function goShopping() {
    const st = S();
    if (!st.flags.shoes) {
      await narr('要出門了。勇者伸手拿鞋子——');
      shake();
      await say('sys', '【裝備欄】鞋子：空');
      await say('bro', '我的鞋子呢？！', 'shock');
      if (st.shoe === 0) await startShoeQuest();
      const c = await choose('bro', '要怎麼辦……', ['穿拖鞋出門（媽媽可能會念）', '先去找鞋子']);
      if (c === 1) return say('bro', '（先找鞋子吧。家人之中，一定有人知道些什麼。）');
      st.flags.slippers = true;
      await say('bro', '拖鞋也是鞋！勇者不拘小節！', 'happy');
    }
    await card('📍 巷口超市', '勇者的試煉場');
    enterShop();
    await shopping();
    hidePhone();
    await card('🏠 回到家', '');
    showScreen('game');
    teleport(7, 10, 'left');
    st.stage = 3;
    refreshHUD();
    saveGame(true);
    await say('bro', '我回來了——！', 'happy');
  }

  async function shopRound(key, ask, options) {
    const st = S();
    let tries = 0;
    for (;;) {
      const i = await choose('bro', ask, options.map((o) => o.text));
      const o = options[i];
      if (o.ok) {
        Sfx.ok();
        shopCheck(key);
        await o.react();
        return;
      }
      tries += 1; st.mistakes += 1;
      Sfx.bad(); shake(); setMood(st.mistakes);
      await o.react(tries);
    }
  }

  async function shopping() {
    const st = S();
    st.mistakes = 0;
    await narr('超市裡冷氣開得好強。勇者打開了購物清單。');
    if (st.flags.slippers) await narr('路過的店員看了一眼你的拖鞋，露出了「我懂」的表情。');

    await shopRound('soy', '第一項：醬油（要上次那罐，綠色標籤）。', [
      { text: '🏷️ 特價最便宜的那罐', react: async (n) => {
        await phone('mom', '便宜的有便宜的味道。放回去。');
        await say('bro', n === 1 ? '她怎麼知道？！她人在哪裡？！' : '……這間超市是不是有媽媽的眼線。', 'shock');
      } },
      { text: '✨ 瓶子最帥的限定版', react: async () => {
        await phone('sis', '哥，你是在買醬油還是在買公仔🤣');
        await say('bro', '可、可是它是限定版耶……', 'deadpan');
      } },
      { text: '🟢 綠色標籤的那罐', ok: true, react: async () => {
        await say('bro', '綠色標籤，就是你了！', 'happy');
      } },
    ]);

    await shopRound('scallion', '第二項：蔥（要直的，不要有想法的）。', [
      { text: '🌿 彎彎的蔥（看起來很放鬆）', react: async () => {
        await phone('mom', '彎的蔥代表它有自己的想法。不要。');
        await say('bro', '蔥……有自己的想法……', 'shock');
      } },
      { text: '🧄 蒜苗（反正長得差不多）', react: async () => {
        await phone('mom', '那是蒜苗。你是在考驗我嗎？');
        await phone('sis', '笑死，連我都分得出來🤣');
        await say('bro', '（家族群組今天特別熱鬧。）', 'deadpan');
      } },
      { text: '📏 最直的那一把', ok: true, react: async () => {
        await say('bro', '這把蔥直得跟爸爸看電視的坐姿一樣。完美。', 'happy');
      } },
    ]);

    await shopRound('egg', '第三項：雞蛋一盒（每一顆都要很有精神）。', [
      { text: '🥚 隨手拿一盒', react: async () => {
        await phone('mom', '你有看嗎？你沒看。我知道你沒看。');
        await say('bro', '（媽媽的千里眼，今天也正常運作中。）', 'shock');
      } },
      { text: '🐔 直接買一隻雞（源頭管理）', react: async () => {
        await phone('sis', '哥，這裡是超市不是牧場🤣');
        await phone('mom', '放回去。');
        await say('bro', '（……店員默默地看著我。超市根本沒有在賣雞。）', 'deadpan');
      } },
      { text: '🔍 一顆一顆檢查精神狀態', ok: true, react: async () => {
        await narr('勇者花了七分鐘，跟每一顆雞蛋認真對看。');
        await say('bro', '嗯。每一顆都很有精神。', 'happy');
      } },
    ]);

    await narr('結帳前，勇者在冷藏櫃前停下了腳步。冷藏櫃裡有媽媽最愛的那款布丁。');
    const c = await choose('bro', st.flags.sawPudding ? '（冰箱那盒寫著「哥哥不准吃」的，就是這款……）' : '（這款布丁，好像是媽媽很喜歡的那個……）', [
      '🍮 順手買一盒給媽媽',
      '算了，直接結帳',
    ]);
    if (c === 0) {
      await itemGet('pudding');
      st.flags.pudding = true;
      unlock('pudding');
    }
    await itemGet('bag');
    if (st.mistakes === 0) unlock('perfect');
    await phone('mom', '買好了就快回來。');
    await say('bro', '任務完成。回家！', 'happy');
  }

  /* ---------- 結局：交給媽媽 ---------- */
  async function finale() {
    const st = S();
    await say('mom', '回來了？我看看。');
    await say('sys', '【媽媽的驗收時間】');
    await say('mom', '醬油，對。', 'deadpan');
    emote('mom', '🔍', 1800);
    await say('mom', '蔥……嗯。直的。沒有想法。', 'deadpan');
    await say('mom', '雞蛋，精神很好。', 'normal');
    if (st.mistakes === 0) {
      shake();
      await say('mom', '……全對？你是誰？把我兒子還來。', 'shock');
    } else {
      await say('mom', '中間錯了 ' + st.mistakes + ' 次對吧？你妹都跟我說了。', 'angry');
      emote('sis', '📱');
      await say('sis', '我只是負責轉播。', 'deadpan');
    }
    if (st.flags.slippers) {
      await say('mom', '還有，你穿拖鞋出門？你是要讓整條巷子都知道我們家兒子沒鞋子穿嗎？', 'angry');
      await say('bro', '因為鞋子不見了嘛……', 'deadpan');
      emote('mom', '💦');
      await say('mom', '……下次找仔細一點。', 'deadpan');
    }
    if (st.flags.shoes) {
      await say('mom', '你怎麼穿那雙？那雙不是說好重要的日子才……', 'shock');
      await say('bro', '它被藏在沙發底下……', 'deadpan');
      await say('mom', '……算了。今天就勉強算是個重要的日子吧。', 'soft');
    }
    if (st.flags.pudding) {
      await say('mom', '欸？這是什麼？', 'shock');
      await say('bro', '布丁。妳喜歡的那個。');
      await say('mom', '誰說我喜歡了。……放冰箱，上面寫我的名字。', 'soft');
      await say('bro', '（媽媽轉身的時候，嘴角明顯上揚了 3 度。）', 'happy');
    }
    await wait(300);
    const d = G.npcs.find((n) => n.id === 'dad');
    if (d) d.dir = 'down';
    emote('dad', '💬', 2000);
    await say('dad', '……辛苦了。', 'soft');
    shake(); emote('sis', '❗'); emote('mom', '❗');
    await say('sis', '爸講話了！而且超過一個字！今天是什麼日子？！', 'shock');
    await say('bro', '（爸爸今天的台詞量，創下本年度新高。）', 'happy');
    await say('mom', '好了，去休息吧。', 'normal');
    await say('mom', '……謝謝你啊，哥哥。', 'soft');
    await narr('無法通關的新手村，今天，好像通關了一點點。');
    Sfx.fanfare();
    st.stage = 4;
    st.flags.clearedAt = Date.now();
    saveGame(true);
    await wait(500);
    showClear();
  }

  function clearStats(st) {
    const rank = st.mistakes === 0 ? 'S（把我兒子還來）' : st.mistakes <= 2 ? 'A（勉強及格）' : 'B（下次叫妹妹去）';
    const got = st.items.length, all = Object.keys(ITEMS).length;
    return [
      '🎒 回憶收集：' + got + ' / ' + all,
      '🛒 採買失誤：' + st.mistakes + ' 次',
      '👩 媽媽評價：' + rank,
      '👟 支線「神秘消失的裝備」：' + (st.flags.shoes ? '完成' : '未完成'),
    ];
  }

  async function interact(kind, id) {
    if (kind === 'npc') {
      const fn = { mom, dad, sis }[id];
      if (fn) await fn();
    } else if (OBJ[id]) {
      await OBJ[id]();
    }
  }

  return {
    map: MAP,
    npcs: NPCS,
    rug: { x: 11, y: 5, w: 5, h: 2 },
    start: { x: 8, y: 2, dir: 'down' },
    speakers: SPEAKERS,
    items: ITEMS,
    achievements: ACH,
    ambient: [['sis', '📱'], ['dad', '📺'], ['mom', '🎵']],
    objectAt: (x, y, ch) => OBJ_BY_CHAR[ch] || null,
    objective, intro, interact, clearStats,
  };
})();
