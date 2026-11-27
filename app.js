const byId = id => document.getElementById(id);
const canvas = byId('canvas');
const drawing = canvas.getContext('2d', { alpha: false });
const status = byId('status');
const modes = [...document.querySelectorAll('[data-mode]')];
const labels = {
  video: ['Selecciona o arrastra un video', 'MP4, WebM u otro video compatible', 'video/*'],
  image: ['Selecciona o arrastra una imagen', 'PNG, JPEG, WebP u otra imagen compatible', 'image/*'],
  mix: ['Selecciona o arrastra un video o GIF', 'MP4, WebM o GIF animado', 'video/*,image/gif']
};
const maxLocalBytes = 80 * 1024 * 1024;
let mode = 'video';
let visual;
let audio;
let conversionRequest;
const audioSources = new WeakMap();
let visualRequest = 0;
let audioRequest = 0;
let loadingVisual = false;
let loadingAudio = false;
let busy = false;
let previewSession;
let importController;
let importing = false;

function closeVisual(item) {
  if (!item) return;
  if (item.kind === 'video') {
    item.media.pause();
    item.media.removeAttribute('src');
    item.media.load();
  }
  item.decoder?.close();
  item.frame?.close();
  if (item.url) URL.revokeObjectURL(item.url);
}

let stickerJob;
let nativePackage;
let wizardStep=1;
function clearResult() {
  hideCropGuides();
  byId('quality-result').hidden = true;
  byId('quality-result').textContent = '';
  byId('size-result').textContent = '';
  byId('size-warning').hidden = true;
  nativePackage = undefined;
  conversionRequest = undefined;
  byId('native-bridge').hidden = true;
  byId('bridge-status').textContent = '';
  byId('bookmark-status').textContent = '';
  stopSourcePreview();
  stickerJob?.abort();
  stickerJob = undefined;
  for (const id of ['sticker-image', 'sticker-audio']) {
    const media = byId(id);
    if (media.getAttribute('src')?.startsWith('blob:')) URL.revokeObjectURL(media.src);
  }
  byId('sticker-image').removeAttribute('src');
  byId('sticker-audio').pause();
  byId('sticker-audio').removeAttribute('src');
  byId('sticker-audio').load();
  byId('sticker-progress').hidden = true;
  byId('cancel-sticker').hidden = true;
  byId('prepare-sticker').hidden = true;
  byId('components').hidden = true;
  byId('prepare-sticker').disabled = false;
  byId('sticker-state').textContent = '';
  byId('sticker-files').hidden = true;
  byId('sticker-advanced').open = false;

}

function sync() {
  byId('export').disabled = busy || importing || loadingVisual || loadingAudio || !!stickerJob || !visual || !audio;
  byId('quality').disabled = busy || importing || !!stickerJob;
  byId('signature').disabled = busy || importing || !!stickerJob;
  byId('size-budget').disabled = busy || importing || !!stickerJob;
  byId('sound-row').hidden = mode === 'video';
  byId('visual-trim').hidden = !visual || visual.kind === 'image';
  byId('audio-trim').hidden = mode === 'video' || !audio;
  byId('motion-row').hidden = mode !== 'mix';
  byId('empty').hidden = !!visual;
  byId('position').hidden = !visual;
  for (const id of ['pan-x','pan-y','zoom','pan-x-value','pan-y-value','zoom-value','center-crop','rotation','rotate-left','rotate-right','rotate-half']) byId(id).disabled = busy || importing || !!stickerJob || !visual;
  if (!visual) hideCropGuides();
  byId('scrub-row').hidden = !visual || visual.kind === 'image' || (wizardStep!==2 && !!conversionRequest);
  byId('scrub').disabled = busy || importing || loadingVisual || loadingAudio || !!stickerJob || (wizardStep!==2 && !!conversionRequest);
  byId('source-preview').hidden = !visual || !audio || loadingVisual || loadingAudio || busy || importing || (wizardStep!==2 && !!conversionRequest);
  byId('play-source').disabled = busy || importing;
  byId('use-frame').hidden = !visual || visual.kind === 'image' || !audio;
  byId('use-frame').disabled = busy || importing || loadingVisual || loadingAudio;
  byId('trim-actions').hidden = byId('scrub-row').hidden;
  updateTimeline();
  // Hidden trim fields must not block form submission.
  for (const [ids,hidden] of [[['vs','ve'],byId('visual-trim').hidden],[['as','ae'],byId('audio-trim').hidden]]) for (const id of ids) { byId(id).required = !hidden; byId(id).disabled = hidden || busy; }
  for (const id of ['mark-start','mark-end','demo','v-full','a-full']) byId(id).disabled = busy || importing;
  for (const id of ['vs','ve','as','ae']) {
    const field=byId(id), slider=byId(id+'-slider');
    slider.max=field.max || 1; slider.value=field.value;
    slider.disabled=field.disabled || importing || !!stickerJob;
  }
  selectionInfo();
  syncWizard();
  canvas.classList.toggle('ready', !!visual);
}

function wizardAvailable(step){
  if(step===1)return true;
  if(!visual || !audio || loadingVisual || loadingAudio)return false;
  if(step===2)return true;
  if(step===3)return !byId('export').disabled || !!conversionRequest;
  return !!nativePackage;
}
function syncWizard(){
  const locked=busy||importing||loadingVisual||loadingAudio||!!stickerJob;
  if(wizardStep>1 && (!visual||!audio) && !locked)wizardStep=1;
  if(wizardStep===4 && !nativePackage)wizardStep=3;
  document.documentElement.dataset.wizardStep=String(wizardStep);
  const names=['Importar contenido','Editar sticker','Crear sticker','Enviar sticker'];
  const heading=byId('editor');
  const label=window.StickerUI?.language()==='en'?['Import content','Edit sticker','Create sticker','Send sticker'][wizardStep-1]:names[wizardStep-1];
  if(heading.textContent!==label)heading.textContent=names[wizardStep-1];
  for(const button of document.querySelectorAll('[data-wizard]')){
    const step=Number(button.dataset.wizard);
    button.disabled=locked||step>wizardStep+1||!wizardAvailable(step);
    if(step===wizardStep)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  }
  byId('wizard-prev').disabled=locked||wizardStep===1;
  byId('wizard-next').disabled=locked||wizardStep===4||!wizardAvailable(wizardStep+1);
  byId('wizard-next').hidden=wizardStep===4;
  byId('wizard-counter').textContent=wizardStep+' / 4';
}
function goWizard(step){
  if(step===wizardStep || busy||importing||loadingVisual||loadingAudio||stickerJob||!wizardAvailable(step)||step>wizardStep+1)return;
  stopSourcePreview();byId('sticker-audio').pause();
  wizardStep=step;sync();
  if(step===2&&visual)previewFrame(byId('scrub').valueAsNumber);
  const target=step===4?byId('send-title'):byId('editor');
  target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
  document.querySelector('.workflow-strip').scrollIntoView({block:'nearest',behavior:'instant'});
}
byId('wizard-prev').onclick=()=>goWizard(wizardStep-1);
byId('wizard-next').onclick=()=>goWizard(wizardStep+1);
for(const button of document.querySelectorAll('[data-wizard]'))button.onclick=()=>goWizard(Number(button.dataset.wizard));


