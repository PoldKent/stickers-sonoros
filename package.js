/* Shared browser package validation: native binary, text and cryptographic APIs. */
(() => {
'use strict';
async function validatePackage(file) {
  const fail=code=>{throw Error(code)};
  const MAX_BYTES=1000000,MAX_JSON=1400000;
  if(!file||typeof file.text!=='function')fail('invalid');
  if(file.size>MAX_JSON)fail('large');
  const tag=(b,i,n)=>String.fromCharCode(...b.subarray(i,i+n));
  function decode(s){
    if(typeof s!=='string'||!s.length||s.length>MAX_JSON||s.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))fail('invalid');
    const raw=atob(s);if(btoa(raw)!==s)fail('invalid');
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  let p,w,a;
  try{p=JSON.parse(await file.text());if(p?.format!=='stickers-sonoros/1')fail('invalid');w=decode(p.webp);a=decode(p.ogg)}catch{fail('invalid')}
  if(w.length+a.length>MAX_BYTES)fail('large');
  if(w.length<30||a.length<28||tag(w,0,4)!=='RIFF'||tag(w,8,4)!=='WEBP'||tag(a,0,4)!=='OggS'||!new TextDecoder().decode(a.subarray(0,256)).includes('OpusHead'))fail('invalid');
  const d=new DataView(w.buffer),digest=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',a))));
  let side=0,frames=0,animated=false,meta,durationMs=0,i=12;
  const u24=b=>w[b]+256*w[b+1]+65536*w[b+2];
  if(d.getUint32(4,true)+8!==w.length)fail('invalid');
  for(;i+8<=w.length;){
    const k=tag(w,i,4),n=d.getUint32(i+4,true),b=i+8,end=b+n;
    if(end+(n&1)>w.length)fail('invalid');
    if(k==='VP8X'){
      if(n!==10||side)fail('invalid');
      side=u24(b+4)+1;if(side!==u24(b+7)+1||side>512)fail('invalid');animated=!!(w[b]&2);
    }
    if(k==='ANMF'){if(n<16)fail('invalid');frames++;durationMs+=u24(b+12)}
    if(k==='EXIF'){
      if(meta||n<26)fail('invalid');
      const v=new DataView(w.buffer,b,n);
      if(v.getUint32(0)!==0x4d4d002a||v.getUint32(4)!==8||v.getUint16(8)!==1||v.getUint16(10)!==0x5741||v.getUint16(12)!==7||v.getUint32(18)!==26||v.getUint32(14)+26!==n)fail('invalid');
      try{meta=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(w.subarray(b+26,end)))}catch{fail('invalid')}
    }
    i=end+(n&1);
  }
  const info=p.info;
  if(i!==w.length||!side||!meta||meta['sound-sha256']!==digest||info?.soundSha256!==digest||info.lado!==side||info.isAnimated!==animated||!Number.isSafeInteger(info.segundosAudio)||info.segundosAudio<1||animated&&frames<1||!animated&&frames>0||frames>1&&(!durationMs||frames*1000/durationMs<9-.01))fail('invalid');
  return {file,webp:new Blob([w],{type:'image/webp'}),ogg:new Blob([a],{type:'audio/ogg; codecs=opus'}),side,animated,frames:Math.max(1,frames),durationMs,seconds:info.segundosAudio,digest,meta,info};
}
window.SonoroPackage=Object.freeze({validate:validatePackage});
})();
