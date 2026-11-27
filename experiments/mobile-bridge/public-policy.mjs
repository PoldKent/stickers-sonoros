import {createHash} from 'node:crypto';
import {phoneNumber} from './web-policy.mjs';
export const CAPACITY=2,PAIR_MS=120000,WINDOW_MS=600000;
const digest=t=>createHash('sha256').update(t).digest('hex');
export const tokenKey=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t)?digest(t):null;
export function ownJid(id,phone){
 const m=typeof id==='string'&&id.match(/^([1-9][0-9]{7,14})(?::[0-9]+)?@s\.whatsapp\.net$/);
 if(!m||!phoneNumber(phone)||m[1]!==phone)throw Error('identity');
 return m[1]+'@s.whatsapp.net';
}
export function limiter(){let starts=[],phones=new Map();return (phone,now=Date.now())=>{
 starts=starts.filter(t=>now-t<WINDOW_MS);
 for(const [k,t] of phones)if(now-t>=WINDOW_MS)phones.delete(k);
 const k=digest(phone);if(starts.length>=6||phones.has(k))return false;
 starts.push(now);phones.set(k,now);return true;
}}
export function sessionStore(){const map=new Map();return {
 get(t){const k=tokenKey(t);return k?map.get(k):undefined},
 add(t,v){const k=tokenKey(t);if(!k||map.has(k)||map.size>=CAPACITY)return false;map.set(k,v);return true},
 remove(t,v){const k=tokenKey(t);if(k&&map.get(k)===v)map.delete(k)},
 values:()=>[...map.values()],size:()=>map.size
}}
