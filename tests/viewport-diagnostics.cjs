'use strict';
// Diagnostic evidence: retain rotation failures even when independent loads pass.
const {chromium,webkit,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=process.cwd(),out=path.join(root,'qa-results','viewport');fs.mkdirSync(out,{recursive:true});
const minimal='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><style>html,body{margin:0;height:100%}body{position:fixed;inset:0;background:#234;color:white}@media(orientation:portrait){body{background:#345}}</style><p>Minimal viewport: no game JavaScript</p>';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/minimal'){res.setHeader('Content-Type','text/html');return res.end(minimal);}
 const file=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(bytes);});
});
const results=[];
const snapshot=page=>page.evaluate(()=>({inner:[innerWidth,innerHeight],layout:[document.documentElement.clientWidth,document.documentElement.clientHeight],visual:[visualViewport.width,visualViewport.height,visualViewport.scale],portrait:matchMedia('(orientation:portrait)').matches,app:document.getElementById('app')?.getBoundingClientRect().toJSON(),events:window.viewportEvents.slice()}));
function matches(s,v){return s.inner[0]===v.width&&s.inner[1]===v.height&&s.layout[0]===v.width&&s.layout[1]===v.height&&s.portrait===(v.height>v.width)&&(!s.app||Math.abs(s.app.width-v.width)<1&&Math.abs(s.app.height-v.height)<1);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const [engine,type] of Object.entries({chromium,webkit})){
  const browser=await type.launch();
  for(const target of ['minimal','game'])for(const initial of [{width:844,height:390},{width:390,height:844}]){
   const label=initial.width>initial.height?'landscape':'portrait',r={engine,target,label,status:'running'},context=await browser.newContext({...devices['iPhone 13'],viewport:initial}),page=await context.newPage();results.push(r);
   try{
    await page.addInitScript(()=>{window.viewportEvents=[];for(const name of ['resize','orientationchange'])addEventListener(name,()=>viewportEvents.push({event:name,inner:[innerWidth,innerHeight],layout:[document.documentElement.clientWidth,document.documentElement.clientHeight]}));visualViewport.addEventListener('resize',()=>viewportEvents.push({event:'visualViewport.resize',inner:[innerWidth,innerHeight],layout:[document.documentElement.clientWidth,document.documentElement.clientHeight]}));});
    await page.goto(base+(target==='game'?'/game/':'/minimal'));
    if(target==='game'){
     await page.waitForFunction(()=>Object.values(FamilyAssets.status()).every(s=>s==='ready'));
     if(await page.locator('#rotate').isVisible())await page.locator('#btnRotateOk').tap();
     await page.locator('#btnFamily').tap();
    }
    r.initial=await snapshot(page);assert.ok(matches(r.initial,initial),'independent initial viewport');
    if(target==='game'){
     assert.ok(await page.evaluate(()=>document.querySelector('#familyGallery').scrollWidth<=innerWidth&&[...document.querySelectorAll('.family-grid img')].every(i=>i.complete&&i.naturalWidth===512)));
     await page.screenshot({path:path.join(out,engine+'-'+label+'-initial.png')});
    }
    r.initialStatus='passed';const changed={width:initial.height,height:initial.width};
    await page.setViewportSize(changed);await page.waitForTimeout(600);r.rotated=await snapshot(page);r.rotationStatus=matches(r.rotated,changed)?'passed':'failed';
    if(target==='game')await page.screenshot({path:path.join(out,engine+'-'+label+'-rotated.png')});
    // Event delivery cannot repair an engine that retains the old CSS viewport.
    await page.evaluate(()=>{dispatchEvent(new Event('resize'));dispatchEvent(new Event('orientationchange'));visualViewport.dispatchEvent(new Event('resize'));});
    await page.waitForTimeout(350);r.afterSyntheticEvents=await snapshot(page);
    await page.reload();if(target==='game')await page.waitForFunction(()=>Object.values(FamilyAssets.status()).every(s=>s==='ready'));
    r.reloaded=await snapshot(page);assert.ok(matches(r.reloaded,changed),'reload at changed viewport');r.reloadStatus='passed';r.status=r.rotationStatus;
   }catch(e){r.status='failed';r.failure=e.stack;}finally{await context.close();}
  }await browser.close();
 }
})().catch(e=>results.push({status:'failed',failure:e.stack})).finally(()=>{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({platform:process.platform,playwright:require('playwright/package.json').version,scope:'Automation viewport diagnostic, not physical iPhone orientation',cases:results},null,2));console.log(JSON.stringify(results.map(({engine,target,label,status,initialStatus,rotationStatus,reloadStatus,failure})=>({engine,target,label,status,initialStatus,rotationStatus,reloadStatus,failure})),null,2));server.close();if(results.some(r=>r.status!=='passed'))process.exitCode=1;});
