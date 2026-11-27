/* Adaptación no comercial del flujo de envío de Shirtep/WA-audio-stickers,
 * commit 25f790945134f395c4bed4f0deea380ac3a2b778, extension/src/wa.js.
 * Licencia PolyForm Noncommercial 1.0.0: vendor/shirtep/LICENSE.md.
 * El marcador funciona dentro de WhatsApp Web; no carga código remoto,
 * no lee credenciales ni historial y solo envía tras confirmación explícita.
 */
(function () {
  'use strict';
  async function runStickerBridge(language,validatePackage) {
    const t = (es,en) => language==='en' ? en : es;
    if (location.origin !== 'https://web.whatsapp.com') {
      alert(t('Abre https://web.whatsapp.com, entra a tu chat de prueba y pulsa este marcador allí.',"Open https://web.whatsapp.com, enter a chat and click this bookmark there."));
      return;
    }
    const existing = document.getElementById('ss-local-bridge');
    if (existing) { existing.querySelector('input')?.focus(); return; }
    const panel = document.createElement('div');
    panel.id = 'ss-local-bridge';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label',t('Enviar sticker sonoro',"Send sound sticker"));
    Object.assign(panel.style,{maxHeight:'calc(100dvh - 36px)',overflowY:'auto',position:'fixed',zIndex:'2147483647',top:'18px',right:'18px',width:'min(370px,calc(100vw - 36px))',padding:'18px',background:'#202c33',color:'#fff',border:'1px solid #46565e',borderRadius:'12px',boxShadow:'0 8px 30px #0006',font:'14px system-ui,sans-serif',display:'grid',gap:'10px'});
    const add = (tag, text) => { const el=document.createElement(tag); if(text) el.textContent=text; panel.append(el); return el; };
    add('strong',t('Stickers Sonoros · Enviar a WhatsApp',"Stickers Sonoros · Send to WhatsApp"));
    add('span',t('Abre el chat de la persona a la que quieres enviar el sticker. Selecciona el archivo que guardaste en Stickers Sonoros.',"Open the recipient's chat. Choose the file you saved in Stickers Sonoros."));
    const input = add('input'); input.type='file'; input.accept='.json,application/json';
    const status = add('p',t('Selecciona tu sticker para continuar.',"Choose your sticker to continue."));
    status.setAttribute('role','status');
    status.style.whiteSpace='pre-wrap';
    const send = add('button',t('Enviar sticker con sonido',"Send sticker with sound")); send.disabled=true;
    const close = add('button',t('Cerrar',"Close"));
    for(const button of [send,close]) Object.assign(button.style,{padding:'9px',border:'1px solid #52646d',borderRadius:'7px',background:'#2a3942',color:'#fff',cursor:'pointer'});
    document.body.append(panel);
    let data, sending=false;
    close.onclick=()=>{if(!sending)panel.remove();};
    const msg=(s)=>{status.textContent=s;};
    function ns(name) {
      if(typeof window.importNamespace==='function') { try {const m=window.importNamespace(name);if(m)return m;}catch{} }
      if(typeof window.require!=='function') throw Error(t('No se pudo conectar con WhatsApp Web. Comprueba que tu sesión esté abierta.',"Could not connect to WhatsApp Web. Make sure you are signed in."));
      return window.require(name);
    }
    const def=name=>{const m=ns(name);return m?.default??m;};
    const b64=bytes=>btoa(String.fromCharCode(...bytes));
    async function validate(file){
      try{return await validatePackage(file)}
      catch(e){throw Error(e.message==='large'?t('El sticker y su audio superan 1 MB.','The sticker and its audio exceed 1 MB.'):t('El archivo del sticker está dañado. Vuelve a guardarlo desde la aplicación.','The sticker file is damaged. Save it again from the editor.'))}
    }
    function activeChat(){return ns('WAWebChatCollection').ChatCollection.getActive()||null;}
    function name(chat){return String(chat.formattedTitle||chat.name||t('chat abierto',"open chat")).slice(0,100);}
    function asB64(v){
      if(typeof v==='string')return v;
      if(v instanceof ArrayBuffer)return b64(new Uint8Array(v));
      if(ArrayBuffer.isView(v))return b64(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));
      throw Error(t('WhatsApp devolvió datos de subida incompatibles.',"WhatsApp returned incompatible upload data."));
    }
    input.onchange=async()=>{
      data=undefined;send.disabled=true;msg(t('Preparando tu sticker…',"Preparing your sticker…"));
      try{
        const file=input.files[0];
        if(!file){msg(t('Selecciona el archivo de tu sticker.',"Choose your sticker file."));return;}
        const loaded=await validate(file);
        if(input.files[0]!==file)return;
        data=loaded;send.disabled=false;
        msg(t('Sticker listo · ',"Sticker ready · ")+data.seconds+t(' s de sonido. Pulsa Enviar y confirma el destinatario.'," s of sound. Click Send and confirm the recipient."));
      }catch(e){msg(e.message||t('Paquete no válido.',"Invalid package."));}
    };
    send.onclick=async()=>{
      if(!data||sending)return;
      let chat;
      try{
        chat=activeChat();
        if(!chat)throw Error(t('Abre primero un chat de WhatsApp.',"Open a WhatsApp chat first."));
        const gate=ns('WAWebSoundStickerGating');
        if(gate.isSoundStickerCreationEnabled()!==true)throw Error(t('El sonido no está habilitado en esta sesión. Utiliza Enviar a mi WhatsApp.','Sound is not enabled in this session. Use Send to my WhatsApp.'));
        if(!confirm(t('¿Enviar un sticker con sonido al chat «',"Send a sound sticker to chat «")+name(chat)+'»?'))return;
        if(activeChat()!==chat)throw Error(t('El chat ha cambiado. Confirma de nuevo.',"The chat changed. Confirm again."));
      }catch(e){msg(e.message);return;}
      sending=true;input.disabled=true;send.disabled=true;close.disabled=true;
      let attempted=false;
      try{
        msg(t('Preparando el sonido para enviarlo…',"Preparing sound to send…"));
        const mt=ns('WAWebMmsMediaTypes').MEDIA_TYPES;
        let origin=1;try{origin=def('WAWebMediaGetUploadOriginForChat')(chat);}catch{}
        const params={blob:data.ogg,type:mt.AUDIO,signal:new AbortController().signal,uploadQpl:new Proxy({},{get:()=>()=>undefined}),uploadOrigin:origin,fileOrigin:undefined,userUploadAttemptCount:0,forwardedFromWeb:false,isViewOnce:false,isHdPhoto:false};
        let uploaded;
        try{uploaded=await def('WAWebUploadManagerMainThread').encryptAndUpload(params,def('WAWebCreateMediaUploadMetrics')(params));}
        catch{uploaded=await def('WAWebUploadManager').encryptAndUpload(params);}
        const stickerAudio={deprecatedMms3Url:uploaded.url||undefined,directPath:uploaded.directPath,mediaKey:asB64(uploaded.mediaKey),mediaKeyTimestamp:uploaded.mediaKeyTimestamp,filehash:data.digest,encFilehash:asB64(uploaded.encFilehash),size:data.ogg.size,mimetype:'audio/ogg; codecs=opus',duration:data.seconds};
        if(ns('WAWebSoundStickerUtils').isCompleteStickerAudio(stickerAudio)!==true)throw Error(t('WhatsApp no pudo aceptar el sonido del sticker.',"WhatsApp could not accept the sticker sound."));
        if(activeChat()!==chat)throw Error(t('El chat cambió durante la subida. No se envió el sticker.',"The chat changed during upload. The sticker was not sent."));
        msg(t('Enviando sticker a «',"Sending sticker to «")+name(chat)+'»…');
        const opaque=await def('WAWebMediaOpaqueData').createFromData(data.webp,'image/webp');
        const MediaPrep=def('WAWebMediaPrep');
        const prep=new MediaPrep('sticker',Promise.resolve({type:'sticker',mediaBlob:opaque,mimetype:'image/webp',size:data.webp.size,fullWidth:data.side,fullHeight:data.side,isAnimated:data.animated,emojis:['🔊']}));
        if(activeChat()!==chat)throw Error(t('El chat cambió. No se envió el sticker.',"The chat changed. The sticker was not sent."));
        attempted=true;
        const response=await prep.sendToChat({chat,options:{stickerAudio}});
        if(response?.messageSendResult!==ns('WAWebSendMsgResultAction').SendMsgResult.OK)throw Error(t('WhatsApp no confirmó el envío.',"WhatsApp did not confirm the send."));
        const sent=response.msg;
        if(!sent||!(sent.stickerAudio||sent.attributes?.stickerAudio))throw Error(t('El cliente no confirmó que el mensaje contiene audio.',"The client did not confirm the message contains audio."));
        msg(t('Sticker enviado. Comprobando la entrega…',"Sticker sent. Checking confirmation…"));
        const until=Date.now()+15000,ACK=ns('WAWebAck').ACK;
        while(Date.now()<until&&sent.ack<ACK.SENT&&sent.ack>=0)await new Promise(r=>setTimeout(r,300));
        if(sent.ack>=ACK.SENT){msg(t('WhatsApp confirmó el envío. ¡Tu sticker con sonido está en el chat!',"WhatsApp confirmed the send. Your sound sticker is in the chat!"));}
        else {msg(t('El mensaje se creó, pero la confirmación no llegó o fue negativa. Revisa el chat antes de volver a enviar.',"The message was created but confirmation was missing or negative. Check the chat before retrying."));}
        data=undefined;
      }catch(e){
        msg((e.message||t('Error del cliente WhatsApp',"WhatsApp client error")) + (attempted?t(' Revisa el chat antes de volver a intentar.'," Check the chat before retrying."):t(' No se envió el sticker.'," The sticker was not sent.")));
        if(attempted)data=undefined;
      }finally{
        sending=false;input.disabled=false;close.disabled=false;send.disabled=!data;
      }
    };
  }
  window.StickersSonorosBridge = {
    bookmarklet: (language='es') => 'javascript:'+encodeURIComponent('void('+runStickerBridge.toString()+')('+JSON.stringify(language==='en'?'en':'es')+','+window.SonoroPackage.validate.toString()+')')
  };
})();
