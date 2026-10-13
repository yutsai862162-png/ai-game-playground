/* Focused UI fixture tests, NOT a complete story run or real phone acceptance.
 * Uses production dialogue/input/layout with injected text to stress small screens. */
'use strict';
const { chromium, webkit, devices } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const root = process.cwd(), out = path.join(root, 'qa-results/mobile');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + p + (p.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, bytes) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' })[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
  });
});
const results = [];
async function pointerChecks(page, engine) {
  const emit = (type, id, dir) => page.evaluate(({type,id,dir}) => {
    const pad=document.querySelector('#dpad'), arm=pad.querySelector('.arm.'+dir).getBoundingClientRect();
    pad.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',clientX:arm.x+arm.width/2,clientY:arm.y+arm.height/2}));
  }, {type,id,dir});
  for(const event of ['pointerup','pointercancel','lostpointercapture']) {
    const dir=await page.evaluate(()=>Object.keys(DIRS).find(d=>walkable(G.player.x+DIRS[d][0],G.player.y+DIRS[d][1])));
    const before=await page.evaluate(()=>({x:G.player.x,y:G.player.y}));
    await emit('pointerdown',901,dir); await page.waitForTimeout(380);
    await emit(event,901,dir); await page.waitForTimeout(250);
    const after=await page.evaluate(()=>({x:G.player.x,y:G.player.y}));
    assert.notDeepEqual(after,before,'hold moves character before '+event);
    assert.equal(await page.evaluate(()=>Input.pad),null,event+' clears active direction');
    await page.waitForTimeout(250);
    assert.deepEqual(await page.evaluate(()=>({x:G.player.x,y:G.player.y})),after,event+' must not leave movement stuck');
  }
  await emit('pointerdown',902,'down');
  await emit('pointerdown',903,'left');
  assert.equal(await page.evaluate(()=>Input.pad),'down','second finger must not steal the active pad');
  await emit('pointerup',903,'left');
  assert.equal(await page.evaluate(()=>Input.pad),'down','second finger release must not stop first finger');
  await emit('pointercancel',902,'down');
  assert.equal(await page.evaluate(()=>Input.pad),null);
  await page.waitForTimeout(250);
  if(engine==='chromium') {
    const cdp=await page.context().newCDPSession(page);
    const points=await page.evaluate(()=>['down','left'].map((d,i)=>{
      const r=document.querySelector('#dpad .arm.'+d).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:i+1};
    }));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
    assert.equal(await page.evaluate(()=>Input.pad),'down');
    // CDP names the contact being lifted here, not the remaining contact.
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[1]]});
    assert.equal(await page.evaluate(()=>Input.pad),'down');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert.equal(await page.evaluate(()=>Input.pad),null);
    await cdp.detach(); await page.waitForTimeout(250);
  }
}
async function fit(page, selectors) {
  const errors = await page.evaluate(selectors => selectors.flatMap(selector => {
    const el = document.querySelector(selector), r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 ? [] : [{ selector, rect: r.toJSON(), viewport: [innerWidth, innerHeight] }];
  }), selectors);
  assert.deepEqual(errors, [], 'visible controls must fit viewport');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
async function dialogue(page, name) {
  await page.evaluate(() => {
    G.locked = true; setControls(false);
    window.__mobileChoice = null;
    choose('mom', '警告！玩家裝備遭到未知管理員移除。\n哥哥用自己的錢買鞋，隔天不見；他找遍鞋櫃和房間。\n這段長文字用來檢查手機對話框，並不加入正式劇情。', ['那……要怎麼看它有沒有想法？', '遵命！保證完成任務！', '可以叫妹妹去嗎？']).then(i => { window.__mobileChoice = i; });
    Dialog.finish();
  });
  await page.waitForTimeout(500);
  await fit(page, ['#dialog', '#portrait', '#dlgName', '#dlgText', '#choices']);
  const layout = await page.evaluate(() => {
    const text = document.querySelector('#dlgText');
    return { textClientHeight: text.clientHeight, textScrollHeight: text.scrollHeight,
      textOverflow: getComputedStyle(text).overflowY,
      choiceHeights: [...document.querySelectorAll('#choices button')].map(el => el.getBoundingClientRect().height) };
  });
  assert.ok(layout.textClientHeight >= 23, 'at least one readable line');
  assert.equal(layout.textOverflow, 'auto');
  assert.ok(layout.choiceHeights.every(h => h >= 44), 'choice touch targets');
  await page.screenshot({path:path.join(out,name+'-choices.png')});
  await page.locator('#choices button').nth(2).tap();
  await page.waitForFunction(() => window.__mobileChoice === 2);
  return layout;
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
    const browser = await type.launch();
    for (const [label, viewport, safe] of [
      ['small-landscape', { width: 568, height: 320 }, false],
      ['notch-landscape', { width: 844, height: 390 }, true],
      ['portrait', { width: 390, height: 844 }, false]
    ]) {
      const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport });
      const page = await ctx.newPage(), r = { engine, label, status: 'running', errors: [] };
      results.push(r); page.on('pageerror', e => r.errors.push(e.message));
      try {
        await page.goto('http://127.0.0.1:' + server.address().port + '/game/');
        await page.waitForFunction(() => HeroAssets.status().walkingReady);
        if (await page.locator('#rotate').isVisible()) await page.locator('#btnRotateOk').tap();
        await fit(page, ['#btnNew']);
        await page.locator('#btnNew').tap();
        // The existing full-game test covers the real intro; this fixture isolates layout.
        for (let i = 0; i < 60 && await page.evaluate(() => G.locked); i++) {
          if (await page.locator('#dialogLayer').isVisible()) await page.locator('#dialog').tap();
          await page.waitForTimeout(90);
        }
        await page.waitForFunction(() => G.screen === 'game' && !G.locked);
        if (safe) await page.evaluate(() => {
          for (const [key, value] of Object.entries({ '--sl':'47px', '--sr':'47px', '--sb':'21px' })) document.documentElement.style.setProperty(key, value);
        });
        await fit(page, ['#btnA', '.dpad-vis', '#btnBag', '#btnSave']);
        assert.deepEqual(await page.evaluate(()=>({opacity:getComputedStyle(document.querySelector('.dpad-vis')).opacity,events:getComputedStyle(document.querySelector('#dpad')).pointerEvents})),{opacity:'0',events:'auto'});
        const before = await page.evaluate(() => ({ x:G.player.x, y:G.player.y }));
        await page.locator('#dpad .arm.left').tap({ force: true });
        await page.waitForTimeout(230);
        assert.deepEqual(await page.evaluate(() => ({ x:G.player.x, y:G.player.y })), before, 'quick turn should not walk');
        assert.equal(await page.evaluate(() => Input.pad), null, 'touch release clears direction');
        await page.locator('#btnBag').tap(); await fit(page, ['#bag .panel', '#btnBagClose']);
        await page.locator('#btnBagClose').tap();
        await pointerChecks(page,engine);
        r.pointerCoverage = engine==='chromium' ? 'pointer lifecycle fixtures + CDP two-finger touch' : 'pointer lifecycle fixtures; no physical multitouch';
        await page.screenshot({path:path.join(out,engine+'-'+label+'-invisible-pad.png')});
        const beforeRotation=await page.evaluate(()=>({x:G.player.x,y:G.player.y}));
        r.layout = await dialogue(page,engine+'-'+label);
        await page.screenshot({ path: path.join(out, engine + '-' + label + '.png') });
        // Dialogue open during rotation/toolbar-height change must remain accessible.
        const changed = label === 'portrait' ? { width:844,height:390 } : { width:390,height:650 };
        await page.setViewportSize(changed);
        if (await page.locator('#rotate').isVisible()) await page.locator('#btnRotateOk').tap();
        await page.waitForTimeout(300);
        await fit(page, ['#dialog', '#portrait', '#dlgText']);
        assert.deepEqual(await page.evaluate(() => ({ x:G.player.x,y:G.player.y })), beforeRotation);
        assert.deepEqual(r.errors, []); r.status = 'passed';
      } catch (e) { r.status = 'failed'; r.failure = e.stack; await page.screenshot({ path: path.join(out, engine + '-' + label + '-failure.png') }).catch(() => {}); }
      finally { await ctx.close(); }
    }
    await browser.close();
  }
})().catch(e => results.push({ status:'failed', failure:e.stack })).finally(() => {
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2)); server.close();
  if(results.some(r => r.status !== 'passed')) process.exitCode=1;
});