// All crop positions are in output-canvas pixels; guides never enter the canvas.
const cropSide = 512;
const cropAxes = ['pan-x','pan-y'];
let cropKey = '';
let guideTimer;
const clampCrop = (n,min,max) => Math.max(min,Math.min(max,n));
const quantizeCrop = (n,step) => Number((Math.round(n/step)*step).toFixed(2));
function cropGeometry(media = visual?.frame || visual?.media, zoom = Number(byId('zoom').value)) {
  if (!media) return null;
  const width = media.videoWidth || media.naturalWidth || media.displayWidth;
  const height = media.videoHeight || media.naturalHeight || media.displayHeight;
  if (!width || !height) return null;
  const angle=Number(byId('rotation').value);
  const quarter=angle===90||angle===270;
  const orientedW=quarter?height:width, orientedH=quarter?width:height;
  const base=Math[byId('fit').value==='cover'?'max':'min'](cropSide/orientedW,cropSide/orientedH);
  const scale=base*zoom/100;
  return {angle,baseW:orientedW*base,baseH:orientedH*base,w:orientedW*scale,h:orientedH*scale,drawW:width*scale,drawH:height*scale};
}
function cropTargets(id,g) {
  if (!g) return [];
  if (id === 'zoom') {
    const x = Number(byId('pan-x').value), y = Number(byId('pan-y').value);
    return [100,100*cropSide/g.baseW,100*cropSide/g.baseH,
      100*(cropSide+2*x)/g.baseW,100*(cropSide-2*x)/g.baseW,
      100*(cropSide+2*y)/g.baseH,100*(cropSide-2*y)/g.baseH];
  }
  const edge = (cropSide - (id === 'pan-x' ? g.w : g.h))/2;
  return [0,edge,-edge];
}
function cropReadouts() {
  for (const id of [...cropAxes,'zoom']) {
    const input=byId(id), number=byId(id+'-value');
    number.min=input.min; number.max=input.max;
    if (document.activeElement!==number) number.value=Number(input.value).toFixed(id==='zoom'?2:1);
  }
}
function refreshCrop(g) {
  if (!g) return;
  const key=[g.w,g.h,g.baseW,g.baseH].join('/');
  if (cropKey!==key) {
    cropKey=key;
    cropAxes.forEach((id,index)=>{
      const input=byId(id), current=Number(input.value);
      const extent=Math.ceil(Math.max(256,Math.abs(cropSide-(index?g.h:g.w))/2+64,Math.abs(current)));
      input.min=-extent; input.max=extent; input.value=current;
    });
  }
  cropReadouts();
}
function paint(media) {
  const g=cropGeometry(media);
  if (!g) return;
  refreshCrop(g);
  drawing.fillStyle='#14101d';
  drawing.fillRect(0,0,cropSide,cropSide);
  drawing.save();
  try {
    drawing.translate(cropSide/2+Number(byId('pan-x').value),cropSide/2+Number(byId('pan-y').value));
    drawing.rotate(g.angle*Math.PI/180);
    drawing.drawImage(media,-g.drawW/2,-g.drawH/2,g.drawW,g.drawH);
  } finally { drawing.restore(); }
}
function hideCropGuides() {
  clearTimeout(guideTimer);
  byId('crop-guides').setAttribute('hidden','');
  byId('crop-guide-lines').setAttribute('d','');
}
function showCropGuides() {
  const g=cropGeometry();
  if(!g || busy || !visual) return;
  const x=Number(byId('pan-x').value), y=Number(byId('pan-y').value);
  const left=(cropSide-g.w)/2+x, top=(cropSide-g.h)/2+y;
  const near=(a,b)=>Math.abs(a-b)<=0.18;
  const lines=[];
  if(near(x,0))lines.push('M256 0V512');
  if(near(y,0))lines.push('M0 256H512');
  if(near(left,0))lines.push('M2 0V512');
  if(near(left+g.w,cropSide))lines.push('M510 0V512');
  if(near(top,0))lines.push('M0 2H512');
  if(near(top+g.h,cropSide))lines.push('M0 510H512');
  byId('crop-guide-lines').setAttribute('d',lines.join(' '));
  byId('crop-guides').toggleAttribute('hidden',!lines.length);
  clearTimeout(guideTimer);
  guideTimer=setTimeout(hideCropGuides,700);
}

function range(prefix, duration) {
  const max = Math.floor(duration * 100) / 100;
  if (max < .01) throw new Error('El archivo es demasiado corto.');
  byId(prefix + 's').max = max;
  byId(prefix + 's').value = 0;
  byId(prefix + 'e').max = max;
  byId(prefix + 'e').value = max;
  if (prefix === 'v') { byId('scrub').max = max; byId('scrub').value = 0; byId('scrub-time').textContent = '0.00 s'; }
}

function loadVideo(video, url) {
  return new Promise((resolve, reject) => {
    const done = () => settle();
    const failed = () => settle(new Error('El navegador no pudo leer el video.'));
    const timer = setTimeout(() => settle(new Error('El video tardó demasiado en abrirse.')), 15000);
    function settle(error) {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', done);
      video.removeEventListener('error', failed);
      if (error) reject(error); else resolve();
    }
    video.addEventListener('loadeddata', done, { once: true });
    video.addEventListener('error', failed, { once: true });
    video.src = url;
  });
}

async function readAudio(file) {
  const context = new OfflineAudioContext(1, 1, 48000);
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    if (buffer.duration < .01) throw new Error();
    audioSources.set(buffer,file);
    return buffer;
  } catch {
    throw new Error('No pude leer una pista de audio compatible en este archivo.');
  }
}

async function readVisual(file, selectedMode) {
  if (selectedMode === 'mix' && (file.type === 'image/gif' || /[.]gif$/i.test(file.name))) {
    if (!('ImageDecoder' in window)) throw new Error('Para GIF animado, abre el editor en Chrome o Edge actualizado.');
    const decoder = new ImageDecoder({ data: file.stream(), type: 'image/gif' });
    try {
      await decoder.completed;
      const count = decoder.tracks.selectedTrack.frameCount;
      const ends = [];
      let duration = 0;
      for (let frameIndex = 0; frameIndex < count; frameIndex++) {
        const { image } = await decoder.decode({ frameIndex });
        duration += Math.max(.02, (image.duration || 100000) / 1e6);
        ends.push(duration);
        image.close();
      }
      const { image } = await decoder.decode({ frameIndex: 0 });
      return { kind: 'gif', decoder, frame: image, index: 0, duration, ends };
    } catch (error) {
      decoder.close();
      throw error;
    }
  }
  const url = URL.createObjectURL(file);
  try {
    if (selectedMode === 'image') {
      const media = new Image();
      media.src = url;
      await media.decode();
      return { kind: 'image', media, url };
    }
    const media = document.createElement('video');
    media.muted = true;
    media.playsInline = true;
    media.preload = 'auto';
    await loadVideo(media, url);
    let duration = media.duration;
    if (!Number.isFinite(duration) && selectedMode === 'video') {
      duration = (await readAudio(file)).duration;
    }
    if (!Number.isFinite(duration) || !media.videoWidth) throw new Error('No pude obtener la duración o imagen del video.');
    return { kind: 'video', media, url, duration };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function chooseVisual(file, signal) {
  if (!file || busy || signal?.aborted) return;
  if (file.size > maxLocalBytes) { status.textContent = 'El archivo local supera 80 MiB. Selecciona un archivo más pequeño.'; return false; }
  const request = ++visualRequest;
  const selectedMode = mode;
  loadingVisual = true;
  clearResult();
  closeVisual(visual);
  visual = undefined;
  if (mode === 'video') audio = undefined;
  byId('visual-label').dataset.noTranslate = '';
  byId('visual-label').textContent = file.name;
  status.textContent = 'Leyendo archivo…';
  sync();
  let item;
  try {
    item = await readVisual(file, selectedMode);
    if (request !== visualRequest || signal?.aborted) return;
    if (item.duration) range('v', item.duration);
    item.name = file.name;
    item.file = file;
    visual = item;
    byId('rotation').value='0';
    paint(item.frame || item.media);
    if (selectedMode === 'video') {
      const buffer = await readAudio(file);
      if (request !== visualRequest || signal?.aborted) return;
      audio = buffer;
      range('v', Math.min(item.duration, audio.duration));
    }
    status.textContent = '';
    return true;
  } catch (error) {
    if (request === visualRequest) status.textContent = error.message;
    return false;
  } finally {
    if (item && item !== visual) closeVisual(item);
    if (request === visualRequest) {
      if (signal?.aborted && visual === item) { closeVisual(visual); visual = undefined; if (selectedMode === 'video') audio = undefined; }
      loadingVisual = false;
      sync();
    }
  }
}

async function chooseAudio(file, signal) {
  if (!file || busy || signal?.aborted) return;
  if (file.size > maxLocalBytes) { status.textContent = 'El archivo local supera 80 MiB. Selecciona un archivo más pequeño.'; return false; }
  const request = ++audioRequest;
  clearResult();
  audio = undefined;
  loadingAudio = true;
  status.textContent = 'Leyendo la pista de audio…';
  sync();
  try {
    const buffer = await readAudio(file);
    if (request !== audioRequest || signal?.aborted) return;
    range('a', buffer.duration);
    audio = buffer;
    status.textContent = '';
  } catch (error) {
    if (request === audioRequest) status.textContent = error.message;
  } finally {
    if (request === audioRequest) {
      loadingAudio = false;
      sync();
    }
  }
}
byId('sound').addEventListener('change', event => chooseAudio(event.target.files[0]));

for (const button of modes) {
  button.addEventListener('click', () => {
    if (busy || button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    visualRequest++;
    audioRequest++;
    loadingVisual = loadingAudio = false;
    clearResult();
    closeVisual(visual);
    visual = audio = undefined;
    for (const tab of modes) tab.setAttribute('aria-pressed', String(tab === button));
    const [label, hint, accept] = labels[mode];
    delete byId('visual-label').dataset.noTranslate;
    byId('visual-label').textContent = label;
    byId('visual-hint').textContent = hint;
    byId('visual').accept = accept;
    byId('visual').value = byId('sound').value = '';
    status.textContent = '';
    sync();
  });
}
byId('visual').addEventListener('change', event => {
  if (event.target.files[0]) showLinkState('');
  chooseVisual(event.target.files[0]);
});
const drop = byId('drop');
drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', event => {
  event.preventDefault();
  drop.classList.remove('over');
  if (event.dataTransfer.files[0]) showLinkState('');
  chooseVisual(event.dataTransfer.files[0]);
});

function seek(video, time) {
  if (Math.abs(video.currentTime - time) < .001 && !video.seeking) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const settle = error => {
      clearTimeout(timer);
      video.removeEventListener('seeked', done);
      if (error) reject(error);
      else resolve();
    };
    const done = () => settle();
    const timer = setTimeout(() => settle(new Error('El video no respondió al recorte.')), 4000);
    video.addEventListener('seeked', done, { once: true });
    video.currentTime = time;
  });
}

