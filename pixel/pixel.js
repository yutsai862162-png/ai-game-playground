'use strict';
// Independent local prototype: original story is read directly, never copied or rewritten.
const $=s=>document.querySelector(s), TILE=16, DIR={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const G={state:{stage:0,shoe:0,met:{},flags:{},items:[],ach:[],mistakes:0},npcs:Story.npcs.map(n=>({...n})),locked:false};
const player={x:8,y:3,dir:'down',step:null}, input={pad:null,pointer:null,keys:[]};
let running=false, dialogue=null, walked=0, last=0, toastTimer;
const canvas=$('#world'), ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.setTransform(2,0,0,2,0,0);
const C={outline:'#28313a',wood:'#a7754d',woodLight:'#c89461',woodDark:'#79583f',wall:'#e0cea0',wallShade:'#b6af8b',cream:'#eee0b3',red:'#9d5b4d',teal:'#5b8580',blue:'#44677c',skin:'#e4af7b',skinLight:'#f4cb94',hair:'#473b34',shadow:'#615c4d'};
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function frame(x,y,w,h,color){rect(x,y,w,h,C.outline);rect(x+1,y+1,w-2,h-2,color);}
function tile(x,y,ch){if(PixelArt.tile(ctx,x,y,ch))return;const px=x*16,py=y*16;
 if(ch==='#'){rect(px,py,16,16,C.wallShade);rect(px+1,py,15,12,C.wall);rect(px,py+13,16,3,C.woodDark);rect(px+2,py+3,1,7,'#c5b88f');return;}
 const kitchen=ch===',';rect(px,py,16,16,kitchen?'#a8b4a4':C.wood);rect(px,py+15,16,1,kitchen?'#84998f':C.woodDark);rect(px+(y%2?8:0),py,1,15,kitchen?'#cad0b8':C.woodDark);if(!kitchen){rect(px+3,py+4,8,1,C.woodLight);rect(px+9,py+11,5,1,'#ba895b');}
}
function furniture(x,y,ch){if(PixelArt.furniture(ctx,x,y,ch))return;const a=x*16,b=y*16;
 if('CF'.includes(ch)){frame(a,b,16,16,'#bfc4ab');rect(a+1,b+1,14,5,C.cream);if(ch==='C'){frame(a+3,b+2,9,4,'#779597');rect(a+2,b+9,5,5,'#899d95');rect(a+9,b+9,5,5,'#899d95');rect(a+5,b+9,1,2,C.cream);}else{rect(a+1,b+8,14,1,'#657e7b');rect(a+12,b+3,1,3,C.outline);rect(a+12,b+10,1,3,C.outline);rect(a+4,b+3,3,3,'#ba7061');}}
 if(ch==='V'){rect(a-3,b+10,23,6,C.woodDark);frame(a-3,b-1,23,14,'#344f61');rect(a-1,b+1,19,8,'#749b9b');rect(a+1,b+6,16,3,'#4e787e');rect(a+6,b+3,5,2,'#d6c692');rect(a+7,b+13,3,1,C.cream);}
 if(ch==='S'){frame(a,b+1,16,15,C.red);rect(a+1,b+3,14,5,'#c1846b');rect(a+1,b+9,14,4,'#b37561');rect(a+2,b+14,3,2,C.woodDark);}
 if(ch==='T'&&x===3&&y===6){rect(a+2,b+2,46,31,C.woodDark);frame(a,b,48,29,'#c49360');rect(a+2,b+2,44,2,C.cream);rect(a+3,b+28,4,4,C.woodDark);rect(a+41,b+28,4,4,C.woodDark);frame(a+19,b+8,10,8,'#728f7f');rect(a+21,b+9,6,2,'#e2d5a9');rect(a+8,b+9,5,5,C.cream);rect(a+9,b+10,3,3,'#b57752');rect(a+35,b+17,5,4,'#c5d0b1');}
 if(ch==='K'){frame(a,b,16,16,C.woodDark);for(let j=0;j<2;j++){rect(a+2,b+1+j*7,12,5,'#d2b382');for(let i=0;i<3;i++){rect(a+3+i*4,b+2+j*7,2,2,['#637e89','#b06c59','#d4bc76'][i]);rect(a+2+i*4,b+4+j*7,3,2,['#768c9d','#c8856d','#889967'][i]);}}}
 if(ch==='P'){rect(a+4,b+8,9,8,'#b17650');rect(a+3,b+8,11,2,'#dbac79');rect(a+7,b+2,2,9,'#557351');rect(a+2,b+3,6,4,'#6b9164');rect(a+8,b,6,5,'#84a676');rect(a+9,b+5,6,3,'#557951');}
 if(ch==='R'){frame(a,b,16,16,C.woodDark);for(let j=0;j<2;j++){rect(a+2,b+3+j*6,12,4,'#594b3c');rect(a+3,b+4+j*6,4,2,'#c3aa82');rect(a+9,b+4+j*6,4,2,'#d0bd96');}}
 if(ch==='B'||ch==='E'){frame(a,b,16,16,C.woodDark);rect(a+2,b+1,12,14,'#bd9362');rect(a+4,b+2,8,10,'#a57a53');rect(a+12,b+8,1,2,C.cream);}
}
function sprite(x,y,id,dir='down',phase=0,sitting=false){PixelArt.sprite(ctx,x,y,id,dir,phase,sitting);}
function render(){ctx.clearRect(0,0,320,192);for(let y=0;y<12;y++)for(let x=0;x<20;x++)tile(x,y,Story.map[y][x]);
 frame(11*16,5*16,5*16,2*16,'#728d89');rect(11*16+3,5*16+3,74,26,'#9aaf99');rect(11*16+5,5*16+5,70,22,'#6a8781');
 PixelArt.rug(ctx);for(let y=0;y<12;y++)for(let x=0;x<20;x++)furniture(x,y,Story.map[y][x]);
 const actors=G.npcs.map(n=>({...n,px:n.x*16+8,py:n.y*16+15}));let px=player.x*16+8,py=player.y*16+15;
 if(player.step){const s=player.step,t=Math.min(1,s.elapsed/.16);px+=(s.tx-player.x)*16*t;py+=(s.ty-player.y)*16*t;}
 actors.push({id:'bro',dir:player.dir,px,py});actors.sort((a,b)=>a.py-b.py).forEach(n=>sprite(n.px,n.py,n.id,n.dir,n.id==='bro'&&player.step?Math.floor(walked*12)%4:0,n.sitting));
 const t=target();if(running&&!G.locked&&t){const tx=t.x*16+8,ty=t.y*16-7;rect(tx-2,ty,5,1,'#f4d883');rect(tx-1,ty+1,3,1,'#f4d883');rect(tx,ty+2,1,1,'#f4d883');}
}
function walkable(x,y){return !!Story.map[y]&&['.',',','_'].includes(Story.map[y][x])&&!G.npcs.some(n=>n.x===x&&n.y===y);}
function resetInput(){const id=input.pointer;input.pointer=null;input.pad=null;input.keys=[];if(id!==null){try{if($('#pad').hasPointerCapture(id))$('#pad').releasePointerCapture(id);}catch{}}}
function direction(){return input.pad||input.keys.at(-1)||null;}
function update(dt){if(!running||G.locked)return;const d=direction();if(player.step){player.step.elapsed+=dt;walked+=dt;if(player.step.elapsed>=.16){player.x=player.step.tx;player.y=player.step.ty;player.step=null;}}if(!player.step&&d){player.dir=d;const [dx,dy]=DIR[d];if(walkable(player.x+dx,player.y+dy))player.step={tx:player.x+dx,ty:player.y+dy,elapsed:0};}}
function target(){const [dx,dy]=DIR[player.dir],x=player.x+dx,y=player.y+dy;const npc=G.npcs.find(n=>n.x===x&&n.y===y);if(npc)return {kind:'npc',id:npc.id,x,y};const id=Story.objectAt(x,y,Story.map[y]?.[x]);return id?{kind:'obj',id,x,y}:null;}
function refreshHUD(){$('#quest').textContent=Story.objective(G.state);}
function toast(text){$('#notice').textContent=text;$('#notice').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#notice').hidden=true,2800);}
function wait(ms){return new Promise(r=>setTimeout(r,ms));}
function say(id,text){return showDialogue(id,text);}
function narr(text){return showDialogue('narr',text);}
function choose(id,text,options){return showDialogue(id,text,options);}
function showDialogue(id,text,options){resetInput();const pc=document.getElementById('portrait');pc.hidden=!['bro','mom','dad','sis'].includes(id);if(!pc.hidden){const c=pc.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,64,96);c.setTransform(4,0,0,4,0,0);PixelArt.sprite(c,8,23,id);}$('#dialog').hidden=false;$('#speaker').textContent=Story.speakers[id]?.name|| (id==='sys'?'系統':'');$('#line').textContent=text;$('#choices').replaceChildren();$('#next').hidden=!!options;
 return new Promise(resolve=>{dialogue={resolve,options};if(options)options.forEach((text,i)=>{const button=document.createElement('button');button.textContent=(i+1)+'　'+text;button.addEventListener('click',()=>advance(i));$('#choices').append(button);});});}
function advance(choice){if(!dialogue||dialogue.options&&choice===undefined)return;const d=dialogue;dialogue=null;$('#dialog').hidden=true;d.resolve(choice);}
function saveGame(){refreshHUD();} // Prototype progress is in memory; never touches original save keys.
function emote(){} function shake(){} const Sfx={fanfare(){}};
async function itemGet(id){if(!G.state.items.includes(id))G.state.items.push(id);await narr('獲得：'+Story.items[id].name);}
function unlock(id){if(!G.state.ach.includes(id))G.state.ach.push(id);}
async function interact(){if(!running)return;if(G.locked){advance();return;}if(player.step)return;const t=target();if(!t){toast('面向家人或家具，再按 A');return;}if(t.id==='door'&&G.state.stage>=2){toast('客廳原型到此為止；採買與其他場景保留在舊版。');return;}G.locked=true;resetInput();try{await Story.interact(t.kind,t.id);}catch(e){toast('對話暫時中斷，請再試一次');console.error(e);}finally{G.locked=false;resetInput();refreshHUD();}}
const keys={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
window.addEventListener('keydown',e=>{if(keys[e.key]){e.preventDefault();if(running&&!G.locked&&!e.repeat)input.keys.push(keys[e.key]);}else if(['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)interact();}else if(dialogue?.options&&/^[1-3]$/.test(e.key))advance(Number(e.key)-1);});
window.addEventListener('keyup',e=>{input.keys=input.keys.filter(k=>k!==keys[e.key]);});window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});window.addEventListener('resize',resetInput);window.visualViewport?.addEventListener('resize',resetInput);
const pad=$('#pad');function padMove(e){const r=pad.getBoundingClientRect(),dx=e.clientX-r.x-r.width/2,dy=e.clientY-r.y-r.height/2,dist=Math.hypot(dx,dy),dead=14;let d=null;if(dist>dead||(input.pad&&dist>dead*.6)){const ax=Math.abs(dx),ay=Math.abs(dy),cur=input.pad;let horizontal=cur==='left'||cur==='right'?ay<=ax*1.35:cur==='up'||cur==='down'?ax>ay*1.35:ax>=ay;d=horizontal?(dx<0?'left':'right'):(dy<0?'up':'down');}input.pad=d;}
pad.addEventListener('pointerdown',e=>{e.preventDefault();if(!running||G.locked||input.pointer!==null)return;input.pointer=e.pointerId;pad.setPointerCapture(e.pointerId);padMove(e);});pad.addEventListener('pointermove',e=>{if(e.pointerId===input.pointer){e.preventDefault();padMove(e);}});for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,e=>{if(e.pointerId===input.pointer)resetInput();});
$('#action').addEventListener('pointerdown',e=>{e.preventDefault();interact();});$('#action').addEventListener('click',e=>{if(e.detail===0)interact();});$('#dialog').addEventListener('pointerdown',e=>{if(!e.target.closest('button')){e.preventDefault();advance();}});
$('#start').addEventListener('click',()=>{resetInput();running=true;$('#welcome').hidden=true;refreshHUD();});$('#help').addEventListener('click',()=>{resetInput();toast('左下空白區按住滑動；放開停止。面向人物或家具按 A。方向鍵／WASD 也可移動。');});
function loop(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;update(dt);render();const t=target();$('#hint').textContent=running&&!G.locked&&t?'A · '+(t.kind==='npc'?Story.speakers[t.id].name:'調查'):'';requestAnimationFrame(loop);}requestAnimationFrame(loop);refreshHUD();
// Read-only state is available for diagnostics. Tests drive keyboard/touch, not teleportation.
window.Pixel=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify({player,input,state:G.state,locked:G.locked,running,target:target()})),walkable,map:Story.map});
