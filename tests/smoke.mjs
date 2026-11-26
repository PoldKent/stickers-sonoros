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
  } finally {rmSync(dir,{recursive:true,force:true});}
  console.log('OK: ejemplo, exportación, WebP/Ogg, vínculo de audio y limpieza al cambiar fuente.');
} finally { await browser.close(); }
