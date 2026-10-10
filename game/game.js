/* =========================================================
 * game.js — 遊戲引擎：畫面切換、地圖移動、輸入、對話、存讀檔
 * 劇情內容在 story.js。
 * ========================================================= */
'use strict';

const SAVE_KEY = 'otakuHero.ch1.save';
const PREF_KEY = 'otakuHero.prefs';
const SAVE_VERSION = 1;
const MOVE_TIME = 0.15;  // 走一格的秒數
const TURN_DELAY = 0.07; // 輕點方向鍵少於這個秒數＝只轉身不移動
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 錯誤顯示：任何錯誤都要讓玩家看得到 ---------- */
function showError(msg) {
  const bar = $('#errorBar');
  if (!bar) { alert('發生錯誤：' + msg); return; }
  bar.querySelector('.msg').textContent = '⚠️ 發生錯誤：' + msg + '（可按「回到標題」重試）';
  bar.hidden = false;
}
window.addEventListener('error', (e) => showError(e.message || '未知錯誤'));
window.addEventListener('unhandledrejection', (e) => showError(String((e.reason && e.reason.message) || e.reason)));

/* ---------- 存檔（localStorage 一律 try/catch） ---------- */
const Store = {
  available() {
    try { const k = '__otaku_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
  },
  load() {
    let raw;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return { data: null, error: '無法讀取存檔（瀏覽器限制）' }; }
    if (!raw) return { data: null, error: null };
    try {
      const d = JSON.parse(raw);
      if (!d || d.v !== SAVE_VERSION || typeof d.stage !== 'number') throw new Error('版本不符');
      return { data: d, error: null };
    } catch (e) { return { data: null, error: '存檔資料損壞，請開始新遊戲' }; }
  },
  save(data) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ } },
  getPref(k, def) {
    try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); return k in p ? p[k] : def; } catch (e) { return def; }
  },
  setPref(k, v) {
    try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); p[k] = v; localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) { /* 忽略 */ }
  },
};

/* ---------- 音效（Web Audio 合成，不需音檔） ---------- */
const Sfx = {
  ctx: null, on: true,
  init() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type, vol, when) {
    if (!this.on || !this.ctx) return;
    try {
      const c = this.ctx, t = c.currentTime + (when || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* 忽略 */ }
  },
  blip() { this.tone(820 + Math.random() * 160, 0.03, 'square', 0.02); },
  ok() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, i * 0.08)); },
  bad() { this.tone(200, 0.22, 'sawtooth', 0.05); this.tone(150, 0.3, 'sawtooth', 0.05, 0.12); },
  item() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.07, i * 0.09)); },
  phone() { this.tone(1250, 0.07, 'sine', 0.07); this.tone(1650, 0.09, 'sine', 0.07, 0.09); },
  fanfare() { [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.07, i * 0.13)); },
};

/* ---------- 全域狀態 ---------- */
const G = {
  state: null,      // 會存檔的資料
  screen: 'title',
  locked: false,    // 劇情進行中（不能移動）
  player: null,
  npcs: [],
  emotes: [],
  target: null,
  time: 0,
  shakeT: 0,
  ctx: null, cw: 0, ch: 0, dpr: 1, scale: 1,
  warnedSave: false,
  camX: 0, camY: 0,
  path: [], pathTarget: null, marker: null,
};
window.__game = G; // 方便除錯與自動化測試

function newState() {
  const s = Story.start;
  return {
    v: SAVE_VERSION, x: s.x, y: s.y, dir: s.dir,
    stage: 0, met: {}, shoe: 0, items: [], ach: [], flags: {}, mistakes: 0, savedAt: 0,
  };
}

/* ---------- 畫面切換 ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
  G.screen = id;
  Input.reset();
  if (id === 'game') { resize(); }
  if (id === 'title') { refreshTitle(); drawTitleArt(); }
}

function refreshTitle() {
  const r = Store.load();
  $('#btnContinue').disabled = !r.data;
  $('#storageNote').hidden = Store.available();
  if (r.error) toast('⚠️ ' + r.error);
}

/* ---------- 地圖 ---------- */
function tileAt(x, y) { return Art.at(Story.map, x, y); }
function npcAt(x, y) { return G.npcs.find((n) => n.x === x && n.y === y); }
function walkable(x, y) { return '.,_'.includes(tileAt(x, y)) && !npcAt(x, y); }

