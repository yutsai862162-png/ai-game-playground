/* Targeted regression gates. Rendering and pointer ownership may evolve;
 * approved movement tuning, hero originals and the shoe route must not drift. */
'use strict';
const fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const BASELINE = 'bb844f9dd413c6a00e257d6863e2602662da42df';
const gitText = file => execFileSync('git', ['show', BASELINE + ':' + file], { encoding:'utf8' });
const plain = value => JSON.parse(JSON.stringify(value));
const code = value => value.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').replace(/\s+/g, '');
function controlContract(source, css) {
  const ctx = vm.createContext({ window: { addEventListener() {} } });
  vm.runInContext(source, ctx, { timeout:1000 });
  const tuning = plain(vm.runInContext('({MOVE_TIME,TURN_DELAY,DIRS,OPPOSITE,KEYMAP})', ctx));
  const movement = vm.runInContext('[stepFrom, walkable, Input.dir].map(f=>f.toString())', ctx).map(code);
  const input = vm.runInContext('setupInput.toString()', ctx);
  const boundary = input.indexOf("dpad.addEventListener('pointerdown'");
  assert.ok(boundary > 0, 'Cannot locate directional input tuning; review the guard');
  // This prefix owns dead zone (8 / .16), knob response (.42), hysteresis (1.35).
  // It intentionally excludes pointerdown/up/cancel ownership handlers.
  const directionalTuning = code(input.slice(0,boundary));
  const pad = css.match(/#dpad\s*\{([^}]+)\}/);
  const size = css.match(/--pad:\s*([^;]+);/);
  assert.ok(pad && size, 'Missing original touch geometry');
  return { tuning, movement:plain(movement), directionalTuning, pad:code(pad[1]), size:code(size[1]) };
}
async function shoeContract(source) {
  const state = { stage:2, shoe:0, mistakes:0, met:{dad:true,mom:true,sis:true}, flags:{}, items:[], ach:[] };
  const events = [], checkpoints = [];
  const noop = () => {};
  const ctx = vm.createContext({ G:{state,npcs:[]}, Date:{now:()=>0}, Sfx:{fanfare:noop}, showClear:noop,
    say:async(who,text)=>events.push(['say',who,text]), narr:async text=>events.push(['narr',text]),
    itemGet:async id=>{state.items.push(id);events.push(['item',id]);},
    unlock:id=>state.ach.push(id), saveGame:()=>events.push(['save',state.shoe]),
    emote:noop, shake:noop, toast:noop, refreshHUD:noop, wait:async()=>{} });
  vm.runInContext(source, ctx, { timeout:1000 });
  const story = vm.runInContext('Story',ctx);
  // Real interaction functions; no hard-coded substitute for quest progression.
  for(const [kind,id] of [['obj','shoerack'],['obj','myroom'],['obj','fridge'],['npc','mom'],['npc','sis'],['npc','dad'],['obj','sofa'],['obj','sofa']]) {
    await story.interact(kind,id);
    checkpoints.push({id,state:plain(state)});
  }
  state.stage=3;
  await story.interact('npc','mom'); // Protect the recovered-shoes exchange at the ending too.
  checkpoints.push({id:'shoe-ending',state:plain(state)});
  return { events, checkpoints, item:plain(story.items.shoebox), achievement:plain(story.achievements.shoes) };
}
async function main() {
  const baseline = { game:gitText('game/game.js'), css:gitText('game/style.css'), story:gitText('game/story.js'),
    manifest:JSON.parse(gitText('game/assets/bro/manifest.json')) };
  const current = { game:fs.readFileSync('game/game.js','utf8'), css:fs.readFileSync('game/style.css','utf8'),
    story:fs.readFileSync('game/story.js','utf8'), manifest:JSON.parse(fs.readFileSync('game/assets/bro/manifest.json','utf8')),
    readAsset:name=>fs.readFileSync('game/assets/bro/'+name) };
  const expectedControls = controlContract(baseline.game,baseline.css), expectedShoe = await shoeContract(baseline.story);
  async function verify(candidate) {
    assert.deepEqual(controlContract(candidate.game,candidate.css),expectedControls,'Protected movement parameters or touch geometry changed');
    assert.deepEqual(candidate.manifest,baseline.manifest,'Approved hero manifest changed');
    assert.equal(Object.keys(baseline.manifest.files).length,22);
    for(const [name,hash] of Object.entries(baseline.manifest.files)) {
      assert.equal(crypto.createHash('sha256').update(candidate.readAsset(name)).digest('hex'),hash,'Approved hero PNG changed: '+name);
    }
    assert.deepEqual(await shoeContract(candidate.story),expectedShoe,'Protected shoe dialogue or quest progression changed');
  }
  await verify(current);
  if(process.argv.includes('--self-test')) {
    const changed = (source,from,to) => { assert.ok(source.includes(from)); return source.replace(from,to); };
    const alteredPng=Buffer.concat([current.readAsset('bro_down_0.png'),Buffer.from([0])]);
    const mutations = [
      ['movement speed',{game:changed(current.game,'MOVE_TIME = 0.15','MOVE_TIME = 0.2')}],
      ['turn delay',{game:changed(current.game,'TURN_DELAY = 0.07','TURN_DELAY = 0.1')}],
      ['hysteresis',{game:changed(current.game,'H = 1.35','H = 1.5')}],
      ['dead zone',{game:changed(current.game,'R * 0.16','R * 0.2')}],
      ['touch size',{css:changed(current.css,'40vh','42vh')}],
      ['shoe dialogue',{story:changed(current.story,'鞋子？我不知道啊。','鞋子？是我收走的。')}],
      ['shoe progression',{story:changed(current.story,'st.shoe = 2;','st.shoe = 9;')}],
      ['shoe ending',{story:changed(current.story,'（系統管理員，查無此人。）','（原來一切都是為我好。）')}],
      ['PNG bytes',{readAsset:name=>Buffer.concat([current.readAsset(name),Buffer.from([0])])}],
      ['manifest and PNG rewrite',{readAsset:name=>name==='bro_down_0.png'?alteredPng:current.readAsset(name),manifest:{...current.manifest,files:{...current.manifest.files,'bro_down_0.png':crypto.createHash('sha256').update(alteredPng).digest('hex')}}}]
    ];
    for(const [name,patch] of mutations) await assert.rejects(()=>verify({...current,...patch}),undefined,'guard must reject '+name);
    // Unrelated engine edits and newline differences are intentionally permitted.
    await verify({...current,game:current.game+'\nfunction renderOnlyFixture() {}\n'});
    console.log('PASS: 10 intentional regressions rejected; unrelated engine change accepted');
  }
  console.log('PASS: approved movement tuning/geometry, 22 original PNGs and shoe dialogue/progression; authorized pointer ownership accepted');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
