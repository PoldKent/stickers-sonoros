import {timingSafeEqual} from 'node:crypto';
import {MAX_JSON_BYTES} from './package-adapter.mjs';
export const ORIGIN='https://poldkent.github.io';
export function authorized(header,secret){
  if(typeof header!=='string'||typeof secret!=='string'||secret.length<32)return false;
  const a=Buffer.from(header),b=Buffer.from('Bearer '+secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
export function phoneNumber(s){return typeof s==='string'&&/^[1-9][0-9]{7,14}$/.test(s)}
export function trialPackage(p){
  if(p.audioSeconds<1||p.audioSeconds>3||p.webpBuffer.length>=500000||p.audioBuffer.length>=500000)throw Error('trial-limit');
  return p;
}
export async function readPackage(req){
  const size=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(size)||size<1||size>MAX_JSON_BYTES)throw Error('size');
  let n=0;const chunks=[];
  for await(const part of req){const b=Buffer.from(part);n+=b.length;if(n>size||n>MAX_JSON_BYTES)throw Error('size');chunks.push(b)}
  if(n!==size)throw Error('size');
  return Buffer.concat(chunks,n);
}
