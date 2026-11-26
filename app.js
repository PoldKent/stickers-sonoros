const byId = id => document.getElementById(id);
const canvas = byId('canvas');
const drawing = canvas.getContext('2d', { alpha: false });
const output = byId('output');
const status = byId('status');
const modes = [...document.querySelectorAll('[data-mode]')];
const labels = {
  video: ['Selecciona o arrastra un video', 'MP4, WebM u otro video compatible', 'video/*'],
  image: ['Selecciona o arrastra una imagen', 'PNG, JPEG, WebP u otra imagen compatible', 'image/*'],
  mix: ['Selecciona o arrastra un video o GIF', 'MP4, WebM o GIF animado', 'video/*,image/gif']
};
const limit = 60;
const defaultTrim = 30;
let mode = 'video';
let visual;
let audio;
let result;
let resultUrl;
let compatibleClip, compatibleUrl, mp4Job;
let visualRequest = 0;
let audioRequest = 0;
let loadingVisual = false;
let loadingAudio = false;
let busy = false;
let exportJob;
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
let clipDuration;
function clearResult() {
  nativePackage = undefined;
  byId('native-bridge').hidden = true;
  byId('bridge-status').textContent = '';
  mp4Job?.abort(); mp4Job = undefined;
  if (compatibleUrl) URL.revokeObjectURL(compatibleUrl);
  compatibleClip = compatibleUrl = undefined;
  byId('convert-mp4').hidden = true;
  byId('convert-mp4').disabled = false;
  byId('mp4-consent').hidden = true;
  stopSourcePreview();
  stickerJob?.abort();
  stickerJob = undefined;
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
  for (const id of ['webp-file', 'ogg-file']) {
    const link = byId(id);
    if (link.hasAttribute('href')) URL.revokeObjectURL(link.href);
    link.removeAttribute('href');
  }
  output.pause();
  output.removeAttribute('src');
  output.load();
  output.hidden = true;
  byId('native').hidden = true;
  byId('downloads').hidden = true;
  byId('download').removeAttribute('href');
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  result = resultUrl = undefined;
}

function sync() {
  byId('export').disabled = busy || importing || loadingVisual || loadingAudio || !visual || !audio;
  byId('sound-row').hidden = mode === 'video';
  byId('visual-trim').hidden = !visual || visual.kind === 'image';
  byId('audio-trim').hidden = mode === 'video' || !audio;
  byId('motion-row').hidden = mode !== 'mix';
  byId('empty').hidden = !!visual;
  byId('position').hidden = !visual;
  byId('scrub-row').hidden = !visual || visual.kind === 'image';
  byId('source-preview').hidden = !visual || !audio || loadingVisual || loadingAudio || busy || importing || !!result;
  byId('play-source').disabled = busy || importing;
  byId('use-frame').hidden = !visual || visual.kind === 'image' || !audio;
  byId('use-frame').disabled = busy || importing || loadingVisual || loadingAudio;
  byId('trim-actions').hidden = byId('scrub-row').hidden;
  // Hidden trim fields must not block form submission.
  for (const [ids,hidden] of [[['vs','ve'],byId('visual-trim').hidden],[['as','ae'],byId('audio-trim').hidden]]) for (const id of ids) { byId(id).required = !hidden; byId(id).disabled = hidden || busy; }
  for (const id of ['mark-start','mark-end','demo']) byId(id).disabled = busy || importing;
  selectionInfo();
  canvas.classList.toggle('ready', !!visual);
}

function paint(media) {
  const width = media.videoWidth || media.naturalWidth || media.displayWidth;
  const height = media.videoHeight || media.naturalHeight || media.displayHeight;
  if (!width || !height) return;
  const scale = Math[byId('fit').value === 'cover' ? 'max' : 'min'](512 / width, 512 / height);
  const w = width * scale * byId('zoom').value / 100;
  const h = height * scale * byId('zoom').value / 100;
  drawing.fillStyle = '#14101d';
  drawing.fillRect(0, 0, 512, 512);
  drawing.drawImage(media, (512 - w) / 2 + 2.56 * byId('pan-x').value, (512 - h) / 2 + 2.56 * byId('pan-y').value, w, h);
}

