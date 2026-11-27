(() => {
'use strict';
const ENDPOINT='https://stickers-sonoros-bridge.onrender.com';
const strings={
title:['Enviar a WhatsApp App · privado','Send to WhatsApp App · private'],
intro:['Puente experimental no oficial. Usa solo una cuenta secundaria propia; existe riesgo de restricciones. Sesión temporal: hasta 5 envíos, 15 minutos, mismo destinatario autorizado. No se guarda tu clave.','Unofficial experimental bridge. Use only a secondary account you own; restrictions are possible. Temporary session: up to 5 sends, 15 minutes, same authorized recipient. Your key is not stored.'],
token:['Clave privada del puente','Private bridge access key'],connect:['Vincular cuenta de prueba','Link test account'],refresh:['Comprobar estado','Check status'],send:['Enviar sticker sonoro','Send sound sticker'],stop:['Cerrar sesión','Close session'],confirm:['Autorizo un envío de este paquete al destinatario fijo del puente.','I authorize one send of this package to the bridge’s fixed recipient.'],
pair:['En WhatsApp de la cuenta secundaria: Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono. Introduce el código allí. No lo compartas.','On the secondary account: Linked devices → Link a device → Link with phone number. Enter the code there. Do not share it.'],
tier:['Nivel de prueba','Trial level'],small:['Inicial · 1–3 s, menos de 500 KB por componente','Initial · 1–3 s, under 500 KB per component'],medium:['Intermedio · hasta 15 s y 1 MB total','Intermediate · up to 15 s and 1 MB total'],extended:['Ampliado · hasta 60 s y 2 MB total (sin validar)','Extended · up to 60 s and 2 MB total (unverified)'],
idle:['Sin conectar.','Not connected.'],connecting:['Conectando…','Connecting…'],pairing:['Vinculación pendiente.','Linking pending.'],ready:['Vinculado. Confirma el envío de prueba.','Linked. Confirm the test send.'],validating:['Validando el paquete.','Validating package.'],sending:['Enviando. No repitas la solicitud.','Sending. Do not repeat the request.'],relayed:['El puente procesó el envío. Comprueba recepción y sonido en WhatsApp. La entrega no está confirmada por el servidor.','The bridge relayed the message. Check reception and sound in WhatsApp. Delivery is not confirmed by the server.'],closed:['Sesión cerrada. Desvincula el dispositivo de prueba en WhatsApp.','Session closed. Unlink the test device in WhatsApp.'],failed:['Sesión fallida o expirada. Desvincula el dispositivo.','Session failed or expired. Unlink the device.'],uncertain:['Entrega incierta. Revisa el chat antes de iniciar otra sesión; no se reenvió automáticamente.','Delivery uncertain. Check the chat before starting another session; no automatic resend.'],config:['Introduce tu clave privada del puente.','Enter your private bridge access key.'],error:['No se pudo completar la solicitud. Comprueba el servicio. Si pulsaste Enviar, revisa el chat antes de reintentar.','Request did not complete. Check the service. If you pressed Send, check the chat before retrying.'],busy:['Procesando solicitud…','Processing request…'],missing:['No hay un paquete válido disponible.','No valid package is available.'],docs:['Guía y riesgos del puente privado','Private bridge guide and risks'],remaining:['Envíos restantes: ','Remaining sends: '],duplicate:['Este paquete ya se intentó enviar en esta sesión. Comprueba el chat.','This package was already attempted in this session. Check the chat.'],cooldown:['Espera al menos 5 segundos entre envíos.','Wait at least 5 seconds between sends.'],'trial-limit':['El paquete supera el nivel elegido. Elige un nivel superior o reduce su tamaño/duración.','Package exceeds the selected tier. Choose a higher tier or reduce size/duration.'],quota:['Límite de sesión alcanzado.','Session limit reached.'],'invalid-package':['Paquete no válido.','Invalid package.'],decode:['El audio no se pudo decodificar.','Audio could not be decoded.'],auth:['Clave incorrecta.','Incorrect key.'],'not-configured':['El puente aún no está configurado.','Bridge not configured.'],'not-ready':['Comprueba el estado antes de enviar.','Check status before sending.'],version:['El servidor necesita la versión .45. Comprueba el despliegue antes de continuar.','The server requires version .45. Check deployment before continuing.']};
function mount(root,getPackage){
  if(!root)return;
  const panel=document.createElement('details');panel.className='private-bridge';root.append(panel);
  const add=(tag,key,parent=panel)=>{const e=document.createElement(tag);if(key)e.dataset.privateMsg=key;parent.append(e);return e};
  add('summary','title');add('p','intro');
  const keyLabel=add('label');add('span','token',keyLabel);const key=add('input',null,keyLabel);key.type='password';key.autocomplete='off';
  const actions=add('div');actions.className='private-actions';
  const connect=add('button','connect',actions),refresh=add('button','refresh',actions),stop=add('button','stop',actions);for(const b of [connect,refresh,stop])b.type='button';
  const pairing=add('div');pairing.hidden=true;add('p','pair',pairing);const code=add('strong',null,pairing);
  const tierLabel=add('label');add('span','tier',tierLabel);const tier=add('select',null,tierLabel);for(const id of ['small','medium','extended']){const option=add('option',id,tier);option.value=id;}
  const confirmLabel=add('label');const confirm=add('input',null,confirmLabel);confirm.type='checkbox';add('span','confirm',confirmLabel);
  const send=add('button','send');send.type='button';send.className='primary';send.disabled=true;
  const message=add('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const remaining=add('p');
  const docs=add('a','docs');docs.href='https://github.com/PoldKent/stickers-sonoros/blob/main/docs/MOBILE.md';
  let phase='idle',msg='idle',working=false,preparing=false,uncertain=false,left=null,autoTimer;
  const t=k=>strings[k]?.[document.documentElement.lang==='en'?1:0]||strings.error[document.documentElement.lang==='en'?1:0];
  const finalPhases=['closed','failed','uncertain','relayed'];
  function update(){panel.querySelectorAll('[data-private-msg]').forEach(e=>e.textContent=t(e.dataset.privateMsg));message.textContent=t(msg);remaining.textContent=left===null?'':t('remaining')+left;const busy=working||preparing;send.disabled=busy||uncertain||phase!=='ready'||!confirm.checked;connect.disabled=busy||uncertain||!['idle',...finalPhases].includes(phase);refresh.disabled=busy;stop.disabled=busy;key.disabled=tier.disabled=confirm.disabled=busy;}
  function reset(){clearTimeout(autoTimer);phase='idle';msg='idle';uncertain=false;left=null;confirm.checked=false;pairing.hidden=true;code.textContent='';update()}
  key.onchange=reset;confirm.onchange=update;tier.onchange=()=>{confirm.checked=false;update()};
  function schedule(){clearTimeout(autoTimer);if(panel.open&&['connecting','pairing'].includes(phase)&&!uncertain)autoTimer=setTimeout(()=>request('/v1/status'),2500)}
  async function request(path,method='GET',body){
    if(working)return;
    if(key.value.length<32){msg='config';update();return}
    working=true;msg='busy';update();
    try{
      const response=await fetch(ENDPOINT+path,{method,headers:{Authorization:'Bearer '+key.value,...(body?{'Content-Type':'application/json','X-Bridge-Tier':tier.value}:{})},body,cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(90000)});
      const data=await response.json();
      if(response.ok&&data.version!=='2026.11.26.45'){phase='idle';msg='version';if(path==='/v1/send')uncertain=true;return;}
      if(typeof data.phase==='string'&&Object.hasOwn(strings,data.phase))phase=data.phase;
      if(Number.isInteger(data.remaining))left=data.remaining;
      pairing.hidden=phase!=='pairing'||typeof data.pairingCode!=='string';code.textContent=pairing.hidden?'':data.pairingCode;
      if(response.ok){msg=data.relayed===true?'relayed':phase;if(path==='/v1/status'&&uncertain){msg='uncertain';}if(path==='/v1/stop')uncertain=false;}
      else {msg=Object.hasOwn(strings,data.error)?data.error:'error';if(path==='/v1/send'&&!['trial-limit','quota','cooldown','duplicate','invalid-package','size','decode','not-ready','auth','not-configured'].includes(data.error))uncertain=true;}
    }catch{msg='error';if(path==='/v1/send')uncertain=true}
    finally{working=false;update();schedule()}
  }
  connect.onclick=()=>request('/v1/connect','POST');refresh.onclick=()=>request('/v1/status');stop.onclick=()=>{confirm.checked=false;request('/v1/stop','POST')};
  send.onclick=async()=>{if(working||preparing||uncertain||phase!=='ready'||!confirm.checked)return;preparing=true;confirm.checked=false;update();try{const body=await getPackage();if(!body){msg='missing';return}await request('/v1/send','POST',body)}catch{msg='missing'}finally{preparing=false;update()}};
  panel.addEventListener('toggle',()=>{if(!panel.open)clearTimeout(autoTimer);else schedule()});
  document.addEventListener('sticker-language',update);document.getElementById('mobile-language')?.addEventListener('change',()=>queueMicrotask(update));update();
}
window.SonoroPrivateMobile={mount};
})();