async function gifAt(item, time) {
  let index = item.ends.findIndex(end => time < end);
  if (index === -1) index = item.ends.length - 1;
  if (index === item.index) return item.frame;
  const { image } = await item.decoder.decode({ frameIndex: index });
  item.frame?.close();
  item.frame = image;
  item.index = index;
  return image;
}

let pendingPreview, previewActive=false;
async function previewFrame(at) {
  pendingPreview=at;
  if(previewActive)return;
  previewActive=true;
  try{do{const next=pendingPreview;pendingPreview=undefined;await drawPreviewFrame(next);}while(pendingPreview!==undefined);}finally{previewActive=false;}
}
async function drawPreviewFrame(at) {
  if (!visual || busy) return;
  stopSourcePreview();
  const item = visual;
  const time = Math.max(0, Math.min(item.duration || 0, typeof at === 'number' ? at : (byId('vs').valueAsNumber || 0)));
  try {
    if (item.kind === 'video') await seek(item.media, time);
    const media = item.kind === 'gif' ? await gifAt(item, time) : item.media;
    if (visual === item && !busy) paint(media);
  } catch (error) {
    if (visual === item && !busy) status.textContent = error.message;
  }
}
byId('fit').addEventListener('change', () => { if (visual) { paint(visual.frame || visual.media); } previewFrame(byId('scrub').valueAsNumber); });
byId('vs').addEventListener('change', () => { clearResult(); byId('scrub').value = byId('vs').value; updateScrub(); });
for (const id of ['ve','as','ae','motion','fit']) byId(id).addEventListener('change', clearResult);
function updateTimeline() { const slider=byId('scrub'); byId('scrub-time').textContent = Number(slider.value).toFixed(2) + ' / ' + Number(slider.max).toFixed(2) + ' s'; }
function updateScrub() { updateTimeline(); previewFrame(byId('scrub').valueAsNumber); }
byId('scrub').addEventListener('change', updateScrub);
let scrubFrame = 0;
byId('scrub').addEventListener('input', () => { updateTimeline(); cancelAnimationFrame(scrubFrame); scrubFrame = requestAnimationFrame(() => previewFrame(byId('scrub').valueAsNumber)); });

function trimmed(prefix) {
  const start = byId(prefix + 's').valueAsNumber;
  const end = byId(prefix + 'e').valueAsNumber;
  const max = Number(byId(prefix + 'e').max);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > max + .0001 || end <= start) throw new Error('Selecciona un tramo válido dentro de la duración del archivo.');
  return { start, duration: end - start };
}

// Build a single conversion request from the original media and editor settings.
function conversionSettings() {
  const visualTrim=visual.kind==='image'?null:trimmed('v');
  const soundTrim=mode==='video'?visualTrim:trimmed('a');
  const file=audioSources.get(audio);
  if(!file || !visual.file)throw new Error('Selecciona nuevamente los archivos originales.');
  return {
    visual:{kind:visual.kind,file:visual.file,start:visualTrim?.start||0,dur:visualTrim?.duration||soundTrim.duration},
    audio:{file,start:soundTrim.start,dur:soundTrim.duration},
    mode:{fit:byId('fit').value,rotation:Number(byId('rotation').value),zoom:Number(byId('zoom').value),x:Number(byId('pan-x').value),y:Number(byId('pan-y').value)},
    fit:mode==='video'?'independiente':mode==='mix'&&byId('motion').value==='loop'?'repetir':'congelar'
  };
}
byId('project').addEventListener('submit',async event=>{
  event.preventDefault();
  if(wizardStep!==3||busy||importing||stickerJob||!visual||!audio)return;
  try{
    const request=conversionSettings();
    clearResult();
    conversionRequest=request;
    byId('components').hidden=false;
    status.textContent='';
    await prepareSticker();
  }catch(error){status.textContent=error.message||'No se pudo generar el sticker.';}
});

sync();