function setupWorld() {
  const st = G.state;
  if (!walkable(st.x, st.y)) { st.x = Story.start.x; st.y = Story.start.y; }
  G.player = { x: st.x, y: st.y, dir: st.dir || 'down', moving: false, prog: 0, sx: st.x, sy: st.y, tx: st.x, ty: st.y, walkT: 0 };
  G.path = []; G.pathTarget = null; G.marker = null;
  G.npcs = Story.npcs.map((n) => Object.assign({}, n, { baseDir: n.dir, t: Math.random() * 10 }));
  G.emotes = [];
}

function teleport(x, y, dir) {
  const p = G.player;
  Object.assign(p, { x, y, sx: x, sy: y, tx: x, ty: y, moving: false, prog: 0 });
  if (dir) p.dir = dir;
}

/* ---------- 輸入 ---------- */
const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};
const Input = {
  keys: [], pad: null, since: 0, last: null,
  dir() {
    const d = this.pad || this.keys[this.keys.length - 1] || null;
    if (d !== this.last) { // 記錄方向開始按下的時間，以及當時面向哪裡
      this.last = d; this.since = G.time;
      this.startDir = G.player ? G.player.dir : null;
    }
    return d;
  },
  reset() {
    this.keys = []; this.pad = null; this.last = null;
    highlightPad(null);
    G.path = []; G.pathTarget = null;
  },
};

function highlightPad(dir) {
  document.querySelectorAll('#dpad .arm').forEach((a) => a.classList.toggle('on', a.dataset.dir === dir));
}

function setupInput() {
  const dpad = $('#dpad'), vis = dpad.querySelector('.dpad-vis'), knob = dpad.querySelector('.knob');
  let padId = null;
  const update = (e) => {
    const r = vis.getBoundingClientRect();
    const R = r.width / 2;
    const dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const dist = Math.hypot(dx, dy);
    // 搖桿頭跟著手指走，看得出目前方向
    const k = dist ? (Math.min(dist, R) * 0.42) / dist : 0;
    knob.style.transform = 'translate(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px)';
    let d = null;
    if (dist > Math.max(8, R * 0.16)) {
      // 遲滯：已經在走橫向時，要明顯往上/下才換方向，避免斜角抖動
      const ax = Math.abs(dx), ay = Math.abs(dy), cur = Input.pad, H = 1.35;
      let horiz;
      if (cur === 'left' || cur === 'right') horiz = !(ay > ax * H);
      else if (cur === 'up' || cur === 'down') horiz = ax > ay * H;
      else horiz = ax >= ay;
      d = horiz ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    if (d !== Input.pad) {
      Input.pad = d; highlightPad(d);
      if (d) { G.path = []; G.pathTarget = null; }
    }
  };
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault(); Sfx.init();
    padId = e.pointerId;
    dpad.classList.add('active');
    try { dpad.setPointerCapture(e.pointerId); } catch (err) { /* 舊版瀏覽器 */ }
    update(e);
  });
  dpad.addEventListener('pointermove', (e) => { if (e.pointerId === padId) { e.preventDefault(); update(e); } });
  const end = (e) => {
    if (e.pointerId !== padId) return;
    padId = null; Input.pad = null; highlightPad(null);
    dpad.classList.remove('active'); knob.style.transform = '';
  };
  dpad.addEventListener('pointerup', end);
  dpad.addEventListener('pointercancel', end);
  dpad.addEventListener('lostpointercapture', end);

  const btnA = $('#btnA');
  btnA.addEventListener('pointerdown', (e) => {
    e.preventDefault(); Sfx.init();
    btnA.classList.add('pressed');
    interact();
  });
  const unpress = () => btnA.classList.remove('pressed');
  btnA.addEventListener('pointerup', unpress);
  btnA.addEventListener('pointercancel', unpress);
  btnA.addEventListener('pointerleave', unpress);
  btnA.addEventListener('contextmenu', (e) => e.preventDefault());
  dpad.addEventListener('contextmenu', (e) => e.preventDefault());

  // 點地圖：走過去；點人物或物件：走到旁邊並自動互動
  const view = $('#view');
  view.addEventListener('pointerdown', (e) => {
    if (G.screen !== 'game' || G.locked || !overlaysClosed() || !G.player) return;
    e.preventDefault(); Sfx.init();
    const r = view.getBoundingClientRect();
    const wx = (e.clientX - r.left) / G.scale + G.camX, wy = (e.clientY - r.top) / G.scale + G.camY;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    let target = targetAt(tx, ty);
    // 角色的頭會畫在上一格，點到頭也算點到人
    if (!target && wy - ty * TILE > TILE * 0.35 && npcAt(tx, ty + 1)) target = targetAt(tx, ty + 1);
    walkTo(tx, ty, target);
  });
  view.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat && !KEYMAP[e.code]) return;
    if (KEYMAP[e.code]) {
      e.preventDefault();
      const d = KEYMAP[e.code];
      if (!Input.keys.includes(d)) Input.keys.push(d);
      G.path = []; G.pathTarget = null;
      return;
    }
    if (['Space', 'Enter', 'KeyZ', 'KeyJ'].includes(e.code)) {
      e.preventDefault();
      if (!$('#itemGet').hidden) { $('#itemGet').click(); return; }
      if (!$('#dialogLayer').hidden) { Dialog.advance(); return; }
      if (G.screen === 'game' && overlaysClosed()) interact();
    }
    if (/^Digit[1-9]$/.test(e.code) && Dialog.choosing) {
      const btn = $('#choices').children[Number(e.code.slice(5)) - 1];
      if (btn) btn.click();
    }
    if (e.code === 'Escape') { $('#bag').hidden = true; }
  });
  window.addEventListener('keyup', (e) => {
    const d = KEYMAP[e.code];
    if (d) Input.keys = Input.keys.filter((k) => k !== d);
  });
  window.addEventListener('blur', () => Input.reset());

  // iOS：防止頁面被拖動、雙指縮放
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.scrollable')) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
}

