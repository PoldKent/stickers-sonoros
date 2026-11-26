/* Adaptación no comercial del flujo de envío de Shirtep/WA-audio-stickers,
 * commit 25f790945134f395c4bed4f0deea380ac3a2b778, extension/src/wa.js.
 * Licencia PolyForm Noncommercial 1.0.0: vendor/shirtep/LICENSE.md.
 * El marcador funciona dentro de WhatsApp Web; no carga código remoto,
 * no lee credenciales ni historial y solo envía tras confirmación explícita.
 */
(function () {
  'use strict';
  async function runStickerBridge() {
    if (location.origin !== 'https://web.whatsapp.com') {
      alert('Abre https://web.whatsapp.com, entra a tu chat de prueba y pulsa este marcador allí.');
      return;
    }
    const existing = document.getElementById('ss-local-bridge');
    if (existing) { existing.querySelector('input')?.focus(); return; }
    const panel = document.createElement('div');
    panel.id = 'ss-local-bridge';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Enviar sticker sonoro');
    Object.assign(panel.style,{position:'fixed',zIndex:'2147483647',top:'18px',right:'18px',width:'min(370px,calc(100vw - 36px))',padding:'18px',background:'#202c33',color:'#fff',border:'1px solid #46565e',borderRadius:'12px',boxShadow:'0 8px 30px #0006',font:'14px system-ui,sans-serif',display:'grid',gap:'10px'});
    const add = (tag, text) => { const el=document.createElement(tag); if(text) el.textContent=text; panel.append(el); return el; };
    add('strong','Stickers Sonoros · puente v2 experimental');
    add('span','Abre tu propio chat para la primera prueba. Selecciona el paquete .sonoro.json que exportaste desde el editor.');
    const input = add('input'); input.type='file'; input.accept='.json,application/json';
    const status = add('p','No se enviará nada hasta que confirmes.');
    status.setAttribute('role','status');
    status.style.whiteSpace='pre-wrap';
    const compatibility = add('label');
    compatibility.style.display='flex';
    compatibility.style.gap='8px';
    const opt = document.createElement('input');
    opt.type='checkbox'; opt.id='ss-experimental';
    compatibility.append(opt,document.createTextNode('Probar compatibilidad experimental en esta pestaña (no oficial)'));
    compatibility.hidden=true; compatibility.style.display='none';
    const send = add('button','Confirmar y enviar al chat abierto'); send.disabled=true;
    const close = add('button','Cerrar');
    for(const button of [send,close]) Object.assign(button.style,{padding:'9px',border:'1px solid #52646d',borderRadius:'7px',background:'#2a3942',color:'#fff',cursor:'pointer'});
    document.body.append(panel);
    let data, sending=false;
    close.onclick=()=>{if(!sending)panel.remove();};
    const msg=(s)=>{status.textContent=s;};
    function ns(name) {
      if(typeof window.importNamespace==='function') { try {const m=window.importNamespace(name);if(m)return m;}catch{} }
      if(typeof window.require!=='function') throw Error('Los módulos de WhatsApp Web no están disponibles. Comprueba que tu sesión esté abierta.');
      return window.require(name);
    }
    const def=name=>{const m=ns(name);return m?.default??m;};
    const b64=bytes=>btoa(String.fromCharCode(...bytes));
    const hash=async bytes=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
    const read=(b,i,n)=>String.fromCharCode(...b.subarray(i,i+n));
    function decode(value) {
      if(typeof value!=='string'||value.length>1333336||! /^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error('Paquete inválido.');
      const raw=atob(value);
      if(!raw.length||raw.length>1000000)throw Error('El archivo supera 1 MB o está vacío.');
      return Uint8Array.from(raw,c=>c.charCodeAt(0));
    }
    async function validate(file) {
      if(!file||file.size>3000000)throw Error('Selecciona un paquete de hasta 3 MB.');
      const p=JSON.parse(await file.text());
      if(p.format!=='stickers-sonoros/1')throw Error('Paquete no reconocido.');
      const webp=decode(p.webp),ogg=decode(p.ogg);
      if(read(webp,0,4)!=='RIFF'||read(webp,8,4)!=='WEBP'||read(ogg,0,4)!=='OggS'||!new TextDecoder().decode(ogg.subarray(0,256)).includes('OpusHead'))throw Error('WebP u Ogg/Opus inválido.');
      const digest=await hash(ogg), view=new DataView(webp.buffer);
      let linked=false,side=0,animated=false;
      if(view.getUint32(4,true)+8!==webp.length)throw Error('WebP incompleto.');
      for(let i=12;i+8<=webp.length;){
        const tag=read(webp,i,4),n=view.getUint32(i+4,true),end=i+8+n;
        if(end>webp.length)throw Error('WebP incompleto.');
        if(tag==='VP8X'&&n>=10){
          const x=webp[i+12]|webp[i+13]<<8|webp[i+14]<<16;
          const y=webp[i+15]|webp[i+16]<<8|webp[i+17]<<16;
          if(x!==y||x+1>512)throw Error('El sticker debe ser cuadrado y de hasta 512 px.');
          side=x+1; animated=!!(webp[i+8]&2);
        }
        if(tag==='EXIF'){
          const meta=new TextDecoder().decode(webp.subarray(i+8,end));
          linked=meta.includes('"sound-sha256"')&&meta.includes(digest);
        }
        i=end+(n%2);
      }
      if(!linked||digest!==p.info?.soundSha256||!side||side!==p.info.lado||animated!==p.info.isAnimated)throw Error('El contenido del sticker no coincide con sus metadatos.');
      const seconds=p.info.segundosAudio;
      if(!Number.isInteger(seconds)||seconds<1||seconds>10)throw Error('Duración de audio no válida.');
      return {webp:new Blob([webp],{type:'image/webp'}),ogg:new Blob([ogg],{type:'audio/ogg; codecs=opus'}),side,animated,seconds,digest};
    }
    function enableTemporaryCompatibility() {
      // Mirror Shirtep's local UI feature switches only; no persistent settings or credentials.
      const restore=[];
      function patch(obj,key,fn) {
        const original=Object.getOwnPropertyDescriptor(obj,key);
        if(typeof obj[key]!=='function')return;
        try {
          Object.defineProperty(obj,key,{value:fn,writable:true,configurable:true,enumerable:original?.enumerable??true});
          restore.push(()=>{if(original)Object.defineProperty(obj,key,original);else delete obj[key];});
        } catch {}
      }
      function reset(){for(const undo of restore.reverse()){try{undo();}catch{}}restore.length=0;}
      const gate=ns('WAWebSoundStickerGating');
      try {
        try {
          const ab=ns('WAWebABProps'),original=ab.getABPropConfigValue;
          const flags=new Set(['sound_stickers_consumption_enabled','sound_stickers_creation_enabled','sound_stickers_audio_playing_enabled']);
          if(typeof original==='function')patch(ab,'getABPropConfigValue',function(key){return flags.has(key)?true:original.apply(this,arguments);});
        }catch{}
        if(gate.isSoundStickerCreationEnabled()!==true){
          for(const key of ['isSoundStickerCreationEnabled','isSoundStickerConsumptionEnabled','isSoundStickerPlaybackEnabled'])patch(gate,key,()=>true);
        }
        if(gate.isSoundStickerCreationEnabled()!==true)throw Error('Esta versión de WhatsApp no admite la compatibilidad temporal.');
        return reset;
      }catch(e){reset();throw e;}
    }
    function activeChat(){return ns('WAWebChatCollection').ChatCollection.getActive()||null;}
    function name(chat){return String(chat.formattedTitle||chat.name||'chat abierto').slice(0,100);}
    function asB64(v){
      if(typeof v==='string')return v;
      if(v instanceof ArrayBuffer)return b64(new Uint8Array(v));
      if(ArrayBuffer.isView(v))return b64(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));
      throw Error('WhatsApp devolvió datos de subida incompatibles.');
    }
    input.onchange=async()=>{
      data=undefined;send.disabled=true;msg('Verificando paquete…');
      try{
        const file=input.files[0];
        if(!file){msg('Selecciona un paquete.');return;}
        const loaded=await validate(file);
        if(input.files[0]!==file)return;
        data=loaded;send.disabled=false;
        msg('Paquete verificado: '+data.side+' px, '+data.seconds+' s de audio. Confirma el chat antes de enviar.');
      }catch(e){msg(e.message||'Paquete no válido.');}
    };
    send.onclick=async()=>{
      if(!data||sending)return;
      let chat,restoreCompatibility;
      try{
        chat=activeChat();
        if(!chat)throw Error('Abre primero un chat de WhatsApp.');
        const gate=ns('WAWebSoundStickerGating');
        const unavailable=gate.isSoundStickerCreationEnabled()!==true;
        if(unavailable&&!opt.checked){
          compatibility.hidden=false; compatibility.style.display='flex';
          throw Error('La creación sonora no está habilitada. Puedes marcar la compatibilidad experimental para probar el mecanismo local de Shirtep.');
        }
        if(!confirm('¿Enviar un sticker con sonido al chat «'+name(chat)+'»?'+(unavailable?' Se probarán opciones experimentales locales, que se restaurarán al terminar. WhatsApp puede rechazar el mensaje.':'')))return;
        if(activeChat()!==chat)throw Error('El chat ha cambiado. Confirma de nuevo.');
        if(unavailable)restoreCompatibility=enableTemporaryCompatibility();
      }catch(e){restoreCompatibility?.();msg(e.message);return;}
      sending=true;input.disabled=true;send.disabled=true;close.disabled=true;
      let attempted=false;
      try{
        msg('Subiendo y cifrando el audio mediante WhatsApp…');
        const mt=ns('WAWebMmsMediaTypes').MEDIA_TYPES;
        let origin=1;try{origin=def('WAWebMediaGetUploadOriginForChat')(chat);}catch{}
        const params={blob:data.ogg,type:mt.AUDIO,signal:new AbortController().signal,uploadQpl:new Proxy({},{get:()=>()=>undefined}),uploadOrigin:origin,fileOrigin:undefined,userUploadAttemptCount:0,forwardedFromWeb:false,isViewOnce:false,isHdPhoto:false};
        let uploaded;
        try{uploaded=await def('WAWebUploadManagerMainThread').encryptAndUpload(params,def('WAWebCreateMediaUploadMetrics')(params));}
        catch{uploaded=await def('WAWebUploadManager').encryptAndUpload(params);}
        const stickerAudio={deprecatedMms3Url:uploaded.url||undefined,directPath:uploaded.directPath,mediaKey:asB64(uploaded.mediaKey),mediaKeyTimestamp:uploaded.mediaKeyTimestamp,filehash:data.digest,encFilehash:asB64(uploaded.encFilehash),size:data.ogg.size,mimetype:'audio/ogg; codecs=opus',duration:data.seconds};
        if(ns('WAWebSoundStickerUtils').isCompleteStickerAudio(stickerAudio)!==true)throw Error('WhatsApp rechazó los metadatos del audio.');
        if(activeChat()!==chat)throw Error('El chat cambió durante la subida. No se envió el sticker.');
        msg('Enviando sticker a «'+name(chat)+'»…');
        const opaque=await def('WAWebMediaOpaqueData').createFromData(data.webp,'image/webp');
        const MediaPrep=def('WAWebMediaPrep');
        const prep=new MediaPrep('sticker',Promise.resolve({type:'sticker',mediaBlob:opaque,mimetype:'image/webp',size:data.webp.size,fullWidth:data.side,fullHeight:data.side,isAnimated:data.animated,emojis:['🔊']}));
        if(activeChat()!==chat)throw Error('El chat cambió. No se envió el sticker.');
        attempted=true;
        const response=await prep.sendToChat({chat,options:{stickerAudio}});
        if(response?.messageSendResult!==ns('WAWebSendMsgResultAction').SendMsgResult.OK)throw Error('WhatsApp no confirmó el envío.');
        const sent=response.msg;
        if(!sent||!(sent.stickerAudio||sent.attributes?.stickerAudio))throw Error('El cliente no confirmó que el mensaje contiene audio.');
        msg('Sticker creado; esperando confirmación de WhatsApp…');
        const until=Date.now()+15000,ACK=ns('WAWebAck').ACK;
        while(Date.now()<until&&sent.ack<ACK.SENT&&sent.ack>=0)await new Promise(r=>setTimeout(r,300));
        if(sent.ack>=ACK.SENT){msg('WhatsApp confirmó el envío. Comprueba que el sticker tenga sonido en el chat.');}
        else {msg('El mensaje se creó, pero la confirmación no llegó o fue negativa. Revisa el chat antes de volver a enviar.');}
        data=undefined;
      }catch(e){
        msg((e.message||'Error del cliente WhatsApp')+(attempted?' Revisa el chat antes de volver a intentar.':' No se envió el sticker.'));
        if(attempted)data=undefined;
      }finally{
        restoreCompatibility?.(); opt.checked=false;
        sending=false;input.disabled=false;close.disabled=false;send.disabled=!data;
      }
    };
  }
  window.StickersSonorosBridge = {
    bookmarklet: () => 'javascript:'+encodeURIComponent('void('+runStickerBridge.toString()+')()')
  };
})();
