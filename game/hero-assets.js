/* Approved hero PNG adapter. Rendering only: no input, movement, collision,
   quest or save-state changes. Incomplete images fall back to Canvas art. */
(function () {
  'use strict';
  const root = 'assets/bro/';
  const dirs = ['down', 'up', 'left', 'right'];
  const faces = {
    normal: 'relax', happy: 'laugh', angry: 'nagged',
    shock: 'panic', deadpan: 'nagged', soft: 'gentle',
    relax: 'relax', laugh: 'laugh', smug: 'smug',
    nagged: 'nagged', panic: 'panic', gentle: 'gentle'
  };
  const TARGET_HEIGHT = 49; // Logical pixels, excluding transparent padding.
  const ALPHA_THRESHOLD = 32;
  // The approved left PNGs still have clipped shoe soles. Use the complete
  // approved right profile, mirrored at draw time, until native left art is
  // repaired. Keep all original PNG bytes and never mirror front-facing text.
  const sourceDirFor = dir => dir === 'left' ? 'right' : dir;
  const frames = {}, portraits = {}, images = [];
  let paintQueued = false, lastPortrait = null;
  let walkLayout = null, geometryError = null;
  const oldChibi = Art.chibi, oldPortrait = Art.portrait, oldMetrics = Art.metrics;
  const ready = img => !!(img && img.complete && img.naturalWidth > 0);
  const allWalksLoaded = () => dirs.every(dir => frames[dir] && frames[dir].every(ready));
  const walksReady = () => !!walkLayout && allWalksLoaded();

  // Measure once after loading. Never crop, stretch, or rewrite approved PNGs.
  // Ignore nearly transparent edge noise when choosing alignment landmarks.
  function bounds(img) {
    if (img.naturalWidth !== 96 || img.naturalHeight !== 160) {
      throw new Error('Expected a 96x160 walking frame');
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas measurement is unavailable');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let x0 = canvas.width, y0 = canvas.height, x1 = -1, y1 = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    if (x1 < x0) throw new Error('Empty walking frame');
    return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1,
      centerX: (x0 + x1 + 1) / 2, footY: y1 + 1 };
  }
  function prepareLayout() {
    if (walkLayout || geometryError || !allWalksLoaded()) return;
    try {
      const measured = {};
      dirs.forEach(dir => {
        const list = frames[dir].map(bounds);
        const heights = list.map(r => r.height).sort((a, b) => a - b);
        const median = (heights[1] + heights[2]) / 2;
        // One uniform scale per direction: retain natural intra-step variation,
        // rather than enlarging and shrinking the same head every frame.
        const scale = TARGET_HEIGHT / median;
        measured[dir] = list.map(r => Object.freeze({ ...r, scale }));
      });
      walkLayout = measured;
    } catch (e) {
      // A tainted/blocked canvas must not stop the game or partially switch art.
      geometryError = String(e && e.message || e);
      console.warn('Hero PNG alignment unavailable; using Canvas fallback.');
    }
  }
  function repaintVisibleArt() {
    paintQueued = false;
    if (typeof G === 'undefined') return;
    if (G.screen === 'title' && typeof drawTitleArt === 'function') drawTitleArt();
    if (G.screen === 'shop' && typeof drawShopBro === 'function') drawShopBro();
    const p = lastPortrait;
    if (p && p.look === 'bro' && p.canvas.isConnected && p.canvas.getClientRects().length) {
      Art.portrait(p.canvas, p.look, p.expression);
    }
  }
  function queueRepaint() {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(repaintVisibleArt);
  }
  function makeImage(name) {
    const img = new Image();
    img.decoding = 'async';
    const settled = () => { prepareLayout(); queueRepaint(); };
    img.addEventListener('load', settled);
    img.addEventListener('error', settled);
    images.push(img);
    img.src = root + name + '.png';
    return img;
  }
  dirs.forEach(dir => {
    frames[dir] = Array.from({ length: 4 }, (_, i) => makeImage('bro_' + dir + '_' + i));
  });
  Array.from(new Set(Object.values(faces))).forEach(face => {
    portraits[face] = makeImage('bro_' + face);
  });

  function frameAt(t, moving) {
    if (!moving) return 0;
    const seconds = Number.isFinite(t) ? Math.max(0, t) : 0;
    // Read the approved tile duration; do not alter it. Two image changes per
    // tile means the four-frame loop spans two tiles, not nearly seven tiles.
    const step = typeof MOVE_TIME === 'number' && MOVE_TIME > 0 ? MOVE_TIME : 0.15;
    return Math.floor(seconds / step * 2 + 1e-7) % 4;
  }
  Art.chibi = function (ctx, x, y, look, options) {
    if (look !== LOOKS.bro) return oldChibi(ctx, x, y, look, options);
    const o = options || {};
    const dir = dirs.includes(o.dir) ? o.dir : 'down';
    if (!walksReady()) return oldChibi(ctx, x, y, look, o);
    const frame = frameAt(o.t, o.moving), sourceDir = sourceDirFor(dir);
    const img = frames[sourceDir][frame], r = walkLayout[sourceDir][frame], k = r.scale;
    // All source pixels remain available (including anti-aliased edges).
    // The visible foot baseline, NOT the bottom of the PNG, meets (x,y).
    ctx.save(); ctx.translate(x, y);
    if (dir === 'left') ctx.scale(-1, 1);
    ctx.drawImage(img, -r.centerX * k, -r.footY * k,
      img.naturalWidth * k, img.naturalHeight * k);
    ctx.restore();
  };
  Art.metrics = function (look) {
    const previous = oldMetrics(look);
    if (look !== LOOKS.bro || !walksReady()) return previous;
    const tallest = Math.max(...dirs.flatMap(dir => walkLayout[sourceDirFor(dir)].map(r => r.height * r.scale)));
    // Keep emote bubbles above the taller normalized sprite. Geometry only.
    return { ...previous, top: -tallest };
  };
  Art.portrait = function (canvas, look, expression) {
    lastPortrait = { canvas, look, expression };
    if (look !== 'bro') return oldPortrait(canvas, look, expression);
    const img = portraits[faces[expression] || 'relax'];
    if (!ready(img)) return oldPortrait(canvas, look, expression);
    const ctx = canvas.getContext('2d');
    if (!ctx) return oldPortrait(canvas, look, expression);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  };
  window.HeroAssets = Object.freeze({
    status: () => ({ total: images.length, loaded: images.filter(ready).length,
      failed: images.filter(img => img.complete && !img.naturalWidth).length,
      walkingReady: walksReady(), geometryError, revision: 'walk-polish-1',
      leftUsesMirroredRight: true }),
    geometry: () => walkLayout ? Object.fromEntries(dirs.map(dir =>
      [dir, walkLayout[sourceDirFor(dir)].map(r => ({ ...r, sourceDir: sourceDirFor(dir), mirrored: dir === 'left' }))])) : null,
    frameAt
  });
  const initialize = () => { prepareLayout(); queueRepaint(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else initialize();
})();