function overlaysClosed() {
  return $('#bag').hidden && $('#confirm').hidden && $('#itemGet').hidden && $('#dialogLayer').hidden;
}

/* ---------- 互動 ---------- */
function targetAt(x, y) {
  const n = npcAt(x, y);
  if (n) return { kind: 'npc', id: n.id, x, y, label: '對話' };
  const obj = Story.objectAt(x, y, tileAt(x, y));
  if (obj) return { kind: 'obj', id: obj, x, y, label: '調查' };
  return null;
}

function findTarget() {
  const p = G.player;
  if (!p || p.moving) return null;
  const order = [p.dir].concat(['up', 'down', 'left', 'right'].filter((d) => d !== p.dir));
  for (const d of order) {
    const t = targetAt(p.x + DIRS[d][0], p.y + DIRS[d][1]);
    if (t) return Object.assign(t, { dir: d });
  }
  return null;
}

/** 從玩家位置找路（BFS），goal(x, y) 為真即抵達；回傳方向陣列，找不到回傳 null */
function findPath(goal) {
  const p = G.player;
  const sx = p.moving ? p.tx : p.x, sy = p.moving ? p.ty : p.y;
  const key = (x, y) => x + ',' + y;
  const prev = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (goal(x, y)) {
      const out = [];
      let k = key(x, y);
      while (prev.get(k)) { const [px, py, d] = prev.get(k); out.unshift(d); k = key(px, py); }
      return out;
    }
    for (const d of ['up', 'down', 'left', 'right']) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1], k = key(nx, ny);
      if (prev.has(k) || !walkable(nx, ny)) continue;
      prev.set(k, [x, y, d]);
      q.push([nx, ny]);
    }
  }
  return null;
}

function walkTo(tx, ty, target) {
  let path;
  if (target) {
    path = findPath((x, y) => Math.abs(x - target.x) + Math.abs(y - target.y) === 1);
  } else if (walkable(tx, ty)) {
    path = findPath((x, y) => x === tx && y === ty);
  }
  if (!path) { emote('player', '❔', 600); return; }
  G.path = path;
  G.pathTarget = target || null;
  G.marker = { x: target ? target.x : tx, y: target ? target.y : ty, born: G.time };
  if (!path.length && target && !G.player.moving) arrive();
}

/** 自動走到目的地：面向目標並互動 */
function arrive() {
  const t = G.pathTarget, p = G.player;
  G.pathTarget = null; G.marker = null;
  if (!t) return;
  const dx = t.x - p.x, dy = t.y - p.y;
  p.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  interact();
}

function interact() {
  if (G.screen !== 'game' || G.locked || !overlaysClosed()) return;
  const t = findTarget();
  if (!t) { emote('player', '❔', 700); return; }
  G.player.dir = t.dir;
  if (t.kind === 'npc') {
    const n = G.npcs.find((m) => m.id === t.id);
    if (n && !n.noTurn) n.dir = OPPOSITE[t.dir];
  }
  runScript(() => Story.interact(t.kind, t.id));
}

async function runScript(fn) {
  if (G.locked) return;
  G.locked = true;
  Input.reset();
  setControls(false);
  try {
    await fn();
  } catch (e) {
    console.error(e);
    showError('劇情執行錯誤：' + (e && e.message));
  } finally {
    Dialog.close();
    G.npcs.forEach((n) => { n.dir = n.baseDir; });
    G.locked = false;
    setControls(true);
    refreshHUD();
  }
}

