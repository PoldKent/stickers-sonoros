(() => {
'use strict';
const ENDPOINT='https://stickers-sonoros-bridge.onrender.com';
const strings={
title:['Enviar a WhatsApp','Send to WhatsApp'],
intro:['Puente experimental no oficial. Usa solo una cuenta secundaria propia; existe riesgo de restricciones. Sesión temporal: hasta 5 envíos, 15 minutos, mismo destinatario autorizado. No se guarda tu clave.','Unofficial experimental bridge. Use only a secondary account you own; restrictions are possible. Temporary session: up to 5 sends, 15 minutes, same authorized recipient. Your key is not stored.'],
token:['Clave de acceso','Access key'],connect:['Conectar WhatsApp','Connect WhatsApp'],refresh:['Revisar conexión','Check connection'],send:['Enviar sticker sonoro','Send sound sticker'],stop:['Cerrar sesión','Close session'],confirm:['Autorizo un envío de este paquete al destinatario fijo del puente.','I authorize one send of this package to the bridge’s fixed recipient.'],
pair:['En WhatsApp de la cuenta secundaria: Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono. Introduce el código allí. No lo compartas.','On the secondary account: Linked devices → Link a device → Link with phone number. Enter the code there. Do not share it.'],
idle:['Sin conectar.','Not connected.'],connecting:['Conectando…','Connecting…'],pairing:['Vinculación pendiente.','Linking pending.'],ready:['WhatsApp conectado. Ya puedes enviar tu sticker.','WhatsApp connected. You can now send your sticker.'],validating:['Validando el paquete.','Validating package.'],sending:['Enviando. No repitas la solicitud.','Sending. Do not repeat the request.'],relayed:['El puente procesó el envío. Comprueba recepción y sonido en WhatsApp. La entrega no está confirmada por el servidor.','The bridge relayed the message. Check reception and sound in WhatsApp. Delivery is not confirmed by the server.'],closed:['Sesión cerrada. Desvincula el dispositivo de prueba en WhatsApp.','Session closed. Unlink the test device in WhatsApp.'],failed:['Sesión fallida o expirada. Desvincula el dispositivo.','Session failed or expired. Unlink the device.'],uncertain:['Entrega incierta. Revisa el chat antes de iniciar otra sesión; no se reenvió automáticamente.','Delivery uncertain. Check the chat before starting another session; no automatic resend.'],config:['Introduce tu clave de acceso (al menos 32 caracteres).','Enter your access key (at least 32 characters).'],error:['No se pudo completar la solicitud. Comprueba el servicio. Si pulsaste Enviar, revisa el chat antes de reintentar.','Request did not complete. Check the service. If you pressed Send, check the chat before retrying.'],busy:['Procesando solicitud…','Processing request…'],missing:['No hay un paquete válido disponible.','No valid package is available.'],docs:['Guía y riesgos del puente privado','Private bridge guide and risks'],remaining:['Envíos restantes: ','Remaining sends: '],duplicate:['Este paquete ya se intentó enviar en esta sesión. Comprueba el chat.','This package was already attempted in this session. Check the chat.'],cooldown:['Espera al menos 5 segundos entre envíos.','Wait at least 5 seconds between sends.'],'trial-limit':['Este sticker supera los límites de envío. Vuelve a Crear y reduce su tamaño.','This sticker exceeds the sending limits. Return to Create and reduce its size.'],quota:['Límite de sesión alcanzado.','Session limit reached.'],'invalid-package':['Paquete no válido.','Invalid package.'],decode:['El audio no se pudo decodificar.','Audio could not be decoded.'],auth:['Clave incorrecta.','Incorrect key.'],'not-configured':['El puente aún no está configurado.','Bridge not configured.'],'not-ready':['Comprueba el estado antes de enviar.','Check status before sending.'],version:['El servidor necesita la versión .48. Comprueba el despliegue antes de continuar.','The server requires version .48. Check deployment before continuing.']};
Object.assign(strings,{
intro:['Conecta tu WhatsApp una vez y envía tus stickers con sonido.','Connect WhatsApp once and send your sound stickers.'],
accessHelp:['Usa la clave que te dio el administrador del servicio. No es tu contraseña de WhatsApp.','Use the key provided by the service administrator. It is not your WhatsApp password.'],
accessShort:['La clave de acceso debe tener al menos 32 caracteres.','The access key must be at least 32 characters long.'],
risk:['Envío privado experimental. Usa una cuenta secundaria propia: la conexión no es oficial y WhatsApp podría restringirla.','Experimental private sending. Use an owned secondary account: the connection is unofficial and WhatsApp may restrict it.'],
pairTitle:['Introduce este código en WhatsApp','Enter this code in WhatsApp'],
pair:['1. Abre WhatsApp en tu cuenta secundaria. 2. En Dispositivos vinculados, pulsa Vincular dispositivo. 3. Elige vincular con número de teléfono e introduce el código. Regresa aquí; detectaremos la conexión.','1. Open WhatsApp on your secondary account. 2. In Linked devices, choose Link a device. 3. Choose linking with a phone number and enter the code. Return here; we will detect the connection.'],
copyCode:['Copiar código','Copy code'],copied:['Código copiado. Pégalo únicamente en WhatsApp.','Code copied. Paste it only in WhatsApp.'],
ready:['WhatsApp conectado. Ya puedes enviar tu sticker.','WhatsApp connected. You can now send your sticker.'],
confirmSend:['¿Enviar este sticker con sonido al número receptor configurado para el servicio?','Send this sound sticker to the configured receiving number?'],
confirmExtended:['Este sticker pesa más de 1 MB. ¿Enviar al número receptor configurado? WhatsApp podría rechazarlo.','This sticker weighs more than 1 MB. Send to the configured receiving number? WhatsApp may reject it.'],
recipient:['Se enviará al número receptor configurado por el administrador.','It will be sent to the receiving number configured by the administrator.'],
details:['Información de la sesión','Session information'],sessionInfo:['Hasta 5 envíos en 15 minutos. Espera 5 segundos entre stickers distintos. Cierra la sesión y desvincula el dispositivo al terminar. No guardamos la clave.','Up to 5 sends in 15 minutes. Wait 5 seconds between different stickers. Close the session and unlink the device when finished. We do not store the key.'],
reconnect:['Conectar de nuevo','Connect again'],size:['El sticker supera el tamaño permitido.','The sticker exceeds the allowed size.']
});
function packageWeight(p){
  const bytes=s=>typeof s==='string'?Math.floor(s.length*3/4)-(s.endsWith('==')?2:s.endsWith('=')?1:0):NaN;
  const w=bytes(p?.webp),a=bytes(p?.ogg),seconds=p?.info?.segundosAudio;
  return p?.format==='stickers-sonoros/1'&&Number.isSafeInteger(seconds)&&seconds>=1&&w>0&&a>0&&w+a<=2000000?w+a:null;
}
function mount(root,getPackage){
  if(!root)return;
  const panel=document.createElement('details');panel.className='private-bridge';panel.open=true;root.append(panel);
  const add=(tag,key,parent=panel)=>{const e=document.createElement(tag);if(key)e.dataset.privateMsg=key;parent.append(e);return e};
  const button=(key,parent=panel,primary=false)=>{const b=add('button',key,parent);b.type='button';if(primary)b.className='primary';return b;};
  add('summary','title');add('p','intro');
  const access=add('div');access.className='private-access';
  const keyLabel=add('label',null,access);add('span','token',keyLabel);const key=add('input',null,keyLabel);key.type='password';key.autocomplete='off';key.spellcheck=false;key.setAttribute('autocapitalize','none');
  add('p','accessHelp',access).className='private-help';
  const connect=button('connect',access,true);
  const pairing=add('div');pairing.className='private-pairing';pairing.hidden=true;add('h4','pairTitle',pairing);const code=add('strong',null,pairing);const copy=button('copyCode',pairing);add('p','pair',pairing);
  const ready=add('div');ready.hidden=true;ready.className='private-ready';add('p','recipient',ready);const send=button('send',ready,true);
  const remaining=add('p',null,ready);remaining.className='private-help';
  const message=add('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const secondary=add('div');secondary.className='private-actions';const refresh=button('refresh',secondary),stop=button('stop',secondary);
  add('p','risk').className='private-risk';
  const info=add('details');info.className='private-info';add('summary','details',info);add('p','sessionInfo',info);const docs=add('a','docs',info);docs.href='https://github.com/PoldKent/stickers-sonoros/blob/main/docs/MOBILE.md';
  let phase='idle',msg='idle',working=false,preparing=false,uncertain=false,left=null,autoTimer;
  const t=k=>strings[k]?.[document.documentElement.lang==='en'?1:0]||strings.error[document.documentElement.lang==='en'?1:0];
  const finalPhases=['closed','failed','uncertain','relayed'];
  const connected=()=>['connecting','pairing','ready','validating','sending'].includes(phase);
  function update(){
    connect.dataset.privateMsg=finalPhases.includes(phase)?'reconnect':'connect';
    panel.querySelectorAll('[data-private-msg]').forEach(e=>e.textContent=t(e.dataset.privateMsg));message.textContent=t(msg);
    remaining.textContent=left===null?'':t('remaining')+left;const busy=working||preparing;
    access.hidden=connected()||uncertain;
    ready.hidden=phase!=='ready'||uncertain;
    send.disabled=busy||uncertain||phase!=='ready'||left===0;
    connect.disabled=busy||uncertain||key.value.length<32;
    secondary.hidden=!connected()&&!uncertain&&!['error','version'].includes(msg);
    refresh.hidden=!['connecting','pairing','ready'].includes(phase)&&!uncertain&&!['error','version'].includes(msg);
    stop.hidden=!connected()&&!uncertain;
    refresh.disabled=stop.disabled=busy;key.disabled=busy;
  }
  function reset(){clearTimeout(autoTimer);phase='idle';msg=key.value.length&&key.value.length<32?'accessShort':'idle';uncertain=false;left=null;pairing.hidden=true;code.textContent='';update()}
  key.oninput=reset;
  function schedule(){clearTimeout(autoTimer);if(panel.open&&['connecting','pairing'].includes(phase)&&!uncertain)autoTimer=setTimeout(()=>request('/v1/status'),2500)}
  async function request(path,method='GET',body){
    if(working)return;
    if(key.value.length<32){msg='accessShort';update();return}
    working=true;msg=path==='/v1/send'?'sending':'busy';update();
    try{
      const response=await fetch(ENDPOINT+path,{method,headers:{Authorization:'Bearer '+key.value,...(body?{'Content-Type':'application/json'}:{})},body,cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(90000)});
      const data=await response.json();
      if(response.ok&&data.version!=='2026.11.27.48'){phase='idle';msg='version';if(path==='/v1/send')uncertain=true;return;}
      if(typeof data.phase==='string'&&Object.hasOwn(strings,data.phase))phase=data.phase;
      if(Number.isInteger(data.remaining))left=data.remaining;
      pairing.hidden=phase!=='pairing'||typeof data.pairingCode!=='string';code.textContent=pairing.hidden?'':data.pairingCode;
      if(response.ok){msg=data.relayed===true?'relayed':phase;if(path==='/v1/status'&&uncertain)msg='uncertain';if(path==='/v1/stop')uncertain=false;}
      else {msg=Object.hasOwn(strings,data.error)?data.error:'error';if(path==='/v1/send'&&!['trial-limit','quota','cooldown','duplicate','invalid-package','size','decode','not-ready','auth','not-configured'].includes(data.error))uncertain=true;}
    }catch{msg='error';if(path==='/v1/send')uncertain=true}
    finally{working=false;update();schedule()}
  }
  connect.onclick=()=>request('/v1/connect','POST');refresh.onclick=()=>request('/v1/status');stop.onclick=()=>request('/v1/stop','POST');
  copy.onclick=async()=>{try{if(code.textContent){await navigator.clipboard.writeText(code.textContent);msg='copied';update()}}catch{code.scrollIntoView({block:'nearest'})}};
  send.onclick=async()=>{
    if(working||preparing||uncertain||phase!=='ready')return;
    preparing=true;msg='busy';update();
    try{
      const body=await getPackage();if(!body){msg='missing';return;}
      const p=JSON.parse(await body.text()),weight=packageWeight(p);
      if(!weight){msg='trial-limit';return;}
      if(!window.confirm(t(weight>1000000?'confirmExtended':'confirmSend'))){msg='ready';return;}
      await request('/v1/send','POST',body);
    }catch{msg='missing'}finally{preparing=false;update()}
  };
  panel.addEventListener('toggle',()=>{if(!panel.open)clearTimeout(autoTimer);else schedule()});
  document.addEventListener('sticker-language',update);document.getElementById('mobile-language')?.addEventListener('change',()=>queueMicrotask(update));update();
}
window.SonoroPrivateMobile={mount,packageWeight};
})();
