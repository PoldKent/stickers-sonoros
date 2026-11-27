(() => {
'use strict';
const $=id=>document.getElementById(id);
const messages={
language:['Idioma','Language'],title:['Enviar sticker guardado','Send saved sticker'],intro:['Abre tu paquete sonoro y envíalo a tu propio chat de WhatsApp.','Open your sound sticker package and send it to your own WhatsApp chat.'],
choose:['Seleccionar archivo .sonoro.json','Choose .sonoro.json file'],back:['Volver al editor','Back to editor'],guide:['Guía móvil','Mobile guide'],
invalid:['Paquete sonoro no válido o dañado.','Invalid or damaged sound sticker package.'],large:['El puente admite hasta 1 MB de imagen y audio combinados.','The bridge accepts up to 1 MB of combined image and audio.'],loading:['Verificando paquete…','Verifying package…'],ready:['Paquete válido. Continúa con el envío a tu WhatsApp.','Valid package. Continue to send to your WhatsApp.'],still:['Imagen fija','Still image'],animated:['Animación','Animation']};
let language='es',statusKey='',current=null,serial=0,urls=[];
try{language=localStorage.getItem('stickers.language')==='en'?'en':'es'}catch{}
const t=k=>messages[k]?.[language==='en'?1:0]||k;
function status(k){statusKey=k;$('mobile-status').textContent=k?t(k):'';}
function applyLanguage(){
  document.documentElement.lang=language;$('mobile-language').value=language;$('mobile-language').setAttribute('aria-label',t('language'));
  document.title='Stickers Sonoros · '+t('title');
  document.querySelectorAll('[data-msg]').forEach(e=>e.textContent=t(e.dataset.msg));
  $('mobile-guide').href='https://github.com/PoldKent/stickers-sonoros/blob/main/docs/MOBILE.md#'+(language==='en'?'english':'español');
  if(statusKey)status(statusKey);
  if(current)$('mobile-info').textContent=current.side+' px · '+t(current.frames>1?'animated':'still')+' · '+current.seconds+' s · '+((current.webp.size+current.ogg.size)/1000).toFixed(1)+' KB';
}
$('mobile-language').onchange=()=>{language=$('mobile-language').value;try{localStorage.setItem('stickers.language',language)}catch{}applyLanguage()};
const validate=window.SonoroPackage.validate;

function clear(){
  current=null;$('mobile-result').hidden=true;$('mobile-image').removeAttribute('src');
  $('mobile-audio').pause();$('mobile-audio').removeAttribute('src');$('mobile-audio').load();
  for(const u of urls)URL.revokeObjectURL(u);urls=[];
}
$('mobile-package').onchange=async()=>{
  const n=++serial;clear();status('loading');
  if(!$('mobile-package').files.length){status('');return;}
  try{
    const p=await validate($('mobile-package').files[0]);if(n!==serial)return;
    current=p;urls=[URL.createObjectURL(p.webp),URL.createObjectURL(p.ogg)];
    $('mobile-image').src=urls[0];$('mobile-audio').src=urls[1];
    $('mobile-result').hidden=false;$('self-send-bridge').hidden=false;status('ready');applyLanguage();
  }catch(e){if(n===serial)status(messages[e.message]?e.message:'invalid')}
};
window.SonoroMobile={validate};
window.SonoroSelfSend?.mount($('self-send-bridge'),()=>current?.file||null);
applyLanguage();
})();
