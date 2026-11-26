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
const limit = 10;
let mode = 'video';
let visual;
let audio;
let result;
let resultUrl;
let visualRequest = 0;
let audioRequest = 0;
let loadingVisual = false;
let loadingAudio = false;
let busy = false;
let exportJob;
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
let clipDuration;
function clearResult() {
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
  byId('trim-actions').hidden = byId('scrub-row').hidden;
  // Hidden trim fields must not block form submission.
  for (const id of ['vs','ve']) byId(id).required = !byId('visual-trim').hidden;
  for (const id of ['as','ae']) byId(id).required = !byId('audio-trim').hidden;
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
  byId(prefix + 'e').value = Math.min(limit, max);
  if (prefix === 'v') { byId('scrub').max = max; byId('scrub').value = 0; byId('scrub-time').textContent = '0.00 s'; }
}

function loadVideo(video, url) {
  return new Promise((resolve, reject) => {
    video.addEventListener('loadeddata', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error('El navegador no pudo leer el video.')), { once: true });
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

async function chooseVisual(file) {
  if (!file || busy) return;
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
    if (request !== visualRequest) return;
    if (item.duration) range('v', item.duration);
    visual = item;
    paint(item.frame || item.media);
    if (selectedMode === 'video') {
      const buffer = await readAudio(file);
      if (request !== visualRequest) return;
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
      loadingVisual = false;
      sync();
    }
  }
}

byId('sound').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file || busy) return;
  const request = ++audioRequest;
  clearResult();
  audio = undefined;
  loadingAudio = true;
  status.textContent = 'Leyendo la pista de audio…';
  sync();
  try {
    const buffer = await readAudio(file);
    if (request !== audioRequest) return;
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
});

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
        sound.stop();
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
    if (encoding?.recorder.state === 'recording') encoding.recorder.stop();
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
    if (soundTrim.duration > limit + .0001) throw new Error('Selecciona un tramo de audio de hasta 10 segundos para WhatsApp.');
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
    download.textContent = 'Guardar para WhatsApp (' + extension.toUpperCase() + ') ↓';
    byId('format-note').textContent = extension === 'mp4' ? 'Vídeo MP4 listo para guardar en la galería.' : 'Este navegador exportó WebM. Si tu galería no lo admite, utiliza un navegador compatible con exportación MP4.';
    try { byId('share').hidden = !navigator.canShare?.({ files: [result] }); } catch { byId('share').hidden = true; }
    byId('downloads').hidden = false;
    status.textContent = 'Vídeo preparado. Generando los archivos del sticker sonoro…';
  } catch (error) {
    status.textContent = error.message || 'No pude crear el clip.';
  } finally {
    if (context) await context.close().catch(() => {});
    exportJob = undefined;
    byId('cancel-export').hidden = true;
    busy = false;
    byId('progress').hidden = true;
    for (const field of document.querySelectorAll('input, select, .modes button')) field.disabled = false;
    sync();
  }
  if (result) { status.textContent = 'Vídeo listo para WhatsApp.'; await prepareSticker(); }
});
byId('cancel-export').onclick = () => exportJob?.abort();

