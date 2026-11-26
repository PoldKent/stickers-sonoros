import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

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
  await page.locator('#export').click();
  await page.locator('#downloads').waitFor({state:'visible',timeout:40000});
  await page.waitForFunction(()=>document.querySelector('#output').readyState>=2,{},{timeout:20000});
  assert.match(await page.locator('#download').getAttribute('href'),/^blob:/);
  const caps=await page.evaluate(()=>window.WAAS.capabilities());
  assert.equal(caps.opus,true,'Chromium must support Opus');
  assert.equal(caps.webpEncode,'image/webp');
  await page.locator('#sticker-files').waitFor({state:'visible',timeout:120000});
  assert.match(await page.locator('#sticker-state').textContent(),/verificada/);
  const sizes = await page.evaluate(async()=>Promise.all(['webp-file','ogg-file'].map(async id=>(await (await fetch(document.getElementById(id).href)).blob()).size)));
  assert(sizes.every(size=>size>0&&size<=1000000));
  // Export the actual converted package and execute the bookmarklet against mock WA modules.
  const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#package-download').click()]);
  assert.equal(download.suggestedFilename(),'sticker.sonoro.json');
  const packageBytes=readFileSync(await download.path());
  const pack=JSON.parse(packageBytes.toString('utf8'));
  assert.equal(pack.format,'stickers-sonoros/1');
  assert.equal(pack.info.segundosAudio,2);
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
  const send=panel.getByRole('button',{name:'Confirmar y enviar al chat abierto'});
  await wa.waitForFunction(()=>!document.querySelector('#ss-local-bridge button').disabled);
  await send.click();
  assert.equal(await wa.evaluate(()=>window.mockCalls.uploads),0);
  await wa.evaluate(()=>{window.mockCalls.confirm=true;window.mockCalls.enabled=false;});
  await send.click();
  assert.match(await panel.locator('[role=status]').textContent(),/no está habilitada/);
  assert.equal(await wa.evaluate(()=>window.mockCalls.uploads),0);
  await panel.locator('#ss-experimental').check();
  await send.click();
  await panel.getByText('WhatsApp confirmó el envío.',{exact:false}).waitFor();
  assert.deepEqual(await wa.evaluate(()=>[window.mockCalls.uploads,window.mockCalls.sends]),[1,1]);
  assert.equal(await send.isDisabled(),true);
  assert.equal(await wa.evaluate(()=>window.require('WAWebSoundStickerGating').isSoundStickerCreationEnabled()),false);
  await wa.close();
  await page.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,version:'2026.11.26.5'})}));
  await page.locator('#check-service').click();
  await page.waitForFunction(()=>document.querySelector('#service-status').textContent.includes('Actualiza Render'));
  await page.unroute('**/health');
  assert.deepEqual(errors,[]);
  await page.locator('[data-mode="video"]').click();
  assert.equal(await page.locator('#downloads').isVisible(),false);
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
    assert.equal(await page.locator('input[type=url]').count(),1);
    assert.equal(await page.locator('#export').isDisabled(),false);
    assert.equal(await page.locator('#play-source').isVisible(),true);
    await page.locator('#play-source').click();
    await page.waitForFunction(()=>document.querySelector('#play-source').textContent.includes('Detener'));
    await page.locator('#play-source').click();
    const pages=await browser.newPage();
    const origin='https://poldkent.github.io';
    const backend='https://stickers-sonoros.onrender.com';
    await pages.route(origin+'/**',route=>{
      const path=new URL(route.request().url()).pathname.replace(/^\/stickers-sonoros\//,'')||'index.html';
      if (!['index.html','app.js','style.css','vendor/shirtep/convert.js','vendor/shirtep/local-send.js'].includes(path)) return route.abort();
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
    if (!['index.html','app.js','style.css','vendor/shirtep/convert.js','vendor/shirtep/local-send.js'].includes(path)) return route.abort();
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
  console.log('OK: ejemplo, exportación, WebP/Ogg, vínculo de audio y limpieza al cambiar fuente.');
} finally { await browser.close(); }