function setControls(on) {
  $('#controls').hidden = !on;
  $('#hud').style.visibility = on ? '' : 'hidden';
  if (!on) Input.reset();
}

/* ---------- 對話系統 ---------- */
const Dialog = {
  typing: false, full: '', idx: 0, timer: null, onAdvance: null, choosing: false,
  open(who, face) {
    const sp = Story.speakers[who] || { name: who, look: null };
    const box = $('#dialog');
    $('#dialogLayer').hidden = false;
    box.className = '';
    if (!sp.look) box.classList.add('no-portrait');
    if (sp.cls) box.classList.add(sp.cls);
    $('#dlgName').textContent = sp.name || '';
    if (sp.look) {
      const cv = $('#portrait');
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const size = Math.max(64, Math.round(r.width * dpr));
      if (cv.width !== size) { cv.width = size; cv.height = size; }
      Art.portrait(cv, sp.look, face || 'normal');
    }
  },
  type(text) {
    clearInterval(this.timer);
    this.full = text; this.idx = 0; this.typing = true;
    const el = $('#dlgText');
    el.textContent = '';
    $('#dlgNext').hidden = true;
    this.timer = setInterval(() => {
      this.idx += 1;
      el.textContent = this.full.slice(0, this.idx);
      if (this.idx % 2 === 0) Sfx.blip();
      if (this.idx >= this.full.length) this.finish();
    }, 26);
  },
  finish() {
    clearInterval(this.timer);
    this.typing = false;
    $('#dlgText').textContent = this.full;
    $('#dlgNext').hidden = this.choosing;
    if (this.onTyped) { const f = this.onTyped; this.onTyped = null; f(); }
  },
  advance() {
    if (this.choosing && !this.typing) return;
    if (this.typing) { this.finish(); return; }
    if (this.onAdvance) { const f = this.onAdvance; this.onAdvance = null; f(); }
  },
  close() {
    clearInterval(this.timer);
    this.typing = false; this.choosing = false; this.onAdvance = null; this.onTyped = null;
    $('#dialogLayer').hidden = true;
    $('#choices').innerHTML = '';
  },
};

/** 顯示一句對話，玩家點擊後才繼續。face: normal / happy / angry / shock / deadpan / soft */
function say(who, text, face) {
  return new Promise((resolve) => {
    Dialog.choosing = false;
    $('#choices').innerHTML = '';
    Dialog.open(who, face);
    Dialog.type(text);
    Dialog.onAdvance = resolve;
  });
}
const narr = (text) => say('narr', text);

/** 顯示問題與選項，回傳選擇的索引 */
function choose(who, text, options, face) {
  return new Promise((resolve) => {
    Dialog.choosing = true;
    const box = $('#choices');
    box.innerHTML = '';
    Dialog.open(who, face);
    Dialog.onTyped = () => {
      const shownAt = performance.now();
      options.forEach((opt, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = opt;
        b.style.animationDelay = i * 0.06 + 's';
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (performance.now() - shownAt < 280) return; // 防止「跳過打字」的同一下誤選到選項
          Sfx.blip();
          Dialog.choosing = false;
          box.innerHTML = '';
          resolve(i);
        });
        box.appendChild(b);
      });
    };
    Dialog.type(text);
  });
}

/* ---------- 演出效果 ---------- */
function emote(id, icon, ms) { G.emotes = G.emotes.filter((e) => e.id !== id); G.emotes.push({ id, icon, until: G.time + (ms || 1400) / 1000, born: G.time }); }

function shake() {
  G.shakeT = 0.4;
  const app = $('#app');
  app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
}

let toastTimer = null;
function toast(text, ms) {
  const el = $('#toast');
  el.textContent = text; el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms || 2200);
}

let phoneTimer = null;
/** 手機訊息通知（不會擋住劇情），回傳 promise 讓劇情稍等一下 */
function phone(who, text) {
  const el = $('#phone');
  const sp = Story.speakers[who] || { name: who };
  el.querySelector('.phone-from').textContent = (sp.icon || '') + ' ' + sp.name;
  el.querySelector('.phone-text').textContent = text;
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  Sfx.phone();
  clearTimeout(phoneTimer);
  phoneTimer = setTimeout(() => { el.hidden = true; }, 5200);
  return wait(650);
}
function hidePhone() { clearTimeout(phoneTimer); $('#phone').hidden = true; }

