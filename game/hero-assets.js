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
  const frames = {}, portraits = {};
  const images = [];
  let paintQueued = false;
  let lastPortrait = null;
  const oldChibi = Art.chibi, oldPortrait = Art.portrait;
  const ready = img => !!(img && img.complete && img.naturalWidth > 0);
  const walksReady = () => dirs.every(dir => frames[dir] && frames[dir].every(ready));

  function repaintVisibleArt() {
    paintQueued = false;
    if (typeof G === 'undefined') return;
    // These screens are drawn once by the engine, unlike the map's live loop.
    // Repaint them when an asynchronous image arrives; never require a resize.
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
    img.addEventListener('load', queueRepaint);
    img.addEventListener('error', queueRepaint);
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

  Art.chibi = function (ctx, x, y, look, options) {
    if (look !== LOOKS.bro) return oldChibi(ctx, x, y, look, options);
    const o = options || {};
    const dir = dirs.includes(o.dir) ? o.dir : 'down';
    const frame = o.moving ? ((Math.floor((o.t || 0) * 4) % 4) + 4) % 4 : 0;
    // Swap the full walking set together: never alternate new/old art mid-step.
    if (!walksReady()) return oldChibi(ctx, x, y, look, o);
    ctx.drawImage(frames[dir][frame], x - 16, y - 53, 32, 53);
  };
  Art.portrait = function (canvas, look, expression) {
    // Track every caller, including other characters, to prevent late loads
    // from painting a brother portrait over the next speaker's face.
    lastPortrait = { canvas, look, expression };
    if (look !== 'bro') return oldPortrait(canvas, look, expression);
    const img = portraits[faces[expression] || 'relax'];
    if (!ready(img)) return oldPortrait(canvas, look, expression);
    const ctx = canvas.getContext('2d');
    if (!ctx) return oldPortrait(canvas, look, expression);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  // Read-only diagnostics for reproducible QA; no game-state mutations.
  window.HeroAssets = Object.freeze({
    status: () => ({
      total: images.length,
      loaded: images.filter(ready).length,
      failed: images.filter(img => img.complete && !img.naturalWidth).length,
      walkingReady: walksReady()
    })
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queueRepaint, { once: true });
  } else queueRepaint();
})();
