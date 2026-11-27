import {createHash} from 'node:crypto';
import {MAX_JSON_BYTES,MAX_MEDIA_BYTES} from './package-adapter.mjs';
export const ORIGIN='https://poldkent.github.io';
export function phoneNumber(s){return typeof s==='string'&&/^[1-9][0-9]{7,14}$/.test(s)}

export const SESSION_MS=15*60*1000,MAX_SENDS=5,COOLDOWN_MS=5000;
export function trialPackage(p){
  if(!Number.isSafeInteger(p.audioSeconds)||p.audioSeconds<1||p.webpBuffer.length<1||p.audioBuffer.length<1||p.webpBuffer.length+p.audioBuffer.length>MAX_MEDIA_BYTES)throw Error('trial-limit');
  return p;
}
// A session records only media digests, never message bodies or credentials.
export function newBudget(){return {attempts:0,last:null,seen:new Set()}}
export function claim(b,p,now=Date.now()){
  if(b.attempts>=MAX_SENDS)throw Error('quota');
  if(b.last!==null&&now-b.last<COOLDOWN_MS)throw Error('cooldown');
  const digest=createHash('sha256').update(p.webpBuffer).update(p.audioBuffer).digest('hex');
  if(b.seen.has(digest))throw Error('duplicate');
  b.seen.add(digest);b.attempts++;b.last=now;
}
export async function readPackage(req){
  const size=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(size)||size<1||size>MAX_JSON_BYTES)throw Error('size');
  let n=0;const chunks=[];
  for await(const part of req){const b=Buffer.from(part);n+=b.length;if(n>size||n>MAX_JSON_BYTES)throw Error('size');chunks.push(b)}
  if(n!==size)throw Error('size');
  return Buffer.concat(chunks,n);
}

// FFmpeg decodes to a null sink; parse the final progress timestamp, not an untrusted declared duration.
export function checkDecodedAudio(progress,declared){
  if(typeof progress!=='string'||!Number.isSafeInteger(declared)||declared<1||!/^progress=end\r?$/m.test(progress))throw Error('decode');
  const times=[...progress.matchAll(/^out_time_us=(\d+)\r?$/gm)];
  const seconds=Number(times.at(-1)?.[1])/1e6;
  if(!Number.isFinite(seconds)||seconds<=0||Math.max(1,Math.round(seconds))!==declared)throw Error('decode');
  return seconds;
}
