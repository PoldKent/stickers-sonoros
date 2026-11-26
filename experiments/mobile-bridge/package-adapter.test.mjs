import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preparePackage} from './package-adapter.mjs';
function chunk(tag,b){const h=Buffer.alloc(8);h.write(tag);h.writeUInt32LE(b.length,4);return Buffer.concat([h,b,Buffer.alloc(b.length%2)])}
function fixture(){
  const a=Buffer.alloc(64);a.write('OggS');a.write('OpusHead',28);const digest=createHash('sha256').update(a).digest('base64');
  const v=Buffer.alloc(10);v[0]=10;v.writeUIntLE(127,4,3);v.writeUIntLE(127,7,3);
  const m=Buffer.from(JSON.stringify({'sound-sha256':digest,'sticker-pack-name':'Creado en Stickers Sonoros'}));
  const e=Buffer.alloc(26);e.writeUInt32BE(0x4d4d002a);e.writeUInt32BE(8,4);e.writeUInt16BE(1,8);e.writeUInt16BE(0x5741,10);e.writeUInt16BE(7,12);e.writeUInt32BE(m.length,14);e.writeUInt32BE(26,18);
  const frame=Buffer.alloc(16);frame.writeUIntLE(100,12,3);
  const body=Buffer.concat([Buffer.from('WEBP'),chunk('VP8X',v),chunk('ANMF',frame),chunk('ANMF',frame),chunk('EXIF',Buffer.concat([e,m]))]);
  const h=Buffer.alloc(8);h.write('RIFF');h.writeUInt32LE(body.length,4);
  return {format:'stickers-sonoros/1',webp:Buffer.concat([h,body]).toString('base64'),ogg:a.toString('base64'),info:{lado:128,isAnimated:true,segundosAudio:1,soundSha256:digest}};
}
test('preserves original payload bytes and dimensions (structural fixture only)',()=>{const p=fixture(),r=preparePackage(JSON.stringify(p));assert.deepEqual(r.webpBuffer,Buffer.from(p.webp,'base64'));assert.deepEqual(r.audioBuffer,Buffer.from(p.ogg,'base64'));assert.equal(r.width,128);assert.equal(r.audioSeconds,1)});
test('rejects wrong digest, malformed Base64 and oversized envelope',()=>{const p=fixture();assert.throws(()=>preparePackage(JSON.stringify({...p,info:{...p.info,soundSha256:'bad'}})),/linkage/);assert.throws(()=>preparePackage(JSON.stringify({...p,webp:'!!!'})),/Base64/);assert.throws(()=>preparePackage(Buffer.alloc(2800001)),/budget/)});
