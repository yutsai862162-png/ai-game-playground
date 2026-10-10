/* Browser-level integration tests. Runs the real game, not renderer stubs.
   Screenshots and machine-readable results are written to qa-results/.
   Device profiles are emulation, NOT physical iPhone tests. */
'use strict';
const { chromium, webkit, devices } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ROOT = process.cwd(), OUT = path.join(ROOT, 'qa-results');
fs.mkdirSync(OUT, { recursive: true });
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.json':'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(ROOT, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(bytes);
  });
});
const result = { commit: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), scope:'Real game served on loopback; Chromium/WebKit mobile emulation, not hardware', cases:[] };
const draws = () => {
  window.__qaDraws = {};
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
    const src = image && (image.currentSrc || image.src) || '';
    if (src.includes('/assets/bro/')) {
      const k = this.canvas.id + ':' + src.split('/').pop();
      window.__qaDraws[k] = (window.__qaDraws[k] || 0) + 1;
    }
    return original.call(this, image, ...args);
  };
};
async function pointTap(page, locator) {
  const r = await locator.boundingBox();
  assert.ok(r && r.width > 0 && r.height > 0, 'tap target must be visible');
  await page.touchscreen.tap(r.x + r.width/2, r.y + r.height/2);
}
async function advance(page) {
  if (await page.locator('#itemGet').isVisible()) {
    await pointTap(page, page.locator('#itemGet .item-card')); return;
  }
  const opts = page.locator('#choices button');
  if (await opts.count()) {
    await page.waitForTimeout(330);
    const text = await opts.allTextContents();
    let i = text.findIndex(t => /綠色標籤|最直的|一顆一顆|順手買/.test(t));
    if (i < 0) i = 0;
    await pointTap(page, opts.nth(i)); return;
  }
  if (await page.locator('#dialogLayer').isVisible()) {
    await pointTap(page, page.locator('#dlgText')); return;
  }
  await page.waitForTimeout(100);
}
async function drain(page) {
  const deadline = Date.now()+75000;
  while (Date.now()<deadline) {
    if (await page.locator('#errorBar').isVisible()) throw new Error(await page.locator('#errorBar').innerText());
    if (await page.evaluate(() => !G.locked)) return;
    await advance(page); await page.waitForTimeout(65);
  }
  throw new Error('Dialogue did not finish: '+await page.locator('#dlgText').innerText());
}
async function step(page, dir) {
  const key = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[dir];
  await page.keyboard.down(key);
  try { await page.waitForFunction(() => G.player.moving, null, {timeout:1500}); }
  finally { await page.keyboard.up(key); }
  await page.waitForFunction(() => !G.player.moving, null, {timeout:1500});
}
async function visit(page, x, y) {
  // Read the production path finder, then perform real keyboard input one step at a time.
  // No teleporting, calling dialogue functions, or modifying quest state.
  const dirs = await page.evaluate(([x,y]) => findPath((px,py)=>Math.abs(px-x)+Math.abs(py-y)===1), [x,y]);
  assert.ok(dirs, 'target must be reachable');
  for (const d of dirs) await step(page,d);
  const face = await page.evaluate(([x,y]) => x>G.player.x?'right':x<G.player.x?'left':y>G.player.y?'down':'up', [x,y]);
  const key = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[face];
  await page.keyboard.down(key); await page.waitForTimeout(100); await page.keyboard.up(key);
  await page.waitForTimeout(50);
  await page.locator('#btnA').tap();
  await drain(page);
}
async function boot(page, base) {
  await page.goto(base+'/game/', {waitUntil:'networkidle'});
  await page.waitForFunction(() => typeof G !== 'undefined' && typeof Story !== 'undefined');
}
async function runCase(browser, name, fn, viewport={width:844,height:390}) {
  const ctx = await browser.newContext({...devices['iPhone 13'],viewport,screen:viewport,locale:'zh-TW'});
  const page = await ctx.newPage(); page.setDefaultTimeout(6000);
  const record={name,status:'running',errors:[],checks:[]}; result.cases.push(record);
  page.on('pageerror',e=>record.errors.push(e.message));
  await page.addInitScript(draws);
  try { await fn(page,record); assert.deepEqual(record.errors,[]); record.status='passed'; }
  catch(e) { record.status='failed'; record.failure=e.message; record.stack=e.stack; }
  finally {
    record.draws=await page.evaluate(()=>window.__qaDraws || {}).catch(()=>({}));
    await page.screenshot({path:path.join(OUT,name+'.png')}).catch(()=>{});
    await ctx.close();
    console.log('QA_CASE '+JSON.stringify(record));
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(result,null,2));
  }
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  for (const [engine,type] of [['chromium',chromium],['webkit',webkit]]) {
    const browser=await type.launch({headless:true});
    await runCase(browser,engine+'-full-game',async(page,r)=>{
      await boot(page,base);
      await page.locator('#btnNew').tap(); await drain(page);
      r.checks.push('start and introductory dialogue');
      await page.screenshot({path:path.join(OUT,engine+'-map.png')});
      // Actual pointer hold/release on the visible pad; direction must stop after release.
      const from=await page.evaluate(()=>({x:G.player.x,y:G.player.y}));
      const freeDir=await page.evaluate(()=>['down','right','left','up'].find(d=>walkable(G.player.x+DIRS[d][0],G.player.y+DIRS[d][1])));
      const arm=await page.locator('#dpad .arm.'+freeDir).boundingBox();
      await page.mouse.move(arm.x+arm.width/2,arm.y+arm.height/2); await page.mouse.down();
      await page.waitForTimeout(360); await page.mouse.up(); await page.waitForTimeout(220);
      const to=await page.evaluate(()=>({x:G.player.x,y:G.player.y}));
      assert.notDeepEqual(to,from); await page.waitForTimeout(250);
      assert.deepEqual(await page.evaluate(()=>({x:G.player.x,y:G.player.y})),to);
      r.checks.push('pad pointer hold/release; taps elsewhere use mobile touch');
      await visit(page,13,4); await visit(page,6,6); await visit(page,2,3);
      assert.equal(await page.evaluate(()=>G.state.stage),2);
      r.checks.push('three NPCs and shopping quest accepted');
      await visit(page,1,10); assert.equal(await page.evaluate(()=>G.state.shoe),1);
      await visit(page,6,6); assert.equal(await page.evaluate(()=>G.state.shoe),2);
      await visit(page,13,4); assert.equal(await page.evaluate(()=>G.state.shoe),3);
      await visit(page,12,4); assert.equal(await page.evaluate(()=>G.state.shoe),4);
      assert.ok(await page.evaluate(()=>G.state.items.includes('shoebox')));
      r.checks.push('shoe side quest, repaired story, item acquisition');
      await page.locator('#btnBag').tap(); assert.ok(await page.locator('#bag').isVisible());
      assert.match(await page.locator('#bagList').innerText(),/神秘鞋盒/); await page.locator('#btnBagClose').tap();
      await page.locator('#btnSave').tap();
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('otakuHero.ch1.save')));
      await page.reload({waitUntil:'networkidle'}); await page.locator('#btnContinue').tap();
      assert.equal(await page.evaluate(()=>G.state.shoe),saved.shoe);
      assert.deepEqual(await page.evaluate(()=>G.state.items),saved.items);
      r.checks.push('bag, save, reload and continue');
      await visit(page,8,10); assert.equal(await page.evaluate(()=>G.state.stage),3);
      r.checks.push('supermarket sequence and return home');
      await visit(page,2,3); assert.equal(await page.evaluate(()=>G.state.stage),4);
      assert.ok(await page.locator('#clear').isVisible());
      await page.screenshot({path:path.join(OUT,engine+'-chapter-clear.png')});
      r.checks.push('chapter completion');
      await page.locator('#btnClearTitle').tap(); assert.ok(await page.locator('#title').isVisible());
      await page.locator('#btnContinue').tap();
      r.checks.push('return to title and continue completed save');
      const calls=await page.evaluate(()=>Object.keys(window.__qaDraws));
      assert.ok(calls.some(x=>x.startsWith('view:bro_')),'map must draw approved PNG');
      assert.ok(calls.some(x=>x.startsWith('portrait:bro_')),'dialogue must draw approved PNG');
      assert.ok(calls.some(x=>x.startsWith('shopBro:bro_')),'supermarket must draw approved PNG');
      r.checks.push('real PNG draws in map, dialogue and supermarket');
    });
    await runCase(browser,engine+'-slow-title',async(page,r)=>{
      await page.route('**/assets/bro/*.png',async route=>{await new Promise(x=>setTimeout(x,1600));await route.continue();});
      await boot(page,base); await page.waitForTimeout(500);
      const found=await page.evaluate(()=>Object.keys(window.__qaDraws).some(k=>k.startsWith('titleArt:bro_')));
      assert.ok(found,'Title stayed on old Canvas hero after PNGs finished loading');
      r.checks.push('slow images repaint title without a tap or resize');
    });
    await runCase(browser,engine+'-missing-images',async(page,r)=>{
      await page.route('**/assets/bro/*.png',route=>route.fulfill({status:404,body:'missing'}));
      await boot(page,base); await page.locator('#btnNew').tap(); await drain(page);
      assert.equal(await page.evaluate(()=>G.screen),'game');
      assert.equal(await page.locator('#errorBar').isVisible(),false);
      r.checks.push('all 22 missing images fall back; game still starts');
    },{width:568,height:320});
    await runCase(browser,engine+'-blocked-storage',async(page,r)=>{
      await page.addInitScript(()=>{for(const k of ['getItem','setItem','removeItem'])Storage.prototype[k]=function(){throw new DOMException('Denied by test','SecurityError');};});
      await boot(page,base); assert.ok(await page.locator('#storageNote').isVisible());
      await page.locator('#btnNew').tap(); await drain(page);
      assert.equal(await page.evaluate(()=>G.screen),'game');
      r.checks.push('disabled storage warning and playable new game');
    });
    await browser.close();
  }
  server.close();
  result.passed=result.cases.filter(c=>c.status==='passed').length;
  result.failed=result.cases.filter(c=>c.status!=='passed').length;
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(result,null,2));
  console.log('QA_SUMMARY '+JSON.stringify({commit:result.commit,passed:result.passed,failed:result.failed}));
  process.exitCode=result.failed?1:0;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
