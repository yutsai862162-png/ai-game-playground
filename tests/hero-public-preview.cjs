/* Actual external preview checks. No game-state mutation or publish operation. */
'use strict';
const { chromium, webkit, devices } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const REF = process.env.HERO_PREVIEW_REF || '6393797c212effd7a8cbac46559fcfe5e5399601';
const ROOT = 'yutsai862162-png/ai-game-playground/' + REF + '/game/';
const OUT = path.resolve('preview-results'); fs.mkdirSync(OUT, { recursive: true });
const results = { ref: REF, checkedAt: new Date().toISOString(), scope: 'Remote HTTPS; mobile emulation, not physical iPhone', urls: [], cases: [] };
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const save = () => fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
async function probe(base) {
  const r = { base, url: base + 'index.html', status: 'failed' };
  try {
    const response = await fetch(r.url, { signal: AbortSignal.timeout(25000) });
    r.http = response.status; r.type = response.headers.get('content-type');
    const html = await response.text();
    assert(response.ok && /text\/html/.test(r.type || ''), 'Expected HTML 200');
    assert(html.includes('hero-assets.js') && html.includes('btnNew'), 'Unexpected HTML');
    const art = await fetch(base + 'hero-assets.js', { signal: AbortSignal.timeout(20000) });
    assert(art.ok, 'Renderer HTTP error');
    r.rendererSha256 = digest(Buffer.from(await art.arrayBuffer()));
    r.checkoutRendererSha256 = digest(fs.readFileSync('game/hero-assets.js'));
    assert.equal(r.rendererSha256, r.checkoutRendererSha256, 'Renderer mismatch');
    const image = await fetch(base + 'assets/bro/bro_down_0.png', { signal: AbortSignal.timeout(20000) });
    r.image = { status: image.status, finalUrl: image.url, type: image.headers.get('content-type'), cors: image.headers.get('access-control-allow-origin'), bytes: (await image.arrayBuffer()).byteLength };
    r.status = 'passed';
  } catch (e) { r.failure = String(e.message || e); }
  results.urls.push(r); console.log('PREVIEW_HTTP ' + JSON.stringify(r)); save();
  return r.status === 'passed';
}
async function browserCase(name, type, url) {
  const r = { name, url, status: 'failed', checks: [], errors: [], console: [], responses: [], failedRequests: [] };
  let browser, context, page;
  try {
    browser = await type.launch();
    context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', e => r.errors.push(e.message));
    page.on('console', m => { if (['warning','error'].includes(m.type())) r.console.push(m.text()); });
    page.on('response', res => { const u = res.url(); if (u.includes('/game/')) r.responses.push({ url:u, status:res.status() }); });
    page.on('requestfailed', req => r.failedRequests.push({url:req.url(),failure:req.failure()}));
    const response = await page.goto(url, {waitUntil:'domcontentloaded',timeout:40000});
    r.navigationStatus = response && response.status(); await page.waitForTimeout(1000);
    if (!(await page.locator('#btnNew').count())) {
      r.initialText = (await page.locator('body').innerText()).slice(0,2200);
      await page.screenshot({path:path.join(OUT,name+'-confirmation.png')});
      const button = page.getByRole('button',{name:/continue|proceed|confirm|open|繼續|確認/i}).first();
      const link = page.getByRole('link',{name:/continue|proceed|confirm|open|繼續|確認/i}).first();
      if (await button.count()) {r.confirmationAction=await button.innerText(); await button.click();}
      else if (await link.count()) {
        const href=new URL(await link.getAttribute('href'),page.url());
        assert(['rawcdn.githack.com','raw.githack.com'].includes(href.hostname),'Unexpected link');
        r.confirmationAction=await link.innerText(); await link.click();
      }
    }
    await page.waitForFunction(()=>window.HeroAssets,null,{timeout:25000});
    await page.waitForFunction(()=>{const s=HeroAssets.status();return s.loaded+s.failed===22;},null,{timeout:30000});
    r.assets=await page.evaluate(()=>HeroAssets.status());
    r.finalUrl=page.url();
    if (!r.assets.walkingReady) {
      // Isolated diagnostic only; do not replace the live game's Image loader.
      r.crossOriginProbe=await page.evaluate(()=>new Promise(resolve=>{
        const img=new Image(); let done=false;
        const end=value=>{if(!done){done=true;resolve(value);}};
        img.crossOrigin='anonymous';
        img.onload=()=>{try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
          const x=c.getContext('2d');x.drawImage(img,0,0);x.getImageData(0,0,1,1);end({readable:true,width:c.width,height:c.height});}
          catch(e){end({readable:false,error:e.message});}};
        img.onerror=()=>end({readable:false,error:'image error'});
        img.src=new URL('assets/bro/bro_down_0.png',document.baseURI).href;
        setTimeout(()=>end({readable:false,error:'timeout'}),12000);
      }));
    }
    assert.equal(r.assets.loaded,22); assert.equal(r.assets.failed,0);
    assert.equal(r.assets.revision,'walk-polish-1');
    assert.equal(r.assets.geometryError,null,'PNG geometry error: '+r.assets.geometryError);
    assert(r.assets.walkingReady,'Walking set not ready');
    r.checks.push('22 PNGs loaded; normalized geometry ready; expected renderer revision');
    await page.screenshot({path:path.join(OUT,name+'-title.png')});
    await page.locator('#btnNew').tap();
    await page.waitForFunction(()=>window.__game&&__game.screen==='game');
    await page.waitForFunction(()=>!document.querySelector('#dialogLayer').hidden,null,{timeout:12000});
    let gotPortrait=false;
    for(let i=0;i<45;i++){
      const s=await page.evaluate(()=>({locked:__game.locked,dialog:!document.querySelector('#dialogLayer').hidden,name:document.querySelector('#dlgName').textContent,error:!document.querySelector('#errorBar').hidden}));
      assert(!s.error,'Game error visible'); if(!s.locked)break;
      if(s.dialog){if(!gotPortrait&&s.name==='哥哥'){await page.screenshot({path:path.join(OUT,name+'-dialogue.png')});gotPortrait=true;}
        await page.locator('#dialog').tap();}
      await page.waitForTimeout(160);
    }
    await page.waitForFunction(()=>!__game.locked,null,{timeout:10000});
    r.checks.push('Start and intro complete using emulated touch on the remote page');
    await page.screenshot({path:path.join(OUT,name+'-map.png')});
    const t=await page.evaluate(()=>{const p=__game.player;for(const [dir,d]of Object.entries(DIRS))if(walkable(p.x+d[0],p.y+d[1]))return{dir,x:p.x,y:p.y};return null;});
    assert(t,'No walkable neighbor');const key={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[t.dir];
    await page.keyboard.down(key);await page.waitForTimeout(220);await page.keyboard.up(key);await page.waitForTimeout(200);
    r.position=await page.evaluate(()=>({x:__game.player.x,y:__game.player.y}));
    assert(r.position.x!==t.x||r.position.y!==t.y,'Player did not move');
    r.checks.push('Real keyboard movement; not physical touch-feel acceptance');
    await page.locator('#btnBag').tap();assert(await page.locator('#bag').isVisible());
    await page.locator('#btnBagClose').tap();await page.locator('#btnSave').tap();
    r.saved=await page.evaluate(()=>!!localStorage.getItem('otakuHero.ch1.save'));assert(r.saved);assert.deepEqual(r.errors,[]);
    r.checks.push('Backpack and manual save; no uncaught JS errors');r.status='passed';
  }catch(e){r.failure=String(e.message||e);if(page){try{r.lastText=(await page.locator('body').innerText()).slice(0,2500);
    r.diagnostics=await page.evaluate(()=>({url:location.href,status:window.HeroAssets?HeroAssets.status():null,scripts:Array.from(document.scripts).map(s=>s.src)}));
    await page.screenshot({path:path.join(OUT,name+'-failure.png')});}catch(_){}}}
  finally{if(context)await context.close();if(browser)await browser.close();results.cases.push(r);console.log('PREVIEW_BROWSER '+JSON.stringify(r));save();}
}
(async()=>{
  let base;for(const host of ['rawcdn.githack.com','raw.githack.com']){const b='https://'+host+'/'+ROOT;if(await probe(b)){base=b;break;}}
  if(base){results.previewUrl=base+'index.html';await browserCase('chromium-remote',chromium,results.previewUrl);await browserCase('webkit-remote',webkit,results.previewUrl);}
  results.passed=results.cases.filter(c=>c.status==='passed').length;results.failed=results.cases.filter(c=>c.status!=='passed').length;save();
  console.log('PREVIEW_SUMMARY '+JSON.stringify({url:results.previewUrl,passed:results.passed,failed:results.failed}));
  if(results.passed!==2||results.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