function range(prefix, duration) {
  const max = Math.floor(duration * 100) / 100;
  if (max < .01) throw new Error('El archivo es demasiado corto.');
  byId(prefix + 's').max = max;
  byId(prefix + 's').value = 0;
  byId(prefix + 'e').max = max;
  byId(prefix + 'e').value = Math.min(defaultTrim, max);
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
      for (let frameIndex = 0; frameIndex < Math.min(count, 1200) && duration < 120; frameIndex++) {
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
  const request = ++visualRequest;
  const selectedMode = mode;
  loadingVisual = true;
  clearResult();
  closeVisual(visual);
  visual = undefined;
  if (mode === 'video') audio = undefined;
  byId('visual-label').textContent = file.name;
  status.textContent = 'Leyendo archivo…';
  sync();
  let item;
  try {
    item = await readVisual(file, selectedMode);
    if (request !== visualRequest || signal?.aborted) return;
    if (item.duration) range('v', item.duration);
    item.name = file.name;
    visual = item;
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
    byId('visual-label').textContent = label;
    byId('visual-hint').textContent = hint;
    byId('visual').accept = accept;
    byId('visual').value = byId('sound').value = '';
    status.textContent = '';
    sync();
  });
}
byId('visual').addEventListener('change', event => chooseVisual(event.target.files[0]));
const drop = byId('drop');
drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', event => {
  event.preventDefault();
  drop.classList.remove('over');
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

async function previewFrame(at) {
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
byId('fit').addEventListener('change', () => previewFrame(byId('scrub').valueAsNumber));
byId('vs').addEventListener('change', () => { clearResult(); byId('scrub').value = byId('vs').value; updateScrub(); });
for (const id of ['ve','as','ae','motion','fit']) byId(id).addEventListener('change', clearResult);
function updateScrub() { byId('scrub-time').textContent = Number(byId('scrub').value).toFixed(2) + ' s'; previewFrame(byId('scrub').valueAsNumber); }
byId('scrub').addEventListener('change', updateScrub);
byId('scrub').addEventListener('input', () => { byId('scrub-time').textContent = Number(byId('scrub').value).toFixed(2) + ' s'; });

function trimmed(prefix) {
  const start = byId(prefix + 's').valueAsNumber;
  const end = byId(prefix + 'e').valueAsNumber;
  const max = Number(byId(prefix + 'e').max);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > max + .0001 || end <= start) throw new Error('Selecciona un tramo válido dentro de la duración del archivo.');
  return { start, duration: end - start };
}