// Small magnetic detents, with a wider release radius. Keyboard and numeric fields bypass snapping.
const locks = new Map();
const activeSliders = new Set();
let drag;
function cropAvailable() { return visual && !busy && !importing && !stickerJob; }
function snapCrop(id,raw,magnetic) {
  const input=byId(id), min=Number(input.min),max=Number(input.max), step=Number(input.step);
  raw=clampCrop(raw,min,max);
  if(!magnetic){locks.delete(id);return quantizeCrop(raw,step);}
  const targets=cropTargets(id,cropGeometry()).filter(n=>n>=min-0.001&&n<=max+0.001);
  // Use a small preview-space radius, not a percentage of the full slider range.
  const radius=id==='zoom'?0.6:clampCrop(2*cropSide/Math.max(1,canvas.clientWidth),2,4);
  const old=locks.get(id);
  if(old!==undefined && targets.some(n=>Math.abs(n-old)<0.02) && Math.abs(raw-old)<=radius*1.65)
    return clampCrop(quantizeCrop(old,step),min,max);
  locks.delete(id);
  let nearest;
  for(const n of targets)if(nearest===undefined||Math.abs(n-raw)<Math.abs(nearest-raw))nearest=n;
  if(nearest!==undefined && Math.abs(nearest-raw)<=radius){locks.set(id,nearest);raw=nearest;}
  return clampCrop(quantizeCrop(raw,step),min,max);
}
function editCrop() {
  if(!cropAvailable())return;
  if(conversionRequest || previewSession || nativePackage)clearResult();
  paint(visual.frame || visual.media);
  cropReadouts();
  showCropGuides();
  sync();
}
for(const id of [...cropAxes,'zoom']){
  const input=byId(id),number=byId(id+'-value');
  input.addEventListener('pointerdown',()=>{activeSliders.add(id);locks.delete(id);});
  const release=()=>{activeSliders.delete(id);locks.delete(id);};
  input.addEventListener('pointerup',release);
  input.addEventListener('pointercancel',release);
  input.addEventListener('lostpointercapture',release);
  input.addEventListener('blur',release);
  input.addEventListener('keydown',release);
  input.addEventListener('input',event=>{
    if(!cropAvailable())return;
    input.value=snapCrop(id,Number(input.value),activeSliders.has(id)&&!event.shiftKey);
    editCrop();
  });
  number.addEventListener('change',()=>{
    if(!cropAvailable())return;
    const n=number.valueAsNumber;
    if(Number.isFinite(n)){input.value=snapCrop(id,n,false);editCrop();}
    number.value=Number(input.value).toFixed(id==='zoom'?2:1);
  });
  number.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();number.blur();}});
}
byId('center-crop').onclick=()=>{
  if(!cropAvailable())return;
  locks.clear();cropAxes.forEach(id=>{byId(id).value=0;});
  editCrop();
};
// Rotate the actual canvas content, not a CSS preview. Pan stays in screen coordinates.
function changeRotation(angle) {
  if(!cropAvailable())return;
  byId('rotation').value=String((angle%360+360)%360);
  locks.clear();cropKey='';
  editCrop();
}
byId('rotation').addEventListener('change',()=>changeRotation(Number(byId('rotation').value)));
for(const [id,delta] of [['rotate-left',-90],['rotate-right',90],['rotate-half',180]]) {
  byId(id).onclick=()=>changeRotation(Number(byId('rotation').value)+delta);
}
canvas.addEventListener('pointerdown',event=>{
  if(!cropAvailable()||drag||event.button!==0)return;
  canvas.setPointerCapture(event.pointerId);
  locks.clear();
  drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,values:cropAxes.map(id=>Number(byId(id).value))};
});
canvas.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer||!cropAvailable())return;
  const rect=canvas.getBoundingClientRect();
  const delta=[(event.clientX-drag.x)*cropSide/rect.width,(event.clientY-drag.y)*cropSide/rect.height];
  cropAxes.forEach((id,index)=>{byId(id).value=snapCrop(id,drag.values[index]+delta[index],!event.shiftKey);});
  editCrop();
});
const endCropDrag=event=>{if(drag?.pointer===event.pointerId){drag=undefined;locks.clear();}};
canvas.addEventListener('pointerup',endCropDrag);
canvas.addEventListener('pointercancel',endCropDrag);
canvas.addEventListener('lostpointercapture',endCropDrag);
const linkStatus = byId('link-status');
function showLinkState(message, state = 'info') {
  const fallback = byId('tiktok-alternative');
  fallback.hidden = true;
  if (state === 'error') {
    try {
      const url = new URL(linkInput.value.trim());
      if (url.protocol === 'https:' && /^(?:(?:www|m|vm|vt)\.)?tiktok\.com$/i.test(url.hostname)
          && !/cancelada|Espera a que termine/i.test(message)) fallback.hidden = false;
    } catch {}
  }
  linkStatus.dataset.state = state;
  linkStatus.textContent = message;
}
const maxImportBytes = 80 * 1024 * 1024;
const socialHosts = /^(?:(?:www|m|vm|vt)\.tiktok\.com|tiktok\.com|(?:www\.)?instagram\.com|(?:www\.|m\.)?youtube\.com|youtu\.be)$/i;
const configuredEndpoint = document.querySelector('meta[name="sticker-import-endpoint"]')?.content.trim() || '';
// Deployment configuration belongs to the administrator, never to the user.
const isPages = location.hostname.endsWith('.github.io');
const importEndpoint = isPages ? configuredEndpoint : location.origin;
try { localStorage.removeItem('sticker-import-endpoint'); } catch {}
let linkTimer;
let lastLink = '';
byId('choose-tiktok-file').onclick = () => { switchToVideo(); byId('visual').click(); };
function switchToVideo() {
  if (mode !== 'video') modes.find(button => button.dataset.mode === 'video').click();
}
function cancelImport() { if (mediaModeChange) return; clearTimeout(linkTimer); if (importController) { importController.abort(); showLinkState('Importación cancelada.'); } lastLink = ''; }
byId('cancel-link').onclick = cancelImport;
byId('visual').addEventListener('change', cancelImport, { capture: true });
drop.addEventListener('drop', cancelImport, { capture: true });
for (const button of modes) button.addEventListener('click', cancelImport, { capture: true });
function httpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Introduce una URL HTTPS válida.');
  return url;
}
const mediaExtensions = {
  mp4:'video/mp4', m4v:'video/mp4', webm:'video/webm', mov:'video/quicktime',
  mp3:'audio/mpeg', wav:'audio/wav', m4a:'audio/mp4', ogg:'audio/ogg', opus:'audio/ogg', aac:'audio/aac', flac:'audio/flac',
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', avif:'image/avif'
};
const mediaKind = type => /^(video|audio|image)\//.exec(type)?.[1];
function inferredType(url) {
  try { return mediaExtensions[new URL(url).pathname.split('.').pop().toLowerCase()] || ''; }
  catch { return ''; }
}
function detectedType(response, hint = '') {
  const declared = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (mediaKind(declared)) return declared;
  if (declared === 'application/octet-stream' || !declared) return (hint.endsWith('/unknown') ? '' : hint) || inferredType(response.url);
  return declared;
}
async function checkResponse(response) {
  if (response.ok) return;
  let message = 'Error de descarga (' + response.status + ').';
  if ((response.headers.get('content-type') || '').includes('application/json')) {
    try { message = (await response.json()).error || message; } catch {}
  }
  throw new Error(message);
}
async function readBounded(response, signal, maximum, report = false) {
  const total = Number(response.headers.get('content-length')) || 0;
  if (total > maximum) { await response.body?.cancel().catch(()=>{}); throw new Error('El archivo supera el límite permitido.'); }
  if (!response.body) throw new Error('El navegador no permite leer esta descarga.');
  const reader = response.body.getReader(), chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (signal.aborted) throw new DOMException('Cancelado','AbortError');
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) throw new Error('El archivo supera el límite permitido.');
      chunks.push(value);
      if (report) showLinkState('Cargando… ' + (total ? Math.min(100,Math.round(100*bytes/total)) + '%' : (bytes/1048576).toFixed(1) + ' MB'),'loading');
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (!bytes) throw new Error('El archivo está vacío.');
  return chunks;
}
async function readMedia(response, signal, hint = '') {
  await checkResponse(response);
  const type = detectedType(response,hint), kind = mediaKind(type);
  if (!kind || type === 'image/svg+xml') throw new Error('El recurso no devolvió un video, imagen o audio compatible.');
  const chunks = await readBounded(response,signal,maxImportBytes,true);
  const ext = Object.keys(mediaExtensions).find(key => mediaExtensions[key] === type) || kind;
  return new File(chunks,kind+'-importado.'+ext,{type});
}
function findMedia(markup, pageUrl) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  const found = new Map();
  function add(value, hint = '') {
    if (!value || found.size >= 60) return;
    try {
      const url = new URL(value,pageUrl);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      const type = inferredType(url.href) || hint;
      const kind = mediaKind(type);
      if (!kind || type === 'image/svg+xml') return;
      if (!found.has(url.href)) found.set(url.href,{url:url.href,type,kind});
    } catch {}
  }
  const attr = (el, name) => el.getAttribute(name);
  for (const el of template.content.querySelectorAll('video,audio,video source,audio source,img,picture source,a[href],meta[property],meta[name]')) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'meta') {
      const key = (attr(el,'property') || attr(el,'name') || '').toLowerCase();
      if (/^(og:image(?::url|:secure_url)?|twitter:image(?::src)?)$/.test(key)) add(attr(el,'content'),'image/unknown');
      if (/^og:video(?::url|:secure_url)?$/.test(key)) add(attr(el,'content'),'video/unknown');
      if (/^og:audio(?::url|:secure_url)?$/.test(key)) add(attr(el,'content'),'audio/unknown');
    } else if (tag === 'a') add(attr(el,'href'));
    else {
      const parent = el.parentElement?.tagName.toLowerCase();
      const kind = tag === 'video' || parent === 'video' ? 'video' : tag === 'audio' || parent === 'audio' ? 'audio' : 'image';
      const hint = attr(el,'type') || kind+'/unknown';
      for (const key of ['src','data-src','data-original']) add(attr(el,key),hint);
      if (tag === 'video') add(attr(el,'poster'),'image/unknown');
    }
  }
  return [...found.values()];
}
function clearMediaResults() {
  byId('media-results').hidden = true;
  byId('media-list').replaceChildren();
}
function showMediaResults(items) {
  clearMediaResults();
  byId('media-count').textContent = String(items.length);
  for (const item of items) {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'media-item';
    const label = document.createElement('strong');
    label.textContent = ({video:'▶ Video',image:'▧ Imagen',audio:'♫ Audio'})[item.kind];
    const detail = document.createElement('small');
    const url = new URL(item.url);
    detail.dataset.noTranslate = '';
    detail.textContent = url.hostname + ' · ' + (url.pathname.split('/').pop() || item.kind).slice(0,70);
    row.append(label,detail);
    row.addEventListener('click',()=>loadDetected(item));
    byId('media-list').append(row);
  }
  byId('media-results').hidden = !items.length;
}
let mediaModeChange = false;
function selectMediaMode(next, keepVisual = false, keepAudio = false) {
  if (mode === next) return;
  const oldVisual = visual, oldAudio = audio;
  if (keepVisual) visual = undefined;
  mediaModeChange = true;
  try { modes.find(button=>button.dataset.mode===next).click(); }
  finally { mediaModeChange = false; }
  if (keepVisual) {
    visual = oldVisual;
    if (visual?.duration) range('v',visual.duration);
    if (visual?.name) byId('visual-label').dataset.noTranslate = ''; else delete byId('visual-label').dataset.noTranslate;
    byId('visual-label').textContent = visual?.name || 'Contenido seleccionado';
  }
  if (keepAudio && oldAudio) { audio = oldAudio; range('a',audio.duration); }
  sync();
}
async function openMedia(file, signal) {
  if (signal?.aborted) return '';
  const kind = mediaKind(file.type);
  if (kind === 'audio') {
    if (mode === 'video') selectMediaMode(visual ? 'mix' : 'image',!!visual);
    await chooseAudio(file, signal);
    if (signal?.aborted) return '';
    return !!audio ? (visual ? 'Audio cargado. Ajusta el tramo.' : 'Audio cargado. Selecciona una imagen o GIF para acompañarlo.') : '';
  }
  if (kind === 'image') {
    selectMediaMode(file.type === 'image/gif' ? 'mix' : 'image',false,!!audio);
    return await chooseVisual(file, signal) ? (audio ? 'Imagen cargada. Ajusta el encuadre.' : 'Imagen cargada. Añade una pista de audio.') : '';
  }
  selectMediaMode(audio && mode !== 'video' ? 'mix' : 'video',false,!!audio && mode!=='video');
  let loaded = await chooseVisual(file, signal);
  if (signal?.aborted) return '';
  if (!loaded && visual && mode==='video' && !audio) {
    selectMediaMode('mix',true);
    return 'Video cargado sin pista de audio compatible. Añade un audio.';
  }
  return loaded ? 'Video listo. Ajusta el tramo y el encuadre en la vista previa.' : '';
}
async function fetchBackend(path, options = {}) {
  if (!importEndpoint) throw new Error('No hay un servidor de importación configurado.');
  const endpoint = new URL(importEndpoint);
  if (endpoint.protocol !== 'https:' && !(endpoint.origin === location.origin && ['localhost','127.0.0.1'].includes(location.hostname))) throw new Error('Dirección de servidor no válida.');
  try {
    return await fetch(new URL(path, endpoint), {...options, credentials:'omit', referrerPolicy:'no-referrer', cache:'no-store'});
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (error instanceof TypeError) throw new Error('No se puede conectar con Render ('+path+'). Comprueba el servidor al pie de la página; puede estar suspendido o no permitir el origen de esta web.');
    throw error;
  }
}
async function backendHealth(signal, capability) {
  const response = await fetchBackend('/health',{signal});
  if (!response.ok) throw new Error('Render respondió HTTP '+response.status+' al comprobar el servidor.');
  let info;
  try { info = await response.json(); } catch { throw new Error('Render no devolvió el estado JSON del descargador. Revisa su despliegue.'); }
  if (!info.ok) throw new Error('El servidor de importación no está disponible.');
  if (capability && info[capability] !== true) throw new Error('Render está ejecutando una versión antigua ('+(info.version||'sin versión')+'). No tiene habilitada la importación alternativa de medios. Despliega el último commit de main en Render.');
  return info;
}
async function fetchAccessible(url, signal) {
  const options = {signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'};
  try {
    return await fetch(url,options);
  } catch (error) {
    if (signal.aborted || !(error instanceof TypeError)) throw error;
    const target = new URL(url);
    if (socialHosts.test(target.hostname)) throw error;
    if (!importEndpoint) throw new Error('La fuente no permite acceso directo y el servidor alternativo no está configurado.');
    showLinkState('La fuente no permite acceso directo. Comprobando Render…','loading');
    await backendHealth(signal,'publicMedia');
    showLinkState('Descargando el recurso público mediante Render…','loading');
    return await fetchBackend('/api/media',{
      ...options,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:target.href})
    });
  }
}
async function loadDetected(item) {
  if (busy || importing) return;
  const controller = new AbortController();
  importController = controller; importing = true;
  byId('load-link').hidden = true; byId('cancel-link').hidden = false;
  const timer = setTimeout(()=>controller.abort(),120000);
  sync();
  try {
    showLinkState('Cargando recurso seleccionado…','loading');
    const response = await fetchAccessible(item.url,controller.signal);
    const file = await readMedia(response,controller.signal,item.type);
    if (controller.signal.aborted) return;
    const message = await openMedia(file, controller.signal);
    if (controller.signal.aborted || importController !== controller) return;
    showLinkState(message || status.textContent || 'No se pudo abrir el recurso.',message?'success':'error');
  } catch(error) {
    if (importController === controller) showLinkState(error.name==='AbortError'?'Importación cancelada.':error instanceof TypeError?'El sitio no permite acceder al archivo desde esta web (CORS). Si tienes permiso, importa el archivo original.':error.message,'error');
  } finally {
    clearTimeout(timer);
    if (importController===controller) {
      importController=undefined; importing=false;
      byId('load-link').hidden=false; byId('cancel-link').hidden=true;
      sync();
    }
  }
}
const linkInput = byId('link-input');
function queueImport() {
  clearTimeout(linkTimer);
  if (busy) { showLinkState('Espera a que termine la generación antes de importar.','error'); return; }
  const text = linkInput.value.trim();
  if (text === lastLink && importing) return;
  if (importing) cancelImport();
  if (!text) { showLinkState('Pega un enlace HTTPS de un video.'); return; }
  showLinkState('Comprobando enlace…','loading');
  linkTimer = setTimeout(() => importLink(false), 500);
}
linkInput.addEventListener('input', queueImport);
linkInput.addEventListener('paste', event => {
  const pasted = event.clipboardData?.getData('text/plain')?.trim();
  if (!pasted || !/^https?:\/\//i.test(pasted)) return;
  event.preventDefault();
  linkInput.value = pasted;
  clearTimeout(linkTimer);
  importLink(true);
});
linkInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); clearTimeout(linkTimer); importLink(true); }
});
byId('load-link').onclick = () => { clearTimeout(linkTimer); importLink(true); };
async function importLink(force) {
  byId('source-alternatives').hidden = true;
  if (busy) { showLinkState('Espera a que termine la generación antes de importar.','error'); return; }
  const text = linkInput.value.trim();
  if (!force && text === lastLink) return;
  if (importing && text === lastLink) return;
  let controller, timer;
  showLinkState('Comprobando enlace…','loading');
  try {
    if (!text) throw new Error('Pega primero el enlace de un video.');
    const url = httpsUrl(text);
    const social = socialHosts.test(url.hostname);
    // Keep a single YouTube video; do not pass playlist or tracking parameters.
    if (social && /(?:^|\.)youtube\.com$/.test(url.hostname) && url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Pega el enlace de un solo video de YouTube.');
      url.search = '?v=' + id;
      url.hash = '';
    }
    let request = url.href, options = {};
    if (social) {
      if (!importEndpoint) throw new Error('El enlace es de una red social, pero el servidor de descarga todavía no está conectado a esta web. No se ha descargado el video. Puedes seleccionar un MP4 del dispositivo mientras se activa el servicio.');
      const endpoint = new URL(importEndpoint);
      if (endpoint.protocol !== 'https:' && !(endpoint.origin === location.origin && ['localhost','127.0.0.1'].includes(location.hostname))) throw new Error('Servicio de descarga no disponible.');
      request = endpoint.href.replace(/\/$/, '') + '/api/import';
      options = {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:url.href})};
    }
    importController?.abort();
    stopSourcePreview();
    clearMediaResults();
    if (social && mode !== 'video') selectMediaMode('video');
    controller = new AbortController();
    importController = controller;
    importing = true;
    lastLink = text;
    byId('load-link').hidden = true;
    byId('cancel-link').hidden = false;
    linkInput.setAttribute('aria-busy','true');
    sync();
    timer = setTimeout(() => controller.abort(), 240000);
    showLinkState(social ? 'Conectando con el servidor de descarga…' : 'Conectando con el video…','loading');
    if (social) {
      await backendHealth(controller.signal);
      showLinkState('Obteniendo video y audio…','loading');
    }
    const response = social ? await fetchBackend('/api/import', {...options, signal:controller.signal}) : await fetchAccessible(request,controller.signal);
    await checkResponse(response);
    const type = detectedType(response,inferredType(url.href));
    if (!social && (type === 'text/html' || type === 'application/xhtml+xml' || (type==='application/json' && response.url.endsWith('/api/media')))) {
      const viaServer = type === 'application/json';
      const chunks = await readBounded(response,controller.signal,viaServer?12*1024*1024:2*1024*1024);
      const raw = await new Blob(chunks).text();
      const page = viaServer?JSON.parse(raw):{html:raw,url:response.url||url.href};
      if (typeof page.html!=='string' || typeof page.url!=='string') throw new Error('Respuesta de detección no válida.');
      const items = findMedia(page.html,page.url);
      if (controller.signal.aborted || importController!==controller) return;
      showMediaResults(items);
      showLinkState(items.length ? 'Selecciona el video, imagen o audio que quieras utilizar.' : 'No se encontraron archivos multimedia directos. El sitio puede utilizar reproducción dinámica.',items.length?'success':'error');
      return;
    }
    const file = await readMedia(response, controller.signal,social?'video/mp4':inferredType(url.href));
    if (controller.signal.aborted || busy || importController !== controller) return;
    linkStatus.textContent = 'Cargando en el editor…';
    const message = await openMedia(file, controller.signal);
    const loaded = !!message;
    if (!controller.signal.aborted && importController === controller) {
      showLinkState(message || 'No se pudo abrir el recurso: ' + status.textContent, loaded ? 'success' : 'error');
      if (loaded && matchMedia('(max-width:740px)').matches) byId('preview-title').scrollIntoView({behavior:'smooth',block:'start'});
    }
  } catch (error) {
    if (!controller || importController === controller) {
      showLinkState(error.name === 'AbortError' ? 'Importación cancelada o tiempo agotado.' : error instanceof TypeError ? 'No se pudo acceder al enlace. La página puede bloquear el acceso desde otras webs (CORS) o estar desconectada.' : error.message, 'error');
      if (error.name !== 'AbortError') { try { const host=new URL(text).hostname; byId('source-alternatives').hidden = !/(^|\.)youtube\.com$|^youtu\.be$/i.test(host); } catch {} }
    }
  } finally {
    clearTimeout(timer);
    if (controller && importController === controller) {
      if (controller.signal.aborted && linkStatus.dataset.state === 'loading') showLinkState('Importación cancelada o tiempo agotado.','error');
      importController = undefined;
      importing = false;
      byId('load-link').hidden = false;
      byId('cancel-link').hidden = true;
      linkInput.removeAttribute('aria-busy');
      sync();
    }
  }
}

