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
const limit = 30;
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

function clearResult() {
  output.pause();
  output.removeAttribute('src');
  output.load();
  output.hidden = true;
  byId('downloads').hidden = true;
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  result = resultUrl = undefined;
}

function sync() {
  byId('export').disabled = busy || loadingVisual || loadingAudio || !visual || !audio;
  byId('sound-row').hidden = mode === 'video';
  byId('visual-trim').hidden = !visual || visual.kind === 'image';
  byId('audio-trim').hidden = mode === 'video' || !audio;
  byId('motion-row').hidden = mode !== 'mix';
  byId('empty').hidden = !!visual;
  canvas.classList.toggle('ready', !!visual);
}

function paint(media) {
  const width = media.videoWidth || media.naturalWidth || media.displayWidth;
  const height = media.videoHeight || media.naturalHeight || media.displayHeight;
  if (!width || !height) return;
  const scale = Math[byId('fit').value === 'cover' ? 'max' : 'min'](512 / width, 512 / height);
  drawing.fillStyle = '#14101d';
  drawing.fillRect(0, 0, 512, 512);
  drawing.drawImage(media, (512 - width * scale) / 2, (512 - height * scale) / 2, width * scale, height * scale);
}

function range(prefix, duration) {
  const max = Math.floor(duration * 100) / 100;
  if (max < .01) throw new Error('El archivo es demasiado corto.');
  byId(prefix + 's').max = max;
  byId(prefix + 's').value = 0;
  byId(prefix + 'e').max = max;
  byId(prefix + 'e').value = Math.min(limit, max);
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
    if (!Number.isFinite(media.duration) || !media.videoWidth) throw new Error('No pude obtener la duración o imagen del video.');
    return { kind: 'video', media, url, duration: media.duration };
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
  } catch (error) {
    if (request === visualRequest) status.textContent = error.message;
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

async function previewFrame() {
  if (!visual || busy) return;
  const item = visual;
  const time = Math.max(0, Math.min(item.duration || 0, byId('vs').valueAsNumber || 0));
  try {
    if (item.kind === 'video') await seek(item.media, time);
    const media = item.kind === 'gif' ? await gifAt(item, time) : item.media;
    if (visual === item && !busy) paint(media);
  } catch (error) {
    if (visual === item && !busy) status.textContent = error.message;
  }
}
byId('fit').addEventListener('change', previewFrame);
byId('vs').addEventListener('change', previewFrame);

function trimmed(prefix) {
  const start = byId(prefix + 's').valueAsNumber;
  const end = byId(prefix + 'e').valueAsNumber;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('El final del tramo debe ser posterior al inicio.');
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

async function render(context, videoTrim, soundTrim) {
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
  const loop = mode === 'mix' && byId('motion').value === 'loop';
  const end = videoTrim && videoTrim.start + videoTrim.duration;
  try {
    if (video) await seek(video, videoTrim.start);
    paint(item.kind === 'gif' ? await gifAt(item, videoTrim.start) : item.media);
    encoding = record(stream);
    if (video) await video.play();
    encoding.recorder.start();
    const started = context.currentTime;
    const ended = new Promise(resolve => sound.addEventListener('ended', resolve, { once: true }));
    sound.start(started, soundTrim.start, soundTrim.duration);
    interval = setInterval(async () => {
      if (updating || failure) return;
      updating = true;
      try {
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
        }
      } catch (error) {
        failure = error;
        sound.stop();
      } finally {
        updating = false;
      }
    }, 33);
    await Promise.race([ended, encoding.blob]);
    clearInterval(interval);
    if (encoding.recorder.state !== 'inactive') encoding.recorder.stop();
    const blob = await encoding.blob;
    if (failure) throw failure;
    if (!blob.size) throw new Error('El navegador devolvió un video vacío.');
    return blob;
  } finally {
    clearInterval(interval);
    video?.pause();
    if (encoding?.recorder.state === 'recording') encoding.recorder.stop();
    for (const track of stream.getTracks()) track.stop();
  }
}

byId('project').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !visual || !audio) return;
  let context;
  try {
    if (!window.MediaRecorder || !canvas.captureStream || !window.AudioContext) throw new Error('Este navegador no permite exportar el clip. Prueba con Chrome o Edge actualizado.');
    const videoTrim = visual.kind === 'image' ? null : trimmed('v');
    const soundTrim = mode === 'video' ? videoTrim : trimmed('a');
    if (soundTrim.duration > limit + .0001) throw new Error('Selecciona un tramo de audio de hasta 30 segundos.');
    busy = true;
    clearResult();
    for (const field of document.querySelectorAll('input, select, .modes button')) field.disabled = true;
    sync();
    const progress = byId('progress');
    progress.value = 0;
    progress.hidden = false;
    status.textContent = 'Creando el clip. Mantén esta pestaña abierta…';
    context = new AudioContext();
    await context.resume();
    const blob = await render(context, videoTrim, soundTrim);
    const type = blob.type.split(';')[0];
    const extension = type === 'video/mp4' ? 'mp4' : 'webm';
    result = new File([blob], 'sticker-sonoro.' + extension, { type });
    resultUrl = URL.createObjectURL(result);
    output.src = resultUrl;
    output.hidden = false;
    const download = byId('download');
    download.href = resultUrl;
    download.download = result.name;
    download.textContent = 'Descargar ' + extension.toUpperCase() + ' ↓';
    byId('share').hidden = !navigator.canShare?.({ files: [result] });
    byId('downloads').hidden = false;
    status.textContent = 'Clip listo para reproducir o descargar.';
  } catch (error) {
    status.textContent = error.message || 'No pude crear el clip.';
  } finally {
    if (context) await context.close();
    busy = false;
    byId('progress').hidden = true;
    for (const field of document.querySelectorAll('input, select, .modes button')) field.disabled = false;
    sync();
  }
});

byId('share').addEventListener('click', async () => {
  if (!result) return;
  try {
    await navigator.share({ files: [result] });
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = 'El navegador no pudo compartir el archivo. Puedes descargarlo.';
  }
});
sync();