function record(stream) {
  const types = ['video/mp4;codecs=avc1.42001E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
  const options = { videoBitsPerSecond: 1200000, audioBitsPerSecond: 96000 };
  const recorder = new MediaRecorder(stream, mimeType ? { ...options, mimeType } : options);
  const buffered = [];
  const blob = new Promise((resolve, reject) => {
    recorder.addEventListener('dataavailable', event => {
      if (event.data.size) buffered.push(event.data);
    });
    recorder.addEventListener('stop', () => resolve(new Blob(buffered, { type: recorder.mimeType || buffered[0]?.type })), { once: true });
    recorder.addEventListener('error', event => reject(event.error || new Error('Falló la codificación.')), { once: true });
  });
  blob.catch(() => {});
  return { recorder, blob };
}

async function render(context, videoTrim, soundTrim, signal) {
  const item = visual;
  const video = item.kind === 'video' ? item.media : null;
  const sound = context.createBufferSource();
  sound.buffer = audio;
  const destination = context.createMediaStreamDestination();
  sound.connect(destination);
  const stream = canvas.captureStream(30);
  for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
  let encoding;
  let interval;
  let failure;
  let updating = false;
  let watchdog;
  let pendingUpdate;
  let abortRender;
  const interrupted = new Promise((_, reject) => { abortRender = () => reject(new DOMException('Generación cancelada','AbortError')); });
  interrupted.catch(() => {});
  signal.addEventListener('abort', abortRender, {once:true});
  const loop = mode === 'mix' && byId('motion').value === 'loop';
  const end = videoTrim && videoTrim.start + videoTrim.duration;
  try {
    if (video) await seek(video, videoTrim.start);
    paint(item.kind === 'gif' ? await gifAt(item, videoTrim.start) : item.media);
    encoding = record(stream);
    if (signal.aborted) throw new DOMException('Generación cancelada','AbortError');
    if (video) await video.play();
    if (signal.aborted) throw new DOMException('Generación cancelada','AbortError');
    encoding.recorder.start();
    const started = context.currentTime;
    const ended = new Promise(resolve => sound.addEventListener('ended', resolve, { once: true }));
    sound.start(started, soundTrim.start, soundTrim.duration);
    interval = setInterval(() => {
      if (updating || failure) return;
      updating = true;
      pendingUpdate = (async () => { try {
        const elapsed = context.currentTime - started;
        byId('progress').value = Math.min(1, elapsed / soundTrim.duration);
        if (video) {
          if ((video.currentTime >= end || video.ended) && !video.paused) video.pause();
          if ((video.currentTime >= end || video.ended) && loop) {
            await seek(video, videoTrim.start);
            await video.play();
          }
          paint(video);
        } else if (item.kind === 'gif') {
          const time = loop ? elapsed % videoTrim.duration : Math.min(elapsed, videoTrim.duration - .001);
          paint(await gifAt(item, videoTrim.start + time));
        } else {
          paint(item.media);
        }
      } catch (error) {
        failure = error;
        try { sound.stop(); } catch {}
      } finally {
        updating = false;
      } })();
    }, 33);
    const timeout = new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('La generación tardó demasiado. Mantén la pestaña visible y vuelve a intentar.')), (soundTrim.duration + 15) * 1000); });
    await Promise.race([ended, encoding.blob, interrupted, timeout]);
    clearInterval(interval);
    await pendingUpdate;
    if (encoding.recorder.state !== 'inactive') encoding.recorder.stop();
    const blob = await encoding.blob;
    if (failure) throw failure;
    if (!blob.size) throw new Error('El navegador devolvió un video vacío.');
    return blob;
  } finally {
    clearInterval(interval);
    clearTimeout(watchdog);
    signal.removeEventListener('abort', abortRender);
    try { sound.stop(); } catch {}
    await pendingUpdate;
    video?.pause();
    if (encoding && encoding.recorder.state !== 'inactive') encoding.recorder.stop();
    for (const track of stream.getTracks()) track.stop();
  }
}

