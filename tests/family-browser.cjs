'use strict';
const { chromium, webkit, devices } = require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=process.cwd(),out=path.join(root,'qa-results');fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('game/assets/family/manifest.json','utf8'));
for(const [name,hash] of Object.entries(manifest.display.files)){
 const bytes=fs.readFileSync('game/assets/family/display/'+name);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash);
 assert.equal(bytes.readUInt32BE(16),512);assert.equal(bytes.readUInt32BE(20),768);
 assert.ok(bytes.length<500000,'mobile display image must stay below 500 KB');
}
for(const [name,hash] of Object.entries(manifest.files)){
 const p='game/assets/family/source/'+name,bytes=fs.readFileSync(p);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash);
 assert.equal(Buffer.compare(bytes,execFileSync('git',['show',manifest.sourceCommit+':'+p],{maxBuffer:10000000})),0,'original source changed');
}
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
const results=[];
function save(){fs.writeFileSync(path.join(out,'family-results.json'),JSON.stringify({sourceCommit:manifest.sourceCommit,originalPngs:4,cases:results},null,2));}
async function diagnostic(read){let timer;try{return await Promise.race([read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Unresponsive browser during diagnostic capture')),2000);})]);}catch(e){return {unavailable:e.message};}finally{clearTimeout(timer);}}
async function drain(page){for(let i=0;i<100&&await page.evaluate(()=>G.locked);i++){if(await page.locator('#dialogLayer').isVisible())await page.locator('#dialog').tap();await page.waitForTimeout(90);}await page.waitForFunction(()=>!G.locked);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const [engine,type] of Object.entries({chromium,webkit})){
  const browser=await type.launch();
  for(const mode of ['loaded','missing','slow']){
   const ctx=await browser.newContext({...devices['iPhone 13'],viewport:{width:844,height:390},locale:'zh-TW'}),page=await ctx.newPage();
   const r={engine,mode,status:'running',errors:[],events:[]};results.push(r);save();console.log('FAMILY_CASE_START '+engine+'/'+mode);page.on('pageerror',e=>{r.errors.push(e.message);save();});page.on('crash',()=>{r.events.push('page-crash');save();});
   try{
    if(mode==='missing')await page.route('**/assets/family/display/*.png',route=>route.fulfill({status:404,body:'missing'}));
    if(mode==='slow')await page.route('**/assets/family/display/*.png',async route=>{await new Promise(resolve=>setTimeout(resolve,1500));await route.continue();});
    await page.addInitScript(()=>{window.familyDraws=[];const old=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if((img.src||'').includes('/assets/family/'))familyDraws.push({canvas:this.canvas.id,src:img.src,args});return old.call(this,img,...args);};});
    await page.goto(base+'/game/');await page.waitForFunction(()=>Object.values(FamilyAssets.status()).every(s=>s!=='loading'));
    assert.deepEqual(Object.values(await page.evaluate(()=>FamilyAssets.status())),Array(4).fill(mode==='missing'?'load-failed':'ready'));
    await page.waitForFunction(()=>HeroAssets.status().walkingReady);
    if(mode!=='missing'){
     await page.waitForFunction(()=>new Set(familyDraws.filter(d=>d.canvas==='titleArt').map(d=>d.src)).size===3);
     await page.locator('#btnFamily').tap();assert.equal(await page.locator('.family-grid img').count(),4);
     assert.ok(await page.locator('.family-grid img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth===512&&i.naturalHeight===768)));
     assert.ok(await page.locator('.family-grid img').evaluateAll(imgs=>imgs.every(i=>i.crossOrigin==='anonymous')));
     if(mode==='loaded')await page.screenshot({path:path.join(out,'family-'+engine+'-gallery-landscape.png')});
     await page.locator('#btnFamilyClose').tap();
    }
    await page.locator('#btnNew').tap();await drain(page);assert.equal(await page.locator('#errorBar').isVisible(),false);
    if(mode!=='missing'){
     await page.waitForFunction(()=>familyDraws.some(d=>d.canvas==='view'&&d.src.endsWith('/mom.png'))&&familyDraws.some(d=>d.canvas==='view'&&d.src.endsWith('/sister.png')));
     assert.equal(await page.evaluate(()=>familyDraws.some(d=>d.canvas==='view'&&d.src.endsWith('/dad.png'))),false,'seated dad must not use standing PNG');
     r.geometry=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=300;c.height=240;const ctx=c.getContext('2d',{willReadFrequently:true}),out={};
      for(const id of Object.keys(FamilyAssets.manifest)){
       ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,300,240);ctx.scale(3,3);FamilyAssets.draw(ctx,50,70,id);
       const p=ctx.getImageData(0,0,300,240).data;let top=240,bottom=-1,left=300,right=-1;
       for(let y=0;y<240;y++)for(let x=0;x<300;x++)if(p[(y*300+x)*4+3]>32){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
       out[id]={top,bottom,left,right,targetHeight:FamilyAssets.manifest[id].height*3};
      }return out;
     });
     for(const g of Object.values(r.geometry)){assert.ok(Math.abs(g.bottom-209)<=2);assert.ok(Math.abs(g.bottom-g.top+1-g.targetHeight)<=3);assert.ok(g.left>0&&g.right<299&&g.top>0);}
     assert.ok(await page.evaluate(()=>{const c=document.createElement('canvas'),ctx=c.getContext('2d');return ['mom','sis'].every(id=>['up','down','left','right'].every(dir=>FamilyAssets.draw(ctx,0,0,id,{dir})));}),'static art persists through logical facing changes');
     if(mode==='loaded')await page.screenshot({path:path.join(out,'family-'+engine+'-map-landscape.png')});
    }
    for(const who of ['dad','mom','sis']){
     await page.evaluate(who=>{Dialog.open(who,'soft');Dialog.type({dad:'……辛苦了。',mom:'……謝謝你啊，哥哥。',sis:'哥，你是不是又被系統管理員刪裝備了？'}[who]);Dialog.finish();},who);
     if(mode!=='missing')assert.ok(await page.evaluate(who=>familyDraws.some(d=>d.canvas==='portrait'&&d.src.endsWith('/'+({sis:'sister'}[who]||who)+'.png')&&d.args.length===8),who));
     if(mode==='loaded')await page.screenshot({path:path.join(out,'family-'+engine+'-'+who+'-dialogue.png')});
     await page.evaluate(()=>Dialog.close());
    }
    if(mode==='loaded'){
     await page.evaluate(()=>showScreen('title'));await page.setViewportSize({width:390,height:844});
     await page.waitForFunction(()=>matchMedia('(orientation:portrait)').matches&&document.getElementById('app').getBoundingClientRect().width<=390);
     if(await page.locator('#rotate').isVisible())await page.locator('#btnRotateOk').tap();
     await page.locator('#btnFamily').tap();assert.ok(await page.evaluate(()=>document.querySelector('#familyGallery').scrollWidth<=innerWidth));
     await page.screenshot({path:path.join(out,'family-'+engine+'-gallery-portrait.png')});
    }
    assert.deepEqual(r.errors,[]);r.status='passed';
   }catch(e){
    r.status='failed';r.failure=e.stack;
    r.viewport=await diagnostic(()=>page.evaluate(()=>({innerWidth,innerHeight,layout:[document.documentElement.clientWidth,document.documentElement.clientHeight],app:document.getElementById('app').getBoundingClientRect().toJSON(),portrait:matchMedia('(orientation:portrait)').matches,visual:[visualViewport.width,visualViewport.height,visualViewport.scale]})));
    save();await diagnostic(()=>page.screenshot({path:path.join(out,'family-'+engine+'-'+mode+'-failure.png')}));
    // Keep rotation failure visible; independently check a fresh portrait load.
    if(engine==='webkit'&&mode==='loaded'&&r.viewport.innerWidth===390){
     try{
      await page.reload();await page.waitForFunction(()=>Object.values(FamilyAssets.status()).every(s=>s==='ready'));
      if(await page.locator('#rotate').isVisible())await page.locator('#btnRotateOk').tap();
      await page.locator('#btnFamily').tap();
      assert.ok(await page.evaluate(()=>matchMedia('(orientation:portrait)').matches&&document.querySelector('#familyGallery').scrollWidth<=390));
      await page.screenshot({path:path.join(out,'family-webkit-gallery-portrait-reloaded.png')});r.freshPortrait='passed';
     }catch(portraitError){r.freshPortrait=portraitError.message;}
    }
   }
   finally{save();console.log('FAMILY_CASE_END '+JSON.stringify(r));await ctx.close();}
  }await browser.close();
 }
})().catch(e=>results.push({status:'failed',failure:e.stack})).finally(()=>{save();console.log(JSON.stringify(results,null,2));server.close();if(results.some(r=>r.status!=='passed'))process.exitCode=1;});
