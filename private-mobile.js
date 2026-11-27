(() => {
'use strict';
const BASE='https://stickers-sonoros-bridge.onrender.com';
const words={
title:['Enviar a mi WhatsApp','Send to my WhatsApp'],intro:['Vincula tu cuenta y recibe el sticker en tu propio chat.','Link your account and receive the sticker in your own chat.'],start:['Comenzar','Get started'],phone:['Tu número con código de país','Your number with country code'],hint:['Ejemplo: +591 70000000. Usa solo tu propio número.','Example: +591 70000000. Use only your own number.'],risk:['Al vincular autorizas temporalmente un dispositivo alojado en nuestro servidor. Un dispositivo vinculado puede acceder a mensajes. Esta conexión no es oficial y podría causar restricciones. No pedimos SMS, PIN ni contraseña. Recomendamos una cuenta secundaria propia.','Linking temporarily authorizes a device hosted on our server. A linked device can access messages. This connection is unofficial and may cause restrictions. We never ask for SMS codes, PINs or passwords. We recommend an owned secondary account.'],consent:['Entiendo los riesgos y autorizo vincular mi propia cuenta.','I understand the risks and authorize linking my own account.'],link:['Conectar mi WhatsApp','Connect my WhatsApp'],pair:['En tu WhatsApp: Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono. Introduce únicamente el código mostrado aquí; nunca compartas códigos recibidos por SMS.','In your WhatsApp: Linked devices → Link a device → Link with phone number. Enter only the code shown here; never share codes received by SMS.'],copy:['Copiar código','Copy code'],send:['Enviar a mi propio chat','Send to my own chat'],stop:['Desconectar WhatsApp','Disconnect WhatsApp'],ready:['Conectado. El sticker se enviará únicamente a tu propio chat.','Connected. Your sticker will only be sent to your own chat.'],connecting:['Conectando…','Connecting…'],closed:['Sesión terminada. Comprueba Dispositivos vinculados y elimina el dispositivo si sigue allí.','Session ended. Check Linked devices and remove the device if it remains.'],relayed:['Envío procesado. Comprueba tu propio chat y el sonido.','Send processed. Check your own chat and sound.'],disabled:['El envío individual todavía no está habilitado.','Individual sending is not yet enabled.'],capacity:['El servidor está ocupado. Intenta más tarde.','The server is busy. Try later.'],rate:['Espera antes de solicitar otro código.','Wait before requesting another code.'],challenge:['Completa la verificación de seguridad de nuevo.','Complete the security verification again.'],error:['No pudimos completar la solicitud.','We could not complete the request.'],expired:['La sesión caducó. Comprueba los dispositivos vinculados.','Session expired. Check linked devices.'],uncertain:['No se confirmó el envío. Revisa tu chat antes de repetirlo.','Sending was not confirmed. Check your chat before repeating it.'],confirm:['¿Enviar este sticker a tu propio chat?','Send this sticker to your own chat?'],large:['Este sticker supera 1 MB. WhatsApp podría rechazarlo. ¿Enviar a tu propio chat?','This sticker exceeds 1 MB. WhatsApp may reject it. Send to your own chat?'],duplicate:['Ya intentaste enviar este sticker.','You already attempted to send this sticker.'],cooldown:['Espera cinco segundos entre envíos.','Wait five seconds between sends.'],invalid:['Revisa el número y el archivo.','Check the number and file.'],failed:['No se pudo conectar. Revisa Dispositivos vinculados.','Could not connect. Check Linked devices.'],sessionInfo:['Sesión temporal de hasta 15 minutos y 5 envíos. Desconecta y comprueba Dispositivos vinculados al terminar.','Temporary session up to 15 minutes and 5 sends. Disconnect and check Linked devices when done.']};
function packageWeight(p){
  const bytes=s=>typeof s==='string'?Math.floor(s.length*3/4)-(s.endsWith('==')?2:s.endsWith('=')?1:0):NaN;
  const w=bytes(p?.webp),a=bytes(p?.ogg),seconds=p?.info?.segundosAudio;
  return p?.format==='stickers-sonoros/1'&&Number.isSafeInteger(seconds)&&seconds>=1&&w>0&&a>0&&w+a<=2000000?w+a:null;
}

function mount(root,getPackage){
 if(!root)return;
 const panel=document.createElement('section');panel.className='self-bridge private-bridge';root.append(panel);
 const add=(tag,k,parent=panel)=>{const e=document.createElement(tag);if(k)e.dataset.selfMsg=k;parent.append(e);return e};
 const btn=(k,parent=panel)=>{const e=add('button',k,parent);e.type='button';return e};
 add('h4','title');add('p','intro');const start=btn('start');start.className='primary';
 const form=add('div');form.hidden=true;
 const l=add('label',null,form);add('span','phone',l);const phone=add('input',null,l);phone.type='tel';phone.autocomplete='tel';add('p','hint',form);
 add('p','risk',form).className='private-risk';const consentLabel=add('label',null,form);consentLabel.className='self-consent';const consent=add('input',null,consentLabel);consent.type='checkbox';add('span','consent',consentLabel);
 const captcha=add('div',null,form);const link=btn('link',form);link.className='primary';
 const pairing=add('div');pairing.hidden=true;pairing.className='private-pairing';const code=add('strong',null,pairing);const copy=btn('copy',pairing);add('p','pair',pairing);
 const send=btn('send');send.className='primary';send.hidden=true;
 const stop=btn('stop');stop.hidden=true;const msg=add('p');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');add('p','sessionInfo').className='private-help';
 let token='',challenge='',widget,phase='idle',message='',busy=false,timer,uncertain=false;
 const t=k=>words[k]?.[document.documentElement.lang==='en'?1:0]||words.error[document.documentElement.lang==='en'?1:0];
 const update=()=>{panel.querySelectorAll('[data-self-msg]').forEach(e=>e.textContent=t(e.dataset.selfMsg));msg.textContent=message?t(message):'';start.disabled=busy;link.disabled=busy||!consent.checked||!challenge;send.disabled=busy||uncertain;stop.disabled=busy;send.hidden=phase!=='ready'||uncertain;stop.hidden=!token;pairing.hidden=phase!=='pairing'||!code.textContent};
 function reset(){clearTimeout(timer);token='';phase='idle';code.textContent='';uncertain=false;start.hidden=false;form.hidden=true;phone.value='';consent.checked=false;challenge='';if(widget!==undefined){window.turnstile?.remove(widget);widget=undefined}update()}
 async function call(path,method='GET',body){
  const response=await fetch(BASE+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body,cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(90000)});
  return {response,data:await response.json()};
 }
 function poll(){clearTimeout(timer);if(token&&['connecting','pairing'].includes(phase))timer=setTimeout(()=>act('/v2/status'),2500);else if(token&&phase==='ready')timer=setTimeout(()=>act('/v2/status'),30000)}
 async function act(path,method='GET',body){
  if(busy)return;busy=true;update();
  try{const {response,data}=await call(path,method,body);
   if(data.phase){phase=data.phase;code.textContent=data.pairingCode||''}
   if(response.ok){if(path!=='/v2/status'||message!=='relayed'||phase!=='ready')message=data.relayed?'relayed':phase==='pairing'?'':phase;if(['closed','failed','uncertain'].includes(phase)){const m=message;reset();message=m}}
   else{message=data.error||'error';if(response.status===410||path==='/v2/connect'){const m=message;reset();message=m}else if(path==='/v2/send'&&response.status>=500){uncertain=true;message='uncertain'}}
  }catch{message=path==='/v2/send'?'uncertain':'error';if(path==='/v2/send')uncertain=true;else if(path==='/v2/connect'){phase='connecting';}}
  finally{busy=false;update();poll()}
 }
 start.onclick=async()=>{if(busy)return;busy=true;update();try{const {response,data}=await call('/v2/config');if(!response.ok||data.version!=='2026.11.27.49'||!data.enabled){message='disabled';return}
  start.hidden=true;form.hidden=false;
  if(!window.turnstile){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=resolve;s.onerror=reject;document.head.append(s)})}
  widget=window.turnstile.render(captcha,{sitekey:data.siteKey,action:'sonoro_link',callback:v=>{challenge=v;update()},'expired-callback':()=>{challenge='';update()},'error-callback':()=>{challenge='';message='challenge';update()}});message='';
 }catch{reset();message='error'}finally{busy=false;update()}};
 consent.onchange=update;link.onclick=()=>{const number=phone.value.replace(/[\s()+-]/g,'');if(!/^[1-9][0-9]{7,14}$/.test(number)||!consent.checked||!challenge){message='invalid';update();return}
  token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');const body=JSON.stringify({phone:number,challenge,consent:true});form.hidden=true;phone.value='';challenge='';if(widget!==undefined){window.turnstile?.remove(widget);widget=undefined}act('/v2/connect','POST',body)};
 stop.onclick=()=>act('/v2/stop','POST');
 copy.onclick=()=>navigator.clipboard.writeText(code.textContent).catch(()=>{});
 send.onclick=async()=>{if(busy||phase!=='ready'||uncertain)return;busy=true;update();try{const body=await getPackage();const weight=body&&packageWeight(JSON.parse(await body.text()));if(!weight){message='invalid';return}if(!confirm(t(weight>1000000?'large':'confirm'))){message='ready';return;}busy=false;await act('/v2/send','POST',body)}catch{message='error'}finally{busy=false;update()}};
 document.addEventListener('sticker-language',update);document.getElementById('mobile-language')?.addEventListener('change',()=>queueMicrotask(update));update();
}
window.SonoroPrivateMobile={mount,packageWeight};
})();
