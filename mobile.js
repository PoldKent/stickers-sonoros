(() => {
'use strict';
const $=id=>document.getElementById(id);
const messages={
language:['Idioma','Language'],title:['Enviar sticker guardado','Send saved sticker'],intro:['Abre tu paquete sonoro y envíalo a tu propio chat de WhatsApp.','Open your sound sticker package and send it to your own WhatsApp chat.'],
choose:['Seleccionar archivo .sonoro.json','Choose .sonoro.json file'],back:['Volver al editor','Back to editor'],guide:['Guía móvil','Mobile guide'],
invalid:['Paquete sonoro no válido o dañado.','Invalid or damaged sound sticker package.'],large:['El puente admite hasta 2 MB de imagen y audio combinados.','The bridge accepts up to 2 MB of combined image and audio.'],loading:['Verificando paquete…','Verifying package…'],ready:['Paquete válido. Continúa con el envío a tu WhatsApp.','Valid package. Continue to send to your WhatsApp.'],still:['Imagen fija','Still image'],animated:['Animación','Animation']};
let language='es',statusKey='',current=null,serial=0,urls=[];
try{language=localStorage.getItem('stickers.language')==='en'?'en':'es'}catch{}
const t=k=>messages[k]?.[language==='en'?1:0]||k;
function status(k){statusKey=k;$('mobile-status').textContent=t(k);}
function applyLanguage(){
  document.documentElement.lang=language;$('mobile-language').value=language;$('mobile-language').setAttribute('aria-label',t('language'));
  document.title='Stickers Sonoros · '+t('title');
  document.querySelectorAll('[data-msg]').forEach(e=>e.textContent=t(e.dataset.msg));
  $('mobile-guide').href='https://github.com/PoldKent/stickers-sonoros/blob/main/docs/MOBILE.md#'+(language==='en'?'english':'español');
  if(statusKey)status(statusKey);
  if(current)$('mobile-info').textContent=current.side+' px · '+t(current.frames>1?'animated':'still')+' · '+current.seconds+' s · '+((current.webp.size+current.ogg.size)/1000).toFixed(1)+' KB';
}
$('mobile-language').onchange=()=>{language=$('mobile-language').value;try{localStorage.setItem('stickers.language',language)}catch{}applyLanguage()};
const fail=k=>{throw new Error(k)};
const tag=(b,i,n)=>String.fromCharCode(...b.subarray(i,i+n));
function fromBase64(s){if(typeof s!=='string'||!s.length||s.length>2800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))fail('invalid');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function validate(file){
  if(!file||file.size>2800000)fail('large');
  let p;try{p=JSON.parse(await file.text())}catch{fail('invalid')}
  if(p?.format!=='stickers-sonoros/1')fail('invalid');
  const w=fromBase64(p.webp),a=fromBase64(p.ogg);
  if(w.length+a.length>2000000)fail('large');
  if(w.length<30||a.length<28||tag(w,0,4)!=='RIFF'||tag(w,8,4)!=='WEBP'||tag(a,0,4)!=='OggS'||!new TextDecoder().decode(a.subarray(0,256)).includes('OpusHead'))fail('invalid');
  const d=new DataView(w.buffer),digest=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',a))));
  let side=0,frames=0,animated=false,linked=false,durationMs=0,i=12;
  if(d.getUint32(4,true)+8!==w.length)fail('invalid');
  for(;i+8<=w.length;){
    const k=tag(w,i,4),n=d.getUint32(i+4,true),b=i+8,end=b+n;if(end>w.length)fail('invalid');
    if(k==='VP8X'&&n>=10){const x=w[b+4]+256*w[b+5]+65536*w[b+6]+1,y=w[b+7]+256*w[b+8]+65536*w[b+9]+1;if(x!==y||x>512)fail('invalid');side=x;animated=!!(w[b]&2)}
    if(k==='ANMF'){if(n<16)fail('invalid');frames++;durationMs+=w[b+12]+256*w[b+13]+65536*w[b+14]}
    if(k==='EXIF'&&n>=26){try{const v=new DataView(w.buffer,b,n);const size=v.getUint32(14),start=v.getUint32(18);if(start!==26||start+size!==n)fail('invalid');const meta=JSON.parse(new TextDecoder().decode(w.subarray(b+start,end)));linked=meta['sound-sha256']===digest}catch{fail('invalid')}}
    i=end+(n&1);
  }
  if(i!==w.length||!linked||p.info?.soundSha256!==digest||p.info?.lado!==side||!side||p.info?.isAnimated!==animated||!Number.isInteger(p.info?.segundosAudio)||p.info.segundosAudio<1)fail('invalid');
  return {file,webp:new Blob([w],{type:'image/webp'}),ogg:new Blob([a],{type:'audio/ogg'}),side,frames:Math.max(1,frames),durationMs,seconds:p.info.segundosAudio,name:file.name.replace(/\.sonoro\.json$|\.json$/i,'').replace(/[^\p{L}\p{N}_.-]/gu,'_').slice(0,100)||'sticker'};
}

function clear(){
  current=null;$('mobile-result').hidden=true;$('mobile-image').removeAttribute('src');
  $('mobile-audio').pause();$('mobile-audio').removeAttribute('src');$('mobile-audio').load();
  for(const u of urls)URL.revokeObjectURL(u);urls=[];
}
$('mobile-package').onchange=async()=>{
  const n=++serial;clear();status('loading');
  try{
    const p=await validate($('mobile-package').files[0]);if(n!==serial)return;
    current=p;urls=[URL.createObjectURL(p.webp),URL.createObjectURL(p.ogg)];
    $('mobile-image').src=urls[0];$('mobile-audio').src=urls[1];
    $('mobile-result').hidden=false;status('ready');applyLanguage();
    // Self-send panel is visible after package validation.
  }catch(e){if(n===serial)status(messages[e.message]?e.message:'invalid')}
};
window.SonoroMobile={validate};
window.SonoroSelfSend?.mount($('self-send-bridge'),()=>current?.file||null);
applyLanguage();
})();