/** 場景字卡（淡入淡出） */
function card(title, sub) {
  const el = $('#card');
  el.querySelector('.card-title').textContent = title;
  el.querySelector('.card-sub').textContent = sub || '';
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  return new Promise((r) => setTimeout(() => { el.hidden = true; r(); }, 1800));
}

/** 取得道具：放進回憶背包並跳出提示 */
function itemGet(id) {
  const it = Story.items[id];
  const st = G.state;
  if (!st.items.includes(id)) st.items.push(id);
  Sfx.item();
  $('#itemIcon').textContent = it.icon;
  $('#itemName').textContent = '【' + it.name + '】';
  $('#itemDesc').textContent = it.desc;
  const el = $('#itemGet');
  el.hidden = false;
  return new Promise((resolve) => {
    const close = () => { el.hidden = true; el.removeEventListener('click', close); resolve(); };
    setTimeout(() => el.addEventListener('click', close), 350);
  });
}

function hasItem(id) { return G.state.items.includes(id); }

function unlock(achId) {
  const st = G.state;
  if (st.ach.includes(achId)) return;
  st.ach.push(achId);
  const a = Story.achievements[achId];
  setTimeout(() => toast('🏆 成就解鎖：' + a.name, 2600), 50);
}

/* ---------- HUD / 背包 ---------- */
function refreshHUD() {
  if (!G.state) return;
  $('#objText').textContent = Story.objective(G.state);
}

function openBag() {
  if (G.locked) return;
  const list = $('#bagList');
  list.innerHTML = '';
  const items = G.state.items;
  if (!items.length) {
    const li = document.createElement('li'); li.className = 'empty'; li.textContent = '背包空空的。回憶還沒開始累積。'; list.appendChild(li);
  }
  items.forEach((id) => {
    const it = Story.items[id];
    const li = document.createElement('li');
    const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = it.icon;
    const box = document.createElement('div');
    const b = document.createElement('b'); b.textContent = it.name;
    const s = document.createElement('small'); s.textContent = it.desc;
    box.append(b, s); li.append(ic, box); list.appendChild(li);
  });
  $('#bag').hidden = false;
}

function confirmBox(text, okLabel, cancelLabel) {
  return new Promise((resolve) => {
    $('#confirmText').textContent = text;
    $('#confirmOk').textContent = okLabel || '確定';
    $('#confirmCancel').textContent = cancelLabel || '取消';
    $('#confirm').hidden = false;
    const done = (v) => { $('#confirm').hidden = true; $('#confirmOk').onclick = null; $('#confirmCancel').onclick = null; resolve(v); };
    $('#confirmOk').onclick = () => done(true);
    $('#confirmCancel').onclick = () => done(false);
  });
}

/* ---------- 存讀檔 ---------- */
function saveGame(silent) {
  const st = G.state, p = G.player;
  if (!st) return false;
  if (p) { st.x = p.moving ? p.tx : p.x; st.y = p.moving ? p.ty : p.y; st.dir = p.dir; }
  st.savedAt = Date.now();
  const ok = Store.save(st);
  if (!silent) toast(ok ? '💾 已存檔' : '⚠️ 存檔失敗：瀏覽器不允許儲存（可能是無痕模式）', 2600);
  else if (!ok && !G.warnedSave) { G.warnedSave = true; toast('⚠️ 自動存檔失敗：此瀏覽器無法儲存進度', 3000); }
  return ok;
}

function startNew() {
  G.state = newState();
  setupWorld();
  showScreen('game');
  refreshHUD();
  saveGame(true);
  runScript(Story.intro);
}

function continueGame() {
  const r = Store.load();
  if (!r.data) { toast('⚠️ ' + (r.error || '找不到存檔')); refreshTitle(); return; }
  G.state = Object.assign(newState(), r.data);
  setupWorld();
  showScreen('game');
  refreshHUD();
  toast('📂 讀取存檔成功');
}

async function goTitle(ask) {
  if (ask) {
    const ok = await confirmBox('要回到標題畫面嗎？\n（目前進度會自動存檔）', '回到標題', '繼續玩');
    if (!ok) return;
  }
  if (G.state && G.screen === 'game' && !G.locked) saveGame(true);
  Dialog.close();
  hidePhone();
  G.locked = false;
  setControls(true);
  $('#bag').hidden = true; $('#itemGet').hidden = true; $('#errorBar').hidden = true;
  showScreen('title');
}