byId('project').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || importing || !visual || !audio) return;
  let context;
  try {
    if (!window.MediaRecorder || !canvas.captureStream || !window.AudioContext) throw new Error('Este navegador no permite exportar el clip. Prueba con Chrome o Edge actualizado.');
    const videoTrim = visual.kind === 'image' ? null : trimmed('v');
    const soundTrim = mode === 'video' ? videoTrim : trimmed('a');
    if (soundTrim.duration > limit + .0001) throw new Error('Selecciona un tramo de audio de hasta 60 segundos.');
    busy = true;
    clearResult();
    exportJob = new AbortController();
    byId('cancel-export').hidden = false;
    for (const field of document.querySelectorAll('input, select, .modes button')) field.disabled = true;
    sync();
    const progress = byId('progress');
    progress.value = 0;
    progress.hidden = false;
    status.textContent = 'Creando el clip. Mantén esta pestaña abierta…';
    context = new AudioContext();
    await context.resume();
    const blob = await render(context, videoTrim, soundTrim, exportJob.signal);
    if (exportJob.signal.aborted) throw new DOMException('Generación cancelada','AbortError');
    const type = blob.type.split(';')[0];
    const extension = type === 'video/mp4' ? 'mp4' : 'webm';
    result = new File([blob], 'sticker-sonoro.' + extension, { type });
    clipDuration = soundTrim.duration;
    byId('components').hidden = false;
    resultUrl = URL.createObjectURL(result);
    output.src = resultUrl;
    output.hidden = false;
    byId('native').hidden = false;
    const download = byId('download');
    download.href = resultUrl;
    download.download = result.name;
    download.textContent = 'Guardar vídeo (' + extension.toUpperCase() + ') ↓';
    byId('format-note').textContent = extension === 'mp4' ? 'Vídeo MP4 listo para guardar en la galería.' : 'Este navegador exportó WebM. Si tu galería no lo admite, utiliza un navegador compatible con exportación MP4.';
    byId('convert-mp4').hidden = extension==='mp4' || !importEndpoint;
    byId('mp4-consent').hidden = byId('convert-mp4').hidden;
    try { byId('share').hidden = !navigator.canShare?.({ files: [result] }); } catch { byId('share').hidden = true; }
    byId('downloads').hidden = false;
    status.textContent = 'Vídeo preparado. Generando los archivos del sticker sonoro…';
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? 'Generación cancelada.' : error.message || 'No pude crear el clip.';
  } finally {
    if (context) await context.close().catch(() => {});
    exportJob = undefined;
    byId('cancel-export').hidden = true;
    busy = false;
    byId('progress').hidden = true;
    for (const field of document.querySelectorAll('input, select, .modes button')) field.disabled = false;
    sync();
  }
  if (result) { status.textContent = 'Vídeo preparado para el editor de stickers de WhatsApp.'; await prepareSticker(); }
});
byId('cancel-export').onclick = () => exportJob?.abort();

byId('share').addEventListener('click', async () => {
  if (!result) return;
  try {
    await navigator.share({ files: [compatibleClip || result] });
    status.textContent = 'Archivo compartido como vídeo, no como sticker. Usa Crear sticker en WhatsApp para añadir el sonido.';
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = 'El navegador no pudo compartir el archivo. Puedes descargarlo.';
  }
});
sync();