function selectionInfo() {
  const info = byId('selection-info');
  if (!visual || !audio) { info.textContent = 'Selecciona un archivo con audio. Animaciones: mínimo 9 FPS; máximo 2 MB.'; return; }
  try {
    const t = mode === 'video' ? trimmed('v') : trimmed('a');
    info.textContent = 'Duración: ' + t.duration.toFixed(2) + ' s.';
    if (t.duration > 30) info.textContent += ' · La animación puede reducir su calidad para respetar el tamaño elegido.';

    if (visual.kind !== 'image' && mode !== 'video') trimmed('v');

  } catch (error) { info.textContent = error.message; byId('export').disabled = true; }
}
for (const id of ['vs','ve','as','ae']) {
  const field=byId(id), slider=byId(id+'-slider');
  field.addEventListener('input', () => { clearResult(); sync(); });
  slider.addEventListener('input', () => {
    const prefix=id[0], start=byId(prefix+'s'), end=byId(prefix+'e');
    const value=slider.valueAsNumber;
    field.value=(id.endsWith('s')?Math.min(value,end.valueAsNumber-.01):Math.max(value,start.valueAsNumber+.01)).toFixed(2);
    clearResult(); sync();
    if(prefix==='v'){byId('scrub').value=field.value;updateScrub();}
  });
}
for(const prefix of ['v','a']) byId(prefix+'-full').onclick=()=>{
  if(busy||importing||stickerJob)return;
  byId(prefix+'s').value='0';byId(prefix+'e').value=byId(prefix+'e').max;
  clearResult();sync();if(prefix==='v'){byId('scrub').value='0';updateScrub();}
};
byId('mark-start').onclick = () => {
  if (busy || !visual) return;
  const start = byId('scrub').valueAsNumber;
  const max = Number(byId('ve').max);
  byId('vs').value = Math.min(start, max - .01).toFixed(2);
  byId('ve').value = Math.max(Number(byId('ve').value), Math.min(max, Number(byId('vs').value) + .01)).toFixed(2);
  clearResult(); sync(); previewFrame(Number(byId('vs').value));
};
byId('mark-end').onclick = () => {
  if (busy || !visual) return;
  const end = byId('scrub').valueAsNumber;
  const start = byId('vs').valueAsNumber;
  if (end <= start) { status.textContent = 'El final debe estar después del inicio.'; return; }
  byId('ve').value = end.toFixed(2);

  clearResult(); sync();
};
const stickerAppUrl = 'https://poldkent.github.io/stickers-sonoros/';
const stickerPackName = 'Creado en Stickers Sonoros';
function stickerAttribution() {
  const signature=byId('signature').value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,40);
  return {packName:stickerPackName,publisher:signature ? signature+' · '+stickerAppUrl : stickerAppUrl,signature};
}
async function verifySticker(files) {
  if (!files.webp?.size || !files.ogg?.size || files.webp.size + files.ogg.size > 2000000 || (byId('size-budget').value === 'compatible' && files.webp.size + files.ogg.size > 1000000) || (files.info?.tipo !== 'image' && !(files.info?.fps >= 9))) throw new Error('Los archivos superan el límite del conversor o están vacíos.');
  const webp = new Uint8Array(await files.webp.arrayBuffer());
  const ogg = new Uint8Array(await files.ogg.arrayBuffer());
  const read = (b,i,n) => String.fromCharCode(...b.subarray(i,i+n));
  if (read(webp,0,4) !== 'RIFF' || read(webp,8,4) !== 'WEBP' || read(ogg,0,4) !== 'OggS') throw new Error('El formato generado no es válido.');
  const hash = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',ogg))));
  // Check the actual EXIF chunk rather than assuming a successful converter implies correct linkage.
  const dv = new DataView(webp.buffer);
  let valid = false, attribution;
  for (let offset = 12; offset + 8 <= webp.length;) {
    const size = dv.getUint32(offset+4,true), end = offset+8+size;
    if (end > webp.length) throw new Error('WebP incompleto.');
    if (read(webp,offset,4) === 'EXIF') {
      const exif=webp.subarray(offset+8,end);
      if(exif.length<26)throw new Error('Metadatos del sticker no válidos.');
      const view=new DataView(exif.buffer,exif.byteOffset,exif.byteLength);
      const length=view.getUint32(14), start=view.getUint32(18);
      if(view.getUint32(0)!==0x4d4d002a||view.getUint32(4)!==8||view.getUint16(8)!==1||view.getUint16(10)!==0x5741||start!==26||start+length!==exif.length)throw new Error('Metadatos del sticker no válidos.');
      attribution=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(exif.subarray(start,start+length)));
      valid=attribution['sound-sha256']===hash;
    }
    offset = end + (size % 2);
  }
  if (!valid || files.info?.soundSha256 !== hash) throw new Error('No se pudo verificar la vinculación del sonido.');
  const expected=stickerAttribution();
  if(attribution?.['sticker-pack-name']!==expected.packName||attribution?.['sticker-pack-publisher']!==expected.publisher)throw new Error('No se pudo verificar la firma del sticker.');
  return {...files.info,...expected,appUrl:stickerAppUrl};
}
async function prepareSticker() {
  if (!conversionRequest || stickerJob) return;
  const request = conversionRequest;
  const button = byId('prepare-sticker'), state = byId('sticker-state'), progress = byId('sticker-progress');
  const controller = new AbortController();
  stickerJob = controller;
  busy=true;
  for(const field of document.querySelectorAll('input,select,.modes button'))field.disabled=true;
  sync();
  button.hidden = true;
  button.disabled = true;
  byId('cancel-sticker').hidden = false;
  progress.hidden = false; progress.value = 0;
  state.textContent = 'Comprobando compatibilidad del navegador…';
  try {
    if (!window.WAAS) throw new Error('No se cargó el conversor. Recarga la página.');
    const caps = await window.WAAS.capabilities();
    if (caps.opus !== true || caps.webpEncode !== 'image/webp') throw new Error('Este navegador no puede crear el sticker con sonido. Prueba Chrome o Edge actualizado.');
    if (controller.signal.aborted) return;
    const files = await window.WAAS.convert({
      ...request, profile: byId('quality').value, extended: byId('size-budget').value === 'extended', ...stickerAttribution(), signal: controller.signal,
      onProgress(message, fraction) { if (!controller.signal.aborted) { state.textContent = message; if (Number.isFinite(fraction)) progress.value = Math.max(0, Math.min(1, fraction)); } }
    });
    const info = await verifySticker(files);
    if (controller.signal.aborted || conversionRequest !== request) return;
    const webpUrl = URL.createObjectURL(files.webp), oggUrl = URL.createObjectURL(files.ogg);
    byId('sticker-image').src = webpUrl;
    byId('sticker-audio').src = oggUrl;
    byId('sticker-info').textContent = (info.lado || '?') + ' px · ' + (info.fps ? info.fps + ' FPS' : 'Imagen fija') + ' · ' + Math.round(files.webp.size/1024) + ' KB + ' + Math.round(files.ogg.size/1024) + ' KB de audio';
    nativePackage = {webp:files.webp,ogg:files.ogg,info};
    byId('attribution-result').textContent=info.packName+' · '+info.publisher;
    byId('quality-result').textContent = 'Calidad final: ' + info.lado + ' × ' + info.lado + ' px · ' + (info.fps ? info.fps + ' FPS' : 'Imagen fija') + (info.lado < 256 ? ' · Resolución reducida. Para mejorar la nitidez, elige un tramo más corto.' : '');
    byId('quality-result').hidden = false;
    byId('size-result').textContent = 'Peso total: '+((files.webp.size+files.ogg.size)/1000000).toFixed(2)+' MB';
    byId('size-warning').hidden = files.webp.size + files.ogg.size <= 1000000;
    byId('native-bridge').hidden = false;
    byId('sticker-files').hidden = false;
    state.textContent = 'Tu sticker está listo para enviar.';
    status.textContent = '';
    byId('sticker-advanced').open=true;
  } catch (error) {
    if (stickerJob === controller) {
      state.textContent = controller.signal.aborted ? 'Conversión cancelada. Puedes reintentar.' : (error.message || 'No se pudo generar el sticker.') + ' Puedes reintentar o elegir un tramo más corto.';
      status.textContent = '';
      button.hidden = false;
    }
  } finally {
    if (stickerJob === controller) {
      stickerJob = undefined;
      busy=false;
      for(const field of document.querySelectorAll('input,select,.modes button'))field.disabled=false;
      sync();
      progress.hidden = true;
      byId('cancel-sticker').hidden = true;
      button.disabled = false;
      if (controller.signal.aborted) { button.hidden = false; state.textContent = 'Conversión cancelada. Puedes reintentar.'; status.textContent = ''; }
    }
  }
}
byId('signature').addEventListener('input',()=>{ if(conversionRequest || nativePackage) {clearResult();sync();if(visual)paint(visual.frame || visual.media);} });
for(const id of ['quality','size-budget']) byId(id).addEventListener('change', () => { clearResult(); sync(); if (visual) paint(visual.frame || visual.media); });
byId('prepare-sticker').onclick = prepareSticker;
byId('cancel-sticker').onclick = () => stickerJob?.abort();

