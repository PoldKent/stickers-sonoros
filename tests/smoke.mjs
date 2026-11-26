import { chromium } from 'playwright';
import assert from 'node:assert/strict';

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
  console.log('OK: ejemplo, exportación, WebP/Ogg, vínculo de audio y limpieza al cambiar fuente.');
} finally { await browser.close(); }
