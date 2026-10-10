/* Rendering regression checks on real Chromium/WebKit pages, not hardware. */
'use strict';
const { chromium, webkit, devices } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = process.cwd(), out = path.join(root, 'qa-results');
fs.mkdirSync(out, { recursive: true });
const manifest = JSON.parse(fs.readFileSync('game/assets/bro/manifest.json', 'utf8'));
assert.equal(Object.keys(manifest.files).length, 22);
for (const [name, hash] of Object.entries(manifest.files)) {
  const bytes = fs.readFileSync(path.join(root, 'game/assets/bro', name));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), hash, 'approved PNG changed: ' + name);
}
const result = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  scope: 'real HTTP game and PNGs; browser mobile emulation, not physical iPhone', unchangedPngs: 22, cases: [] };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  const file = path.resolve(root, '.' + p + (p.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404); return res.end('missing'); }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes);
  });
});
async function test(browser, name, fn) {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, locale: 'zh-TW' });
  const page = await context.newPage(), r = { name, status: 'running', errors: [] };
  result.cases.push(r); page.setDefaultTimeout(8000);
  page.on('pageerror', e => r.errors.push(e.message));
  await page.addInitScript(() => {
    window.__walkDraws = [];
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image.src && image.src.includes('/assets/bro/')) window.__walkDraws.push(this.canvas.id + ':' + image.src.split('/').pop());
      return original.call(this, image, ...args);
    };
  });
  try { await fn(page, r); assert.deepEqual(r.errors, []); r.status = 'passed'; }
  catch (e) { r.status = 'failed'; r.failure = e.message; r.stack = e.stack; }
  finally {
    await page.screenshot({ path: path.join(out, name + '.png') }).catch(() => {});
    await context.close(); console.log('QA_WALK_CASE ' + JSON.stringify(r));
    fs.writeFileSync(path.join(out, 'hero-walk-results.json'), JSON.stringify(result, null, 2));
  }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await type.launch({ headless: true });
    await test(browser, engine + '-walk-geometry', async (page, r) => {
      await page.goto(base + '/game/', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => HeroAssets.status().walkingReady);
      r.geometry = await page.evaluate(() => {
        const metadata = HeroAssets.geometry(), samples = [];
        const cv = document.createElement('canvas'); cv.id = 'walk-test'; cv.width = 400; cv.height = 240;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        for (const dir of ['down', 'up', 'left', 'right']) for (let i = 0; i < 4; i++) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 400, 240); ctx.setTransform(3, 0, 0, 3, 200, 180);
          Art.chibi(ctx, 0, 0, LOOKS.bro, { dir, moving: true, t: (i + 0.05) * MOVE_TIME / 2 });
          const a = ctx.getImageData(0, 0, 400, 240).data; let top = 240, bottom = -1;
          for (let y = 0; y < 240; y++) for (let x = 0; x < 400; x++) {
            if (a[(y * 400 + x) * 4 + 3] > 32) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
          }
          samples.push({ dir, frame: i, top, bottom, height: bottom - top + 1 });
        }
        return { metadata, samples,
          sequence: Array.from({ length: 8 }, (_, i) => HeroAssets.frameAt((i + 0.05) * MOVE_TIME / 2, true)),
          idle: [0, 0.15, 7, 900].map(t => HeroAssets.frameAt(t, false)) };
      });
      for (const list of Object.values(r.geometry.metadata)) {
        assert.ok(list.every(m => Math.abs(m.scale - list[0].scale) < 1e-12));
        const h = list.map(m => m.height * m.scale).sort((a, b) => a - b);
        assert.ok(Math.abs((h[1] + h[2]) / 2 - 49) < 1e-8);
      }
      for (const sample of r.geometry.samples) {
        assert.ok(sample.bottom >= 179 && sample.bottom <= 180, 'visible feet baseline');
        assert.ok(sample.height >= 143 && sample.height <= 151, 'visible height at 3x');
      }
      assert.deepEqual(r.geometry.sequence, [0, 1, 2, 3, 0, 1, 2, 3]); assert.deepEqual(r.geometry.idle, [0, 0, 0, 0]);
      assert.ok(r.geometry.metadata.left.every(m => m.mirrored && m.sourceDir === 'right'));
      const drawn = await page.evaluate(() => [...new Set(window.__walkDraws.filter(k => k.startsWith('walk-test:')))]);
      assert.equal(drawn.length, 12, '12 native PNGs cover 16 slots; left mirrors complete right art');
    });
    await test(browser, engine + '-one-frame-missing', async (page, r) => {
      await page.route('**/assets/bro/bro_left_2.png', route => route.fulfill({ status: 404, body: 'missing' }));
      await page.goto(base + '/game/', { waitUntil: 'networkidle' }); await page.locator('#btnNew').tap();
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline && await page.evaluate(() => G.locked)) {
        if (await page.locator('#dialogLayer').isVisible()) await page.locator('#dialog').tap();
        await page.waitForTimeout(100);
      }
      assert.equal(await page.evaluate(() => G.locked), false, 'intro should finish');
      assert.equal(await page.evaluate(() => G.screen), 'game');
      r.assetStatus = await page.evaluate(() => HeroAssets.status());
      assert.equal(r.assetStatus.walkingReady, false); assert.equal(r.assetStatus.failed, 1);
      assert.equal(await page.locator('#errorBar').isVisible(), false);
      const calls = await page.evaluate(() => window.__walkDraws);
      assert.equal(calls.some(k => k.startsWith('view:bro_')), false, 'do not mix incomplete walk art');
      assert.ok(calls.some(k => k.startsWith('portrait:bro_')), 'valid portraits remain usable');
    });
    await browser.close();
  }
  result.passed = result.cases.filter(r => r.status === 'passed').length;
  result.failed = result.cases.length - result.passed;
  fs.writeFileSync(path.join(out, 'hero-walk-results.json'), JSON.stringify(result, null, 2));
  console.log('QA_WALK_SUMMARY ' + JSON.stringify({ passed: result.passed, failed: result.failed }));
  server.close(); process.exitCode = result.failed ? 1 : 0;
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
