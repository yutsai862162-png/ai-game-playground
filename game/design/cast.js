/* =========================================================
 * cast.js — 角色定稿候選（v5）
 * 統一規格：日系 Q 版、約 2.2 頭身、所有部件同一種深棕描線。
 * 表情只改五官，不改臉型／髮型／體型／衣著，確保一致。
 *
 * ⚠️ 目前沒有任何真人或原始參考圖，以下外觀全部依 Issue #1、#2 與
 *    遊戲總監的文字規格繪製；未明確指定的部分（髮色、服裝顏色等）
 *    標記為「暫定」，等總監確認。
 * ========================================================= */
'use strict';

const Cast = (() => {
  const OL = '#3b2a24';      // 統一描線色
  const INK = '#2b1f1c';     // 五官
  let LW = 1.1;              // 描線粗細（會跟著縮放）

  /* ---------- 繪圖小工具（全部帶描線） ---------- */
  function stroke(ctx) { ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.lineJoin = 'round'; ctx.stroke(); }
  function E(ctx, x, y, rx, ry, fill, noLine) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill(); if (!noLine) stroke(ctx);
  }
  function rrPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function R(ctx, x, y, w, h, r, fill, noLine) { rrPath(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (!noLine) stroke(ctx); }
  function P(ctx, pts, fill, noLine) { // 平滑多邊形
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (!noLine) stroke(ctx);
  }
  function L(ctx, x1, y1, x2, y2, c, w) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); }
  function A(ctx, x, y, r, a0, a1, c, w) { ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); }

  /* =========================================================
   * 角色資料
   * ========================================================= */
  const LOOKS = {
    bro: {
      kind: 'bro', name: '哥哥', role: '主角／勇者',
      skin: '#f6cfa9', cheek: '#f2a99b', hair: '#231c1a',
      shirt: '#6a8fcf', pants: '#7f7466', shoe: '#e9e6e0', shoe2: '#8d939b',
      head: [12.8, 11.6], torso: [27, 16], leg: 11, legW: 7.6, armW: 5.4, belly: 6.5,
      eyeStyle: 'small', glasses: true,
      expr: {
        relax: { label: '平常放鬆', brow: 'neutral', eye: 'open', mouth: 'smile', fx: ['blush'] },
        laugh: { label: '開心大笑', brow: 'up', eye: 'squint', mouth: 'laugh', fx: ['blush'] },
        smug: { label: '白目得意', brow: 'oneup', eye: 'smug', mouth: 'smirk' },
        nagged: { label: '被唸到無言', brow: 'neutral', eye: 'flat', mouth: 'flat', fx: ['gloom', 'sweat'] },
        panic: { label: '驚訝慌張', brow: 'worried', eye: 'wide', mouth: 'wavy', fx: ['sweat', 'sweat2'] },
        gentle: { label: '認真溫柔', brow: 'soft', eye: 'soft', mouth: 'soft', fx: ['blush'] },
      },
      alias: { normal: 'relax', happy: 'laugh', shock: 'panic', deadpan: 'nagged', angry: 'nagged', soft: 'gentle' },
    },
    dad: {
      kind: 'dad', name: '爸爸', role: '安靜看電視的爸爸',
      skin: '#e9bf98', cheek: '#e0a08c', hair: '#5f5a55', hairHi: '#8b857e',
      shirt: '#8b977c', pants: '#59606b', shoe: '#7c8796', shoe2: '#7c8796',
      head: [9.8, 11.8], torso: [19, 18], leg: 14, legW: 5.6, armW: 4.2, belly: 1.5,
      eyeStyle: 'narrow',
      expr: {
        calm: { label: '平靜', brow: 'neutral', eye: 'open', mouth: 'flat' },
        blank: { label: '放空', brow: 'high', eye: 'dot', mouth: 'o' },
        smile: { label: '淡笑', brow: 'neutral', eye: 'soft', mouth: 'soft' },
        helpless: { label: '無奈', brow: 'worried', eye: 'half', mouth: 'sigh', fx: ['sweat'] },
        puzzled: { label: '疑惑', brow: 'oneup', eye: 'open', mouth: 'o', fx: ['question'] },
        serious: { label: '難得認真', brow: 'firm', eye: 'open', mouth: 'flat' },
      },
      alias: { normal: 'calm', deadpan: 'blank', happy: 'smile', soft: 'smile', shock: 'puzzled', angry: 'serious' },
    },
    mom: {
      kind: 'mom', name: '媽媽', role: '家中的系統管理員',
      skin: '#f7cfae', cheek: '#ee9f98', hair: '#3f2620', lip: '#c9545e',
      shirt: '#b8566a', apron: '#f2e3c4', pants: '#5b4c68', shoe: '#c7a3b3', shoe2: '#c7a3b3',
      head: [10.6, 10.8], torso: [21, 16], leg: 12, legW: 5.6, armW: 4.4, belly: 1,
      eyeStyle: 'lash', handsOnHips: true,
      expr: {
        normal: { label: '平常', brow: 'neutral', eye: 'open', mouth: 'smile' },
        urge: { label: '催促', brow: 'furrow1', eye: 'open', mouth: 'open' },
        annoyed: { label: '不耐煩', brow: 'furrow', eye: 'half', mouth: 'pressed', fx: ['vein'] },
        command: { label: '強勢下指令', brow: 'firm', eye: 'sharp', mouth: 'shout' },
        pretend: { label: '假裝沒事', brow: 'up', eye: 'side', mouth: 'smile', fx: ['sweat'] },
        calm: { label: '難得平靜', brow: 'soft', eye: 'closed', mouth: 'soft' },
      },
      alias: { happy: 'normal', angry: 'command', shock: 'urge', deadpan: 'annoyed', soft: 'calm' },
    },
    sis: {
      kind: 'sis', name: '妹妹', role: '已搬出去住的吐槽役',
      skin: '#f8d6b8', cheek: '#f0a3a0', hair: '#2a2024', lip: '#b8545a',
      shirt: '#f3f1ec', outer: '#7b9cc0', pants: '#3b4560', shoe: '#f4f4f4', shoe2: '#cfd6de',
      head: [10, 10.4], torso: [17, 16], leg: 14, legW: 5, armW: 3.9, belly: 0,
      eyeStyle: 'sharp',
      expr: {
        normal: { label: '平常', brow: 'neutral', eye: 'open', mouth: 'soft' },
        smirk: { label: '吐槽笑', brow: 'oneup', eye: 'half', mouth: 'smirk' },
        speechless: { label: '無言', brow: 'neutral', eye: 'flat', mouth: 'flat', fx: ['sweat'] },
        eyeroll: { label: '翻白眼', brow: 'furrow1', eye: 'up', mouth: 'pressed' },
        laugh: { label: '大笑', brow: 'up', eye: 'squint', mouth: 'laugh', fx: ['blush'] },
        caring: { label: '認真關心', brow: 'worried', eye: 'open', mouth: 'soft' },
      },
      alias: { deadpan: 'smirk', happy: 'laugh', shock: 'speechless', angry: 'eyeroll', soft: 'caring' },
    },
    sil: {
      kind: 'sil', name: '未來大嫂', role: '平等的隊友（第一章未登場）',
      skin: '#f8d3b4', cheek: '#f3a3a3', hair: '#4a3026', lip: '#d4686e',
      shirt: '#9db59f', pants: '#9db59f', shoe: '#9a6b52', shoe2: '#9a6b52',
      head: [11.2, 10.9], torso: [20, 15], leg: 12, legW: 6, armW: 4.4, belly: 1.5,
      eyeStyle: 'round', skirt: true,
      expr: {
        normal: { label: '平常微笑', brow: 'neutral', eye: 'open', mouth: 'smile', fx: ['blush'] },
        happy: { label: '開心', brow: 'up', eye: 'happy', mouth: 'grin', fx: ['blush'] },
        shy: { label: '害羞', brow: 'worried', eye: 'closed', mouth: 'soft', fx: ['blush2'] },
        worried: { label: '擔心', brow: 'worried', eye: 'open', mouth: 'frown' },
        surprised: { label: '驚訝', brow: 'up', eye: 'wide', mouth: 'o' },
        support: { label: '認真支持', brow: 'neutral', eye: 'sharp', mouth: 'smile' },
      },
      alias: { soft: 'shy', shock: 'surprised', deadpan: 'worried', angry: 'support' },
    },
  };

  /** 角色骨架位置（腳底 = 0） */
  function metrics(Lk) {
    const [hx, hy] = Lk.head, [tw, th] = Lk.torso;
    const legTop = -Lk.leg;
    const torsoTop = legTop - th + 2;
    const headCY = torsoTop - hy + 3;
    return { hx, hy, tw, th, legTop, torsoTop, headCY, top: headCY - hy - (Lk.kind === 'bro' ? 3 : 1.5) };
  }

  function resolveExpr(Lk, face) {
    const key = Lk.expr[face] ? face : (Lk.alias[face] || Object.keys(Lk.expr)[0]);
    return Lk.expr[key] || Lk.expr[Object.keys(Lk.expr)[0]];
  }

  /* =========================================================
   * 全身
   * ========================================================= */
  function draw(ctx, x, y, Lk, o) {
    o = o || {};
    const dir = o.dir || 'down', t = o.t || 0;
    const M = metrics(Lk);
    const step = o.moving ? Math.sin(t * 16) : 0;
    const bob = o.moving ? Math.abs(step) * 1.4 : Math.sin(t * 2) * 0.4;
    const scale = Math.abs(ctx.getTransform().a) || 1;
    LW = Math.max(0.9, 1.6 / Math.sqrt(scale)) ; // 放大時描線不會太粗
    ctx.save();
    ctx.translate(x, y);
    if (!o.noShadow) E(ctx, 0, 0, M.tw / 2 + 3, 3.4, 'rgba(0,0,0,.2)', true);
    ctx.translate(0, -bob);
    if (dir === 'left') ctx.scale(-1, 1);
    const side = dir === 'left' || dir === 'right';
    const back = dir === 'up';

    backHair(ctx, Lk, M, back);
    if (!o.sitting) legs(ctx, Lk, M, step, side);
    torso(ctx, Lk, M, back, side);
    arms(ctx, Lk, M, step, back, side);
    head(ctx, Lk, M, back, side);
    if (!back) faceParts(ctx, Lk, M, side ? M.hx * 0.32 : 0, resolveExpr(Lk, o.face || 'normal'), side);
    frontHair(ctx, Lk, M, back, side);
    if (Lk.glasses && !back) glasses(ctx, M, side ? M.hx * 0.32 : 0, side);
    ctx.restore();
  }

  function legs(ctx, Lk, M, step, side) {
    const w = Lk.legW, gap = side ? 0.5 : Lk.torso[0] * 0.08;
    const s1 = step * 2.2, s2 = -step * 2.2;
    for (const [sx, s] of [[-1, s1], [1, s2]]) {
      const lx = side ? -w / 2 + s * 0.6 : sx * (gap + w / 2) - w / 2;
      const top = M.legTop - 1;
      if (Lk.skirt) {
        R(ctx, lx + 1, top + 3, w - 2, -top - 3 - 1.5, 2, Lk.skin);
      } else {
        R(ctx, lx, top, w, -top - 1.5 + (side ? 0 : s * 0.25), 2.2, Lk.pants);
      }
      E(ctx, lx + w / 2 + (side ? 1.2 : 0), -1.4, w / 2 + 1.2, 2, Lk.shoe);
      if (Lk.shoe2 !== Lk.shoe) L(ctx, lx + 1, -1.2, lx + w - 1, -1.2, Lk.shoe2, 1);
    }
  }

  function torso(ctx, Lk, M, back, side) {
    const [tw] = Lk.torso, top = M.torsoTop, bot = M.legTop + 1;
    const w = side ? tw * 0.8 : tw, b = Lk.belly;
    // 上衣：肩膀圓、肚子可以凸
    P(ctx, [
      [-w / 2 + 2, top], [w / 2 - 2, top], [w / 2 + 1, top + 3, w / 2 + 0.5 + b * 0.3, top + 7],
      [w / 2 + b, (top + bot) / 2 + 2, w / 2 - 1, bot], [-w / 2 + 1, bot],
      [-w / 2 - b, (top + bot) / 2 + 2, -w / 2 - 0.5 - b * 0.3, top + 7], [-w / 2 - 1, top + 3, -w / 2 + 2, top],
    ], Lk.shirt);
    if (Lk.skirt) { // 裙子
      P(ctx, [[-w / 2 + 0.5, bot - 3], [w / 2 - 0.5, bot - 3], [w / 2 + 2.5, bot + 4], [-w / 2 - 2.5, bot + 4]], Lk.pants);
    }
    if (back) return;
    if (Lk.kind === 'mom') { // 圍裙
      P(ctx, [[-w / 2 + 4, top + 5], [w / 2 - 4, top + 5], [w / 2 - 2.5, bot + 1], [-w / 2 + 2.5, bot + 1]], Lk.apron);
      R(ctx, -3.5, bot - 6, 7, 4, 1.5, '#e6cfa3');
    }
    if (Lk.outer) { // 敞開的外套
      const ow = side ? 0 : 5.2;
      P(ctx, [[-w / 2 + 1.5, top + 0.5], [-ow + 0.5, top + 0.5], [-ow, bot], [-w / 2 - Lk.belly + 0.5, bot]], Lk.outer);
      if (!side) P(ctx, [[w / 2 - 1.5, top + 0.5], [ow - 0.5, top + 0.5], [ow, bot], [w / 2 + Lk.belly - 0.5, bot]], Lk.outer);
    }
    // 領口
    if (!side) A(ctx, 0, top - 0.5, 3.6, Math.PI * 0.15, Math.PI * 0.85, OL, LW * 0.9);
  }

  function arms(ctx, Lk, M, step, back, side) {
    const aw = Lk.armW, top = M.torsoTop + 1.5, len = Lk.torso[1] - 1;
    const sleeve = Lk.outer || Lk.shirt;
    if (Lk.handsOnHips && !back && !side) {
      // 雙手叉腰：手肘往外，手放在腰上
      for (const s of [-1, 1]) {
        const sx = s * (Lk.torso[0] / 2 + 0.5);
        P(ctx, [[sx, top], [sx + s * 5.5, top + len * 0.45], [sx + s * 1.5, top + len * 0.8],
          [sx - s * 0.5, top + len * 0.62], [sx + s * 2.2, top + len * 0.45], [sx - s * 1.5, top + 3]], sleeve);
        E(ctx, sx - s * 0.2, top + len * 0.72, 2.2, 2.1, Lk.skin);
      }
      return;
    }
    const sides = side ? [1] : [-1, 1];
    for (const s of sides) {
      const sw = (s < 0 ? step : -step) * 2.4;
      const sx = side ? sw * 0.6 : s * (Lk.torso[0] / 2 + Lk.belly * 0.5 + aw * 0.25);
      ctx.save();
      ctx.translate(sx, top);
      ctx.rotate(side ? sw * 0.06 : s * 0.12);
      R(ctx, -aw / 2, 0, aw, len * 0.62, aw / 2, sleeve);
      R(ctx, -aw / 2 + 0.4, len * 0.5, aw - 0.8, len * 0.4, aw / 2, Lk.skin);
      ctx.restore();
    }
  }

  function head(ctx, Lk, M, back, side) {
    const { hx, hy, headCY: cy } = M;
    if (!back && !side) { E(ctx, -hx + 0.3, cy + 1.2, 2.1, 2.8, Lk.skin); E(ctx, hx - 0.3, cy + 1.2, 2.1, 2.8, Lk.skin); }
    if (side) E(ctx, -hx * 0.25, cy + 1.2, 2.1, 2.8, Lk.skin);
    // 臉型：哥哥與大嫂臉頰較肉、下巴圓；爸爸臉較長
    ctx.beginPath();
    const jaw = Lk.kind === 'bro' ? 1.12 : Lk.kind === 'sil' ? 1.06 : Lk.kind === 'dad' ? 0.84 : 0.92;
    ctx.moveTo(-hx, cy);
    ctx.bezierCurveTo(-hx, cy - hy * 1.35, hx, cy - hy * 1.35, hx, cy);
    ctx.bezierCurveTo(hx * jaw, cy + hy * 0.75, hx * 0.45, cy + hy, 0, cy + hy);
    ctx.bezierCurveTo(-hx * 0.45, cy + hy, -hx * jaw, cy + hy * 0.75, -hx, cy);
    ctx.closePath(); ctx.fillStyle = Lk.skin; ctx.fill(); stroke(ctx);
  }

  /* ---------- 頭髮：後層（在身體後面） ---------- */
  function backHair(ctx, Lk, M, back) {
    const { hx, hy, headCY: cy } = M, c = Lk.hair;
    if (Lk.kind === 'sis') { // 過肩長直髮
      R(ctx, -hx - 1.6, cy - hy * 0.4, 2 * hx + 3.2, hy * 2.1, 5, c);
    } else if (Lk.kind === 'sil') { // 及肩短髮，髮尾內彎
      R(ctx, -hx - 2.2, cy - hy * 0.3, 2 * hx + 4.4, hy * 1.45, 6, c);
    } else if (Lk.kind === 'mom') { // 齊下巴、有層次
      R(ctx, -hx - 2.4, cy - hy * 0.4, 2 * hx + 4.8, hy * 1.2, 6, c);
    }
  }

  /* ---------- 頭髮：前層 ---------- */
  function frontHair(ctx, Lk, M, back, side) {
    const { hx, hy, headCY: cy } = M, c = Lk.hair, k = Lk.kind;
    const sx = side ? hx * 0.25 : 0;
    if (back) {
      // 背面：整顆頭被頭髮蓋住
      ctx.beginPath(); ctx.moveTo(-hx - (k === 'bro' || k === 'dad' ? 0.6 : 2), cy + (k === 'bro' || k === 'dad' ? hy * 0.25 : hy * 0.5));
      ctx.bezierCurveTo(-hx - 2, cy - hy * 1.45, hx + 2, cy - hy * 1.45, hx + (k === 'bro' || k === 'dad' ? 0.6 : 2), cy + (k === 'bro' || k === 'dad' ? hy * 0.25 : hy * 0.5));
      ctx.quadraticCurveTo(0, cy + hy * (k === 'bro' || k === 'dad' ? 0.55 : 0.9), -hx - 0.6, cy + hy * 0.25);
      ctx.closePath(); ctx.fillStyle = c; ctx.fill(); stroke(ctx);
      if (k === 'dad') { ctx.globalAlpha = 0.5; for (const d of [-3, 1, 4]) L(ctx, d, cy - hy * 0.8, d + 1, cy - hy * 0.1, Lk.hairHi, 0.8); ctx.globalAlpha = 1; }
      return;
    }
    if (k === 'bro') {
      // 短黑髮：頭頂有份量、兩側剪短（只到耳朵上方），瀏海短、不遮眉
      P(ctx, [
        [-hx - 0.4, cy - hy * 0.15], [-hx - 1, cy - hy * 0.9, -hx * 0.4, cy - hy * 1.2],
        [hx * 0.5 + sx, cy - hy * 1.25, hx + 0.8, cy - hy * 0.6], [hx + 0.4, cy - hy * 0.15],
        [hx - 1.2, cy - hy * 0.35], [hx * 0.55 + sx, cy - hy * 0.52], [hx * 0.25 + sx, cy - hy * 0.42],
        [-hx * 0.05 + sx, cy - hy * 0.55], [-hx * 0.35 + sx, cy - hy * 0.44], [-hx * 0.7 + sx, cy - hy * 0.55], [-hx + 1.2, cy - hy * 0.35],
      ], c);
      return;
    }
    if (k === 'dad') {
      // 自然短髮、髮線略高、帶一點灰
      P(ctx, [
        [-hx - 0.3, cy - hy * 0.1], [-hx - 0.6, cy - hy * 1.0, -hx * 0.3, cy - hy * 1.2],
        [hx * 0.6, cy - hy * 1.22, hx + 0.6, cy - hy * 0.55], [hx + 0.3, cy - hy * 0.1],
        [hx - 1, cy - hy * 0.5], [hx * 0.3 + sx, cy - hy * 0.72, -hx * 0.4 + sx, cy - hy * 0.68], [-hx + 1, cy - hy * 0.5],
      ], c);
      ctx.globalAlpha = 0.55;
      for (const d of [-4, -1, 2.5, 5]) L(ctx, d + sx, cy - hy * 1.05, d + sx - 1.5, cy - hy * 0.75, Lk.hairHi, 0.8);
      ctx.globalAlpha = 1;
      return;
    }
    if (k === 'mom') {
      // 有精神的短髮：旁分、往後梳出一點份量，不是爆炸頭
      P(ctx, [
        [-hx - 2.4, cy + hy * 0.15], [-hx - 2.6, cy - hy * 1.1, 0, cy - hy * 1.28],
        [hx + 2.6, cy - hy * 1.1, hx + 2.4, cy + hy * 0.15], [hx + 0.2, cy + hy * 0.05],
        [hx * 0.9, cy - hy * 0.45, hx * 0.25 + sx, cy - hy * 0.62],
        [-hx * 0.45 + sx, cy - hy * 0.42, -hx * 0.8, cy - hy * 0.1], [-hx - 0.2, cy + hy * 0.05],
      ], c);
      L(ctx, -hx * 0.35 + sx, cy - hy * 1.15, -hx * 0.15 + sx, cy - hy * 0.7, 'rgba(255,255,255,.18)', 0.8);
      return;
    }
    if (k === 'sis') {
      // 黑長直髮，旁分，瀏海往一側撥
      P(ctx, [
        [-hx - 1.6, cy + hy * 0.6], [-hx - 2, cy - hy * 1.2, 0, cy - hy * 1.3],
        [hx + 2, cy - hy * 1.2, hx + 1.6, cy + hy * 0.6], [hx - 0.4, cy + hy * 0.6],
        [hx - 0.2, cy - hy * 0.25], [hx * 0.55 + sx, cy - hy * 0.55, -hx * 0.2 + sx, cy - hy * 0.75],
        [-hx * 0.7 + sx, cy - hy * 0.3, -hx + 0.4, cy + hy * 0.1], [-hx + 0.4, cy + hy * 0.6],
      ], c);
      return;
    }
    // 未來大嫂：及肩、髮尾內彎、柔軟的空氣瀏海
    P(ctx, [
      [-hx - 2.2, cy + hy * 0.5], [-hx - 2.8, cy - hy * 1.15, 0, cy - hy * 1.3],
      [hx + 2.8, cy - hy * 1.15, hx + 2.2, cy + hy * 0.5], [hx + 0.2, cy + hy * 0.45],
      [hx, cy - hy * 0.3], [hx * 0.6 + sx, cy - hy * 0.42], [hx * 0.3 + sx, cy - hy * 0.55], [0 + sx, cy - hy * 0.42],
      [-hx * 0.3 + sx, cy - hy * 0.55], [-hx * 0.6 + sx, cy - hy * 0.42], [-hx, cy - hy * 0.3], [-hx - 0.2, cy + hy * 0.45],
    ], c);
  }

  /* ---------- 眼鏡（哥哥）：適中大小的黑框 ---------- */
  function glasses(ctx, M, fx, side) {
    const ey = M.headCY + M.hy * 0.12, ex = M.hx * 0.42;
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#1c1c1c';
    for (const s of side ? [1] : [-1, 1]) { rrPath(ctx, fx + s * ex - 3.6, ey - 2.8, 7.2, 5.6, 1.8); ctx.stroke(); }
    if (side) { L(ctx, fx + ex - 3.6, ey - 1, -M.hx * 0.2, ey - 1.5, '#1c1c1c', 1); return; }
    L(ctx, fx - ex + 3.6, ey - 0.8, fx + ex - 3.6, ey - 0.8, '#1c1c1c', 1);
    L(ctx, fx - ex - 3.6, ey - 1, -M.hx + 0.5, ey - 1.6, '#1c1c1c', 1);
    L(ctx, fx + ex + 3.6, ey - 1, M.hx - 0.5, ey - 1.6, '#1c1c1c', 1);
  }

  /* =========================================================
   * 五官（表情）
   * ========================================================= */
  function faceParts(ctx, Lk, M, fx, e, side) {
    const { hx, hy, headCY: cy } = M;
    const ey = cy + hy * 0.12, ex = hx * 0.42, my = cy + hy * 0.58, by = ey - (Lk.glasses ? 4.6 : 4);
    const eyes = side ? [1] : [-1, 1];
    const fxs = e.fx || [];

    // 腮紅
    if (fxs.includes('blush') || fxs.includes('blush2') || Lk.kind === 'bro' || Lk.kind === 'sil') {
      ctx.globalAlpha = fxs.includes('blush2') ? 0.85 : fxs.includes('blush') ? 0.55 : 0.32;
      for (const s of eyes) E(ctx, fx + s * hx * 0.62, my - 2, Lk.kind === 'bro' || Lk.kind === 'sil' ? 3.2 : 2.4, 1.5, Lk.cheek, true);
      ctx.globalAlpha = 1;
    }

    // 眉毛
    const bw = Lk.kind === 'dad' ? 1.5 : Lk.kind === 'bro' ? 1.35 : 1.1;
    const bc = Lk.kind === 'dad' ? '#4a4541' : INK;
    for (const s of eyes) {
      const x = fx + s * ex;
      switch (e.brow) {
        case 'up': A(ctx, x, by + 1.6, 3, Math.PI * 1.2, Math.PI * 1.8, bc, bw); break;
        case 'high': L(ctx, x - 2.4, by - 1.2, x + 2.4, by - 1.2, bc, bw); break;
        case 'furrow': L(ctx, x + s * 2.6, by - 1.2, x - s * 2.2, by + 0.9, bc, bw + 0.2); break;
        case 'furrow1': L(ctx, x + s * 2.6, by - 0.7, x - s * 2.2, by + 0.4, bc, bw); break;
        case 'worried': L(ctx, x + s * 2.6, by + 0.6, x - s * 2.2, by - 0.9, bc, bw); break;
        case 'soft': A(ctx, x, by + 2, 3, Math.PI * 1.25, Math.PI * 1.75, bc, bw * 0.9); break;
        case 'firm': L(ctx, x + s * 2.7, by - 0.5, x - s * 2.3, by + 0.3, bc, bw + 0.35); break;
        case 'oneup':
          if (s > 0) A(ctx, x, by + 0.6, 3, Math.PI * 1.2, Math.PI * 1.8, bc, bw);
          else L(ctx, x - 2.4, by + 0.6, x + 2.4, by + 0.6, bc, bw);
          break;
        default: L(ctx, x - 2.4, by, x + 2.4, by - 0.2, bc, bw);
      }
    }

    // 眼睛
    for (const s of eyes) {
      const x = fx + s * ex;
      eye(ctx, Lk, x, ey, s, e.eye === 'smug' ? (s < 0 ? 'half' : 'open') : e.eye);
    }

    // 嘴巴
    mouth(ctx, Lk, fx, my, e.mouth);

    // 效果
    if (fxs.includes('sweat')) drop(ctx, fx + hx * 0.85, cy - hy * 0.25);
    if (fxs.includes('sweat2')) drop(ctx, fx - hx * 0.9, cy - hy * 0.05);
    if (fxs.includes('gloom')) { ctx.globalAlpha = 0.45; for (const d of [-4, -1.5, 1, 3.5]) L(ctx, fx + d, cy - hy * 0.9, fx + d, cy - hy * 0.45, '#5a6fa8', 0.9); ctx.globalAlpha = 1; }
    if (fxs.includes('vein')) {
      const vx = fx + hx * 0.55, vy = cy - hy * 0.55;
      for (const [a, b] of [[0, 0.5], [0.5, 1], [1, 1.5], [1.5, 2]]) A(ctx, vx, vy, 2.2, Math.PI * a + 0.3, Math.PI * b - 0.3, '#d23a3a', 1);
    }
    if (fxs.includes('question')) {
      ctx.fillStyle = '#4d6fd0'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', fx + hx + 3, cy - hy * 0.9);
    }
  }

  function drop(ctx, x, y) {
    ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.quadraticCurveTo(x + 2, y + 0.6, x, y + 1.4); ctx.quadraticCurveTo(x - 2, y + 0.6, x, y - 2.6);
    ctx.fillStyle = '#9fd3f5'; ctx.fill(); ctx.lineWidth = 0.6; ctx.strokeStyle = '#4c8fc0'; ctx.stroke();
  }

  function eye(ctx, Lk, x, y, s, type) {
    const st = Lk.eyeStyle;
    const size = st === 'round' ? 1.15 : st === 'small' ? 0.85 : st === 'narrow' ? 0.8 : 1;
    switch (type) {
      case 'squint': // > < 笑到瞇眼
        L(ctx, x + s * 2.1, y - 1.7, x - s * 1.5, y, INK, 1.3); L(ctx, x - s * 1.5, y, x + s * 2.1, y + 1.7, INK, 1.3); return;
      case 'happy': A(ctx, x, y + 1.2, 2.3 * size + 0.3, Math.PI * 1.15, Math.PI * 1.85, INK, 1.3); return;
      case 'closed': A(ctx, x, y - 0.8, 2.3 * size + 0.3, Math.PI * 0.15, Math.PI * 0.85, INK, 1.2); return;
      case 'flat': L(ctx, x - 2.3, y, x + 2.3, y, INK, 1.3); return;
      case 'dot': E(ctx, x, y - 0.6, 0.9, 0.9, INK, true); return;
      case 'wide':
        E(ctx, x, y, 2.9 * size, 3 * size, '#fff', true); A(ctx, x, y, 2.9 * size, 0, Math.PI * 2, INK, 1);
        E(ctx, x, y, 1, 1, INK, true); return;
      case 'up':
        E(ctx, x, y, 2.3, 2.7, '#fff', true); A(ctx, x, y, 2.3, 0, Math.PI * 2, INK, 0.9);
        E(ctx, x + 0.2, y - 1.6, 1.3, 1, INK, true); L(ctx, x - 2.5, y - 2.4, x + 2.5, y - 2.4, INK, 1.2); return;
      case 'half':
        E(ctx, x, y + 0.5, 1.7 * size, 1.4 * size, INK, true);
        L(ctx, x - 2.6, y - 0.6, x + 2.6, y - 0.6, INK, 1.4); return;
      case 'soft':
        E(ctx, x, y + 0.6, 1.5 * size, 1.3 * size, INK, true);
        A(ctx, x, y + 2.2, 2.8, Math.PI * 1.15, Math.PI * 1.85, INK, 1.1); return;
      case 'side':
        E(ctx, x + 1.1, y, 1.6 * size, 2 * size, INK, true); L(ctx, x - 2.4, y - 1.8, x + 2.4, y - 1.8, INK, 1); return;
      case 'sharp': // 眼神銳利（下指令）
        E(ctx, x, y + 0.3, 1.7, 1.9, INK, true); E(ctx, x + 0.5, y - 0.4, 0.5, 0.5, '#fff', true);
        L(ctx, x + s * 2.6, y - 2.4, x - s * 2.4, y - 1.3, INK, 1.5); return;
      default: { // open
        if (st === 'narrow') { // 爸爸：小眼睛＋眼皮線
          L(ctx, x - 2.4, y - 1.2, x + 2.4, y - 1.2, INK, 1.1); E(ctx, x, y, 1.3, 1.3, INK, true); return;
        }
        const rx = st === 'round' ? 2.1 : st === 'small' ? 1.4 : 1.7, ry = st === 'round' ? 2.6 : st === 'small' ? 1.8 : 2.2;
        E(ctx, x, y, rx, ry, INK, true);
        E(ctx, x + rx * 0.35, y - ry * 0.4, rx * 0.35, rx * 0.35, '#fff', true);
        if (st === 'round') E(ctx, x - rx * 0.3, y + ry * 0.4, 0.4, 0.4, '#fff', true);
        if (st === 'lash' || st === 'sharp') L(ctx, x + s * rx * 0.8, y - ry * 0.7, x + s * (rx + 1.2), y - ry - 0.4, INK, 1);
        if (st === 'sharp') L(ctx, x - 2.2, y - ry - 0.1, x + 2.2, y - ry + 0.2, INK, 1.3);
      }
    }
  }

  function mouth(ctx, Lk, x, y, type) {
    const lip = Lk.lip || '#8a4a3c';
    const fillIn = (pathFn, tongue) => {
      ctx.beginPath(); pathFn(); ctx.closePath(); ctx.fillStyle = '#8a3b36'; ctx.fill();
      ctx.lineWidth = 0.9; ctx.strokeStyle = INK; ctx.stroke();
      if (tongue) { ctx.save(); ctx.clip(); E(ctx, x, y + 2.6, 2.2, 1.4, '#e98b8b', true); ctx.restore(); }
    };
    switch (type) {
      case 'smile': A(ctx, x, y - 1.6, 2.6, Math.PI * 0.2, Math.PI * 0.8, lip, 1.2); return;
      case 'soft': A(ctx, x, y - 1, 1.8, Math.PI * 0.25, Math.PI * 0.75, lip, 1.1); return;
      case 'flat': L(ctx, x - 2, y, x + 2, y, lip, 1.2); return;
      case 'pressed': L(ctx, x - 2.2, y + 0.3, x + 1.8, y - 0.3, lip, 1.4); return;
      case 'o': E(ctx, x, y, 1.1, 1.3, '#8a3b36', true); return;
      case 'sigh': E(ctx, x + 1.2, y, 1.4, 0.9, '#8a3b36', true); return;
      case 'frown': A(ctx, x, y + 1.8, 2.2, Math.PI * 1.2, Math.PI * 1.8, lip, 1.2); return;
      case 'smirk':
        ctx.beginPath(); ctx.moveTo(x - 2.2, y); ctx.quadraticCurveTo(x + 0.5, y + 0.9, x + 2.6, y - 1.4);
        ctx.strokeStyle = lip; ctx.lineWidth = 1.2; ctx.stroke(); return;
      case 'wavy':
        ctx.beginPath(); ctx.moveTo(x - 2.6, y);
        for (let i = 1; i <= 4; i++) ctx.lineTo(x - 2.6 + i * 1.3, y + (i % 2 ? -0.9 : 0.6));
        ctx.strokeStyle = lip; ctx.lineWidth = 1.1; ctx.stroke(); return;
      case 'open': fillIn(() => ctx.ellipse(x, y + 0.2, 1.8, 1.6, 0, 0, Math.PI * 2)); return;
      case 'shout': fillIn(() => { ctx.moveTo(x - 2.8, y - 0.8); ctx.lineTo(x + 2.8, y - 0.8); ctx.quadraticCurveTo(x + 2.4, y + 3, x, y + 3); ctx.quadraticCurveTo(x - 2.4, y + 3, x - 2.8, y - 0.8); }, true); return;
      case 'grin': fillIn(() => { ctx.moveTo(x - 2.6, y - 0.6); ctx.lineTo(x + 2.6, y - 0.6); ctx.quadraticCurveTo(x + 2.2, y + 2.6, x, y + 2.6); ctx.quadraticCurveTo(x - 2.2, y + 2.6, x - 2.6, y - 0.6); }, true); return;
      case 'laugh': fillIn(() => { ctx.moveTo(x - 3.4, y - 1); ctx.lineTo(x + 3.4, y - 1); ctx.quadraticCurveTo(x + 3, y + 3.8, x, y + 3.8); ctx.quadraticCurveTo(x - 3, y + 3.8, x - 3.4, y - 1); }, true); return;
      default: A(ctx, x, y - 1.6, 2.6, Math.PI * 0.2, Math.PI * 0.8, lip, 1.2);
    }
  }

  /** 對話立繪（同一個模型放大裁切成半身，保證和地圖上一致） */
  function portrait(canvas, id, face) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const Lk = LOOKS[id];
    if (!Lk) return;
    const M = metrics(Lk);
    const k = Math.min((h * 0.27) / M.hy, (w * 0.3) / (M.hx + 3));
    ctx.translate(w / 2, h * 0.44 - M.headCY * k);
    ctx.scale(k, k);
    draw(ctx, 0, 0, Lk, { face, noShadow: true });
  }

  return { LOOKS, metrics, draw, portrait, resolveExpr };
})();
