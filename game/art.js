/* =========================================================
 * art.js — 所有畫面都用 Canvas 程式繪製（暫代美術素材）
 * 之後若有正式素材，可在這裡改成 drawImage。
 * ========================================================= */
'use strict';

const TILE = 32;

/* ---------- Q 版角色外觀 ---------- */
const LOOKS = {
  // 哥哥：胖胖圓臉、短髮、眼鏡、宅宅
  bro: { skin: '#ffd9b8', hair: '#2b2320', style: 'short', glasses: true, shirt: '#5b8def', pants: '#3c4a5c', chubby: true },
  // 媽媽：捲髮、圍裙
  mom: { skin: '#ffd6b5', hair: '#5a3424', style: 'curly', shirt: '#d9566b', apron: '#fff1c7', pants: '#6b4e71' },
  // 爸爸：不戴眼鏡、安靜看電視
  dad: { skin: '#f4c9a3', hair: '#55524f', style: 'dad', shirt: '#6e8f5e', pants: '#4d5563' },
  // 妹妹：馬尾、吐槽役
  sis: { skin: '#ffe0c4', hair: '#3a2a28', style: 'pony', shirt: '#ffb347', pants: '#4f6d9a' },
};

const Art = (() => {
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, color) { ctx.fillStyle = color; rr(ctx, x, y, w, h, r); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

  /* ---------- 角色 ----------
   * (x, y) = 腳底中心。角色高約 42 單位（約 1.3 格）。
   * o: { dir, t, moving, face, sitting, noShadow } */
  function chibi(ctx, x, y, look, o) {
    o = o || {};
    const L = look, dir = o.dir || 'down', t = o.t || 0, face = o.face || 'normal';
    const cw = L.chubby ? 1.25 : 1, hw = L.chubby ? 1.12 : 1;
    const bob = o.moving ? Math.abs(Math.sin(t * 14)) * 1.5 : Math.sin(t * 2.2) * 0.5;
    const swing = o.moving ? Math.sin(t * 14) * 2.2 : 0;
    ctx.save();
    ctx.translate(x, y);
    if (!o.noShadow) ell(ctx, 0, 0, 10 * cw, 3.5, 'rgba(0,0,0,.22)');
    ctx.translate(0, -bob + (o.sitting ? 4 : 0));

    // 腳
    if (!o.sitting) {
      fillRR(ctx, -5.5, -7 + swing, 4, 7 - swing, 1.5, L.pants);
      fillRR(ctx, 1.5, -7 - swing, 4, 7 + swing, 1.5, L.pants);
      ell(ctx, -3.5, -0.6 + Math.max(0, swing) * 0, 2.6, 1.6, '#2a2a2a');
      ell(ctx, 3.5, -0.6, 2.6, 1.6, '#2a2a2a');
    }
    // 手
    ell(ctx, -(8 * cw + 1), -13 - swing * 0.6, 3, 3, L.skin);
    ell(ctx, 8 * cw + 1, -13 + swing * 0.6, 3, 3, L.skin);
    // 身體
    fillRR(ctx, -8 * cw, -19, 16 * cw, 13, 5, L.shirt);
    if (L.chubby && dir !== 'up') ell(ctx, 0, -11, 5.5, 3.5, 'rgba(255,255,255,.18)');
    if (L.apron && dir !== 'up') {
      fillRR(ctx, -5, -16, 10, 10, 2, L.apron);
      ell(ctx, 0, -10, 2, 1.2, '#f3a7b3');
    }
    // 頭
    ell(ctx, 0, -29, 11 * hw, 10.5, L.skin);
    if (dir === 'left') ell(ctx, 8 * hw, -28, 2, 2.6, L.skin);
    hair(ctx, L, dir, hw);
    if (dir !== 'up') faceParts(ctx, L, dir, face, hw);
    ctx.restore();
  }

  function hair(ctx, L, dir, hw) {
    const c = L.hair;
    ctx.fillStyle = c;
    if (dir === 'up') {
      ctx.beginPath(); ctx.ellipse(0, -30, 11.6 * hw, 10.8, 0, 0, Math.PI * 2); ctx.fill();
      if (L.style === 'curly') for (let i = -2; i <= 2; i++) ell(ctx, i * 4.5, -22, 3.6, 3.6, c);
      if (L.style === 'pony') { ell(ctx, 0, -24, 4.5, 6, c); ell(ctx, 0, -31, 2, 2, '#ff6f91'); }
      return;
    }
    const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    // 頭頂半圓
    ctx.beginPath(); ctx.ellipse(0, -31, 11.8 * hw, 9.8, 0, Math.PI, 0); ctx.fill();
    if (L.style === 'short') {
      for (let i = -2; i <= 2; i++) ell(ctx, i * 4 + side * 2, -33, 3.4, 3.2, c);
      ell(ctx, -10.5 * hw, -29, 2, 3.5, c); ell(ctx, 10.5 * hw, -29, 2, 3.5, c);
    } else if (L.style === 'curly') {
      for (let a = 0; a <= 8; a++) {
        const ang = Math.PI + (a / 8) * Math.PI;
        ell(ctx, Math.cos(ang) * 11, -30 + Math.sin(ang) * 10, 4.4, 4.4, c);
      }
      ell(ctx, -11.5, -24, 3.8, 4.5, c); ell(ctx, 11.5, -24, 3.8, 4.5, c);
    } else if (L.style === 'dad') {
      ctx.beginPath(); ctx.ellipse(0, -33, 11.2, 6.5, 0, Math.PI, 0); ctx.fill();
      ell(ctx, -10.5, -29, 1.8, 3, c); ell(ctx, 10.5, -29, 1.8, 3, c);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-3 + side * 2, -40, 1.2, 6);
    } else if (L.style === 'pony') {
      for (let i = -2; i <= 2; i++) ell(ctx, i * 3.8 + side * 2, -33, 3, 3.6, c);
      const px = side === 0 ? 11 : -side * 10;
      ell(ctx, px, -33, 4.5, 5.5, c);
      ell(ctx, px + (px > 0 ? 2 : -2), -26, 3.2, 5, c);
      ell(ctx, px * 0.85, -36, 1.8, 1.8, '#ff6f91');
    }
  }

  function faceParts(ctx, L, dir, face, hw) {
    const fx = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
    const ey = -27, ex = 4.3;
    const ink = '#2b2320';
    ctx.lineCap = 'round';
    // 腮紅
    ctx.globalAlpha = face === 'soft' || face === 'happy' ? 0.7 : 0.45;
    ell(ctx, fx - 7.5, -23, 2.4, 1.4, '#ff9aa8'); ell(ctx, fx + 7.5, -23, 2.4, 1.4, '#ff9aa8');
    ctx.globalAlpha = 1;
    // 眼睛
    for (const s of [-1, 1]) {
      const x = fx + s * ex;
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.3;
      if (face === 'happy' || face === 'soft') {
        ctx.beginPath(); ctx.arc(x, ey + 1, 2.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else if (face === 'deadpan') {
        ctx.beginPath(); ctx.moveTo(x - 2.2, ey); ctx.lineTo(x + 2.2, ey); ctx.stroke();
      } else if (face === 'shock') {
        ell(ctx, x, ey, 2.8, 2.8, '#fff'); ctx.beginPath(); ctx.arc(x, ey, 2.8, 0, Math.PI * 2); ctx.stroke();
        ell(ctx, x, ey, 0.9, 0.9, ink);
      } else {
        ell(ctx, x, ey, 1.6, 2.2, ink); ell(ctx, x + 0.5, ey - 0.8, 0.55, 0.55, '#fff');
        if (face === 'angry') {
          ctx.beginPath(); ctx.moveTo(x - 2.6 * s * -1, ey - 4.2); ctx.lineTo(x + 2.4 * s * -1, ey - 2.6); ctx.stroke();
        }
      }
    }
    // 眼鏡
    if (L.glasses) {
      ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = 1.1;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * ex, ey, 3.9, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(fx - 0.6, ey); ctx.lineTo(fx + 0.6, ey); ctx.stroke();
      ctx.globalAlpha = 0.5; ell(ctx, fx - ex + 1.2, ey - 1.5, 1, 0.6, '#fff'); ell(ctx, fx + ex + 1.2, ey - 1.5, 1, 0.6, '#fff'); ctx.globalAlpha = 1;
    }
    // 嘴巴
    ctx.strokeStyle = '#7a3b2e'; ctx.lineWidth = 1.2;
    const my = -21.5;
    if (face === 'happy') {
      ctx.fillStyle = '#7a3b2e'; ctx.beginPath(); ctx.arc(fx, my - 0.5, 2.4, 0, Math.PI); ctx.fill();
    } else if (face === 'angry') {
      ctx.beginPath(); ctx.arc(fx, my + 2, 2.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (face === 'shock') {
      ell(ctx, fx, my, 1.6, 2.1, '#7a3b2e');
    } else if (face === 'deadpan') {
      ctx.beginPath(); ctx.moveTo(fx - 2, my); ctx.lineTo(fx + 2, my); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(fx, my - 1, 2, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    }
  }

  /* 對話框頭像：只畫頭與肩膀，放大 */
  function portrait(canvas, lookId, face) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const look = LOOKS[lookId];
    if (!look) return;
    const k = (h * 0.31) / 11;
    ctx.translate(w / 2, h * 0.47 + 29 * k);
    ctx.scale(k, k);
    chibi(ctx, 0, 0, look, { face, noShadow: true });
  }

  /* ---------- 地圖 ---------- */
  const P = {
    wood1: '#c99b6b', wood2: '#b98a5c', kit1: '#efe9dc', kit2: '#d9d1c1',
    stone1: '#bdb6aa', stone2: '#aaa296', wallTop: '#4a3b36', wallFace: '#f2e0c6',
    stripe: '#e8d1b0', base: '#8a6448',
  };
  const FLOORS = '.,_';

  function at(map, x, y) { return (map[y] && map[y][x]) || '#'; }
  function floorFor(map, x, y) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
      const c = at(map, x + dx, y + dy);
      if (FLOORS.includes(c)) return c;
    }
    return '.';
  }

  function floor(ctx, ch, x, y) {
    const X = x * TILE, Y = y * TILE;
    if (ch === ',') {
      ctx.fillStyle = (x + y) % 2 ? P.kit1 : P.kit2; ctx.fillRect(X, Y, TILE, TILE);
    } else if (ch === '_') {
      ctx.fillStyle = P.stone1; ctx.fillRect(X, Y, TILE, TILE);
      ctx.fillStyle = P.stone2; ctx.fillRect(X, Y + 15, TILE, 1.5); ctx.fillRect(X + ((y % 2) ? 8 : 24), Y, 1.5, 15); ctx.fillRect(X + ((y % 2) ? 22 : 6), Y + 16, 1.5, 16);
    } else {
      ctx.fillStyle = P.wood1; ctx.fillRect(X, Y, TILE, TILE);
      ctx.fillStyle = P.wood2;
      for (let r = 0; r < 4; r++) {
        ctx.fillRect(X, Y + r * 8 + 7, TILE, 1);
        ctx.fillRect(X + ((x * 11 + y * 7 + r * 13) % 28) + 2, Y + r * 8, 1, 7);
      }
    }
  }

  function wallFace(ctx, X, Y) {
    ctx.fillStyle = P.wallTop; ctx.fillRect(X, Y, TILE, 6);
    ctx.fillStyle = P.wallFace; ctx.fillRect(X, Y + 6, TILE, TILE - 6);
    ctx.fillStyle = P.stripe; for (let i = 4; i < TILE; i += 8) ctx.fillRect(X + i, Y + 6, 2, TILE - 10);
    ctx.fillStyle = P.base; ctx.fillRect(X, Y + TILE - 4, TILE, 4);
  }

  function tile(ctx, map, x, y, t) {
    const ch = at(map, x, y), X = x * TILE, Y = y * TILE;
    if (FLOORS.includes(ch)) return floor(ctx, ch, x, y);
    if (ch === '#') {
      // 只有下方是地板時才畫牆面，其餘（含牆上家具的上方）畫成牆頂
      const below = at(map, x, y + 1);
      if (!FLOORS.includes(below)) { ctx.fillStyle = P.wallTop; ctx.fillRect(X, Y, TILE, TILE); }
      else wallFace(ctx, X, Y);
      return;
    }
    // 牆上物件：先畫牆面
    if ('CFVBK'.includes(ch)) wallFace(ctx, X, Y);
    else floor(ctx, floorFor(map, x, y), x, y);

    switch (ch) {
      case 'C': { // 流理台
        fillRR(ctx, X, Y + 10, TILE, 22, 2, '#9aa7b0');
        ctx.fillStyle = '#cfd8de'; ctx.fillRect(X, Y + 10, TILE, 8);
        if (x === 2) { ell(ctx, X + 10, Y + 14, 4, 2.4, '#3b3b3b'); ell(ctx, X + 22, Y + 14, 4, 2.4, '#3b3b3b'); }
        if (x === 4) fillRR(ctx, X + 6, Y + 11, 20, 6, 2, '#7d95a5');
        ctx.fillStyle = '#7f8d96'; ctx.fillRect(X + 15, Y + 20, 1.5, 12);
        break;
      }
      case 'F': { // 冰箱
        fillRR(ctx, X + 3, Y - 4, 26, 36, 3, '#f7f7f4');
        ctx.fillStyle = '#d7d7d2'; ctx.fillRect(X + 3, Y + 10, 26, 1.5);
        ctx.fillStyle = '#9a9a96'; ctx.fillRect(X + 24, Y, 2, 7); ctx.fillRect(X + 24, Y + 14, 2, 10);
        ell(ctx, X + 9, Y + 3, 2, 2, '#ff6f91'); ell(ctx, X + 14, Y + 18, 2, 2, '#ffcc4d');
        break;
      }
      case 'V': { // 電視
        fillRR(ctx, X - 4, Y + 22, TILE + 8, 10, 2, '#6b4a35');
        fillRR(ctx, X - 2, Y + 4, TILE + 4, 19, 2, '#1c1c1c');
        const hue = (t * 40) % 360;
        ctx.fillStyle = `hsl(${hue},60%,55%)`; ctx.fillRect(X + 1, Y + 7, TILE - 2, 13);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(X + 3, Y + 15 + Math.sin(t * 3) * 2, 10, 3);
        ell(ctx, X + 22, Y + 12 + Math.sin(t * 2) * 2, 4, 2, '#2d6fb8');
        break;
      }
      case 'B': { // 哥哥房門
        fillRR(ctx, X + 4, Y + 3, 24, 29, 2, '#8a5a3c');
        ctx.fillStyle = '#9c6a49'; ctx.fillRect(X + 7, Y + 6, 18, 10); ctx.fillRect(X + 7, Y + 18, 18, 11);
        ell(ctx, X + 23, Y + 19, 1.6, 1.6, '#ffd36b');
        fillRR(ctx, X + 9, Y + 7, 14, 8, 2, '#bfe3ff');
        ctx.fillStyle = '#2b4b7a'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('宅', X + 16, Y + 11.5);
        break;
      }
      case 'K': { // 公仔櫃
        fillRR(ctx, X + 2, Y + 4, 28, 28, 2, '#7a5640');
        ctx.fillStyle = '#5e4130'; ctx.fillRect(X + 4, Y + 15, 24, 2); ctx.fillRect(X + 4, Y + 26, 24, 2);
        const cols = ['#ff6f91', '#6fc3ff', '#ffd36b', '#9be38b'];
        for (let i = 0; i < 3; i++) {
          const c = cols[(i + x) % 4];
          fillRR(ctx, X + 6 + i * 8, Y + 9, 5, 6, 1, c); ell(ctx, X + 8.5 + i * 8, Y + 8, 2.4, 2.4, '#ffe0c4');
          fillRR(ctx, X + 6 + i * 8, Y + 20, 5, 6, 1, cols[(i + x + 2) % 4]); ell(ctx, X + 8.5 + i * 8, Y + 19, 2.4, 2.4, '#ffe0c4');
        }
        break;
      }
      case 'S': { // 沙發座位（椅背在 sofaBack 另外畫）
        const l = at(map, x - 1, y) === 'S', r = at(map, x + 1, y) === 'S';
        fillRR(ctx, X + (l ? 0 : 2), Y + 8, TILE - (l ? 0 : 2) - (r ? 0 : 2), 18, l || r ? 3 : 5, '#c0504d');
        ctx.fillStyle = '#d4625e'; ctx.fillRect(X + (l ? 1 : 4), Y + 10, TILE - (l ? 1 : 4) - (r ? 1 : 4), 10);
        ctx.fillStyle = '#a84341'; if (r) ctx.fillRect(X + TILE - 1, Y + 10, 1.5, 12);
        break;
      }
      case 'T': { // 餐桌
        const l = at(map, x - 1, y) === 'T', r = at(map, x + 1, y) === 'T', u = at(map, x, y - 1) === 'T', d = at(map, x, y + 1) === 'T';
        ctx.fillStyle = '#8b5e3c';
        ctx.fillRect(X + (l ? 0 : 3), Y + (u ? 0 : 3), TILE - (l ? 0 : 3) - (r ? 0 : 3), TILE - (u ? 0 : 3) - (d ? 0 : 1));
        ctx.fillStyle = '#a7744d';
        ctx.fillRect(X + (l ? 0 : 5), Y + (u ? 0 : 5), TILE - (l ? 0 : 5) - (r ? 0 : 5), TILE - (u ? 0 : 5) - (d ? 0 : 6));
        if (x === 4 && y === 6) { ell(ctx, X + 16, Y + 18, 5, 4, '#f4f4f4'); ell(ctx, X + 16, Y + 17, 3.5, 2.5, '#9cc76a'); }
        if (x === 5 && y === 7) { fillRR(ctx, X + 7, Y + 6, 14, 10, 1, '#6fa3d8'); ctx.fillStyle = '#fff'; ctx.fillRect(X + 13.5, Y + 6, 1, 10); }
        break;
      }
      case 'P': { // 盆栽
        ell(ctx, X + 16, Y + 28, 9, 3, 'rgba(0,0,0,.2)');
        fillRR(ctx, X + 9, Y + 18, 14, 11, 3, '#c46a3c');
        ell(ctx, X + 16, Y + 12, 9, 8, '#4f9a55'); ell(ctx, X + 10, Y + 9, 5, 5, '#5fb366'); ell(ctx, X + 21, Y + 7, 5, 5, '#5fb366'); ell(ctx, X + 16, Y + 4, 4, 4, '#6fc576');
        break;
      }
      case 'R': { // 鞋櫃
        fillRR(ctx, X + 3, Y + 2, 26, 28, 2, '#9b7653');
        ctx.fillStyle = '#7f5f41'; ctx.fillRect(X + 5, Y + 11, 22, 1.5); ctx.fillRect(X + 5, Y + 20, 22, 1.5);
        ell(ctx, X + 10, Y + 9, 3.5, 1.8, '#ff8fa3'); ell(ctx, X + 20, Y + 9, 3.5, 1.8, '#ff8fa3');
        ell(ctx, X + 11, Y + 18, 3.5, 1.8, '#444'); ell(ctx, X + 21, Y + 27, 3.5, 1.8, '#c9a227');
        break;
      }
      case 'E': { // 大門
        fillRR(ctx, X + 2, Y, 28, 32, 2, '#5b3a26');
        fillRR(ctx, X + 5, Y + 3, 22, 27, 2, '#7b4f33');
        fillRR(ctx, X + 9, Y + 6, 14, 8, 2, '#bfe3ff');
        ell(ctx, X + 8, Y + 19, 2, 2, '#ffd36b');
        break;
      }
    }
  }

  // 沙發椅背：放進深度排序，才能擋住坐著的爸爸
  function sofaBack(ctx, map, x, y) {
    const X = x * TILE, Y = y * TILE;
    const l = at(map, x - 1, y) === 'S', r = at(map, x + 1, y) === 'S';
    fillRR(ctx, X + (l ? 0 : 1), Y + 20, TILE - (l ? 0 : 1) - (r ? 0 : 1), 12, l || r ? 2 : 4, '#9e3b39');
    if (!l) fillRR(ctx, X, Y + 6, 6, 26, 3, '#a84341');
    if (!r) fillRR(ctx, X + TILE - 6, Y + 6, 6, 26, 3, '#a84341');
  }

  function rug(ctx, x, y, w, h) {
    const X = x * TILE + 4, Y = y * TILE + 2, W = w * TILE - 8, H = h * TILE - 4;
    fillRR(ctx, X, Y, W, H, 6, '#6f98bd');
    ctx.strokeStyle = '#f2e6c9'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    rr(ctx, X + 5, Y + 5, W - 10, H - 10, 4); ctx.stroke(); ctx.setLineDash([]);
  }

  return { chibi, portrait, tile, sofaBack, rug, rr, fillRR, ell, at };
})();
