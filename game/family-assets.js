/* Inspected original standing PNGs; no generated poses or pixel readback.
 * Map mother/sister use static front art. Seated father keeps Canvas art. */
(function () {
  'use strict';
  const base = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : null;
  const originals = Object.freeze({
    dad: Object.freeze({ name: '爸爸', libraryId: 'libfile_b9c282fd2a948191b12e1cd266f8de66', fileName: '爸爸_站姿預覽.png', height: 53, src: 'assets/family/source/dad.png', bounds: {x:199,y:36,width:616,height:1469}, portrait: {x:220,y:0,width:620,height:620} }),
    mom: Object.freeze({ name: '媽媽', libraryId: 'libfile_0e8be7ede19c8191bc5a028b3d06e73e', fileName: '媽媽_站姿預覽.png', height: 49, staticFacing: true, src: 'assets/family/source/mom.png', bounds: {x:156,y:54,width:731,height:1431}, portrait: {x:130,y:20,width:760,height:760} }),
    sis: Object.freeze({ name: '妹妹', libraryId: 'libfile_8bca3328e2288191b7f80bc583c9d10f', fileName: '妹妹_站姿預覽.png', height: 51, staticFacing: true, src: 'assets/family/source/sister.png', bounds: {x:169,y:34,width:716,height:1479}, portrait: {x:150,y:0,width:750,height:750} }),
    bride: Object.freeze({ name: '未來大嫂', libraryId: 'libfile_97693d700dac8191b5e577865a763fd8', fileName: '未來大嫂_站姿預覽.png', height: 49, src: 'assets/family/source/sister-in-law.png', bounds: {x:173,y:30,width:714,height:1491}, portrait: {x:150,y:0,width:750,height:750} })
  });
  // Display copies are half-size PNGs; originals remain untouched in source/.
  const half = rect => Object.fromEntries(Object.entries(rect).map(([k,v])=>[k,v/2]));
  const manifest = Object.freeze(Object.fromEntries(Object.entries(originals).map(([id,r])=>[id,Object.freeze({...r,src:r.src.replace('/source/','/display/'),bounds:half(r.bounds),portrait:half(r.portrait)})])));
  // Explicit inspected visible bounds avoid getImageData and background guesses.
  function placement(record, width, height) {
    const b = record.bounds;
    if (!b || ![b.x, b.y, b.width, b.height, width, height, record.height].every(Number.isFinite) ||
        b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0 || record.height <= 0 ||
        b.x + b.width > width || b.y + b.height > height) return null;
    const scale = record.height / b.height;
    return { x: -(b.x + b.width / 2) * scale, y: -(b.y + b.height) * scale,
      width: width * scale, height: height * scale };
  }
  function create(records, ImageClass, repaint) {
    const states = {};
    Object.entries(records).forEach(([id, record]) => {
      const state = states[id] = { status: 'pending-material', image: null, layout: null };
      if (!record.src) return; // Missing assets produce no network requests.
      if (!record.bounds) { state.status = 'invalid-metadata'; return; }
      const img = state.image = new ImageClass();
      state.status = 'loading'; img.crossOrigin = 'anonymous'; img.decoding = 'async';
      img.addEventListener('load', () => {
        state.layout = placement(record, img.naturalWidth, img.naturalHeight);
        state.status = state.layout ? 'ready' : 'invalid-metadata'; repaint();
      });
      img.addEventListener('error', () => { state.status = 'load-failed'; repaint(); });
      img.src = base ? new URL(record.src, base).href : record.src;
    });
    return Object.freeze({
      status: () => Object.fromEntries(Object.entries(states).map(([id, s]) => [id, s.status])),
      image: id => states[id] ? states[id].image : null,
      draw(ctx, x, y, id, options = {}) {
        const s = states[id];
        if (!s || s.status !== 'ready' || options.moving || options.sitting ||
            (!records[id].staticFacing && options.dir && options.dir !== 'down')) return false;
        const r = s.layout;
        ctx.drawImage(s.image, x + r.x, y + r.y, r.width, r.height); return true;
      },
      portrait(canvas, id) {
        const s=states[id], crop=records[id] && records[id].portrait;
        if (!s || s.status!=='ready' || !crop || !placement({bounds:crop,height:1},s.image.naturalWidth,s.image.naturalHeight)) return false;
        const ctx=canvas.getContext('2d'); if(!ctx) return false;
        const k=Math.min(canvas.width/crop.width,canvas.height/crop.height);
        ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(s.image,crop.x,crop.y,crop.width,crop.height,(canvas.width-crop.width*k)/2,(canvas.height-crop.height*k)/2,crop.width*k,crop.height*k);
        ctx.restore();return true;
      }
    });
  }
  let lastPortrait=null;
  const adapter = create(manifest, Image, () => {
    if (typeof G !== 'undefined' && G.screen === 'title' && typeof drawTitleArt === 'function') drawTitleArt();
    window.dispatchEvent(new Event('familyassetschange'));
    if(lastPortrait && lastPortrait.canvas.isConnected && lastPortrait.canvas.getClientRects().length) Art.portrait(lastPortrait.canvas,lastPortrait.id,lastPortrait.face);
  });
  const previous = Art.chibi;
  Art.chibi = function (ctx, x, y, look, options) {
    const id = Object.keys(manifest).find(key => LOOKS[key] === look);
    if (id && adapter.draw(ctx, x, y, id, options)) return;
    return previous(ctx, x, y, look, options);
  };
  const previousMetrics = Art.metrics;
  Art.metrics = function (look) {
    const old = previousMetrics(look);
    const id = Object.keys(manifest).find(key => LOOKS[key] === look);
    return id && adapter.status()[id] === 'ready' ? { ...old, top: Math.min(old.top, -manifest[id].height) } : old;
  };
  const previousPortrait=Art.portrait;
  Art.portrait=function(canvas,id,face){
    lastPortrait={canvas,id,face};
    if(!adapter.portrait(canvas,id)) return previousPortrait(canvas,id,face);
  };
  function setupGallery(){
    const open=document.getElementById('btnFamily'), layer=document.getElementById('familyGallery');
    if(!open || !layer) return;
    for(const [id,record] of Object.entries(manifest)){
      const card=document.createElement('figure'),img=adapter.image(id) || document.createElement('img'),caption=document.createElement('figcaption');
      // Share the already requested anonymous-CORS image, including its decode.
      img.alt=record.name+'站姿';img.dataset.family=id;
      caption.textContent=record.name;card.append(img,caption);layer.querySelector('.family-grid').append(card);
      const failed=()=>{img.hidden=true;caption.textContent=record.name+'（圖片暫時無法載入）';};
      img.addEventListener('error',failed);
      if(adapter.status()[id]==='load-failed') failed();
    }
    const close=()=>{layer.hidden=true;open.focus();};
    open.addEventListener('click',()=>{layer.hidden=false;document.getElementById('btnFamilyClose').focus();});
    document.getElementById('btnFamilyClose').addEventListener('click',close);
    layer.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  }
  if(typeof document!=='undefined') document.addEventListener('DOMContentLoaded',setupGallery,{once:true});
  window.FamilyAssets = Object.freeze({ manifest, status: adapter.status, placement, create, draw:adapter.draw });
})();