const axes = ['pan-x', 'pan-y'];
for (const id of [...axes, 'zoom']) {
  byId(id).addEventListener('input', () => {
    clearResult();
    if (visual) paint(visual.frame || visual.media);
  });
}
let drag;
canvas.addEventListener('pointerdown', event => {
  if (!visual || busy) return;
  canvas.setPointerCapture(event.pointerId);
  clearResult();
  drag = [event.clientX, event.clientY, ...axes.map(id => +byId(id).value)];
});
canvas.addEventListener('pointermove', event => {
  if (!drag || busy) return;
  const delta = [event.clientX - drag[0], event.clientY - drag[1]];
  axes.forEach((id, i) => { byId(id).value = drag[i + 2] + 200 * delta[i] / canvas.clientWidth; });
  paint(visual.frame || visual.media);
});
canvas.addEventListener('lostpointercapture', () => { drag = undefined; });
const linkStatus = byId('link-status');
function showLinkState(message, state = 'info') {
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
  if (!visual || !audio) { info.textContent = 'Selecciona un archivo con audio. Máximo 60 segundos por sticker.'; return; }
  try {
    const t = mode === 'video' ? trimmed('v') : trimmed('a');
    info.textContent = 'Duración: ' + t.duration.toFixed(2) + ' s de ' + limit + ' s permitidos.';
    if (t.duration > 30 && t.duration <= limit) info.textContent += ' · La animación puede reducir su calidad para caber en 1 MB.';
    if (t.duration > limit + .0001) info.textContent += ' Reduce el tramo antes de generar.';
    if (visual.kind !== 'image' && mode !== 'video') trimmed('v');
    if (t.duration > limit + .0001) byId('export').disabled = true;
  } catch (error) { info.textContent = error.message; byId('export').disabled = true; }
}
for (const id of ['vs','ve','as','ae']) byId(id).addEventListener('input', () => { clearResult(); sync(); });
byId('mark-start').onclick = () => {
  if (busy || !visual) return;
  const start = byId('scrub').valueAsNumber;
  const max = Number(byId('ve').max);
  byId('vs').value = Math.min(start, max - .01).toFixed(2);
  byId('ve').value = Math.min(max, Number(byId('vs').value) + limit).toFixed(2);
  clearResult(); sync(); previewFrame(Number(byId('vs').value));
};
byId('mark-end').onclick = () => {
  if (busy || !visual) return;
  const end = byId('scrub').valueAsNumber;
  const start = byId('vs').valueAsNumber;
  if (end <= start) { status.textContent = 'El final debe estar después del inicio.'; return; }
  byId('ve').value = end.toFixed(2);
  if (mode === 'video' && end - start > limit) byId('vs').value = (end - limit).toFixed(2);
  clearResult(); sync();
};
async function verifySticker(files) {
  if (!files.webp?.size || !files.ogg?.size || files.webp.size > 1000000 || files.ogg.size > 1000000) throw new Error('Los archivos superan el límite del conversor o están vacíos.');
  const webp = new Uint8Array(await files.webp.arrayBuffer());
  const ogg = new Uint8Array(await files.ogg.arrayBuffer());
  const read = (b,i,n) => String.fromCharCode(...b.subarray(i,i+n));
  if (read(webp,0,4) !== 'RIFF' || read(webp,8,4) !== 'WEBP' || read(ogg,0,4) !== 'OggS') throw new Error('El formato generado no es válido.');
  const hash = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',ogg))));
  // Check the actual EXIF chunk rather than assuming a successful converter implies correct linkage.
  const dv = new DataView(webp.buffer);
  let valid = false;
  for (let offset = 12; offset + 8 <= webp.length;) {
    const size = dv.getUint32(offset+4,true), end = offset+8+size;
    if (end > webp.length) throw new Error('WebP incompleto.');
    if (read(webp,offset,4) === 'EXIF') {
      const metadata = new TextDecoder().decode(webp.subarray(offset+8,end));
      valid = metadata.includes('"sound-sha256"') && metadata.includes(hash);
    }
    offset = end + (size % 2);
  }
  if (!valid || files.info?.soundSha256 !== hash) throw new Error('No se pudo verificar la vinculación del sonido.');
  return files.info;
}
async function prepareSticker() {
  if (!result || stickerJob) return;
  const source = result, duration = clipDuration;
  const button = byId('prepare-sticker'), state = byId('sticker-state'), progress = byId('sticker-progress');
  const controller = new AbortController();
  stickerJob = controller;
  button.hidden = true;
  button.disabled = true;
  byId('cancel-sticker').hidden = false;
  progress.hidden = false; progress.value = 0;
  state.textContent = 'Comprobando compatibilidad del navegador…';
  try {
    if (!window.WAAS) throw new Error('No se cargó el conversor. Recarga la página.');
    const caps = await window.WAAS.capabilities();
    if (caps.opus !== true || caps.webpEncode !== 'image/webp') throw new Error('Este navegador no puede codificar WebP y Opus. Prueba Chrome o Edge actualizado. El vídeo para WhatsApp sigue disponible.');
    if (controller.signal.aborted) return;
    const files = await window.WAAS.convert({
      file: source, duration, signal: controller.signal,
      onProgress(message, fraction) { if (!controller.signal.aborted) { state.textContent = message; if (Number.isFinite(fraction)) progress.value = Math.max(0, Math.min(1, fraction)); } }
    });
    const info = await verifySticker(files);
    if (controller.signal.aborted || result !== source) return;
    const webpUrl = URL.createObjectURL(files.webp), oggUrl = URL.createObjectURL(files.ogg);
    byId('webp-file').href = byId('sticker-image').src = webpUrl;
    byId('ogg-file').href = byId('sticker-audio').src = oggUrl;
    byId('sticker-info').textContent = (info.lado || '?') + ' px · ' + (info.fps || 1) + ' FPS · ' + Math.round(files.webp.size/1024) + ' KB + ' + Math.round(files.ogg.size/1024) + ' KB de audio';
    nativePackage = {webp:files.webp,ogg:files.ogg,info};
    byId('native-bridge').hidden = false;
    byId('sticker-files').hidden = false;
    state.textContent = 'Animación y audio generados. Vinculación SHA-256 verificada.';
  } catch (error) {
    if (stickerJob === controller) {
      state.textContent = controller.signal.aborted ? 'Conversión cancelada. El vídeo sigue disponible.' : (error.message || 'No se pudo generar el sticker.') + ' Puedes guardar el vídeo y crearlo dentro de WhatsApp.';
      button.hidden = false;
    }
  } finally {
    if (stickerJob === controller) {
      stickerJob = undefined;
      progress.hidden = true;
      byId('cancel-sticker').hidden = true;
      button.disabled = false;
      if (controller.signal.aborted) { button.hidden = false; state.textContent = 'Conversión cancelada. El vídeo sigue disponible.'; }
    }
  }
}
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
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="#211832"/><circle cx="256" cy="220" r="140" fill="#ddb5ff"/><path d="M178 190h40l50-44v148l-50-44h-40zM290 188q45 32 0 64m25-91q78 59 0 118" fill="none" stroke="#241331" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><text x="256" y="420" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="bold" fill="#f7f0ff">¡Suena!</text></svg>';
  const selected = chooseVisual(new File([svg],'ejemplo.svg',{type:'image/svg+xml'}));
  const track = chooseAudio(demoAudio());
  await Promise.all([selected,track]);
  if (mode==='image' && visual && audio) status.textContent='Ejemplo preparado. Pulsa Crear sticker sonoro.';
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
    if (a.duration > limit + .0001) throw new Error('Reduce el tramo a 60 segundos.');
    const context = new AudioContext();
    session = {context,item};
    previewSession = session;
    byId('play-source').textContent = '■ Detener';
    await context.resume();
    if (previewSession !== session) return;
    if (item.kind === 'video') await seek(item.media,v.start);
    if (previewSession !== session) return;
    const sound = context.createBufferSource();
    session.sound = sound;
    sound.buffer = audio;
    sound.connect(context.destination);
    if (item.kind === 'video') await item.media.play();
    if (previewSession !== session) { item.media?.pause?.(); return; }
    const start = context.currentTime;
    sound.start(start,a.start,a.duration);
    sound.onended = () => { if (previewSession === session) stopSourcePreview(); };
    const loop = mode === 'mix' && byId('motion').value === 'loop';
    const tick = async () => {
      if (previewSession !== session) return;
      try {
        const elapsed = context.currentTime-start;
        if (item.kind === 'video') {
          if (item.media.currentTime >= v.start+v.duration || item.media.ended) {
            item.media.pause();
            if (loop) { await seek(item.media,v.start); if (previewSession === session) await item.media.play(); }
          }
          if (previewSession === session) paint(item.media);
        } else if (item.kind === 'gif') {
          const frame = await gifAt(item,v.start+(loop?elapsed%v.duration:Math.min(elapsed,v.duration-.001)));
          if (previewSession === session) paint(frame);
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
byId('convert-mp4').onclick = async () => {
  if (!result || result.type !== 'video/webm' || mp4Job || busy || importing || !importEndpoint) return;
  const original = result, controller = new AbortController(), button = byId('convert-mp4');
  mp4Job = controller;
  button.disabled = true;
  const timer = setTimeout(()=>controller.abort(),120000);
  byId('format-note').textContent='Preparando MP4 con sonido…';
  try {
    const health=await backendHealth(controller.signal);
    if (clipDuration > (health.maxClipDuration || 10)) throw new Error('El servidor aún no admite clips de esta duración. Actualiza Render o guarda el vídeo original.');
    const endpoint=new URL(importEndpoint);
    const response=await fetch(endpoint.href.replace(/\/$/,'')+'/api/clip-mp4',{
      method:'POST',body:original,headers:{'Content-Type':'video/webm'},signal:controller.signal,
      credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'
    });
    await checkResponse(response);
    if (detectedType(response)!=='video/mp4') throw new Error('El servidor no devolvió un MP4.');
    const chunks=await readBounded(response,controller.signal,16*1024*1024);
    if (controller.signal.aborted || result!==original) return;
    compatibleClip=new File(chunks,'sticker-sonoro.mp4',{type:'video/mp4'});
    compatibleUrl=URL.createObjectURL(compatibleClip);
    const link=byId('download');
    link.href=compatibleUrl; link.download=compatibleClip.name;
    link.textContent='Guardar vídeo MP4 ↓';
    byId('format-note').textContent='MP4 preparado. En WhatsApp, usa Crear sticker y conserva el audio si la función está disponible.';
    button.hidden=true;
    byId('mp4-consent').hidden=true;
    try { byId('share').hidden=!navigator.canShare?.({files:[compatibleClip]}); } catch { byId('share').hidden=true; }
  } catch(error) {
    if (mp4Job===controller) byId('format-note').textContent=(error.name==='AbortError'?'Conversión cancelada o agotada.':error.message)+' Puedes seguir descargando el clip original.';
  } finally {
    clearTimeout(timer);
    if(mp4Job===controller) { mp4Job=undefined;button.disabled=false; }
  }
};

function bytesToBase64(bytes) {
  let raw='';
  for(let offset=0;offset<bytes.length;offset+=16384)raw+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
  return btoa(raw);
}
byId('package-download').onclick=async()=>{
  const files=nativePackage;
  if(!files)return;
  const button=byId('package-download');button.disabled=true;
  try{
    const webp=bytesToBase64(new Uint8Array(await files.webp.arrayBuffer()));
    const ogg=bytesToBase64(new Uint8Array(await files.ogg.arrayBuffer()));
    if(nativePackage!==files)return;
    const {lado,isAnimated,segundosAudio,soundSha256}=files.info;
    const blob=new Blob([JSON.stringify({format:'stickers-sonoros/1',webp,ogg,info:{lado,isAnimated,segundosAudio,soundSha256}})],{type:'application/json'});
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download='sticker.sonoro.json';document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    byId('bridge-status').textContent='Sticker guardado. Abre WhatsApp Web y usa el marcador para enviarlo.';
  }catch(e){byId('bridge-status').textContent=e.message||'No se pudo guardar el paquete.';}
  finally{button.disabled=false;}
};
const bookmark=byId('wa-bookmark');
if(window.StickersSonorosBridge){
  const address=window.StickersSonorosBridge.bookmarklet();
  bookmark.href=address;
  bookmark.addEventListener('click',event=>{
    event.preventDefault();
    byId('bridge-status').textContent='Arrastra el marcador a tu barra de favoritos. Luego úsalo dentro de WhatsApp Web.';
  });
  byId('copy-bookmark').onclick=async()=>{
    try{await navigator.clipboard.writeText(address);byId('bridge-status').textContent='Dirección copiada. Crea un marcador nuevo y pega esta dirección en su campo URL.';}
    catch{byId('bridge-status').textContent='No se pudo copiar. Arrastra el enlace a la barra de marcadores.';}
  };
}else{
  bookmark.removeAttribute('href');byId('copy-bookmark').disabled=true;
  byId('bridge-status').textContent='No se cargó la opción de envío. Recarga la página.';
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
