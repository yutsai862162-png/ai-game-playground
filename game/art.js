/* =========================================================
 * art.js — 所有畫面都用 Canvas 程式繪製（暫代美術素材）
 * 之後若有正式素材，可在這裡改成 drawImage。
 * ========================================================= */
'use strict';

const TILE = 32;

/* ---------- Q 版角色外觀 ----------
 * 每個角色有自己的體型（頭圍、身寬、腿長），剪影一眼就能分辨。
 * head: [橫半徑, 縱半徑]  body: [寬, 高]  leg: 腿長 */
const LOOKS = {
  // 哥哥：全家最圓、最親切。超大圓臉＋雙下巴、圓框厚眼鏡、豆豆眼、ω 嘴、
  //       短黑髮＋呆毛、印著「宅」字的緊繃 T 恤（沾了點零食屑）、大肚子、短腿、
  //       灰色運動長褲、白襪（鞋子被刪了）
  bro: { kind: 'bro', skin: '#ffd7b0', hair: '#2a2422', shirt: '#4a78d0', pants: '#868e99', shoe: '#f4f4f4',
    head: [15.5, 13.2], body: [32, 17], leg: 4 },
  // 爸爸：安靜低調的中年爸爸。瘦高、長臉方下巴、髮線後退的灰黑短髮＋兩鬢灰白、
  //       抬頭紋、粗眉、小鬍子、不戴眼鏡、白色汗衫＋卡其短褲＋藍白拖、拿遙控器
  dad: { kind: 'dad', skin: '#e8b98f', hair: '#3a3634', gray: '#a8a39c', shirt: '#f7f5ef', pants: '#b9a27a', shoe: '#3d6fd1',
    head: [9.4, 11.6], body: [16, 19], leg: 11 },
  // 媽媽：高壓、強勢、很會管事，但不是反派。俐落的短鮑伯頭、平直嚴格的眉毛、
  //       抿成一直線的嘴、珍珠耳環、有領子的襯衫外套，雙手抱胸「我說了算」
  mom: { kind: 'mom', skin: '#ffd3b0', hair: '#2e2220', shirt: '#a8324f', collar: '#fff4e4', pants: '#3f3550', shoe: '#2a2228',
    head: [11, 10.6], body: [19, 15], leg: 7.5 },
  // 妹妹：已經搬出去住、清醒獨立的吐槽役。及肩直髮一邊塞耳後、半睜的「看透一切」
  //       眼神、壞笑、白T＋橄欖綠外套、斜背小包、脖子掛耳機、手機不離手
  sis: { kind: 'sis', skin: '#ffe2c8', hair: '#1f1a22', shirt: '#6f7d4f', tee: '#f6f4ee', pants: '#2f3c5c', shoe: '#f4f4f4',
    head: [10.4, 10], body: [15, 14], leg: 9.5 },
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
  function line(ctx, x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  /** 角色各部位的位置（腳底 = 0，往上為負） */
  function metrics(L) {
    const [hx, hy] = L.head, [bw, bh] = L.body;
    const legTop = -L.leg;
    const bodyTop = legTop - bh + 3;
    const headCY = bodyTop - hy + 4;
    const extra = L.kind === 'bro' ? 5 : 2;
    return { hx, hy, bw, bh, legTop, bodyTop, headCY, top: headCY - hy - extra };
  }

  /* ---------- 角色 ----------
   * (x, y) = 腳底中心。o: { dir, t, moving, face, sitting, noShadow } */
  function chibi(ctx, x, y, L, o) {
    o = o || {};
    const dir = o.dir || 'down', t = o.t || 0, face = o.face || 'normal';
    const M = metrics(L);
    const step = o.moving ? Math.sin(t * 16) : 0;
    const bob = o.moving ? Math.abs(step) * 1.6 : Math.sin(t * 2.2) * 0.5;
    const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    ctx.save();
    ctx.translate(x, y);
    if (!o.noShadow) ell(ctx, 0, 0, M.bw / 2 + 2, 3.5, 'rgba(0,0,0,.22)');
    ctx.translate(0, -bob + (o.sitting ? M.leg * 0.6 : 0));

    // 背面時，媽媽的鍋鏟、妹妹的手機要先畫（被身體擋住）
    // 腳
    if (!o.sitting) {
      const lw = Math.max(4, M.bw * (L.kind === 'bro' ? 0.22 : 0.2));
      const gap = L.kind === 'bro' ? M.bw * 0.14 : M.bw * 0.07;
      const s1 = step * 2, s2 = -step * 2;
      if (L.kind === 'dad') {
        // 短褲＋細腿
        fillRR(ctx, -gap - lw, M.legTop + s1 * 0.5, lw, -M.legTop - s1 * 0.5, 1.5, L.skin);
        fillRR(ctx, gap, M.legTop + s2 * 0.5, lw, -M.legTop - s2 * 0.5, 1.5, L.skin);
        fillRR(ctx, -M.bw / 2 + 1, M.legTop - 1, M.bw - 2, 5.5, 1.5, L.pants);
        // 藍白拖
        ell(ctx, -gap - lw / 2, -0.8, lw / 2 + 1.4, 1.7, '#f2f2f2'); ell(ctx, gap + lw / 2, -0.8, lw / 2 + 1.4, 1.7, '#f2f2f2');
        fillRR(ctx, -gap - lw - 0.8, -2.8, lw + 1.6, 1.6, 0.8, L.shoe); fillRR(ctx, gap - 0.8, -2.8, lw + 1.6, 1.6, 0.8, L.shoe);
      } else {
        fillRR(ctx, -gap - lw, M.legTop + s1 * 0.5, lw, -M.legTop - s1 * 0.5, 1.5, L.pants);
        fillRR(ctx, gap, M.legTop + s2 * 0.5, lw, -M.legTop - s2 * 0.5, 1.5, L.pants);
        ell(ctx, -gap - lw / 2, -0.8, lw / 2 + 1, 1.8, L.shoe);
        ell(ctx, gap + lw / 2, -0.8, lw / 2 + 1, 1.8, L.shoe);
      }
    }

    // 手臂
    const ax = M.bw / 2 + 1, ay = M.bodyTop + M.bh * 0.45;
    const armL = L.kind === 'dad' ? L.skin : L.kind === 'bro' ? L.skin : L.shirt;
    const crossed = L.kind === 'mom' && dir !== 'up';
    if (crossed) {
      // 雙手抱胸（畫在身體之後）
    } else {
      ell(ctx, -ax, ay - step * 1.2, 3.2, 3.4, armL); ell(ctx, -ax, ay + 2 - step * 1.2, 2.6, 2.4, L.skin);
    }
    const holding = (L.kind === 'sis' || L.kind === 'dad') && dir === 'down';
    if (!holding && !crossed) { ell(ctx, ax, ay + step * 1.2, 3.2, 3.4, armL); ell(ctx, ax, ay + 2 + step * 1.2, 2.6, 2.4, L.skin); }

    body(ctx, L, M, dir);
    if (crossed) {
      fillRR(ctx, -M.bw / 2 - 1.5, ay - 1.5, M.bw + 3, 6, 3, L.shirt);
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-M.bw / 2 + 2, ay + 3.5); ctx.lineTo(M.bw / 2 - 2, ay - 0.5); ctx.stroke();
      ell(ctx, -M.bw / 2 + 1, ay + 0.5, 2.2, 2, L.skin); ell(ctx, M.bw / 2 - 1, ay + 2.5, 2.2, 2, L.skin);
    }

    // 頭
    if (L.kind === 'dad') { ell(ctx, -M.hx, M.headCY + 1, 2, 3, L.skin); ell(ctx, M.hx, M.headCY + 1, 2, 3, L.skin); }
    ell(ctx, 0, M.headCY, M.hx, M.hy, L.skin);
    if (L.kind === 'dad') fillRR(ctx, -M.hx * 0.72, M.headCY + M.hy * 0.25, M.hx * 1.44, M.hy * 0.78, 4, L.skin); // 方下巴
    if (L.kind === 'bro') { // 肉肉的臉頰與雙下巴
      ell(ctx, -M.hx * 0.7, M.headCY + M.hy * 0.42, 6, 5, L.skin);
      ell(ctx, M.hx * 0.7, M.headCY + M.hy * 0.42, 6, 5, L.skin);
      ell(ctx, 0, M.headCY + M.hy * 0.78, M.hx * 0.6, 3.6, L.skin);
      if (dir !== 'up') {
        ctx.strokeStyle = 'rgba(160,90,60,.4)'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(0, M.headCY + M.hy * 0.66, 6, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
      }
    }
    hair(ctx, L, M, dir, side, t);
    if (dir !== 'up') faceParts(ctx, L, M, side, face);
    if (holding) handItem(ctx, L, M, t, step);
    ctx.restore();
  }

  function body(ctx, L, M, dir) {
    const top = M.bodyTop, bw = M.bw, bh = M.bh;
    if (L.kind === 'bro') {
      // 大肚子＋有點太緊的 T 恤
      ell(ctx, 0, top + bh / 2 + 1, bw / 2, bh / 2 + 2, L.shirt);
      if (dir !== 'up') {
        ell(ctx, 0, top + bh / 2 + 3, bw / 2 - 6, bh / 2 - 3, 'rgba(255,255,255,.12)');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px "PingFang TC","Noto Sans TC",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('宅', 0, top + bh / 2);
        for (const [dx, dy] of [[-7, 3], [-5, 4.5], [6, 2.5]]) ell(ctx, dx, top + dy, 0.8, 0.6, '#d9a25a'); // 零食屑
      }
      return;
    }
    if (L.kind === 'dad') {
      // 白色汗衫（露出肩膀）＋一點小肚子
      fillRR(ctx, -bw / 2, top, bw, bh, 4, L.skin);
      fillRR(ctx, -bw / 2 + 2, top + 1, bw - 4, bh - 1, 3, L.shirt);
      ell(ctx, 0, top + bh * 0.68, bw / 2 - 1, bh * 0.3, L.shirt);
      if (dir !== 'up') {
        ctx.fillStyle = L.skin; ctx.beginPath(); ctx.ellipse(0, top + 1, 3.6, 3, 0, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(0, top + bh * 0.7, 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      }
      return;
    }
    if (L.kind === 'mom') {
      // 有領子的襯衫外套，俐落
      fillRR(ctx, -bw / 2, top, bw, bh, 5, L.shirt);
      if (dir !== 'up') {
        ctx.fillStyle = L.collar;
        ctx.beginPath(); ctx.moveTo(-5, top); ctx.lineTo(0, top + 5); ctx.lineTo(-1.5, top); ctx.fill();
        ctx.beginPath(); ctx.moveTo(5, top); ctx.lineTo(0, top + 5); ctx.lineTo(1.5, top); ctx.fill();
        line(ctx, 0, top + 5, 0, top + bh - 1, 'rgba(0,0,0,.15)', 0.8);
      } else {
        fillRR(ctx, -5, top, 10, 2.5, 1, L.collar);
      }
      return;
    }
    // 妹妹：白T＋敞開的外套＋斜背小包＋脖子上的耳機
    fillRR(ctx, -bw / 2, top, bw, bh, 5, L.shirt);
    if (dir !== 'up') {
      fillRR(ctx, -3.6, top + 1, 7.2, bh - 1, 1.5, L.tee);
      line(ctx, -bw / 2 + 2, top + 1, bw / 2 - 3, top + bh - 2, '#3a2a22', 1.4); // 斜背帶
      fillRR(ctx, bw / 2 - 6, top + bh - 5, 6, 4.5, 1.2, '#c8823a');
      ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, top - 1, 6, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      ell(ctx, -6, top + 1, 2.3, 2.8, '#ff7aa2'); ell(ctx, 6, top + 1, 2.3, 2.8, '#ff7aa2');
    } else {
      line(ctx, -bw / 2 + 2, top + bh - 2, bw / 2 - 3, top + 1, '#3a2a22', 1.4);
    }
  }

  /** 手上拿的東西：妹妹的手機、媽媽的鍋鏟、爸爸的遙控器 */
  function handItem(ctx, L, M, t, step) {
    const x = M.bw / 2 - 1, y = M.bodyTop + M.bh * 0.25;
    if (L.kind === 'sis') {
      fillRR(ctx, x - 1, y - 1, 6, 9, 1.5, '#1f1f28');
      ctx.fillStyle = `hsl(${(t * 30) % 360},70%,75%)`; ctx.fillRect(x, y, 4, 6.5);
      ell(ctx, x + 2.5, y + 8, 3, 3, L.skin);
    } else if (L.kind === 'dad') {
      fillRR(ctx, x - 1, y + 2, 3.5, 8, 1, '#2a2a2a');
      ell(ctx, x + 0.7, y + 3.5, 0.8, 0.8, '#ff5a5a');
      ell(ctx, x + 1, y + 8.5, 2.8, 2.8, L.skin);
    }
  }

  function hair(ctx, L, M, dir, side, t) {
    const c = L.hair, hx = M.hx, hy = M.hy, cy = M.headCY;
    ctx.fillStyle = c;
    if (L.kind === 'bro') {
      if (dir === 'up') {
        ell(ctx, 0, cy - 2, hx + 0.5, hy * 0.9, c);
      } else {
        // 只蓋住頭頂，讓大圓臉更明顯；瀏海短又亂
        ctx.beginPath(); ctx.ellipse(0, cy - hy * 0.32, hx + 0.6, hy * 0.72, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-hx * 0.95, cy - hy * 0.32);
        const teeth = [3.5, 1.5, 4.5, 2, 3.8, 1.2, 3];
        teeth.forEach((d, i) => {
          const x0 = -hx * 0.95 + ((i + 0.5) * 1.9 * hx) / teeth.length;
          ctx.lineTo(x0 + side, cy - hy * 0.32 + d);
          ctx.lineTo(-hx * 0.95 + ((i + 1) * 1.9 * hx) / teeth.length, cy - hy * 0.32);
        });
        ctx.fill();
        ell(ctx, -hx + 0.8, cy - hy * 0.25, 2, 3.2, c); ell(ctx, hx - 0.8, cy - hy * 0.25, 2, 3.2, c);
      }
      // 睡亂翹起來的頭髮＋呆毛
      ell(ctx, -hx * 0.55, cy - hy * 0.92, 3.2, 2.4, c); ell(ctx, hx * 0.5, cy - hy * 0.95, 3, 2.2, c);
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const wob = Math.sin(t * 3) * 1.5;
      ctx.beginPath(); ctx.moveTo(1, cy - hy); ctx.quadraticCurveTo(4 + wob, cy - hy - 7, 8 + wob, cy - hy - 4); ctx.stroke();
      return;
    }
    if (L.kind === 'dad') {
      // 深色短髮旁分，兩鬢灰白
      if (dir === 'up') {
        ctx.beginPath(); ctx.ellipse(0, cy - 1, hx + 0.6, hy * 0.9, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
        fillRR(ctx, -hx - 0.4, cy - 2, 2 * hx + 0.8, hy * 0.75, 3, c);
        ell(ctx, -hx + 0.5, cy + 2, 1.6, 3, L.gray); ell(ctx, hx - 0.5, cy + 2, 1.6, 3, L.gray);
        return;
      }
      // 髮線後退的圓頂短髮（額頭比較高）
      ctx.beginPath(); ctx.ellipse(0, cy - hy * 0.42, hx + 0.6, hy * 0.66, 0, Math.PI, 0); ctx.fill();
      line(ctx, -hx * 0.35, cy - hy * 0.3, hx * 0.35, cy - hy * 0.3, 'rgba(120,70,40,.28)', 0.7); // 抬頭紋
      ctx.beginPath();
      ctx.moveTo(-hx - 0.5, cy - hy * 0.38);
      ctx.quadraticCurveTo(-hx * 0.6 + side, cy - hy * 0.42, -hx * 0.55 + side, cy - hy * 0.62);
      ctx.lineTo(-hx * 0.2, cy - hy * 0.7);
      ctx.fill();
      line(ctx, -hx * 0.35 + side, cy - hy * 1.02, -hx * 0.42 + side, cy - hy * 0.6, 'rgba(255,255,255,.22)', 0.9); // 分線
      ell(ctx, -hx + 0.5, cy - 0.5, 1.7, 3.4, L.gray); ell(ctx, hx - 0.5, cy - 0.5, 1.7, 3.4, L.gray);
      return;
    }
    if (L.kind === 'mom') {
      // 俐落短鮑伯頭：齊下巴、旁分、線條乾淨
      if (dir === 'up') {
        ell(ctx, 0, cy - 0.5, hx + 1.6, hy + 0.6, c);
        fillRR(ctx, -hx - 1.6, cy - 1, 2 * hx + 3.2, hy * 0.85, 2, c);
        return;
      }
      ctx.beginPath(); ctx.ellipse(0, cy - hy * 0.42, hx + 1.6, hy * 0.66 + 1, 0, Math.PI, 0); ctx.fill();
      fillRR(ctx, -hx - 1.6, cy - hy * 0.45, 4.2, hy * 1.2, 1.5, c); // 齊下巴的兩側
      fillRR(ctx, hx - 2.6, cy - hy * 0.45, 4.2, hy * 1.2, 1.5, c);
      // 斜斜的旁分瀏海（圓弧，不擋眉毛）
      ctx.beginPath(); ctx.ellipse(hx * 0.22 + side, cy - hy * 0.72, hx * 0.9, hy * 0.24, -0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-hx * 0.66 + side, cy - hy * 0.5, hx * 0.36, hy * 0.3, 0.6, 0, Math.PI * 2); ctx.fill();
      ell(ctx, -hx + 0.2, cy + 3.5, 1.3, 1.3, '#fffaf0'); ell(ctx, hx - 0.2, cy + 3.5, 1.3, 1.3, '#fffaf0'); // 珍珠耳環
      return;
    }
    // 妹妹：及肩直髮，右邊塞在耳後（露出小耳環）
    if (dir === 'up') {
      ell(ctx, 0, cy, hx + 1.2, hy + 0.6, c);
      fillRR(ctx, -hx - 1.2, cy, 2 * hx + 2.4, hy + 4, 3, c);
      return;
    }
    ctx.beginPath(); ctx.ellipse(0, cy - 1.5, hx + 1.2, hy * 0.98, 0, Math.PI, 0); ctx.fill();
    // 旁分瀏海往左撥
    ctx.beginPath();
    ctx.moveTo(hx * 0.3 + side, cy - hy * 0.98);
    ctx.quadraticCurveTo(-hx * 0.4 + side, cy - hy * 0.6, -hx - 0.6, cy + 1);
    ctx.lineTo(-hx - 1.2, cy - 2); ctx.lineTo(-hx * 0.4, cy - hy); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx * 0.2 + side, cy - hy * 0.72, hx * 0.75, 2.6, -0.15, 0, Math.PI * 2); ctx.fill();
    fillRR(ctx, -hx - 1.8, cy - 3, 3.8, hy + 5, 1.8, c); // 左邊垂到肩
    ell(ctx, hx - 0.2, cy + 0.5, 1.8, 2.6, L.skin); // 右耳（頭髮塞耳後）
    ell(ctx, hx - 0.2, cy + 3.2, 0.8, 0.8, '#ffd34d');
    fillRR(ctx, hx - 1.6, cy - hy * 0.55, 2.6, hy * 0.5, 1.2, c);
  }

  function faceParts(ctx, L, M, side, face) {
    const fx = side * M.hx * 0.28;
    const ey = M.headCY + M.hy * (L.kind === 'bro' ? 0.18 : 0.12), ex = M.hx * (L.kind === 'bro' ? 0.36 : 0.4);
    const my = M.headCY + M.hy * 0.55;
    const ink = '#2b2320';
    ctx.lineCap = 'round';

    // 腮紅（爸爸不太會臉紅）
    if (L.kind !== 'dad' || face === 'soft') {
      ctx.globalAlpha = face === 'soft' || face === 'happy' ? 0.75 : 0.45;
      const bx = L.kind === 'bro' ? M.hx * 0.66 : M.hx * 0.62;
      ell(ctx, fx - bx, my - 1.5, L.kind === 'bro' ? 3.6 : 2.4, 1.6, '#ff9aa8');
      ell(ctx, fx + bx, my - 1.5, L.kind === 'bro' ? 3.6 : 2.4, 1.6, '#ff9aa8');
      ctx.globalAlpha = 1;
    }

    // 眉毛
    for (const s of [-1, 1]) {
      const bx0 = fx + s * ex;
      if (L.kind === 'dad') {
        const ang = face === 'angry' ? 1.6 : face === 'shock' ? -0.8 : 0;
        line(ctx, bx0 - 2.8, ey - 4 - ang * s * -0.6, bx0 + 2.8, ey - 4 + ang * s * -0.6, '#2f2b29', 2);
      } else if (face === 'angry') {
        line(ctx, fx + s * (ex + 2.6), ey - 4.6, fx + s * (ex - 2.2), ey - 2.8, ink, 1.3);
      } else if (L.kind === 'mom') {
        // 平直、內側略壓低的嚴格眉毛：有壓迫感但不兇惡
        line(ctx, bx0 + 2.8 * s, ey - 4.6, bx0 - 2.4 * s, ey - 3.9, ink, 1.4);
      } else if (L.kind === 'sis') {
        line(ctx, bx0 - 2.4, ey - 4, bx0 + 2.4, ey - 4, ink, 1.1); // 平眉，冷靜
      }
    }

    // 眼睛
    for (const s of [-1, 1]) {
      const x = fx + s * ex;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.3;
      if (face === 'happy' || face === 'soft') {
        ctx.beginPath(); ctx.arc(x, ey + 1, 2.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else if (face === 'deadpan') {
        line(ctx, x - 2.2, ey, x + 2.2, ey, ink, 1.3);
      } else if (face === 'shock') {
        ell(ctx, x, ey, 2.8, 2.8, '#fff'); ctx.beginPath(); ctx.arc(x, ey, 2.8, 0, Math.PI * 2); ctx.stroke();
        ell(ctx, x, ey, 0.9, 0.9, ink);
      } else if (L.kind === 'bro') {
        ell(ctx, x, ey, 1.1, 1.3, ink); // 小豆豆眼
      } else if (L.kind === 'dad') {
        line(ctx, x - 2.2, ey - 0.6, x + 2.2, ey - 0.6, ink, 1.2); // 半睜睏睏眼
        ell(ctx, x, ey + 0.4, 1.2, 0.9, ink);
      } else if (L.kind === 'sis') {
        // 半睜、看透一切的清醒眼神
        ell(ctx, x, ey + 0.3, 1.9, 2, ink); ell(ctx, x + 0.6, ey, 0.6, 0.6, '#fff');
        line(ctx, x - 2.6, ey - 0.9, x + 2.6, ey - 0.9, ink, 1.6);
      } else {
        ell(ctx, x, ey, 1.6, 2.2, ink); ell(ctx, x + 0.5, ey - 0.8, 0.55, 0.55, '#fff');
        line(ctx, x + s * 1.6, ey - 1.6, x + s * 2.3, ey - 2, ink, 0.8); // 睫毛
      }
    }

    // 哥哥的圓框厚眼鏡＋鬍渣
    if (L.kind === 'bro') {
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.9;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * ex, ey, 4.6, 0, Math.PI * 2); ctx.stroke(); }
      line(ctx, fx - ex + 4.6, ey - 0.5, fx + ex - 4.6, ey - 0.5, '#141414', 1.4);
      ctx.globalAlpha = 0.6;
      for (const s of [-1, 1]) line(ctx, fx + s * ex - 2.6, ey - 1.6, fx + s * ex - 1, ey - 2.8, '#fff', 1);
      ctx.globalAlpha = 1;
      ell(ctx, fx, ey + 3.2, 1, 0.8, '#f0b48e'); // 小圓鼻
    }

    // 爸爸的小鬍子
    if (L.kind === 'dad') {
      ctx.fillStyle = '#3a3634';
      ctx.beginPath(); ctx.ellipse(fx - 1.8, my - 2.4, 2.4, 1, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(fx + 1.8, my - 2.4, 2.4, 1, 0.2, 0, Math.PI * 2); ctx.fill();
    }

    // 嘴巴
    const lip = L.kind === 'mom' ? '#e0566a' : '#7a3b2e';
    ctx.strokeStyle = lip; ctx.lineWidth = L.kind === 'mom' ? 1.5 : 1.2;
    if (face === 'happy') {
      ctx.fillStyle = lip; ctx.beginPath(); ctx.arc(fx, my - 0.5, 2.4, 0, Math.PI); ctx.fill();
    } else if (face === 'angry') {
      ctx.beginPath(); ctx.arc(fx, my + 2, 2.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (face === 'shock') {
      ell(ctx, fx, my, 1.6, 2.1, lip);
    } else if (face === 'deadpan') {
      line(ctx, fx - 2, my, fx + 2, my, lip, 1.2);
    } else if (L.kind === 'bro') {
      ctx.beginPath(); ctx.arc(fx - 1.2, my - 0.6, 1.2, 0, Math.PI); ctx.arc(fx + 1.2, my - 0.6, 1.2, 0, Math.PI); ctx.stroke(); // ω 嘴
    } else if (L.kind === 'sis') {
      ctx.beginPath(); ctx.moveTo(fx - 2, my - 0.4); ctx.quadraticCurveTo(fx + 0.5, my + 0.6, fx + 2.4, my - 1.6); ctx.stroke(); // 壞笑
    } else if (L.kind === 'mom') {
      line(ctx, fx - 2.2, my - 0.2, fx + 2.2, my - 0.2, lip, 1.5); // 抿成一直線：「我說了算」
    } else {
      line(ctx, fx - 1.6, my - 0.6, fx + 1.6, my - 0.6, lip, 1.1);
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
    const M = metrics(look);
    const k = Math.min((h * 0.3) / M.hy, (w * 0.34) / (M.hx + 5));
    ctx.translate(w / 2, h * 0.48 - M.headCY * k);
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

  return { chibi, portrait, metrics, tile, sofaBack, rug, rr, fillRR, ell, at };
})();
