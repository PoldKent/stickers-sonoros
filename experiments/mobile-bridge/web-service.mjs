// Publicly accessible, individually private self-send sessions. No shared key or fixed account.
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import makeWASocket,{useMultiFileAuthState,DisconnectReason,proto,Browsers} from '@whiskeysockets/baileys';
import {sendSoundSticker,installSoundStickerCodec} from 'wa-sound-sticker';
import pino from 'pino';
import {preparePackage} from './package-adapter.mjs';
import {ORIGIN,phoneNumber,trialPackage,readPackage,newBudget,claim,checkDecodedAudio,MAX_SENDS,SESSION_MS} from './web-policy.mjs';
import {CAPACITY,PAIR_MS,tokenKey,ownJid,limiter,sessionStore} from './public-policy.mjs';
const VERSION='2026.11.27.49',siteKey=process.env.TURNSTILE_SITE_KEY,secret=process.env.TURNSTILE_SECRET_KEY;
const enabled=process.env.PUBLIC_BRIDGE_ENABLED==='true'&&Boolean(siteKey&&secret);
const logger=pino({level:'silent'}),store=sessionStore(),take=limiter();
let pending=0;
const snapshot=s=>({version:VERSION,phase:s.phase,remaining:Math.max(0,MAX_SENDS-s.budget.attempts),pairingCode:s.phase==='pairing'&&Date.now()<s.codeUntil?s.code:undefined});
function reply(res,n,data){res.writeHead(n,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(data))}
async function close(s,phase='closed'){
 if(s.closed)return;s.closed=true;s.phase=phase;s.code='';clearTimeout(s.timer);
 try{if(s.auth?.state?.creds?.registered&&s.sock){let t;try{await Promise.race([s.sock.logout(),new Promise(resolve=>{t=setTimeout(resolve,3000)})])}finally{clearTimeout(t)}}}catch{}
 try{s.sock?.end(undefined)}catch{}
 await s.saving.catch(()=>{});if(s.folder)await rm(s.folder,{recursive:true,force:true}).catch(()=>{});
 s.phone='';s.recipient='';s.auth=null;s.sock=null;store.remove(s.token,s);s.token='';
}
installSoundStickerCodec(proto);
async function connect(s){
 if(s.closed)return;
 const sock=makeWASocket({auth:s.auth.state,logger,browser:Browsers.windows('Chrome'),syncFullHistory:false,shouldSyncHistoryMessage:()=>false,fireInitQueries:false,markOnlineOnConnect:false});
 s.sock=sock;
 sock.ev.on('creds.update',()=>{if(!s.closed&&s.sock===sock)s.saving=s.saving.then(()=>s.closed?undefined:s.auth.saveCreds()).catch(()=>{void close(s,'failed')})});
 sock.ev.on('connection.update',async u=>{
  if(s.closed||s.sock!==sock)return;
  try{
   if(u.qr&&!s.requested&&!s.auth.state.creds.registered){
    s.requested=true;const c=await sock.requestPairingCode(s.phone);
    if(s.closed||s.sock!==sock||s.phase==='ready')return;
    s.code=c;s.codeUntil=Date.now()+PAIR_MS;s.phase='pairing';
   }
   if(u.connection==='open'&&['connecting','pairing'].includes(s.phase)){
    if(!s.auth.state.creds.registered)throw Error('identity');
    s.recipient=ownJid(sock.user?.id,s.phone);s.code='';s.phase='ready';
    clearTimeout(s.timer);s.timer=setTimeout(()=>void close(s,s.phase==='sending'?'uncertain':'closed'),SESSION_MS);
   }
   if(u.connection==='close'){
    const n=u.lastDisconnect?.error?.output?.statusCode;
    if(n===DisconnectReason.restartRequired&&s.restarts++<2&&['connecting','pairing'].includes(s.phase)){s.code='';s.phase='connecting';await s.saving;await connect(s)}
    else await close(s,s.phase==='sending'?'uncertain':'failed');
   }
  }catch{await close(s,s.phase==='sending'?'uncertain':'failed')}
 });
}
async function start(s){
 s.timer=setTimeout(()=>void close(s,'closed'),PAIR_MS);
 try{const dir=await mkdtemp(join(tmpdir(),'sonoro-session-'));if(s.closed){await rm(dir,{recursive:true,force:true});return}
 s.folder=dir;s.auth=await useMultiFileAuthState(dir);if(!s.closed)await connect(s);
 }catch{await close(s,'failed')}
}
async function captcha(value){
 if(typeof value!=='string'||!value.length||value.length>2048)return false;
 try{const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret,response:value}),signal:AbortSignal.timeout(8000)});const x=await res.json();return res.ok&&x.success===true&&x.hostname==='poldkent.github.io'&&x.action==='sonoro_link'}catch{return false}
}
async function smallBody(req){
 if(req.headers['content-type']!=='application/json')throw Error('type');
 let n=0,parts=[];for await(const b of req){n+=b.length;if(n>8192)throw Error('size');parts.push(b)}
 return JSON.parse(Buffer.concat(parts).toString());
}
function decodeAudio(p){return new Promise((resolve,reject)=>{
 const child=spawn('ffmpeg',['-v','error','-xerror','-nostats','-progress','pipe:1','-f','ogg','-i','pipe:0','-map','0:a:0','-f','null','-'],{stdio:['pipe','pipe','ignore']});
 let output='',overflow=false;
 const timer=setTimeout(()=>{overflow=true;child.kill('SIGKILL')},30000);
 child.stdout.on('data',b=>{if(overflow)return;output+=b.toString();if(output.length>262144){overflow=true;child.kill('SIGKILL')}});
 child.stdin.on('error',()=>{});child.on('error',()=>{clearTimeout(timer);reject(Error('decode'))});
 child.on('close',code=>{clearTimeout(timer);try{if(code!==0||overflow)throw Error('decode');resolve(checkDecodedAudio(output,p.audioSeconds))}catch{reject(Error('decode'))}});
 child.stdin.end(p.audioBuffer);
})}
const server=createServer({requestTimeout:20000,headersTimeout:10000},async(req,res)=>{
 if(req.method==='GET'&&req.url==='/health')return reply(res,200,{ok:true,version:VERSION,publicEnabled:enabled});
 if(req.headers.origin!==ORIGIN)return reply(res,403,{error:'origin'});
 res.setHeader('Access-Control-Allow-Origin',ORIGIN);res.setHeader('Vary','Origin');
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Cache-Control':'no-store'});return res.end()}
 if(!req.url.startsWith('/v2/'))return reply(res,404,{error:'route'});
 if(req.method==='GET'&&req.url==='/v2/config')return reply(res,200,{version:VERSION,enabled,siteKey:enabled?siteKey:undefined});
 if(!enabled)return reply(res,503,{error:'disabled'});
 const token=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!tokenKey(token))return reply(res,401,{error:'session'});
 if(req.method==='POST'&&req.url==='/v2/connect'){
  const existing=store.get(token);if(existing)return reply(res,200,snapshot(existing));
  if(store.size()+pending>=CAPACITY)return reply(res,429,{error:'capacity'});
  pending++;
  try{
   const b=await smallBody(req);
   if(!phoneNumber(b.phone)||b.consent!==true)return reply(res,400,{error:'invalid'});
   if(!await captcha(b.challenge))return reply(res,403,{error:'challenge'});
   if(!take(b.phone))return reply(res,429,{error:'rate'});
   const s={token,phone:b.phone,phase:'connecting',closed:false,code:'',codeUntil:0,requested:false,restarts:0,budget:newBudget(),saving:Promise.resolve()};
   if(!store.add(token,s))return reply(res,429,{error:'capacity'});
   await start(s);return reply(res,200,snapshot(s));
  }catch{return reply(res,400,{error:'invalid'})}finally{pending--}
 }
 const s=store.get(token);if(!s||s.closed)return reply(res,410,{error:'expired'});
 if(req.method==='GET'&&req.url==='/v2/status')return reply(res,200,snapshot(s));
 if(req.method==='POST'&&req.url==='/v2/stop'){
  if(['sending','validating'].includes(s.phase))return reply(res,409,{error:'busy',...snapshot(s)});
  await close(s);return reply(res,200,snapshot(s));
 }
 if(req.method==='POST'&&req.url==='/v2/send'){
  if(s.phase!=='ready')return reply(res,409,{error:'not-ready',...snapshot(s)});
  if(req.headers['content-type']!=='application/json')return reply(res,415,{error:'type'});
  s.phase='validating';let p;
  try{p=trialPackage(preparePackage(await readPackage(req)));await decodeAudio(p);
   if(s.closed)return reply(res,410,{error:'expired'});
   if(ownJid(s.sock.user?.id,s.phone)!==s.recipient)throw Error('identity');
   claim(s.budget,p);
  }catch(e){if(!s.closed)s.phase='ready';return reply(res,422,{error:['trial-limit','duplicate','quota','cooldown','decode','size','identity'].includes(e.message)?e.message:'invalid-package',...snapshot(s)})}
  s.phase='sending';
  try{
   const result=await sendSoundSticker(s.sock,s.recipient,{...p,baileys:await import('@whiskeysockets/baileys'),logger});
   if(s.closed||result.hasAudio!==true)throw Error('uncertain');
   if(s.budget.attempts>=MAX_SENDS)await close(s);else s.phase='ready';
   return reply(res,200,{...snapshot(s),relayed:true,deliveryConfirmed:false});
  }catch{await close(s,'uncertain');return reply(res,502,{error:'uncertain',...snapshot(s)})}
 }
 return reply(res,404,{error:'route'});
});
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log(enabled?'Self-send bridge .49 enabled; no pairing started.':'Self-send bridge .49 disabled pending anti-abuse configuration.'));
process.once('SIGTERM',()=>void Promise.all(store.values().map(s=>close(s))).finally(()=>server.close()));