/* ---------- 超市場景 ---------- */
function enterShop() {
  showScreen('shop');
  document.querySelectorAll('#shop .chip').forEach((c) => c.classList.remove('done'));
  setMood(0);
  drawShopBro();
}
function shopCheck(key) {
  const c = document.querySelector('#shop .chip[data-k="' + key + '"]');
  if (c) c.classList.add('done');
}
function setMood(n) { $('#moodFace').textContent = ['😊', '😐', '😠', '🌋'][Math.max(0, Math.min(3, n))]; }
function drawShopBro() {
  const cv = $('#shopBro');
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const ctx = cv.getContext('2d');
  const k = (r.height * dpr) / 50;
  ctx.setTransform(k, 0, 0, k, cv.width / 2, cv.height - 3 * k);
  Art.chibi(ctx, 0, 0, LOOKS.bro, { dir: 'up' });
  Art.fillRR(ctx, 6, -16, 12, 8, 2, '#e05a5a'); // 購物籃
}

/* ---------- 章節完成畫面 ---------- */
function showClear() {
  const st = G.state;
  const stats = $('#clearStats');
  stats.innerHTML = '';
  Story.clearStats(st).forEach((line) => { const li = document.createElement('li'); li.textContent = line; stats.appendChild(li); });
  const ach = $('#clearAch');
  ach.innerHTML = '';
  Object.entries(Story.achievements).forEach(([id, a]) => {
    const li = document.createElement('li');
    const got = st.ach.includes(id);
    li.className = got ? '' : 'locked';
    li.textContent = got ? '🏆 ' + a.name + '：' + a.desc : '🔒 ' + (a.hidden ? '？？？' : a.name) + '：' + (a.hint || a.desc);
    ach.appendChild(li);
  });
  showScreen('clear');
  $('#clear').scrollTop = 0;
}

/* ---------- 繪圖 ---------- */
function resize() {
  const h = window.innerHeight;
  document.documentElement.style.setProperty('--app-h', h + 'px');
  const cv = $('#view');
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  G.cw = r.width; G.ch = r.height;
  G.dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.max(1, Math.round(G.cw * G.dpr));
  cv.height = Math.max(1, Math.round(G.ch * G.dpr));
  G.ctx = cv.getContext('2d');
  // 橫式約顯示 8.5 格高，直式約 9 格寬
  G.scale = Math.max(0.8, Math.min(3.2, Math.min(G.ch / (TILE * 8.5), G.cw / (TILE * 9))));
  if (G.screen === 'title') drawTitleArt();
}

function camAxis(center, view, size) {
  const margin = TILE * 1.6; // 讓角落的物件不會被方向鍵蓋住
  if (view >= size + margin * 2) return (size - view) / 2;
  return Math.max(-margin, Math.min(size + margin - view, center - view / 2));
}

function playerPos() {
  const p = G.player;
  if (!p.moving) return [p.x, p.y];
  const k = p.prog;
  return [p.sx + (p.tx - p.sx) * k, p.sy + (p.ty - p.sy) * k];
}

function render() {
  const ctx = G.ctx;
  if (!ctx || !G.player) return;
  const map = Story.map, W = map[0].length, H = map.length, s = G.scale;
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  ctx.fillStyle = '#141b21';
  ctx.fillRect(0, 0, G.cw, G.ch);

  const [fx, fy] = playerPos();
  const camX = camAxis((fx + 0.5) * TILE, G.cw / s, W * TILE);
  const camY = camAxis((fy + 0.5) * TILE, G.ch / s, H * TILE);
  G.camX = camX; G.camY = camY;
  let ox = 0, oy = 0;
  if (G.shakeT > 0) { ox = (Math.random() - 0.5) * 6; oy = (Math.random() - 0.5) * 6; }
  ctx.setTransform(G.dpr * s, 0, 0, G.dpr * s, (-camX * s + ox) * G.dpr, (-camY * s + oy) * G.dpr);

  // 地板與家具
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) Art.tile(ctx, map, x, y, G.time);
  const rg = Story.rug; Art.rug(ctx, rg.x, rg.y, rg.w, rg.h);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (map[y][x] === 'S') Art.tile(ctx, map, x, y, G.time);
  // 點地圖的目的地標記
  if (G.marker) {
    const a = (G.time - G.marker.born) * 4;
    ctx.strokeStyle = 'rgba(255,204,129,' + (0.9 - (a % 1) * 0.6).toFixed(2) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(G.marker.x * TILE + 16, G.marker.y * TILE + 26, 7 + (a % 1) * 5, 3 + (a % 1) * 2, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // 角色與會遮擋的物件，依 y 排序
  const list = [];
  G.npcs.forEach((n) => list.push({ y: n.y + 0.5, draw: () => {
    Art.chibi(ctx, n.x * TILE + 16, n.y * TILE + (n.sitting ? 24 : 29), LOOKS[n.look], { dir: n.dir, t: G.time + n.t, sitting: n.sitting });
  } }));
  const p = G.player;
  list.push({ y: fy + 0.5, draw: () => {
    Art.chibi(ctx, fx * TILE + 16, fy * TILE + 29, LOOKS.bro, { dir: p.dir, t: p.moving ? p.walkT : G.time, moving: p.moving });
  } });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (map[y][x] === 'S') list.push({ y: y + 0.8, draw: () => Art.sofaBack(ctx, map, x, y) });
  }
  list.sort((a, b) => a.y - b.y).forEach((d) => d.draw());

  // 互動提示
  const t = G.target;
  if (t && !G.locked) {
    const bob = Math.sin(G.time * 6) * 2;
    const isNpc = t.kind === 'npc';
    bubble(ctx, t.x * TILE + 16, (isNpc ? headTop(G.npcs.find((n) => n.id === t.id)) : t.y * TILE - 2) + bob, isNpc ? '💬' : '🔍', 0.85);
  }
  // 表情符號
  G.emotes = G.emotes.filter((e) => e.until > G.time);
  G.emotes.forEach((e) => {
    let x, y;
    if (e.id === 'player') { x = fx * TILE + 16; y = fy * TILE + 29 + Art.metrics(LOOKS.bro).top - 6; }
    else { const n = G.npcs.find((m) => m.id === e.id); if (!n) return; x = n.x * TILE + 16; y = headTop(n); }
    const age = G.time - e.born;
    bubble(ctx, x, y - Math.min(1, age * 6) * 4, e.icon, Math.min(1, 0.4 + age * 5));
  });
}

