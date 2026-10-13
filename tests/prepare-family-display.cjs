/* Build lightweight display copies from approved originals. Never rewrite source/. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch(),page=await browser.newPage(),dir='game/assets/family/display';fs.mkdirSync(dir,{recursive:true});const manifest=JSON.parse(fs.readFileSync('game/assets/family/manifest.json','utf8')),files={};
try{for(const name of Object.keys(manifest.files)){
 const input=fs.readFileSync(path.join('game/assets/family/source',name));if(crypto.createHash('sha256').update(input).digest('hex')!==manifest.files[name])throw Error('Original changed: '+name);
 const encoded=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,512,768);return canvas.toDataURL('image/png').split(',')[1];},'data:image/png;base64,'+input.toString('base64'));
 const bytes=Buffer.from(encoded,'base64');fs.writeFileSync(path.join(dir,name),bytes);files[name]=crypto.createHash('sha256').update(bytes).digest('hex');console.log(name,input.length+' -> '+bytes.length);
}manifest.display={width:512,height:768,scale:0.5,files};fs.writeFileSync('game/assets/family/manifest.json',JSON.stringify(manifest,null,2)+'\n');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
