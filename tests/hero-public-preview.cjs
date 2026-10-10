/* Smoke-test the real, pinned external preview. Never modify game state or
   publishing settings. No credentials are sent to the preview provider. */
'use strict';
const { chromium, webkit, devices } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const REF = '6393797c212effd7a8cbac46559fcfe5e5399601';
const ROOT = 'yutsai862162-png/ai-game-playground/' + REF + '/game/';
const OUT = path.resolve('preview-results');
fs.mkdirSync(OUT, { recursive: true });
const results = { ref: REF, checkedAt: new Date().toISOString(), scope: 'External HTTPS preview, desktop browsers emulating iPhone 13; NOT physical Safari', urls: [], cases: [] };
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
async function probe(base) {
  const entry = { base, url: base + 'index.html', status: 'failed' };
  try {
    const response = await fetch(entry.url, { signal: AbortSignal.timeout(25000) });
    entry.http = response.status; entry.type = response.headers.get('content-type');
    const html = await response.text();
    assert(response.ok && /text\/html/.test(entry.type || ''), 'Expected HTML 200');
    assert(html.includes('hero-assets.js') && html.includes('btnNew'), 'Unexpected preview HTML');
    // Verify the remote renderer matches the repository revision, not a stale branch cache.
    const art = await fetch(base + 'hero-assets.js', { signal: AbortSignal.timeout(20000) });
    assert(art.ok, 'Renderer HTTP error');
    const bytes = Buffer.from(await art.arrayBuffer());
    entry.rendererSha256 = digest(bytes);
    assert.equal(entry.rendererSha256, digest(fs.readFileSync('game/hero-assets.js')), 'Renderer differs from checked-out revision');
    entry.status = 'passed';
  } catch (error) { entry.failure = String(error.message || error); }
  results.urls.push(entry); console.log('PREVIEW_HTTP ' + JSON.stringify(entry));
  return entry.status === 'passed';
}
async function browserCase(name, type, url) {
  const r = { name, url, status: 'failed', checks: [], errors: [], failedRequests: [], initialText: '' };
  let browser, context, page;
  try {
    browser = await type.launch({ headless: true });
    context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
    page = await context.newPage();
    page.on('pageerror', e => r.errors.push(e.message));
    page.on('requestfailed', req => r.failedRequests.push({ url: req.url(), failure: req.failure() }));
    page.setDefaultTimeout(15000);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    r.navigationStatus = response && response.status();
    await page.waitForTimeout(1500);
    if (!(await page.locator('#btnNew').count())) {
      r.initialText = (await page.locator('body').innerText()).slice(0, 2200);
      await page.screenshot({ path: path.join(OUT, name + '-confirmation.png') });
      // Use the provider's visible confirmation UI, rather than silently setting
      // a bypass cookie. Only follow links remaining in the same preview service.
      const button = page.getByRole('button', { name: /continue|proceed|confirm|open|繼續|確認/i }).first();
      const link = page.getByRole('link', { name: /continue|proceed|confirm|open|繼續|確認/i }).first();
      if (await button.count()) {
        r.confirmationAction = await button.innerText(); await button.click();
      } else if (await link.count()) {
        const href = new URL(await link.getAttribute('href'), page.url());
        assert(['rawcdn.githack.com', 'raw.githack.com'].includes(href.hostname), 'Unapproved confirmation destination');
        r.confirmationAction = await link.innerText(); await link.click();
      }
    }
    await page.waitForFunction(() => window.HeroAssets && HeroAssets.status().walkingReady, null, { timeout: 45000 });
    r.assets = await page.evaluate(() => HeroAssets.status());
    assert.equal(r.assets.loaded, 22); assert.equal(r.assets.failed, 0);
    assert.equal(r.assets.revision, 'walk-polish-1'); assert.equal(r.assets.geometryError, null);
    r.checks.push('Pinned walk-polish-1 renderer and all 22 real PNGs loaded; geometry ready');
    await page.screenshot({ path: path.join(OUT, name + '-title.png') });
    await page.locator('#btnNew').tap();
    await page.waitForFunction(() => window.__game && __game.screen === 'game');
    await page.waitForFunction(() => !document.querySelector('#dialogLayer').hidden, null, { timeout: 12000 });
    let portraitSaved = false;
    for (let i = 0; i < 45; i++) {
      const state = await page.evaluate(() => ({ locked: __game.locked, dialog: !document.querySelector('#dialogLayer').hidden,
        name: document.querySelector('#dlgName').textContent, error: !document.querySelector('#errorBar').hidden }));
      assert(!state.error, 'Game error bar visible');
      if (!state.locked) break;
      if (state.dialog) {
        if (!portraitSaved && state.name === '哥哥') {
          await page.screenshot({ path: path.join(OUT, name + '-dialogue.png') }); portraitSaved = true;
        }
        await page.locator('#dialog').tap();
      }
      await page.waitForTimeout(160);
    }
    await page.waitForFunction(() => !__game.locked, null, { timeout: 10000 });
    r.checks.push('Start button and intro dialogue finish on the actual remote page');
    await page.screenshot({ path: path.join(OUT, name + '-map.png') });
    const target = await page.evaluate(() => {
      const p = __game.player;
      for (const [dir, d] of Object.entries(DIRS)) if (walkable(p.x + d[0], p.y + d[1])) return { dir, x: p.x, y: p.y };
      return null;
    });
    assert(target, 'No adjacent walkable tile');
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[target.dir];
    await page.keyboard.down(key); await page.waitForTimeout(220); await page.keyboard.up(key);
    await page.waitForTimeout(200);
    r.position = await page.evaluate(() => ({ x: __game.player.x, y: __game.player.y }));
    assert(r.position.x !== target.x || r.position.y !== target.y, 'Character did not move');
    r.checks.push('Walk input moves the new PNG hero (keyboard events; not a touch-feel acceptance)');
    await page.locator('#btnBag').tap();
    assert(await page.locator('#bag').isVisible(), 'Bag did not open');
    await page.locator('#btnBagClose').tap();
    await page.locator('#btnSave').tap();
    r.saved = await page.evaluate(() => !!localStorage.getItem('otakuHero.ch1.save'));
    assert(r.saved); assert.deepEqual(r.errors, []);
    r.checks.push('Bag open/close and manual save; no uncaught JavaScript errors');
    r.finalUrl = page.url(); r.status = 'passed';
  } catch (e) {
    r.failure = String(e.message || e);
    if (page) {
      try { r.lastText = (await page.locator('body').innerText()).slice(0, 2500); await page.screenshot({ path: path.join(OUT, name + '-failure.png') }); } catch (_) { /* Preserve original failure. */ }
    }
  } finally {
    if (context) await context.close(); if (browser) await browser.close();
    results.cases.push(r); console.log('PREVIEW_BROWSER ' + JSON.stringify(r));
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  }
}
(async () => {
  let base;
  for (const host of ['rawcdn.githack.com', 'raw.githack.com']) {
    const candidate = 'https://' + host + '/' + ROOT;
    if (await probe(candidate)) { base = candidate; break; }
  }
  if (base) {
    results.previewUrl = base + 'index.html';
    await browserCase('chromium-remote', chromium, results.previewUrl);
    await browserCase('webkit-remote', webkit, results.previewUrl);
  }
  results.passed = results.cases.filter(c => c.status === 'passed').length;
  results.failed = results.cases.filter(c => c.status !== 'passed').length;
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log('PREVIEW_SUMMARY ' + JSON.stringify({ url: results.previewUrl, passed: results.passed, failed: results.failed }));
  if (results.passed !== 2 || results.failed) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
