'use strict';
const {chromium,webkit,devices}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const ref=process.env.FAMILY_PREVIEW_REF||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.match(ref,/^[0-9a-f]{40}$/);const base='https://rawcdn.githack.com/yutsai862162-png/ai-game-playground/'+ref+'/game/',out=path.resolve('preview-results');fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('game/assets/family/manifest.json','utf8')),results={ref,url:base+'index.html',cases:[]},sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=()=>fs.writeFileSync(path.join(out,'family-display-public-results.json'),JSON.stringify(results,null,2));
async function bounded(fn,ms=3000){let t;try{return await Promise.race([fn(),new Promise((_,reject)=>{t=setTimeout(()=>reject(Error('Diagnostic timeout')),ms);})]);}finally{clearTimeout(t);}}
const watchdog=setTimeout(()=>{results.watchdog='240 second safety limit';save();process.exit(1);},240000);
(async()=>{
 for(const file of ['family-assets.js','game.js','style.css','index.html']){const response=await fetch(base+file,{signal:AbortSignal.timeout(25000)});assert.ok(response.ok);assert.equal(sha(Buffer.from(await response.arrayBuffer())),sha(execFileSync('git',['show',ref+':game/'+file])),file+' remote source');}
 for(const [file,hash] of Object.entries(manifest.display.files)){const response=await fetch(base+'assets/family/display/'+file,{signal:AbortSignal.timeout(25000)});assert.ok(response.ok);assert.equal(sha(Buffer.from(await response.arrayBuffer())),hash,file+' display bytes');}
 results.exactSourceAndDisplayBytes='passed';save();
 for(const [engine,type] of Object.entries({chromium,webkit})){
  const r={engine,status:'running',errors:[],requests:[]};results.cases.push(r);save();const browser=await type.launch(),context=await browser.newContext({...devices['iPhone 13'],viewport:{width:844,height:390}}),page=await context.newPage();let inGame=false;
  page.on('pageerror',e=>{if(inGame)r.errors.push(e.message);});page.on('crash',()=>{r.crash=true;save();});
  page.on('response',response=>{if(response.url().includes('/assets/family/display/')){const h=response.headers();r.requests.push({url:response.url(),status:response.status(),type:h['content-type'],cors:h['access-control-allow-origin'],length:h['content-length']});save();}});
  await page.addInitScript(()=>{window.familyMapDraws={};const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(this.canvas.id==='view'&&(img.src||'').includes('/family/display/'))familyMapDraws[img.src]=(familyMapDraws[img.src]||0)+1;return draw.call(this,img,...args);};});
  try{
   await page.goto(results.url,{waitUntil:'domcontentloaded',timeout:45000});
   if(!await page.locator('#btnNew').count()){const button=page.getByRole('button',{name:/open the page/i}),link=page.getByRole('link',{name:/open the page/i});if(await button.count()){r.consent=await button.innerText();await button.click();}else{r.consent=await link.innerText();await link.click();}}
   await page.waitForFunction(()=>window.FamilyAssets,null,{timeout:30000});inGame=true;
   await page.waitForFunction(()=>Object.values(FamilyAssets.status()).every(s=>s==='ready')&&HeroAssets.status().walkingReady&&HeroAssets.status().loaded===22,null,{timeout:45000});
   r.family=await page.evaluate(()=>FamilyAssets.status());r.hero=await page.evaluate(()=>HeroAssets.status());
   await page.locator('#btnNew').tap();for(let i=0;i<100&&await page.evaluate(()=>G.locked);i++){if(await page.locator('#dialogLayer').isVisible())await page.locator('#dialog').tap();await page.waitForTimeout(90);}await page.waitForFunction(()=>!G.locked);
   r.mapDraws=await page.evaluate(()=>familyMapDraws);assert.ok(Object.keys(r.mapDraws).some(u=>u.endsWith('/mom.png')),'mother actually drawn in map');assert.ok(Object.keys(r.mapDraws).some(u=>u.endsWith('/sister.png')),'sister actually drawn in map');
   r.pad=await page.locator('.dpad-vis').evaluate(el=>getComputedStyle(el).opacity);assert.equal(r.pad,'0');await page.screenshot({path:path.join(out,'display-map-'+engine+'.png')});
   await page.locator('#btnHome').tap();await page.locator('#confirmOk').tap();await page.locator('#btnFamily').tap();assert.ok(await page.locator('.family-grid img').evaluateAll(a=>a.length===4&&a.every(i=>i.complete&&i.naturalWidth===512&&i.naturalHeight===768&&i.crossOrigin==='anonymous')));await page.screenshot({path:path.join(out,'display-gallery-'+engine+'.png')});
   assert.deepEqual(r.errors,[]);r.status='passed';
  }catch(e){r.status='failed';r.failure=e.stack;r.state=await bounded(()=>page.evaluate(()=>({family:window.FamilyAssets?.status(),hero:window.HeroAssets?.status(),mapDraws:window.familyMapDraws}))).catch(x=>({unavailable:x.message}));}
  finally{save();console.log(JSON.stringify(r));await bounded(()=>browser.close(),5000).catch(e=>{r.closeError=e.message;save();});}
 }
})().catch(e=>{results.failure=e.stack;}).finally(()=>{clearTimeout(watchdog);save();console.log(JSON.stringify(results,null,2));if(results.failure||results.cases.some(r=>r.status!=='passed'))process.exitCode=1;});
