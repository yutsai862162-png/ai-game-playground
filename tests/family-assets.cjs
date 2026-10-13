'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let fallback = 0;
const images = [];
class Image {
  constructor() { this.events = {}; images.push(this); }
  addEventListener(name, fn) { this.events[name] = fn; }
  set src(value) { assert.equal(this.crossOrigin, 'anonymous'); this.url = value; }
  load(w, h) { this.naturalWidth = w; this.naturalHeight = h; this.events.load(); }
}
const context = { Image, URL, document: { addEventListener(){}, currentScript: { src: 'https://example.test/game/family-assets.js' } }, window: {}, LOOKS: { bro: {}, dad: {}, mom: {}, sis: {} },
  Art: { chibi() { fallback++; }, metrics() { return { top: -40 }; } } };
vm.runInNewContext(fs.readFileSync('game/family-assets.js', 'utf8'), context);
const api = context.window.FamilyAssets;
assert.equal(images.length, 4, 'four verified original images requested');
assert.deepEqual(Object.values(api.status()), Array(4).fill('loading'));
images.length=0;
const pending=api.create({dad:{src:null}},Image,()=>{});
assert.equal(images.length,0,'pending metadata must not request guessed URLs');
assert.equal(pending.status().dad,'pending-material');
context.Art.chibi({}, 0, 0, context.LOOKS.bro, {});
context.Art.chibi({}, 0, 0, context.LOOKS.dad, { sitting: true });
assert.equal(fallback, 2, 'hero and missing family material preserve original renderer');
let repaints = 0;
const record = { height: 50, src: 'fixture.png', bounds: { x: 20, y: 10, width: 60, height: 100 } };
const adapter = api.create({ dad: record, mom: record, sis: record }, Image, () => repaints++);
assert.equal(images[0].url, 'https://example.test/game/fixture.png', 'paths resolve against adapter, not design subpage');
assert.equal(adapter.draw({}, 0, 0, 'dad'), false, 'loading keeps fallback');
images[0].load(100, 120);
const calls = [];
const ctx = { drawImage(...args) { calls.push(args); } };
assert.equal(adapter.draw(ctx, 100, 200, 'dad', { dir: 'down' }), true);
assert.deepEqual(calls[0].slice(1), [75, 145, 50, 60], 'uniform scale and visible foot alignment');
for (const options of [{ moving: true }, { sitting: true }, { dir: 'left' }, { dir: 'up' }, { dir: 'right' }]) {
  assert.equal(adapter.draw(ctx, 0, 0, 'dad', options), false, 'standing art must not fake unavailable poses');
}
images[1].events.error(); images[2].load(30, 30);
assert.equal(adapter.status().mom, 'load-failed');
assert.equal(adapter.status().sis, 'invalid-metadata');
assert.equal(adapter.draw(ctx, 0, 0, 'mom'), false);
assert.equal(repaints, 3);
for (const bounds of [null, { x: -1, y: 0, width: 20, height: 20 }, { x: 0, y: 0, width: 0, height: 20 }, { x: 0, y: 0, width: NaN, height: 20 }]) {
  assert.equal(api.placement({ ...record, bounds }, 100, 120), null);
}
console.log('PASS: pending material, hero delegation, CORS order, load failure, bounds validation, foot alignment and pose fallback');
