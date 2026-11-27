import { preparePackage } from '../experiments/mobile-bridge/package-adapter.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

mkdirSync('artifacts/screenshots',{recursive:true});
const browser = await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try {
  const page = await browser.newPage({acceptDownloads:true});
  const errors = [];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8000');
  assert.equal(await page.locator('html').getAttribute('data-editor-ready'),'true');
  await page.locator('#load-link').click();
  assert.match(await page.locator('#link-status').textContent(),/Pega primero/);
  assert.equal(await page.locator('#link-status').getAttribute('data-state'),'error');
  await page.locator('#demo').click();
  await page.waitForFunction(()=>!document.querySelector('#export').disabled);
  assert.match(await page.locator('#selection-info').textContent(),/2\.00 s/);
  assert.equal(await page.locator('#export').isVisible(),false);
  await page.locator('#wizard-next').click();
  assert.equal(await page.locator('#position').isVisible(),true);
  assert.equal(await page.locator('#visual').isVisible(),false);
  await page.locator('#wizard-next').click();
  assert.equal(await page.locator('#position').isVisible(),false);
  await page.locator('#signature').fill('Mi firma 🎵');
  await page.locator('#export').click();
  await page.waitForFunction(()=>!document.querySelector('#sticker-files').hidden || !document.querySelector('#prepare-sticker').hidden || (!document.querySelector('#export').disabled && !document.querySelector('#components').hidden),{},{timeout:120000}).catch(async error=>{throw new Error('Conversion timeout: '+await page.locator('#sticker-state').textContent()+' / '+await page.locator('#status').textContent(),{cause:error});});
  assert.equal(await page.locator('#sticker-files').isVisible(),true,await page.locator('#sticker-state').textContent());
  assert.equal(await page.locator('#output').count(),0);
  assert.equal(await page.locator('#cancel-export').count(),0);
  assert.equal(await page.locator('#sticker-advanced').getAttribute('open'),'');
  const rank=await page.evaluate(()=>{
    const {rankedCells,captureFpsFor}=window.WAAS._internals;
    const cells=[{side:64,fps:20,estado:'ok'},{side:384,fps:5,estado:'baja'},{side:256,fps:10,estado:'ok'}];
    const floor=[{side:512,fps:8,estado:'ok'},{side:384,fps:9,estado:'baja'},{side:192,fps:10,estado:'ok'}];
    return {sharp:rankedCells(cells,'sharp')[0].side,smooth:rankedCells(cells,'smooth')[0].side,limit:captureFpsFor(60,'sharp'),reject:rankedCells([cells[0]],'sharp').length,floor:rankedCells(floor,'sharp')[0].fps,belowFloor:rankedCells([floor[0]],'sharp').length,has9:window.WAAS.limits.FPS_LIST.includes(9),capture:[1,10,20,30,34,60].map(d=>captureFpsFor(d,'sharp')),image:rankedCells([{side:512,fps:1,estado:'ok'}],'sharp',true).length};
  });
  assert.deepEqual(rank,{sharp:256,smooth:64,limit:9,reject:1,floor:9,belowFloor:0,has9:true,capture:[20,20,12,10,9,9],image:1});
  assert.equal(await page.locator('#quality').inputValue(),'sharp');
  assert.equal(await page.locator('#size-budget').inputValue(),'extended');
  assert.deepEqual(await page.evaluate(()=>{const x=window.WAAS._internals;return [x.webpBudget(false,123456),x.webpBudget(true,123456),x.captureFpsFor(10,'sharp',true),x.captureFpsFor(60,'sharp',true)];}),[1000000,1876544,30,9]);
  const caps=await page.evaluate(()=>window.WAAS.capabilities());
  assert.equal(caps.opus,true,'Chromium must support Opus');
  assert.equal(caps.webpEncode,'image/webp');
  await page.locator('#sticker-files').waitFor({state:'visible',timeout:120000});
  assert.match(await page.locator('#sticker-state').textContent(),/listo para enviar/);
  assert.match(await page.locator('#quality-result').textContent(),/Calidad final: /);
  assert.equal(await page.locator('#package-download').isVisible(),false);
  await page.locator('#wizard-next').click();
  assert.equal(await page.locator('#package-download').isVisible(),true);
  await page.locator('#wizard-prev').click();
  assert.equal(await page.locator('#signature').inputValue(),'Mi firma 🎵');
  await page.locator('#wizard-next').click();
  assert.equal(await page.locator('.send-steps > li').count(),4);
  assert.equal(await page.locator('#download').count(),0);
  assert.equal(await page.locator('#share').count(),0);
  assert.equal(await page.locator('#wa-bookmark').isVisible(),false);
  await page.locator('#desktop-send-options > summary').click();
  assert.equal(await page.locator('#wa-bookmark').isVisible(),true);
  await page.locator('#desktop-send-options > summary').click();
  await page.screenshot({path:'artifacts/screenshots/desktop-es.png',fullPage:true});
  await page.locator('#language').selectOption('en');
  await page.screenshot({path:'artifacts/screenshots/desktop-en.png',fullPage:true});
  await page.locator('#language').selectOption('es');
  const visualAudit=await browser.newPage({viewport:{width:320,height:800},isMobile:true,hasTouch:true});
  await visualAudit.goto('http://127.0.0.1:8000');
  await visualAudit.locator('#demo').click();
  await visualAudit.waitForFunction(()=>!document.querySelector('#export').disabled);
  await visualAudit.locator('#wizard-next').click();
  await visualAudit.screenshot({path:'artifacts/screenshots/mobile-editor-es.png',fullPage:true});
  await visualAudit.locator('#language').selectOption('en');
  await visualAudit.screenshot({path:'artifacts/screenshots/mobile-editor-en.png',fullPage:true});
  await visualAudit.close();
  const sizes = await page.evaluate(async()=>Promise.all(['sticker-image','sticker-audio'].map(async id=>(await (await fetch(document.getElementById(id).src)).blob()).size)));
  assert(sizes.every(size=>size>0)&&sizes.reduce((a,b)=>a+b,0)<=2000000);
  // Export the actual converted package and execute the bookmarklet against mock WA modules.
  const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#package-download').click()]);
  assert.equal(download.suggestedFilename(),'ejemplo.sonoro.json');
  const packageBytes=readFileSync(await download.path());
  const pack=JSON.parse(packageBytes.toString('utf8'));
  assert.equal(pack.format,'stickers-sonoros/1');
  assert.equal(pack.info.segundosAudio,2);
  const adapted=preparePackage(packageBytes);
  assert.deepEqual(adapted.webpBuffer,Buffer.from(pack.webp,'base64'));
  assert.deepEqual(adapted.audioBuffer,Buffer.from(pack.ogg,'base64'));
  assert.equal(adapted.soundSha256,pack.info.soundSha256);
  assert.equal(adapted.audioSeconds,2);
  assert.equal(adapted.width,pack.info.lado);
  assert(adapted.webpBuffer.length<500000&&adapted.audioBuffer.length<500000);
  console.log('Mobile bridge: real editor package preserved byte-for-byte');
  // Real generated JSON, mobile handoff and invalid linkage; no WhatsApp device claim.
  const mobileBridge=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  try{
    await mobileBridge.goto('http://127.0.0.1:8000/mobile.html');
    await mobileBridge.locator('#mobile-package').setInputFiles({name:'ejemplo.sonoro.json',mimeType:'application/json',buffer:packageBytes});
    await mobileBridge.locator('#mobile-result').waitFor({state:'visible'});
    // Mobile-only private bridge: simulate transport, never connect WhatsApp in CI.
    const endpoint='https://stickers-sonoros-bridge.onrender.com', token='test-token-'+('x'.repeat(32));
    let posts=0, paired=false,connections=0;
    await mobileBridge.route(endpoint+'/**',async route=>{
      const request=route.request(),path=new URL(request.url()).pathname;
      const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8000','Access-Control-Allow-Headers':'authorization, content-type, x-bridge-tier','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
      assert.equal(request.headers().authorization,'Bearer '+token);
      let body;
      if(path==='/v1/connect'){connections++;paired=true;body={phase:'pairing',pairingCode:'TEST1234'};}
      else if(path==='/v1/status'){assert(paired);body={phase:'ready'};}
      else if(path==='/v1/send'){posts++;assert.deepEqual(request.postDataBuffer(),packageBytes);assert.equal(request.headers()['x-bridge-tier'],'small');body={phase:'ready',remaining:5-posts,relayed:true,deliveryConfirmed:false};}
      else throw Error('Unexpected private endpoint');
      return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({version:'2026.11.26.45',...body})});
    });
    const privatePanel=mobileBridge.locator('.private-bridge');
    assert.equal(await privatePanel.getAttribute('open'),'');
    const connect=privatePanel.getByRole('button',{name:'Conectar WhatsApp',exact:true});
    await privatePanel.locator('input[type=password]').fill('short');
    assert.equal(await connect.isDisabled(),true);
    await privatePanel.locator('input[type=password]').fill(token);
    const privateSend=privatePanel.getByRole('button',{name:'Enviar sticker sonoro',exact:true});
    assert.equal(await privateSend.isVisible(),false);
    await connect.click();
    await privatePanel.getByText('TEST1234',{exact:true}).waitFor();
    await privatePanel.getByText('WhatsApp conectado. Ya puedes enviar tu sticker.',{exact:true}).waitFor();
    assert.equal(await privatePanel.locator('input[type=password]').isVisible(),false);
    assert.equal(await privatePanel.locator('select,input[type=checkbox]').count(),0);
    mobileBridge.once('dialog',dialog=>dialog.dismiss());await privateSend.click();
    assert.equal(posts,0);
    mobileBridge.once('dialog',dialog=>dialog.accept());await privateSend.click();
    await privatePanel.getByText(/El puente procesó el envío/).waitFor();
    assert.equal(posts,1);
    await privateSend.waitFor({state:'visible'});
    mobileBridge.once('dialog',dialog=>dialog.accept());await privateSend.click();
    await privatePanel.getByText(/El puente procesó el envío/).waitFor();
    assert.equal(posts,2);assert.equal(connections,1);
    const tiers=await mobileBridge.evaluate(()=>[1,10,40,61].map(segundosAudio=>SonoroPrivateMobile.chooseTier({format:'stickers-sonoros/1',webp:'YQ==',ogg:'Yg==',info:{segundosAudio}})));
    assert.deepEqual(tiers,['small','medium','extended',null]);
    // Two confirmed UI requests are mocked; actual duplicate rejection is tested separately.
    await mobileBridge.screenshot({path:'artifacts/screenshots/mobile-send-es.png',fullPage:true});
    await mobileBridge.unroute(endpoint+'/**');

    const saved=await mobileBridge.evaluate(async()=>{const p=await SonoroMobile.validate(document.querySelector('#mobile-package').files[0]);return {side:p.side,seconds:p.seconds,webp:p.webp.size,ogg:p.ogg.size};});
    assert.equal(saved.seconds,2);assert.equal(saved.webp,adapted.webpBuffer.length);assert.equal(saved.ogg,adapted.audioBuffer.length);
    assert.equal(await mobileBridge.locator('#prepare-video,#save-png,#save-wav,#save-visual,#save-audio,#mobile-next,#open-whatsapp').count(),0);
    assert.equal(await mobileBridge.locator('#mobile-image').isVisible(),true);
    assert.equal(await mobileBridge.locator('#mobile-audio').isVisible(),true);
    await mobileBridge.locator('#mobile-language').selectOption('en');
    assert.match(await mobileBridge.locator('h1').textContent(),/Send saved sticker/);
    assert(await mobileBridge.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await mobileBridge.screenshot({path:'artifacts/screenshots/mobile-handoff-en.png',fullPage:true});
    await mobileBridge.locator('#mobile-package').setInputFiles({name:'bad.sonoro.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...pack,info:{...pack.info,soundSha256:'invalid'}}))});
    await mobileBridge.waitForFunction(()=>document.querySelector('#mobile-status').textContent.includes('Invalid or damaged'));
    assert.equal(await mobileBridge.locator('#mobile-result').isVisible(),false);
  }finally{await mobileBridge.close();}
  const appUrl='https://poldkent.github.io/stickers-sonoros/';
  assert.match(readFileSync('index.html','utf8'), /<link rel="canonical" href="https:\/\/poldkent\.github\.io\/stickers-sonoros\/">/);
  assert.equal(pack.info.packName,'Creado en Stickers Sonoros');
  assert.equal(pack.info.publisher,'Mi firma 🎵 · '+appUrl);
  assert.equal(pack.info.signature,'Mi firma 🎵');
  assert.equal(pack.info.appUrl,appUrl);
  function readAttribution(pack) {
    const bytes=Buffer.from(pack.webp,'base64');
    for(let at=12;at+8<=bytes.length;){
      const n=bytes.readUInt32LE(at+4);
      if(bytes.toString('ascii',at,at+4)==='EXIF'){
        const exif=bytes.subarray(at+8,at+8+n);
        return JSON.parse(exif.subarray(26,26+exif.readUInt32BE(14)).toString('utf8'));
      }
      at+=8+n+(n%2);
    }
    throw Error('Missing EXIF');
  }
  const metadata=readAttribution(pack);
  assert.equal(metadata['sticker-pack-name'],pack.info.packName);
  assert.equal(metadata['sticker-pack-publisher'],pack.info.publisher);
  assert.equal(metadata['sound-sha256'],pack.info.soundSha256);
  assert.match(await page.locator('#attribution-result').textContent(),/Mi firma/);
  const bookmarklet=await page.locator('#wa-bookmark').getAttribute('href');
  assert.match(bookmarklet,/^javascript:/);
  const wa=await browser.newPage();
  // This route is completely local; no real account or WhatsApp request is used.
  await wa.route('https://web.whatsapp.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Mock WhatsApp</title><body></body>'}));
  await wa.goto('https://web.whatsapp.com/');
  await wa.evaluate(()=>{
    const chat={name:'Mi chat de prueba'};
    window.mockCalls={uploads:0,sends:0,confirm:false,enabled:true};
    window.confirm=()=>window.mockCalls.confirm;
    const modules={
      WAWebChatCollection:{ChatCollection:{getActive:()=>chat}},
      WAWebSoundStickerGating:{isSoundStickerCreationEnabled:()=>window.mockCalls.enabled},
      WAWebMmsMediaTypes:{MEDIA_TYPES:{AUDIO:'audio'}},
      WAWebMediaGetUploadOriginForChat:()=>1,
      WAWebCreateMediaUploadMetrics:()=>({}),
      WAWebUploadManagerMainThread:{encryptAndUpload:async params=>{
        window.mockCalls.uploads++;
        if(params.type!=='audio'||!params.blob.size)throw Error('invalid upload');
        return {url:'https://example.invalid/audio',directPath:'/audio',mediaKey:new Uint8Array(32),encFilehash:new Uint8Array(32),mediaKeyTimestamp:1};
      }},
      WAWebSoundStickerUtils:{isCompleteStickerAudio:a=>a.mimetype==='audio/ogg; codecs=opus'&&a.filehash.length===44},
      WAWebMediaOpaqueData:{createFromData:async blob=>blob},
      WAWebMediaPrep:class {
        constructor(type,data){this.type=type;this.data=data;}
        async sendToChat({chat:destination,options}){
          const media=await this.data;
          if(destination!==chat||this.type!=='sticker'||media.mimetype!=='image/webp'||!options.stickerAudio)throw Error('invalid send');
          window.mockCalls.sends++;
          return {messageSendResult:'OK',msg:{stickerAudio:options.stickerAudio,ack:1}};
        }
      },
      WAWebSendMsgResultAction:{SendMsgResult:{OK:'OK'}},
      WAWebAck:{ACK:{SENT:1}}
    };
    window.require=name=>{if(!(name in modules))throw Error('missing '+name);return modules[name];};
  });
  await wa.evaluate(code=>{(0,eval)(decodeURIComponent(code.slice('javascript:'.length)));},bookmarklet);
  const panel=wa.locator('#ss-local-bridge');
  await panel.waitFor();
  await panel.locator('input[type=file]').setInputFiles({name:'sticker.sonoro.json',mimeType:'application/json',buffer:packageBytes});
  const send=panel.getByRole('button',{name:'Enviar sticker con sonido'});
  await wa.waitForFunction(()=>!document.querySelector('#ss-local-bridge button').disabled);
  await send.click();
  assert.equal(await wa.evaluate(()=>window.mockCalls.uploads),0);
  await wa.evaluate(()=>{window.mockCalls.confirm=true;window.mockCalls.enabled=false;});
  await send.click();
  assert.match(await panel.locator('[role=status]').textContent(),/no está habilitado/);
  assert.equal(await wa.evaluate(()=>window.mockCalls.uploads),0);
  await panel.locator('#ss-experimental').check();
  await send.click();
  await panel.getByText('WhatsApp confirmó el envío.',{exact:false}).waitFor();
  assert.deepEqual(await wa.evaluate(()=>[window.mockCalls.uploads,window.mockCalls.sends]),[1,1]);
  assert.equal(await send.isDisabled(),true);
  assert.equal(await wa.evaluate(()=>window.require('WAWebSoundStickerGating').isSoundStickerCreationEnabled()),false);
  // A real 240-second image+audio package, produced by the shipped converter.
  const longPack=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#5845a3';ctx.fillRect(0,0,128,128);
    const image=new File([await new Promise(r=>canvas.toBlob(r,'image/png'))],'long.png',{type:'image/png'});
    const samples=240*48000, bytes=new ArrayBuffer(44+samples*2), d=new DataView(bytes);
    const ascii=(at,s)=>{for(let i=0;i<s.length;i++)d.setUint8(at+i,s.charCodeAt(i));};
    ascii(0,'RIFF');d.setUint32(4,bytes.byteLength-8,true);ascii(8,'WAVE');ascii(12,'fmt ');
    d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,48000,true);d.setUint32(28,96000,true);d.setUint16(32,2,true);d.setUint16(34,16,true);ascii(36,'data');d.setUint32(40,samples*2,true);
    for(let i=0;i<samples;i++)d.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*440*i/48000)*3000),true);
    const audio=new File([bytes],'long.wav',{type:'audio/wav'});
    const out=await window.WAAS.convert({visual:{kind:'image',file:image,start:0,dur:240},audio:{file:audio,start:0,dur:240},fit:'repetir',extended:true});
    const decoded=await new OfflineAudioContext(1,48000,48000).decodeAudioData(await out.ogg.arrayBuffer());
    if(Math.abs(decoded.duration-240)>0.1)throw Error('Unexpected decoded audio duration: '+decoded.duration);
    const encode=async blob=>{const u=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=16384)s+=String.fromCharCode(...u.subarray(i,i+16384));return btoa(s);};
    return {format:'stickers-sonoros/1',webp:await encode(out.webp),ogg:await encode(out.ogg),info:out.info};
  });
  assert.equal(longPack.info.segundosAudio,240);
  assert.equal(longPack.info.lado,512);
  assert(Buffer.from(longPack.webp,'base64').length+Buffer.from(longPack.ogg,'base64').length<=2000000);
  await panel.locator('input[type=file]').setInputFiles({name:'long.sonoro.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(longPack))});
  await wa.waitForFunction(()=>document.querySelector('#ss-local-bridge [role=status]').textContent.includes('240 s'));
  await wa.evaluate(()=>{window.mockCalls.enabled=true;});
  await send.click();
  await panel.getByText('WhatsApp confirmó el envío.',{exact:false}).waitFor();
  assert.deepEqual(await wa.evaluate(()=>[window.mockCalls.uploads,window.mockCalls.sends]),[2,2]);
  await panel.getByRole('button',{name:'Cerrar'}).click();
  await page.locator('#language').selectOption('en');
  const enBookmark=await page.locator('#wa-bookmark').getAttribute('href');
  await wa.evaluate(code=>{(0,eval)(decodeURIComponent(code.slice('javascript:'.length)));},enBookmark);
  await panel.getByText('Stickers Sonoros · Send to WhatsApp',{exact:true}).waitFor();
  await panel.locator('input[type=file]').setInputFiles({name:'sticker.sonoro.json',mimeType:'application/json',buffer:packageBytes});
  const enSend=panel.getByRole('button',{name:'Send sticker with sound'});
  await wa.waitForFunction(()=>!document.querySelector('#ss-local-bridge button').disabled);
  await enSend.click();
  await panel.getByText('WhatsApp confirmed the send.',{exact:false}).waitFor();
  assert.deepEqual(await wa.evaluate(()=>[window.mockCalls.uploads,window.mockCalls.sends]),[3,3]);
  // Legacy 4 MB packages remain readable by the bookmark; this is a structural transport test, not real WhatsApp acceptance.
  function paddedPackage(target) {
    const old=Buffer.from(pack.webp,'base64'), pad=target-old.length-8;
    assert(pad>=0&&pad%2===0);
    const bytes=Buffer.concat([old,Buffer.from('JUNK'),Buffer.alloc(4),Buffer.alloc(pad)]);
    bytes.writeUInt32LE(pad,old.length+4);bytes.writeUInt32LE(bytes.length-8,4);
    return Buffer.from(JSON.stringify({...pack,webp:bytes.toString('base64')}));
  }
  const audioSize=Buffer.from(pack.ogg,'base64').length;
  const maxWebp=Math.floor((4000000-audioSize)/2)*2;
  await panel.locator('input[type=file]').setInputFiles({name:'large.sonoro.json',mimeType:'application/json',buffer:paddedPackage(maxWebp)});
  await wa.waitForFunction(()=>!document.querySelector('#ss-local-bridge button').disabled);
  await enSend.click();
  await panel.getByText('WhatsApp confirmed the send.',{exact:false}).waitFor();
  assert.deepEqual(await wa.evaluate(()=>[window.mockCalls.uploads,window.mockCalls.sends]),[4,4]);
  await panel.locator('input[type=file]').setInputFiles({name:'oversize.sonoro.json',mimeType:'application/json',buffer:paddedPackage(maxWebp+2)});
  await panel.getByText('The sticker and its audio exceed 4 MB.',{exact:true}).waitFor();
  assert.equal(await enSend.isDisabled(),true);
  await wa.close();
  await page.locator('#language').selectOption('es');
  await page.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,version:'2026.11.26.5'})}));
  await page.locator('#check-service').click();
  await page.waitForFunction(()=>document.querySelector('#service-status').textContent.includes('Actualiza Render'));
  await page.unroute('**/health');
  assert.deepEqual(errors,[]);
  await page.locator('[data-wizard="1"]').click();
  await page.locator('[data-mode="video"]').click();
  assert.equal(await page.locator('#components').isVisible(),false);
  assert.equal(await page.locator('#export').isDisabled(),true);
  // Exercise paste-to-editor with a real playable video and a simulated API response.
  const dir = mkdtempSync(join(tmpdir(),'sticker-import-'));
  try {
    const path = join(dir,'sample.webm');
    execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=128x128:r=15:d=2','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2','-c:v','libvpx','-c:a','libopus','-shortest',path]);
    let requested;
    await page.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
    await page.route('**/api/import',async route=>{
      requested=route.request().postDataJSON().url;
      await route.fulfill({status:200,contentType:'video/webm',body:readFileSync(path)});
    });
    await page.locator('#link-input').evaluate(el=>{
      const data=new DataTransfer();
      data.setData('text/plain','https://www.youtube.com/watch?v=YBB4FHPFVmM&list=RDYBB4FHPFVmM');
      el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>document.querySelector('#link-status').textContent.includes('Video listo'),{},{timeout:20000});
    assert.equal(requested,'https://www.youtube.com/watch?v=YBB4FHPFVmM');
    assert.equal(await page.locator('#links input[type=url]').count(),1);
    assert.equal(await page.locator('#export').isDisabled(),false);
    await page.locator('#wizard-next').click();
    assert.equal(await page.locator('#play-source').isVisible(),true);
    await page.locator('#play-source').click();
    await page.waitForFunction(()=>document.querySelector('#play-source').textContent.includes('Detener'));
    await page.locator('#play-source').click();
    const pages=await browser.newPage();
    const origin='https://poldkent.github.io';
    const backend='https://stickers-sonoros.onrender.com';
    await pages.route(origin+'/**',route=>{
      const path=new URL(route.request().url()).pathname.replace(/^\/stickers-sonoros\//,'')||'index.html';
      if (!['index.html','app.js','style.css','vendor/shirtep/convert.js','vendor/shirtep/local-send.js','i18n.js','private-mobile.js','private-mobile.css'].includes(path)) return route.abort();
      const type=path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html';
      return route.fulfill({status:200,contentType:type,body:readFileSync(path)});
    });
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
    await pages.route(backend+'/health',route=>route.fulfill({status:200,headers,contentType:'application/json',body:'{"ok":true}'}));
    let remoteRequested;
    await pages.route(backend+'/api/import',route=>{
      if (route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
      remoteRequested=route.request().postDataJSON().url;
      return route.fulfill({status:200,headers,contentType:'video/webm',body:readFileSync(path)});
    });
    await pages.goto(origin+'/stickers-sonoros/');
    await pages.locator('#link-input').fill('https://www.youtube.com/watch?v=YBB4FHPFVmM');
    await pages.locator('#load-link').click();
    await pages.waitForFunction(()=>document.querySelector('#link-status').dataset.state==='success',{},{timeout:20000});
    assert.equal(remoteRequested,'https://www.youtube.com/watch?v=YBB4FHPFVmM');
    assert.equal(await pages.locator('#export').isDisabled(),false);
    await pages.close();
  } finally {rmSync(dir,{recursive:true,force:true});}
  // Verify GitHub Pages without a configured backend: explicit error, never a silent click.
  const staticPage=await browser.newPage();
  const staticOrigin='https://poldkent.github.io';
  await staticPage.route(staticOrigin+'/**',route=>{
    const path=new URL(route.request().url()).pathname.replace(/^\/stickers-sonoros\//,'')||'index.html';
    if (!['index.html','app.js','style.css','vendor/shirtep/convert.js','vendor/shirtep/local-send.js','i18n.js'].includes(path)) return route.abort();
    const type=path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html';
    const body=path==='index.html'?readFileSync(path,'utf8').replace('<meta name="sticker-import-endpoint" content="https://stickers-sonoros.onrender.com">','<meta name="sticker-import-endpoint" content="">'):readFileSync(path);
    return route.fulfill({status:200,contentType:type,body});
  });
  await staticPage.goto(staticOrigin+'/stickers-sonoros/');
  await staticPage.locator('#link-input').fill('https://www.youtube.com/watch?v=YBB4FHPFVmM');
  await staticPage.locator('#load-link').click();
  await staticPage.waitForFunction(()=>document.querySelector('#link-status').dataset.state==='error');
  assert.match(await staticPage.locator('#link-status').textContent(),/servidor de descarga todavía no está conectado/);
  await staticPage.close();
  // Detect public HTML resources and combine a selected image with audio.
  const finder=await browser.newPage();
  const site='https://media.example';
  const cors={'Access-Control-Allow-Origin':'*'};
  await finder.route(site+'/page',route=>route.fulfill({status:200,headers:cors,contentType:'text/html',body:'<meta property="og:image" content="/picture.png"><img src="/picture.png"><audio src="/tone.wav"></audio><video src="/clip.webm"></video><script>throw new Error("remote script must not run")</script>'}));
  await finder.route(site+'/picture.png',route=>route.fulfill({status:200,headers:cors,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=','base64')}));
  const wav=Buffer.alloc(44+48000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  for(let i=0;i<48000;i++)wav.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/48000)*5000),44+i*2);
  await finder.route(site+'/tone.wav',route=>route.fulfill({status:200,headers:cors,contentType:'audio/wav',body:wav}));
  await finder.goto('http://127.0.0.1:8000');
  await finder.locator('#link-input').fill(site+'/page');
  await finder.locator('#load-link').click();
  await finder.locator('#media-results').waitFor({state:'visible'});
  assert.equal(await finder.locator('.media-item').count(),3);
  await finder.locator('.media-item').filter({hasText:'Imagen'}).click();
  await finder.waitForFunction(()=>document.querySelector('#link-status').textContent.includes('Imagen cargada'));
  await finder.locator('.media-item').filter({hasText:'Audio'}).click();
  await finder.waitForFunction(()=>!document.querySelector('#export').disabled);
  assert.equal(await finder.locator('[data-mode="image"]').getAttribute('aria-pressed'),'true');
  assert.match(await finder.locator('#selection-info').textContent(),/1\.00 s/);
  // Simulate a website without CORS; the fallback is the first-party public fetcher.
  const blocked='https://blocked.example';
  let proxied;
  await finder.route(blocked+'/**',route=>route.abort());
  await finder.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,version:'2026.11.26.14',publicMedia:true})}));
  await finder.route('**/api/media',route=>{
    proxied=route.request().postDataJSON().url;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({html:'<img src="/picture.png">',url:blocked+'/page'})});
  });
  await finder.locator('#link-input').fill(blocked+'/page');
  await finder.locator('#load-link').click();
  await finder.waitForFunction(()=>document.querySelector('#media-list').children.length===1 && document.querySelector('#link-status').dataset.state==='success');
  assert.equal(proxied,blocked+'/page');
  await finder.unroute('**/health');
  await finder.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,version:'2026.11.26.5'})}));
  await finder.locator('#link-input').fill(blocked+'/old');
  await finder.locator('#load-link').click();
  await finder.waitForFunction(()=>document.querySelector('#link-status').textContent.includes('versión antigua'));
  assert.equal(proxied,blocked+'/page');
  await finder.unroute('**/health');
  await finder.route('**/health',route=>route.abort());
  await finder.locator('#link-input').fill(blocked+'/offline');
  await finder.locator('#load-link').click();
  await finder.waitForFunction(()=>document.querySelector('#link-status').textContent.includes('No se puede conectar con Render'));
  await finder.close();
  // Failed TikTok import shows the manual external fallback; no automatic request to SnapTik.
  const fallback=await browser.newPage();
  await fallback.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,version:'2026.11.26.24',publicMedia:true,tiktokPublicDownload:true})}));
  let failedImports=0;
  await fallback.route('**/api/import',route=>{failedImports++; return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'No se pudo descargar el video.'})});});
  await fallback.goto('http://127.0.0.1:8000');
  await fallback.locator('#link-input').fill('https://www.tiktok.com/@example/video/12345');
  await fallback.locator('#load-link').click();
  await fallback.locator('#tiktok-alternative').waitFor({state:'visible'});
  assert.equal(failedImports,1);
  assert.equal(await fallback.locator('#tiktok-alternative a').getAttribute('href'),'https://snaptik.fi/');
  await fallback.locator('#language').selectOption('en');
  assert.equal(await fallback.locator('#tiktok-alternative a').textContent(),'Open SnapTik ↗');
  await fallback.locator('#demo').click();
  assert.equal(await fallback.locator('#tiktok-alternative').isVisible(),false);
  await fallback.close();
  // Inspect actual ANMF chunks, not the nominal FPS label, over a 38-second moving source.
  const cadencePage=await browser.newPage();
  const cadenceTemp=mkdtempSync(join(tmpdir(),'sticker-cadence-'));
  try{
    const file=join(cadenceTemp,'cadence.webm');
    execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=s=128x128:r=15:d=38','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=38','-c:v','libvpx','-c:a','libopus','-shortest',file]);
    await cadencePage.goto('http://127.0.0.1:8000');
    await cadencePage.locator('#visual').setInputFiles(file);
    const checked=await cadencePage.evaluate(async()=>{
      const file=document.querySelector('#visual').files[0];
      const out=await WAAS.convert({visual:{kind:'video',file,start:0,dur:38},audio:{file,start:0,dur:38},mode:{fit:'contain',rotation:0,zoom:100,x:0,y:0},side:96,fps:9,extended:true});
      const chunks=WAAS._internals.readChunks(new Uint8Array(await out.webp.arrayBuffer())).filter(c=>c.fourcc==='ANMF');
      const times=chunks.map(c=>c.data[12]+256*c.data[13]+65536*c.data[14]);
      const unique=[0,1,2].map(i=>new Set(chunks.slice(i*114,(i+1)*114).map(c=>Array.from(c.data.subarray(16)).join(','))).size);
      return {frames:chunks.length,ms:times.reduce((a,b)=>a+b,0),max:Math.max(...times),unique,bytes:out.webp.size+out.ogg.size};
    });
    assert.equal(checked.frames,342);assert.equal(checked.ms,38000);assert(checked.max<=112);assert(checked.unique.every(n=>n>50));assert(checked.bytes<=2000000);
  }finally{await cadencePage.close();rmSync(cadenceTemp,{recursive:true,force:true});}
  const qualityPage=await browser.newPage();
  const qualityTemp=mkdtempSync(join(tmpdir(),'sticker-quality-'));
  try {
    const file=join(qualityTemp,'moving.webm');
    execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=s=384x384:r=12:d=2','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2','-c:v','libvpx','-c:a','libopus','-shortest',file]);
    await qualityPage.goto('http://127.0.0.1:8000');
    await qualityPage.locator('#visual').setInputFiles(file);
    await qualityPage.waitForFunction(()=>!document.querySelector('#export').disabled);
    await qualityPage.locator('#wizard-next').click();
    await qualityPage.locator('#wizard-next').click();
    await qualityPage.locator('#size-budget').selectOption('compatible');
    await qualityPage.locator('#export').click();
    await qualityPage.locator('#sticker-files').waitFor({state:'visible',timeout:120000});
    const result=await qualityPage.evaluate(async()=>{
      const image=document.querySelector('#sticker-image');
      await image.decode();
      return {side:image.naturalWidth,size:(await (await fetch(image.src)).blob()).size};
    });
    assert(result.side>=64&&result.size<=1000000);
    assert.match(await qualityPage.locator('#quality-result').textContent(),/Calidad final:/);
    const fps=Number((await qualityPage.locator('#quality-result').textContent()).match(/(\d+) FPS/)[1]);
    assert(fps>=9);
    await qualityPage.locator('#size-budget').selectOption('extended');
    assert.equal(await qualityPage.locator('#sticker-files').isVisible(),false);
    await qualityPage.locator('#export').click();
    await qualityPage.locator('#sticker-files').waitFor({state:'visible',timeout:120000});
    const extendedSizes=await qualityPage.evaluate(async()=>Promise.all(['sticker-image','sticker-audio'].map(async id=>(await (await fetch(document.getElementById(id).src)).blob()).size)));
    assert(extendedSizes[0]>0&&extendedSizes[1]>0&&extendedSizes[0]+extendedSizes[1]<=2000000);
    assert(Number((await qualityPage.locator('#quality-result').textContent()).match(/(\d+) FPS/)[1])>=9);
    assert.match(await qualityPage.locator('#size-result').textContent(),/Peso total:/);
    assert.equal(await qualityPage.locator('#size-warning').isVisible(),(extendedSizes[0]>1000000||extendedSizes[1]>1000000));
    await qualityPage.locator('#quality').selectOption('balanced');
    assert.equal(await qualityPage.locator('#sticker-files').isVisible(),false);
  } finally {await qualityPage.close();rmSync(qualityTemp,{recursive:true,force:true});}
  // Real preview geometry, magnetic detents, release, fine numeric editing and mouse drag.
  const crop=await browser.newPage({viewport:{width:1200,height:900}});
  try {
    await crop.goto('http://127.0.0.1:8000');
    await crop.locator('#demo').click();
    await crop.waitForFunction(()=>!document.querySelector('#export').disabled);
    async function loadCropFixture(width,height,asymmetric=false){
      const bytes=await crop.evaluate(async({width,height,asymmetric})=>{
        const c=document.createElement('canvas');c.width=width;c.height=height;
        const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,width,height);
        if(asymmetric){ctx.fillStyle='#0000ff';ctx.fillRect(width/2,0,width/2,height);}
        return Array.from(new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer()));
      },{width,height,asymmetric});
      await crop.locator('#visual').setInputFiles({name:'crop.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
      await crop.waitForFunction(()=>!document.querySelector('#position').hidden&&!document.querySelector('#pan-x').disabled);
    }
    await loadCropFixture(800,400);
    await crop.locator('#wizard-next').click();
    const pan=async(id,n,magnetic=true)=>crop.evaluate(({id,n,magnetic})=>{
      const el=document.getElementById(id);
      if(magnetic)el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
      el.value=String(n);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      if(magnetic)el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
      return Number(el.value);
    },{id,n,magnetic});
    assert.equal(await pan('pan-y',126),128);
    assert.match(await crop.locator('#crop-guide-lines').getAttribute('d'),/M0 510H512/);
    assert.equal(await crop.locator('#crop-guides').isVisible(),true);
    assert.equal(await crop.evaluate(()=>document.querySelector('#canvas').getContext('2d').getImageData(256,511,1,1).data[0]),255);
    assert.equal(await pan('pan-y',-126),-128);
    assert.equal(await pan('pan-y',1),0);
    assert.equal(await pan('pan-y',12),12);
    // While still holding the slider, the magnet must release when movement continues.
    assert.deepEqual(await crop.evaluate(()=>{
      const el=document.getElementById('pan-y');
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
      const values=[126,129,140].map(n=>{el.value=n;el.dispatchEvent(new Event('input',{bubbles:true}));return Number(el.value);});
      el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
      return values;
    }),[128,128,140]);
    await crop.locator('#pan-y-value').fill('127.3');
    await crop.locator('#pan-y-value').press('Enter');
    assert.equal(Number(await crop.locator('#pan-y').inputValue()),127.3);
    await crop.locator('#center-crop').click();
    assert.equal(Number(await crop.locator('#pan-y').inputValue()),0);
    assert.equal(await pan('zoom',199.6),200);
    assert.match(await crop.locator('#crop-guide-lines').getAttribute('d'),/M0 2H512/);
    assert.equal(await pan('pan-x',254),256);
    await crop.locator('#center-crop').click();
    await pan('zoom',100,false);
    // Real pointer motion uses canvas coordinates, independent of viewport scale.
    const rect=await crop.locator('#canvas').boundingBox();
    await crop.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
    await crop.mouse.down();
    await crop.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2+126*rect.height/512);
    assert.equal(Number(await crop.locator('#pan-y').inputValue()),128);
    await crop.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2+143*rect.height/512);
    assert(Math.abs(Number(await crop.locator('#pan-y').inputValue())-143)<2);
    await crop.mouse.up();
    await crop.locator('#center-crop').click();
    await crop.locator('#fit').selectOption('cover');
    assert.equal(await pan('pan-x',-254),-256);
    await crop.locator('#center-crop').click();
    await crop.locator('#fit').selectOption('contain');
    await loadCropFixture(400,800);
    assert.equal(await pan('pan-x',126),128);
    await crop.locator('#center-crop').click();
    await loadCropFixture(800,400,true);
    const colorAt=(x,y)=>crop.evaluate(({x,y})=>Array.from(document.querySelector('#canvas').getContext('2d').getImageData(x,y,1,1).data).slice(0,3),{x,y});
    assert.deepEqual(await colorAt(64,256),[255,0,0]);
    assert.deepEqual(await colorAt(448,256),[0,0,255]);
    await crop.locator('#rotate-right').click();
    assert.equal(await crop.locator('#rotation').inputValue(),'90');
    assert.deepEqual(await colorAt(256,64),[255,0,0]);
    assert.deepEqual(await colorAt(256,448),[0,0,255]);
    assert.equal(await pan('pan-x',126),128);
    await crop.locator('#center-crop').click();
    await crop.locator('#rotate-half').click();
    assert.equal(await crop.locator('#rotation').inputValue(),'270');
    assert.deepEqual(await colorAt(256,64),[0,0,255]);
    await crop.locator('#rotate-left').click();
    assert.equal(await crop.locator('#rotation').inputValue(),'180');
    assert.deepEqual(await colorAt(64,256),[0,0,255]);
    await crop.locator('#rotation').selectOption('0');
    assert.deepEqual(await colorAt(64,256),[255,0,0]);
    // The edited media must keep its rotation in the actual converted output.
    await crop.locator('[data-wizard="1"]').click();
    await crop.locator('#demo').click();
    await crop.waitForFunction(()=>!document.querySelector('#export').disabled);
    await loadCropFixture(800,400,true);
    await crop.locator('#wizard-next').click();
    await crop.waitForFunction(()=>!document.querySelector('#export').disabled);
    await crop.locator('#rotate-right').click();
    await crop.locator('#wizard-next').click();
    await crop.locator('#export').click();
    await crop.locator('#sticker-files').waitFor({state:'visible',timeout:120000});
    const colors=await crop.evaluate(async()=>{
      const img=document.querySelector('#sticker-image');await img.decode();
      const c=document.createElement('canvas');c.width=c.height=512;
      const ctx=c.getContext('2d');ctx.drawImage(img,0,0,512,512);
      return [64,448].map(y=>Array.from(ctx.getImageData(256,y,1,1).data).slice(0,3));
    });
    assert(colors[0][0]>180&&colors[0][2]<70&&colors[1][2]>180&&colors[1][0]<70);
    await crop.locator('#language').selectOption('en');
    assert.equal(await crop.locator('#rotate-right').getAttribute('aria-label'),'Rotate 90° right');
    assert.equal(await crop.locator('#center-crop').textContent(),'Center');
    assert.equal(await crop.locator('#pan-x-value').getAttribute('aria-label'),'Horizontal position in pixels');
    await crop.setViewportSize({width:320,height:800});
    assert(await crop.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),JSON.stringify(await crop.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({id:e.id,tag:e.tagName,right:e.getBoundingClientRect().right})).slice(0,15))));
  }finally{await crop.close();}
  // The editor selects the full source, and permits manual selection beyond 60 seconds.
  const durations=await browser.newPage();
  const temp=mkdtempSync(join(tmpdir(),'sticker-duration-'));
  try{
    const path=join(temp,'source.webm');
    execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=128x128:r=5:d=241','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=241','-c:v','libvpx','-c:a','libopus','-shortest',path]);
    await durations.goto('http://127.0.0.1:8000');
    await durations.locator('#visual').setInputFiles(path);
    await durations.waitForFunction(()=>!document.querySelector('#export').disabled);
    const full=Number(await durations.locator('#ve').inputValue());
    assert(full>=240 && full===Number(await durations.locator('#ve').getAttribute('max')),`Full source selection: ${full}`);
    await durations.locator('#wizard-next').click();
    assert.equal(await durations.locator('#scrub-row').evaluate(e=>e.parentElement.id),'preview-media');
    await durations.locator('#ve').fill('60');
    await durations.locator('#ve').dispatchEvent('change');
    await durations.waitForFunction(()=>!document.querySelector('#export').disabled);
    assert.match(await durations.locator('#selection-info').textContent(),/60\.00 s/);
    await durations.locator('#ve').fill('60.5');
    await durations.locator('#ve').dispatchEvent('change');
    await durations.waitForFunction(()=>!document.querySelector('#export').disabled);
    assert.match(await durations.locator('#selection-info').textContent(),/60\.50 s/);
    await durations.locator('#ve-slider').fill('45');
    assert.equal(Number(await durations.locator('#ve').inputValue()),45);
    await durations.locator('#scrub').fill('10');
    assert.match(await durations.locator('#scrub-time').textContent(),/10\.00 \/ (240|241)\./);
    await durations.locator('#mark-start').click();
    assert.equal(Number(await durations.locator('#vs').inputValue()),10);
    await durations.locator('#v-full').click();
    assert.equal(Number(await durations.locator('#vs').inputValue()),0);
    assert.equal(Number(await durations.locator('#ve').inputValue()),full);
  }finally{await durations.close();rmSync(temp,{recursive:true,force:true});}
  // Mobile layout and language switch preserve the active media and project.
  for(const width of [320,390,740,1024]){
    const phone=await browser.newPage({viewport:{width,height:844},isMobile:width<=740,hasTouch:width<=740});
    const pageErrors=[];
    phone.on('pageerror',error=>pageErrors.push(error.message));
    await phone.goto('http://127.0.0.1:8000');
    await phone.waitForFunction(()=>document.documentElement.dataset.editorReady==='true'&&!!window.StickerUI);
    assert.equal(await phone.locator('#preview-media').evaluate(e=>e.parentElement.id),width<=740?'mobile-preview-slot':'desktop-preview-slot');
    assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await phone.locator('#language').selectOption('en');
    assert.equal(await phone.locator('html').getAttribute('lang'),'en');
    assert.equal(await phone.title(),'Stickers Sonoros · Sound sticker maker');
    assert.match(await phone.locator('meta[name=description]').getAttribute('content'),/four steps/);
    assert.equal(await phone.locator('#wizard-next').textContent(),'Next →');
    assert.equal(await phone.locator('#wizard-prev').textContent(),'← Back');
    assert.match(await phone.locator('#export').textContent(),/Create sound sticker/);
    assert.equal(await phone.locator('#signature').getAttribute('placeholder'),'Your name or nickname');
    assert.equal(await phone.locator('#link-input').getAttribute('placeholder'),'Web page, video, image or audio');
    assert.equal(await phone.locator('#support-link').textContent(),'Support the project');
    assert.match(await phone.locator('#support-link').getAttribute('href'),/#english$/);
    assert.match(await phone.locator('#guide-link').getAttribute('href'),/README\.en\.md$/);
    await phone.waitForFunction(()=>{const img=document.querySelector('.brand img');return img.complete&&img.naturalWidth>0;});
    assert.match(await phone.locator('.footer-brand small').textContent(),/Version 2026/);
    assert.equal(await phone.evaluate(()=>window.StickerUI.translate('El video no respondió al recorte.')),'The video did not respond to seeking.');
    assert.equal(await phone.evaluate(()=>window.StickerUI.translate('Este navegador no puede generar WebP (devolvió image/png). Usa Chrome o Edge.')),'This browser cannot generate WebP (returned image/png). Use Chrome or Edge.');
    assert.equal(await phone.evaluate(()=>window.StickerUI.translate('Dominio no permitido para esta descarga.')),'Domain not allowed for this download.');
    assert.equal(await phone.evaluate(()=>window.StickerUI.translate('No se encontró un formato de video con sonido accesible. Puede que la publicación no ofrezca ambos recursos. Alternativa de descarga pública: TikTok no ofreció un archivo público accesible.')),'No accessible video format with sound was found. The post may not provide both tracks. Public download fallback: TikTok did not provide an accessible public file.');
    await phone.locator('#load-link').click();
    await phone.waitForFunction(()=>document.querySelector('#link-status').textContent.includes('Paste a video link first.'));
    await phone.locator('#demo').click();
    await phone.waitForFunction(()=>!document.querySelector('#export').disabled);
    assert.equal(await phone.locator('#link-status').textContent(),'');
    assert.equal(await phone.locator('.send-steps > li').count(),4);
    await phone.waitForFunction(()=>document.querySelector('#selection-info').textContent.includes('Duration: 2.00 s.'));
    assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await phone.locator('#language').selectOption('es');
    assert.match(await phone.locator('#guide-link').getAttribute('href'),/README\.md$/);
    assert.equal(await phone.title(),'Stickers Sonoros · Creador de stickers con sonido');
    assert.match(await phone.locator('#selection-info').textContent(),/Duración: 2\.00 s/);
    assert.equal(await phone.locator('#export').isDisabled(),false);
    await phone.locator('#language').selectOption('en');
    assert.match(await phone.locator('#selection-info').textContent(),/Duration: 2\.00 s/);
    const englishBookmark=await phone.locator('#wa-bookmark').getAttribute('href');
    assert.match(decodeURIComponent(englishBookmark),/\)\("en"\)$/);
    if(width===390){
      await phone.locator('#wizard-next').click();
      await phone.locator('#wizard-next').click();
      await phone.locator('#export').click();
      await phone.locator('#sticker-files').waitFor({state:'visible',timeout:120000});
      assert.match(await phone.locator('#sticker-state').textContent(),/Your sticker is ready to send/);
      assert.equal(await phone.locator('#send-title').textContent(),'How to send your sticker to WhatsApp');
      assert.equal(await phone.locator('.send-steps > li').count(),4);
      assert.equal(await phone.locator('#download').count(),0);
      await phone.locator('#wizard-next').click();
      assert.equal(await phone.locator('#wa-bookmark').isVisible(),true);
      assert.match(await phone.locator('#package-download').textContent(),/Save sound sticker/);
      assert.equal(await phone.locator('#signature').inputValue(),'');
      const unsigned=await phone.evaluate(async()=>{
        const bytes=new Uint8Array(await (await fetch(document.querySelector('#sticker-image').src)).arrayBuffer());
        let raw='';for(let at=0;at<bytes.length;at+=16384)raw+=String.fromCharCode(...bytes.subarray(at,at+16384));
        return {webp:btoa(raw)};
      });
      const unsignedMeta=readAttribution(unsigned);
      assert.equal(unsignedMeta['sticker-pack-name'],'Creado en Stickers Sonoros');
      assert.equal(unsignedMeta['sticker-pack-publisher'],appUrl);
      await phone.screenshot({path:'artifacts/screenshots/mobile-en.png',fullPage:true});
      await phone.locator('#language').selectOption('es');
      await phone.screenshot({path:'artifacts/screenshots/mobile-es.png',fullPage:true});
      await phone.locator('#language').selectOption('en');
      assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    }
    await phone.reload();
    assert.equal(await phone.locator('#language').inputValue(),'en');
    assert.match(await phone.locator('#export').textContent(),/Create sound sticker/);
    assert.deepEqual(pageErrors,[]);
    await phone.close();
  }
  const coverage=await browser.newPage();
  await coverage.goto('http://127.0.0.1:8000');
  await coverage.locator('#language').selectOption('en');
  await coverage.locator('[data-mode="image"]').click();
  const fixture=await coverage.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
    return Array.from(new Uint8Array(await (await new Promise(r=>canvas.toBlob(r,'image/png'))).arrayBuffer()));
  });
  await coverage.locator('#visual').setInputFiles({name:'Listo',mimeType:'image/png',buffer:Buffer.from(fixture)});
  await coverage.waitForFunction(()=>document.querySelector('#position').hidden===false);
  assert.equal(await coverage.locator('#visual-label').textContent(),'Listo');
  await coverage.locator('#language').selectOption('es');
  assert.equal(await coverage.locator('#visual-label').textContent(),'Listo');
  await coverage.close();
  console.log('OK: ejemplo, exportación, WebP/Ogg, vínculo de audio y limpieza al cambiar fuente.');
} finally { await browser.close(); }
