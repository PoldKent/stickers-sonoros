// Offline adapter for a future explicitly authorized linked-device transport.
// No network, credentials, session management or automatic sending.
import { createHash } from 'node:crypto';
export const MAX_MEDIA_BYTES=1_000_000;
export const MAX_JSON_BYTES=1_400_000;
const hash=b=>createHash('sha256').update(b).digest('base64');
const bad=message=>{throw new Error(message)};
function decode(s){
  if(typeof s!=='string'||!s.length||s.length>MAX_JSON_BYTES||s.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))bad('Invalid Base64');
  const b=Buffer.from(s,'base64');
  if(b.toString('base64')!==s)bad('Noncanonical Base64');
  return b;
}
export function preparePackage(input){
  const raw=Buffer.isBuffer(input)?input:Buffer.from(input);
  if(raw.length>MAX_JSON_BYTES)bad('JSON exceeds size budget');
  const p=JSON.parse(raw.toString('utf8'));
  if(p?.format!=='stickers-sonoros/1')bad('Unknown package');
  const webp=decode(p.webp),ogg=decode(p.ogg);
  if(webp.length+ogg.length>MAX_MEDIA_BYTES)bad('Media exceeds 1 MB');
  if(webp.length<30||webp.toString('ascii',0,4)!=='RIFF'||webp.toString('ascii',8,12)!=='WEBP'||webp.readUInt32LE(4)+8!==webp.length)bad('Invalid WebP');
  if(ogg.length<28||ogg.toString('ascii',0,4)!=='OggS'||!ogg.subarray(0,256).includes(Buffer.from('OpusHead')))bad('Invalid Ogg/Opus');
  let side=0,animated=false,meta,frames=0,ms=0,i=12;
  for(;i+8<=webp.length;){
    const tag=webp.toString('ascii',i,i+4),n=webp.readUInt32LE(i+4),b=i+8,end=b+n;
    if(end+(n&1)>webp.length)bad('Truncated WebP chunk');
    if(tag==='VP8X'){
      if(n!==10||side)bad('Invalid VP8X');
      side=webp.readUIntLE(b+4,3)+1;
      if(side!==webp.readUIntLE(b+7,3)+1||side>512)bad('Invalid dimensions');
      animated=!!(webp[b]&2);
    }
    if(tag==='ANMF'){if(n<16)bad('Invalid animation frame');frames++;ms+=webp.readUIntLE(b+12,3);}
    if(tag==='EXIF'){
      if(meta||n<26||webp.readUInt32BE(b)!==0x4d4d002a||webp.readUInt32BE(b+4)!==8||webp.readUInt16BE(b+8)!==1||webp.readUInt16BE(b+10)!==0x5741||webp.readUInt16BE(b+12)!==7||webp.readUInt32BE(b+18)!==26||webp.readUInt32BE(b+14)+26!==n)bad('Invalid EXIF');
      meta=JSON.parse(webp.toString('utf8',b+26,end));
    }
    i=end+(n&1);
  }
  const digest=hash(ogg),info=p.info;
  if(i!==webp.length||!side||!meta||meta['sound-sha256']!==digest||info?.soundSha256!==digest||info.lado!==side||info.isAnimated!==animated||!Number.isSafeInteger(info.segundosAudio)||info.segundosAudio<1)bad('Invalid sticker linkage or metadata');
  if(animated&&frames<1)bad('Missing animation frames');
  // A one-frame animated still may have a long hold. Motion requires >=9 encoded FPS.
  if(frames>1&&(!ms||frames*1000/ms<9-0.01))bad('Animation below 9 FPS');
  return {webpBuffer:webp,audioBuffer:ogg,width:side,height:side,isAnimated:animated,audioSeconds:info.segundosAudio,audioMimetype:'audio/ogg; codecs=opus',soundSha256:digest,exifMeta:meta,emojis:['🔊']};
}