/** NPC 頭頂上方的位置（放對話泡泡、表情） */
function headTop(n) {
  if (!n) return 0;
  const L = LOOKS[n.look], M = Art.metrics(L);
  return n.y * TILE + (n.sitting ? 24 + L.leg * 0.6 : 29) + M.top - 6;
}

function bubble(ctx, x, y, icon, k) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  Art.fillRR(ctx, -10, -12, 20, 18, 7, 'rgba(255,255,255,.95)');
  ctx.beginPath(); ctx.moveTo(-3, 5); ctx.lineTo(0, 10); ctx.lineTo(3, 5); ctx.fill();
  ctx.font = '12px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(icon, 0, -2.5);
  ctx.restore();
}

function drawTitleArt() {
  const cv = $('#titleArt');
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  const portrait = r.height > r.width;
  const k = portrait ? r.width / 160 : Math.min(r.height / 110, r.width / 260);
  const cx = portrait ? r.width / 2 : r.width * 0.77;
  const fy = portrait ? r.height * 0.3 : r.height * 0.72;
  ctx.save();
  ctx.translate(cx, fy);
  ctx.scale(k, k);
  Art.ell(ctx, 0, 2, 70, 9, 'rgba(0,0,0,.25)');
  Art.chibi(ctx, -48, -2, LOOKS.dad, { face: 'deadpan', noShadow: true });
  Art.chibi(ctx, 48, -2, LOOKS.sis, { face: 'happy', noShadow: true });
  Art.chibi(ctx, -22, 4, LOOKS.mom, { face: 'angry', noShadow: true });
  ctx.scale(1.25, 1.25);
  Art.chibi(ctx, 14, 6, LOOKS.bro, { face: 'shock', noShadow: true });
  ctx.restore();
}

/* ---------- 主迴圈 ---------- */
function update(dt) {
  G.time += dt;
  if (G.shakeT > 0) G.shakeT -= dt;
  const p = G.player;
  if (!p || G.screen !== 'game') return;
  const free = !G.locked && overlaysClosed();
  if (p.moving) {
    p.prog += dt / MOVE_TIME;
    p.walkT += dt;
    if (p.prog >= 1) {
      // 抵達這一格；若方向鍵還按著就無縫接著走下一格，不停頓
      const over = p.prog - 1;
      p.x = p.tx; p.y = p.ty; p.moving = false; p.prog = 0;
      if (free && stepFrom(true)) p.prog = Math.min(over, 0.9);
      else if (!G.path.length && G.pathTarget && free) arrive();
    }
  } else if (free) {
    stepFrom(false);
  }
  G.target = G.locked ? null : findTarget();
  const btn = $('#btnA');
  const ready = !!G.target;
  if (btn.classList.contains('ready') !== ready) btn.classList.toggle('ready', ready);
  const label = G.target ? G.target.label : '互動';
  if ($('#aLabel').textContent !== label) $('#aLabel').textContent = label;
  ambient(dt);
}

