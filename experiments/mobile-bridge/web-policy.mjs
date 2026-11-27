import {timingSafeEqual,createHash} from 'node:crypto';
import {MAX_JSON_BYTES} from './package-adapter.mjs';
export const ORIGIN='https://poldkent.github.io';
export function authorized(header,secret){
  if(typeof header!=='string'||typeof secret!=='string'||secret.length<32)return false;
  const a=Buffer.from(header),b=Buffer.from('Bearer '+secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
export function phoneNumber(s){return typeof s==='string'&&/^[1-9][0-9]{7,14}$/.test(s)}
export const TIERS=Object.freeze({small:{maxSeconds:3,maxBytes:1000000,maxComponentBytes:499999},medium:{maxSeconds:15,maxBytes:1000000,maxComponentBytes:1000000},extended:{maxSeconds:60,maxBytes:2000000,maxComponentBytes:2000000}});
export const SESSION_MS=15*60*1000,MAX_SENDS=5,COOLDOWN_MS=5000;
export function trialPackage(p,tier='small'){
  const t=Object.hasOwn(TIERS,tier)?TIERS[tier]:null;
  if(!t||!Number.isSafeInteger(p.audioSeconds)||p.audioSeconds<1||p.audioSeconds>t.maxSeconds||p.webpBuffer.length<1||p.audioBuffer.length<1||p.webpBuffer.length>t.maxComponentBytes||p.audioBuffer.length>t.maxComponentBytes||p.webpBuffer.length+p.audioBuffer.length>t.maxBytes)throw Error('trial-limit');
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