function demoAudio() {
  const rate = 48000, count = rate * 2, buffer = new ArrayBuffer(44 + count * 2), view = new DataView(buffer);
  function ascii(offset, text) { for (let i=0;i<text.length;i++) view.setUint8(offset+i,text.charCodeAt(i)); }
  ascii(0,'RIFF'); view.setUint32(4,36+count*2,true); ascii(8,'WAVE'); ascii(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,rate,true); view.setUint32(28,rate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
  ascii(36,'data'); view.setUint32(40,count*2,true);
  for(let i=0;i<count;i++){
    const t=i/rate, part=t<.5?t:t<1?t-.5:t-1, frequency=t<.5?440:t<1?554.37:659.25;
    const fade=Math.max(0,Math.min(1,part/.025,(.45-part)/.08));
    view.setInt16(44+2*i,Math.round(9500*fade*Math.sin(2*Math.PI*frequency*part)),true);
  }
  return new File([buffer],'ejemplo.wav',{type:'audio/wav'});
}
byId('demo').onclick = async () => {
  if (busy || importing) return;
  modes.find(button=>button.dataset.mode==='image').click();
  showLinkState('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="#211832"/><circle cx="256" cy="220" r="140" fill="#ddb5ff"/><path d="M178 190h40l50-44v148l-50-44h-40zM290 188q45 32 0 64m25-91q78 59 0 118" fill="none" stroke="#241331" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><text x="256" y="420" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="bold" fill="#f7f0ff">'+(window.StickerUI?.language()==='en'?'Sound!':'¡Suena!')+'</text></svg>';
  const selected = chooseVisual(new File([svg],'ejemplo.svg',{type:'image/svg+xml'}));
  const track = chooseAudio(demoAudio());
  await Promise.all([selected,track]);
  if (mode==='image' && visual && audio) status.textContent='Ejemplo preparado. Pulsa Siguiente.';
};

function stopSourcePreview() {
  const session = previewSession;
  if (!session) return;
  previewSession = undefined;
  cancelAnimationFrame(session.raf);
  try { session.sound?.stop(); } catch {}
  session.item?.media?.pause?.();
  session.context.close().catch(() => {});
  byId('play-source').textContent = '▶ Reproducir tramo';
}
byId('play-source').onclick = async () => {
  if (previewSession) { stopSourcePreview(); return; }
  if (!visual || !audio || busy || importing) return;
  const item = visual;
  let session;
  try {
    const v = item.kind === 'image' ? null : trimmed('v');
    const a = mode === 'video' ? v : trimmed('a');
    const cursor=byId('scrub').valueAsNumber;
    const offset=v&&cursor>=v.start&&cursor<v.start+v.duration?Math.min(cursor-v.start,Math.max(0,a.duration-.01)):0;
    const context = new AudioContext();
    session = {context,item};
    previewSession = session;
    byId('play-source').textContent = '■ Detener';
    await context.resume();
    if (previewSession !== session) return;
    if (item.kind === 'video') await seek(item.media,v.start+offset);
    if (previewSession !== session) return;
    const sound = context.createBufferSource();
    session.sound = sound;
    sound.buffer = audio;
    sound.connect(context.destination);
    if (item.kind === 'video') await item.media.play();
    if (previewSession !== session) { item.media?.pause?.(); return; }
    const start = context.currentTime;
    sound.start(start,a.start+offset,a.duration-offset);
    sound.onended = () => { if (previewSession === session) stopSourcePreview(); };
    const loop = mode === 'mix' && byId('motion').value === 'loop';
    const tick = async () => {
      if (previewSession !== session) return;
      try {
        const elapsed = context.currentTime-start+offset;
        if (item.kind === 'video') {
          if (item.media.currentTime >= v.start+v.duration || item.media.ended) {
            item.media.pause();
            if (loop) { await seek(item.media,v.start); if (previewSession === session) await item.media.play(); }
          }
          if (previewSession === session) { paint(item.media); byId('scrub').value=item.media.currentTime; updateTimeline(); }
        } else if (item.kind === 'gif') {
          const frame = await gifAt(item,v.start+(loop?elapsed%v.duration:Math.min(elapsed,v.duration-.001)));
          if (previewSession === session) { paint(frame); byId('scrub').value=v.start+(loop?elapsed%v.duration:Math.min(elapsed,v.duration)); updateTimeline(); }
        } else paint(item.media);
        if (previewSession === session) session.raf=requestAnimationFrame(tick);
      } catch (error) { if (previewSession === session) { stopSourcePreview(); status.textContent=error.message; } }
    };
    tick();
  } catch (error) { if (previewSession === session) stopSourcePreview(); status.textContent=error.message; }
};

showLinkState(importEndpoint ? 'Pega un enlace para detectar video, imagen o audio.' : 'Importa un archivo de video mediante un enlace directo. YouTube, TikTok e Instagram requieren el servidor de descarga, todavía sin conectar.');

byId('use-frame').onclick = async () => {
  if (busy || importing || !visual || visual.kind==='image' || !audio) return;
  stopSourcePreview();
  try {
    const cut = mode==='video' ? trimmed('v') : trimmed('a');
    const original = visual;
    const at = Math.max(0,Math.min(original.duration-.01,Number(byId('scrub').value)||0));
    await previewFrame(at);
    if (visual!==original) return;
    const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if (!blob || visual!==original) return;
    selectMediaMode('image',false,true);
    byId('fit').value='contain';
    byId('rotation').value='0';
    byId('zoom').value=100;
    byId('pan-x').value=byId('pan-y').value=0;
    const loaded = await chooseVisual(new File([blob],'fotograma.png',{type:'image/png'}));
    if (loaded && audio) {
      byId('as').value=cut.start.toFixed(2);
      byId('ae').value=(cut.start+cut.duration).toFixed(2);
      sync();
      status.textContent='Fotograma seleccionado con el audio original. Puedes ajustar el tramo sonoro.';
    }
  } catch (error) { status.textContent=error.message; }
};

byId('choose-original').onclick = () => {
  switchToVideo();
  byId('visual').click();
};
function bytesToBase64(bytes) {
  let raw='';
  for(let offset=0;offset<bytes.length;offset+=16384)raw+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
  return btoa(raw);
}
async function packageBlob(files){
  const webp=bytesToBase64(new Uint8Array(await files.webp.arrayBuffer()));
  const ogg=bytesToBase64(new Uint8Array(await files.ogg.arrayBuffer()));
  const {lado,isAnimated,segundosAudio,soundSha256,packName,publisher,signature,appUrl,fps,cuadros,duracion,fpsEfectivos}=files.info;
  return new Blob([JSON.stringify({format:'stickers-sonoros/1',webp,ogg,info:{lado,isAnimated,segundosAudio,soundSha256,packName,publisher,signature,appUrl,fps,cuadros,duracion,fpsEfectivos}})],{type:'application/json'});
}
const sendMethods=byId('send-methods');
const isPhone=()=>navigator.userAgentData?.mobile===true||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||(matchMedia('(pointer: coarse)').matches&&innerWidth<=900);
let sendMethod='app';
function updateSendMethod(){const mobile=isPhone();if(mobile)sendMethod='app';sendMethods.hidden=mobile;byId('private-mobile-bridge').hidden=sendMethod!=='app';byId('desktop-send-options').hidden=mobile||sendMethod!=='web';for(const b of sendMethods.querySelectorAll('[data-send-method]'))b.setAttribute('aria-pressed',String(b.dataset.sendMethod===sendMethod));}
for(const b of sendMethods.querySelectorAll('[data-send-method]'))b.addEventListener('click',()=>{sendMethod=b.dataset.sendMethod;updateSendMethod()});
window.addEventListener('resize',updateSendMethod);updateSendMethod();
window.SonoroPrivateMobile?.mount(byId('private-mobile-bridge'),async()=>{const files=nativePackage;if(!files)return null;const blob=await packageBlob(files);return nativePackage===files?blob:null});
byId('package-download').onclick=async()=>{
  const files=nativePackage;
  if(!files)return;
  const button=byId('package-download');button.disabled=true;
  try{
    const blob=await packageBlob(files);
    if(nativePackage!==files)return;
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    const name=(visual?.name || 'sticker').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g,'_').trim().slice(0,120) || 'sticker';
    link.href=url;link.download=name+'.sonoro.json';document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    byId('bridge-status').textContent='Sticker guardado. Puedes enviarlo más tarde desde la web.';
  }catch(e){byId('bridge-status').textContent=e.message||'No se pudo guardar el paquete.';}
  finally{button.disabled=false;}
};
const bookmark=byId('wa-bookmark');
if(window.StickersSonorosBridge){
  const address=()=>window.StickersSonorosBridge.bookmarklet(window.StickerUI?.language()||'es');
  const updateBookmark=()=>{bookmark.href=address();};
  updateBookmark();
  document.addEventListener('sticker-language',updateBookmark);
  bookmark.addEventListener('click',event=>{
    event.preventDefault();
    byId('bookmark-status').textContent='Arrastra el marcador a tu barra de favoritos. Luego úsalo dentro de WhatsApp Web.';
  });
  byId('copy-bookmark').onclick=async()=>{
    try{await navigator.clipboard.writeText(address());byId('bookmark-status').textContent='Dirección copiada. Crea un marcador nuevo y pega esta dirección en su campo URL.';}
    catch{byId('bookmark-status').textContent='No se pudo copiar. Arrastra el enlace a la barra de marcadores.';}
  };
}else{
  bookmark.removeAttribute('href');byId('copy-bookmark').disabled=true;
  byId('bookmark-status').textContent='No se cargó la opción de envío. Recarga la página.';
}

byId('check-service').onclick = async () => {
  const button=byId('check-service'), note=byId('service-status');
  button.disabled=true; note.textContent='Comprobando servidor…';
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),90000);
  try {
    if(!importEndpoint)throw Error('Servidor no configurado.');
    const info=await backendHealth(controller.signal);
    const ui=document.documentElement.dataset.version;
    note.textContent=info.version===ui&&info.publicMedia?'Servidor '+info.version+' · importador público disponible':'Servidor '+(info.version||'sin versión')+' · editor '+ui+'. Actualiza Render si no coinciden.';
  } catch(error) {note.textContent=error.name==='AbortError'?'El servidor no respondió a tiempo.':error.message;}
  finally{clearTimeout(timer);button.disabled=false;}
};
document.documentElement.dataset.editorReady = 'true';