/** 依照方向鍵或自動路徑走一步；chaining = 剛走完一格接著走 */
function stepFrom(chaining) {
  const p = G.player;
  let d = Input.dir();
  const manual = !!d;
  if (!d && G.path.length) d = G.path.shift();
  if (!d) { if (G.marker && !G.pathTarget && !G.path.length) G.marker = null; return false; }
  // 輕點新方向：先轉身，按住超過一下下才開始走
  if (manual && !chaining && d !== Input.startDir && G.time - Input.since < TURN_DELAY) { p.dir = d; return false; }
  p.dir = d;
  const nx = p.x + DIRS[d][0], ny = p.y + DIRS[d][1];
  if (!walkable(nx, ny)) {
    if (!manual) { G.path = []; G.pathTarget = null; G.marker = null; } // 路被擋住就放棄
    return false;
  }
  Object.assign(p, { sx: p.x, sy: p.y, tx: nx, ty: ny, prog: 0, moving: true });
  return true;
}

let ambientT = 4;
function ambient(dt) {
  if (G.locked) return;
  ambientT -= dt;
  if (ambientT > 0) return;
  ambientT = 5 + Math.random() * 5;
  const pick = Story.ambient[Math.floor(Math.random() * Story.ambient.length)];
  if (pick) emote(pick[0], pick[1], 1600);
}

let last = 0, loopAlive = false;
function startLoop() { if (!loopAlive) { loopAlive = true; requestAnimationFrame(loop); } }
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;
  try {
    update(dt);
    if (G.screen === 'game') render();
  } catch (e) {
    console.error(e);
    showError(e.message);
    loopAlive = false;
    return; // 停止迴圈，避免錯誤洗版
  }
  requestAnimationFrame(loop);
}

/* ---------- 啟動 ---------- */
function boot() {
  if (typeof Story === 'undefined') { showError('劇情檔 story.js 載入失敗'); return; }
  // 檢查地圖格式，避免編輯錯誤導致無法遊玩
  const w = Story.map[0].length;
  Story.map.forEach((row, i) => { if (row.length !== w) throw new Error('地圖第 ' + i + ' 列長度錯誤'); });

  Sfx.on = Store.getPref('sound', true);
  $('#btnSound').textContent = Sfx.on ? '🔊' : '🔇';

  setupInput();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));

  $('#btnNew').addEventListener('click', async () => {
    Sfx.init();
    if (Store.load().data) {
      const ok = await confirmBox('已經有存檔了。\n開始新遊戲會覆蓋原本的進度，確定嗎？', '開始新遊戲', '取消');
      if (!ok) return;
    }
    startNew();
  });
  $('#btnContinue').addEventListener('click', () => { Sfx.init(); continueGame(); });
  $('#btnBag').addEventListener('click', openBag);
  $('#btnBagClose').addEventListener('click', () => { $('#bag').hidden = true; });
  $('#bag').addEventListener('click', (e) => { if (e.target.id === 'bag') $('#bag').hidden = true; });
  $('#btnSave').addEventListener('click', () => { if (!G.locked) saveGame(false); });
  $('#btnSound').addEventListener('click', () => {
    Sfx.on = !Sfx.on; Sfx.init();
    Store.setPref('sound', Sfx.on);
    $('#btnSound').textContent = Sfx.on ? '🔊' : '🔇';
    toast(Sfx.on ? '音效：開' : '音效：關');
  });
  $('#btnHome').addEventListener('click', () => { if (!G.locked) goTitle(true); });
  $('#btnClearTitle').addEventListener('click', () => goTitle(false));
  $('#btnClearRoam').addEventListener('click', () => {
    if (!G.player) setupWorld();
    showScreen('game'); refreshHUD();
  });
  // 對話：手指一碰就前進（比 click 更即時）；點在選項上則交給選項按鈕
  $('#dialogLayer').addEventListener('pointerdown', (e) => {
    if (e.target.closest('#choices')) return;
    e.preventDefault();
    Dialog.advance();
  });
  $('#btnRotateOk').addEventListener('click', () => { $('#rotate').classList.add('dismissed'); });
  $('#btnErrClose').addEventListener('click', () => { $('#errorBar').hidden = true; });
  $('#btnErrTitle').addEventListener('click', () => { $('#errorBar').hidden = true; goTitle(false); startLoop(); });

  showScreen('title');
  startLoop();
}

window.addEventListener('DOMContentLoaded', () => {
  try { boot(); } catch (e) { console.error(e); showError(e.message); }
});
