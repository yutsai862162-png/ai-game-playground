/* GPT hero-art adapter — keeps all movement and touch handling untouched.
   Assets are deliberately optional: missing files fall back to original Canvas artwork. */
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
  const makeImage = (name) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = root + name + '.png';
    return img;
  };
  dirs.forEach(dir => {
    frames[dir] = Array.from({length:4},(_,i)=>makeImage('bro_'+dir+'_'+i));
  });
  Array.from(new Set(Object.values(faces))).forEach(face => {
    portraits[face] = makeImage('bro_'+face);
  });
  const ready = img => !!(img && img.complete && img.naturalWidth > 0);
  const oldChibi = Art.chibi, oldPortrait = Art.portrait;
  Art.chibi = function(ctx,x,y,look,o) {
    if (look !== LOOKS.bro) return oldChibi(ctx,x,y,look,o);
    o = o || {};
    const dir = dirs.includes(o.dir) ? o.dir : 'down';
    const frame = o.moving ? (Math.floor((o.t || 0) * 4) % 4 + 4) % 4 : 0;
    const img = frames[dir][frame];
    if (!ready(img)) return oldChibi(ctx,x,y,look,o);
    ctx.drawImage(img,x-16,y-53,32,53);
  };
  Art.portrait = function(canvas,look,expression) {
    if (look !== 'bro') return oldPortrait(canvas,look,expression);
    const img = portraits[faces[expression] || 'relax'];
    if (!ready(img)) return oldPortrait(canvas,look,expression);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
  };
})();