(() => {
'use strict';
const strings={
title:['Envío experimental privado a WhatsApp App','Experimental private send to WhatsApp App'],
intro:['Requiere un puente privado configurado por su administrador. Vincula solo una cuenta secundaria propia; el cliente no oficial puede causar restricciones. Prueba inicial: 1–3 s y menos de 500 KB por componente.','Requires a private bridge configured by its operator. Link only a secondary account you own; the unofficial client may cause restrictions. Initial trial: 1–3 s and under 500 KB per component.'],
url:['URL HTTPS del puente privado','Private bridge HTTPS URL'],token:['Clave de acceso del puente (no de WhatsApp)','Bridge access key (not a WhatsApp credential)'],connect:['Vincular cuenta de prueba','Link test account'],refresh:['Comprobar estado','Check status'],send:['Enviar un sticker de prueba','Send one test sticker'],stop:['Cerrar prueba','Close trial'],confirm:['Autorizo un único envío de este paquete al destinatario fijo del puente.','I authorize sending this package once to the bridge’s fixed recipient.'],pair:['En WhatsApp de la cuenta secundaria: Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono. Introduce este código allí, no lo compartas.','On the secondary account in WhatsApp: Linked devices → Link a device → Link with phone number. Enter this code there; do not share it.'],
idle:['Sin conectar.','Not connected.'],connecting:['Conectando. Comprueba el estado en unos segundos.','Connecting. Check status in a moment.'],pairing:['Vinculación pendiente.','Linking pending.'],ready:['Vinculado. Confirma el envío de prueba.','Linked. Confirm the test send.'],validating:['Validando el paquete.','Validating package.'],sending:['Enviando. No repitas la solicitud.','Sending. Do not repeat the request.'],relayed:['El puente procesó el envío. Comprueba recepción, sonido y reenvío en WhatsApp; no es confirmación de entrega.','The bridge relayed the message. Check reception, sound and forwarding in WhatsApp; this is not delivery confirmation.'],closed:['Prueba cerrada. Desvincula el dispositivo en WhatsApp.','Trial closed. Unlink the device in WhatsApp.'],failed:['Prueba fallida o expirada. Revisa WhatsApp y desvincula el dispositivo; no reenvíes automáticamente.','Trial failed or expired. Check WhatsApp and unlink the device; do not automatically resend.'],config:['Introduce la URL del servicio Render privado y su clave de acceso.','Enter the private Render service URL and access key.'],error:['No se pudo completar la solicitud. Comprueba el servicio. Si pulsaste Enviar, revisa el chat antes de reintentar.','Request did not complete. Check the service. If you pressed Send, check the chat before retrying.'],busy:['Procesando solicitud…','Processing request…'],missing:['No hay un paquete válido disponible.','No valid package is available.'],docs:['Configuración del puente privado','Private bridge setup']};
function mount(root,getPackage){
  if(!root)return;
  const panel=document.createElement('details');panel.className='private-bridge';root.append(panel);
  const add=(tag,key,parent=panel)=>{const e=document.createElement(tag);if(key)e.dataset.privateMsg=key;parent.append(e);return e};
  add('summary','title');add('p','intro');
  const urlLabel=add('label'),urlText=add('span','url',urlLabel),url=add('input',null,urlLabel);url.type='url';url.placeholder='https://…onrender.com';url.autocomplete='off';
  const keyLabel=add('label'),keyText=add('span','token',keyLabel),key=add('input',null,keyLabel);key.type='password';key.autocomplete='off';
  const actions=add('div');actions.className='private-actions';
  const connect=add('button','connect',actions),refresh=add('button','refresh',actions),stop=add('button','stop',actions);for(const b of [connect,refresh,stop])b.type='button';
  const pairing=add('div');pairing.hidden=true;add('p','pair',pairing);const code=add('strong',null,pairing);
  const confirmLabel=add('label');const confirm=add('input',null,confirmLabel);confirm.type='checkbox';add('span','confirm',confirmLabel);
  const send=add('button','send');send.type='button';send.className='primary';send.disabled=true;
  const message=add('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const docs=add('a','docs');docs.href='https://github.com/PoldKent/stickers-sonoros/tree/main/experiments/mobile-bridge#prueba-web-móvil--mobile-web-trial';
  let phase='idle',msg='idle',working=false,locked=false,preparing=false;
  const t=k=>strings[k]?.[document.documentElement.lang==='en'?1:0]||strings.error[document.documentElement.lang==='en'?1:0];
  function update(){panel.querySelectorAll('[data-private-msg]').forEach(e=>e.textContent=t(e.dataset.privateMsg));message.textContent=t(msg);send.disabled=working||preparing||locked||phase!=='ready'||!confirm.checked;connect.disabled=working||preparing||locked||!['idle','failed','closed'].includes(phase);refresh.disabled=working||preparing;stop.disabled=working||preparing;url.disabled=key.disabled=confirm.disabled=working||preparing;}
  function reset(){phase='idle';msg='idle';locked=false;confirm.checked=false;pairing.hidden=true;code.textContent='';update()}
  url.onchange=key.onchange=reset;confirm.onchange=update;
  function endpoint(){let u;try{u=new URL(url.value.trim())}catch{}if(!u||u.protocol!=='https:'||!/^([a-z0-9-]+)\.onrender\.com$/.test(u.hostname)||u.port||u.username||u.password||u.pathname!=='/'||u.search||u.hash||key.value.length<32)throw Error('config');return u.origin}
  async function request(path,method='GET',body){
    if(working)return;
    let base;try{base=endpoint()}catch{msg='config';update();return}
    working=true;msg='busy';update();
    try{
      const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+key.value,...(body?{'Content-Type':'application/json'}:{})},body,cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(90000)});
      const data=await response.json();
      if(!response.ok)throw Error('request');
      phase=Object.hasOwn(strings,data.phase)?data.phase:'failed';msg=phase;
      pairing.hidden=phase!=='pairing'||typeof data.pairingCode!=='string';code.textContent=pairing.hidden?'':data.pairingCode;
      if(['relayed','failed','closed'].includes(phase))locked=true;
    }catch{msg='error';if(path==='/v1/send')locked=true}
    finally{working=false;update()}
  }
  connect.onclick=()=>request('/v1/connect','POST');refresh.onclick=()=>request('/v1/status');stop.onclick=()=>request('/v1/stop','POST');
  send.onclick=async()=>{if(working||preparing||locked||phase!=='ready'||!confirm.checked)return;preparing=true;update();try{const body=await getPackage();if(!body){msg='missing';return}locked=true;await request('/v1/send','POST',body)}catch{msg='missing'}finally{preparing=false;update()}};
  document.addEventListener('sticker-language',update);document.getElementById('mobile-language')?.addEventListener('change',()=>queueMicrotask(update));update();
}
window.SonoroPrivateMobile={mount};
})();