byId('share').addEventListener('click', async () => {
  if (!result) return;
  try {
    await navigator.share({ files: [result] });
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
const endpointField = byId('import-endpoint');
const maxImportBytes = 80 * 1024 * 1024;
const socialHosts = /^(?:(?:www|m|vm|vt)\.tiktok\.com|tiktok\.com|(?:www\.)?instagram\.com|(?:www\.|m\.)?youtube\.com|youtu\.be)$/i;
const configuredEndpoint = document.querySelector('meta[name="sticker-import-endpoint"]')?.content || '';
endpointField.value = configuredEndpoint;
try { endpointField.value = localStorage.getItem('sticker-import-endpoint') || configuredEndpoint; } catch {}
endpointField.addEventListener('change', () => {
  try { localStorage.setItem('sticker-import-endpoint', endpointField.value.trim()); } catch {}
});
function switchToVideo() {
  if (mode !== 'video') modes.find(button => button.dataset.mode === 'video').click();
}
function cancelImport() { importController?.abort(); }
byId('cancel-link').onclick = cancelImport;
byId('visual').addEventListener('change', cancelImport, { capture: true });
drop.addEventListener('drop', cancelImport, { capture: true });
for (const button of modes) button.addEventListener('click', cancelImport, { capture: true });
function httpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Introduce una URL HTTPS válida.');
  return url;
}
async function downloadVideo(response, signal) {
  if (!response.ok) {
    let message = 'Error de descarga (' + response.status + ').';
    if ((response.headers.get('content-type') || '').includes('application/json')) {
      try { message = (await response.json()).error || message; } catch {}
    }
    throw new Error(message);
  }
  const type = (response.headers.get('content-type') || '').split(';')[0];
  if (type && !type.startsWith('video/') && type !== 'application/octet-stream') throw new Error('El enlace no devolvió un archivo de video.');
  const total = Number(response.headers.get('content-length')) || 0;
  if (total > maxImportBytes) throw new Error('El video supera 80 MB.');
  if (!response.body) throw new Error('El navegador no permite leer esta descarga.');
  const reader = response.body.getReader(), chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (signal.aborted) throw new DOMException('Cancelado','AbortError');
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxImportBytes) throw new Error('El video supera 80 MB.');
      chunks.push(value);
      linkStatus.textContent = 'Descargando… ' + (total ? Math.min(100,Math.round(100*bytes/total)) + '%' : (bytes/1048576).toFixed(1) + ' MB');
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (!bytes) throw new Error('El video está vacío.');
  return new File(chunks, type === 'video/webm' ? 'video-importado.webm' : 'video-importado.mp4', {type: type.startsWith('video/') ? type : 'video/mp4'});
}
byId('link-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); byId('load-link').click(); }
});
byId('load-link').onclick = async () => {
  if (busy || importing) return;
  const button = byId('load-link');
  let controller, timer;
  try {
    const url = httpsUrl(byId('link-input').value.trim());
    const social = socialHosts.test(url.hostname);
    let request = url.href, options = {};
    if (social) {
      if (!endpointField.value.trim()) {
        byId('import-settings').open = true;
        throw new Error('Falta configurar el servicio de descarga para TikTok, Reels y Shorts.');
      }
      const endpoint = httpsUrl(endpointField.value.trim());
      if (endpoint.search || endpoint.hash) throw new Error('Configura la URL base del servicio, sin parámetros.');
      request = endpoint.href.replace(/\/$/, '') + '/api/import';
      options = {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:url.href})};
    }
    switchToVideo();
    controller = new AbortController();
    importController = controller;
    importing = true;
    button.disabled = true;
    byId('cancel-link').hidden = false;
    sync();
    timer = setTimeout(() => controller.abort(), 120000);
    linkStatus.textContent = social ? 'Preparando el video en el servicio de descarga…' : 'Conectando con el video…';
    const response = await fetch(request, {...options, signal:controller.signal, credentials:'omit', referrerPolicy:'no-referrer', cache:'no-store'});
    const file = await downloadVideo(response, controller.signal);
    if (controller.signal.aborted || busy) return;
    linkStatus.textContent = 'Abriendo el video en el editor…';
    const loaded = await chooseVisual(file);
    if (!controller.signal.aborted) linkStatus.textContent = loaded ? 'Video importado. Ajusta el tramo, zoom y posición antes de crear el clip.' : 'No se pudo abrir el video: ' + status.textContent;
  } catch (error) {
    linkStatus.textContent = error.name === 'AbortError' ? 'Descarga cancelada o tiempo agotado.' : error instanceof TypeError ? 'No se pudo conectar. Comprueba el servicio o que el video directo permita CORS.' : error.message;
  } finally {
    clearTimeout(timer);
    importController = undefined;
    importing = false;
    button.disabled = false;
    byId('cancel-link').hidden = true;
    sync();
  }
};

function selectionInfo() {
  const info = byId('selection-info');
  if (!visual || !audio) { info.textContent = 'Selecciona un archivo con audio. Máximo 10 segundos por sticker.'; return; }
  try {
    const t = mode === 'video' ? trimmed('v') : trimmed('a');
    info.textContent = 'Duración: ' + t.duration.toFixed(2) + ' s de ' + limit + ' s permitidos.';
    if (t.duration > limit + .0001) info.textContent += ' Reduce el tramo antes de generar.';
    if (visual.kind !== 'image' && mode !== 'video') trimmed('v');
    if (t.duration > limit + .0001) byId('export').disabled = true;
  } catch (error) { info.textContent = error.message; byId('export').disabled = true; }
}
for (const id of ['vs','ve','as','ae']) byId(id).addEventListener('input', () => { clearResult(); sync(); });
byId('mark-start').onclick = () => {
  const start = byId('scrub').valueAsNumber;
  const max = Number(byId('ve').max);
  byId('vs').value = Math.min(start, max - .01).toFixed(2);
  byId('ve').value = Math.min(max, Number(byId('vs').value) + limit).toFixed(2);
  clearResult(); sync(); previewFrame(Number(byId('vs').value));
};
byId('mark-end').onclick = () => {
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
