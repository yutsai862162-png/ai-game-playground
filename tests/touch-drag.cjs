'use strict';
const {chromium,webkit,devices}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=process.cwd(),out=path.join(root,'qa-results','touch-drag');fs.mkdirSync(out,{recursive:true});const results=[];
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end();}fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(f)]||'application/octet-stream');r.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch(),context=await browser.newContext({...devices['iPhone 13'],viewport:{width:844,height:390}}),page=await context.newPage(),r={engine,status:'running',checks:[]};results.push(r);
 try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/game/index.html');await page.locator('#btnNew').tap();for(let i=0;i<90&&await page.evaluate(()=>G.locked);i++){if(await page.locator('#dialogLayer').isVisible())await page.locator('#dialog').tap();await page.waitForTimeout(90);}await page.waitForFunction(()=>!G.locked);
 const g=await page.evaluate(()=>{const b=document.querySelector('.dpad-vis').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,R:b.width/2,dead:Math.max(8,b.width/2*.16)};});
 const emit=(type,id,x,y,target='#dpad')=>page.evaluate(a=>document.querySelector(a.target).dispatchEvent(new PointerEvent(a.type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:a.id,clientX:a.x,clientY:a.y})),{type,id,x,y,target});
 const dir=()=>page.evaluate(()=>Input.pad);
 await emit('pointerdown',11,g.x+g.R*.6,g.y);await page.waitForTimeout(100);
 await emit('pointerdown',12,500,210,'#view');assert.equal(await page.evaluate(()=>G.path.length),0,'second finger on map must not queue a path behind held pad');r.checks.push('pad/map ownership');
 await page.evaluate(()=>Input.reset());await emit('pointermove',11,g.x+g.R*.6,g.y);assert.equal(await dir(),null,'old finger must not reactivate pad after dialog/blur reset');r.checks.push('reset ends gesture');await emit('pointerup',11,g.x,g.y);
 await page.evaluate(()=>{G.path=['right','right'];});await emit('pointerdown',19,g.x,g.y);assert.equal(await page.evaluate(()=>G.path.length),0,'neutral pad grab cancels previous tap-to-walk');await emit('pointerup',19,g.x,g.y);r.checks.push('neutral pad takes ownership from path');
 await emit('pointerdown',21,g.x+g.R*.6,g.y);
 for(let i=0;i<24;i++){await emit('pointermove',21,g.x+g.dead+(i%2?-.8:1),g.y+(i%3-1)*.5);assert.equal(await dir(),'right','subpixel boundary jitter must not repeatedly stop movement');await page.waitForTimeout(16);}
 await emit('pointermove',21,g.x+1,g.y+1);assert.equal(await dir(),null,'returning to center must stop');r.checks.push('24 continuous jitter moves and neutral');
 await emit('pointermove',21,g.x+40,g.y);for(let i=0;i<12;i++){await emit('pointermove',21,g.x+30,g.y-29+(i%2));assert.equal(await dir(),'right','diagonal jitter must preserve axis');}await emit('pointermove',21,g.x+10,g.y-45);assert.equal(await dir(),'up');r.checks.push('axis hysteresis and deliberate turn');
 await emit('pointermove',21,700,50);await emit('pointercancel',21,700,50);assert.equal(await dir(),null);r.checks.push('cross-zone drag then cancel');
 if(engine==='chromium'){
  const cdp=await context.newCDPSession(page),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const first={id:1,x:g.x+g.R*.6,y:g.y},second={id:2,x:500,y:210};await touch('touchStart',[first]);
  for(let i=0;i<20;i++){first.x=g.x+g.R*.6+(i%3-1)*2;first.y=g.y+(i%3-1);await touch('touchMove',[first]);await page.waitForTimeout(16);}
  await touch('touchStart',[first,second]);await touch('touchMove',[first,{...second,x:520}]);assert.equal(await dir(),'right');assert.equal(await page.evaluate(()=>G.path.length),0);
  await touch('touchEnd',[second]);assert.equal(await dir(),'right');await touch('touchCancel',[]);assert.equal(await dir(),null);r.checks.push('real CDP drag plus second finger/map/release');
  await page.evaluate(()=>{const mom=G.npcs.find(n=>n.id==='mom');teleport(mom.x,mom.y+1,'up');});
  const a=await page.locator('#btnA').boundingBox(),up={id:3,x:g.x,y:g.y-g.R*.6},action={id:4,x:a.x+a.width/2,y:a.y+a.height/2};
  await touch('touchStart',[up]);await touch('touchStart',[up,action]);assert.equal(await page.evaluate(()=>G.locked),true,'second thumb A opens real NPC dialogue');assert.equal(await dir(),null);
  await touch('touchMove',[{...up,x:g.x-40},action]);assert.equal(await dir(),null,'old first finger remains cancelled through dialogue');await touch('touchCancel',[]);await cdp.detach();r.checks.push('real held pad plus second-thumb A dialogue');
  // End the isolated interaction fixture before the generic transition check.
  await page.evaluate(()=>{Dialog.close();G.locked=false;setControls(true);});
 }
 await emit('pointerdown',31,g.x+g.R*.6,g.y);await page.evaluate(()=>{G.locked=true;setControls(false);});await emit('pointermove',31,g.x-50,g.y);assert.equal(await dir(),null);await page.evaluate(()=>{G.locked=false;setControls(true);});await emit('pointerup',31,g.x,g.y);r.checks.push('A/dialog controls transition cancels held finger');
 r.frames=await page.evaluate(()=>new Promise(resolve=>{const deltas=[];let last=performance.now(),end=last+1000;function tick(now){deltas.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else{deltas.sort((a,b)=>a-b);resolve({samples:deltas.length,p50Ms:deltas[Math.floor(deltas.length*.5)],p95Ms:deltas[Math.floor(deltas.length*.95)],maxMs:Math.max(...deltas)});}}requestAnimationFrame(tick);}));
 assert.equal(await page.locator('.dpad-vis').evaluate(el=>getComputedStyle(el).opacity),'0');await page.screenshot({path:path.join(out,engine+'.png')});r.status='passed';
 }catch(e){r.status='failed';r.failure=e.stack;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
}})().catch(e=>results.push({status:'failed',failure:e.stack})).finally(()=>{server.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status!=='passed'))process.exitCode=1;});
