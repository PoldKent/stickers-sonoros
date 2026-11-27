// Private bounded mobile experiment. No inbox, public pairing, automatic retry or arbitrary recipient.
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import makeWASocket,{useMultiFileAuthState,DisconnectReason,proto,Browsers} from '@whiskeysockets/baileys';
import {sendSoundSticker,installSoundStickerCodec} from 'wa-sound-sticker';
import pino from 'pino';
import {preparePackage} from './package-adapter.mjs';
import {ORIGIN,authorized,phoneNumber,trialPackage,readPackage,TIERS,SESSION_MS,MAX_SENDS,COOLDOWN_MS,newBudget,claim,checkDecodedAudio} from './web-policy.mjs';
const secret=process.env.BRIDGE_TOKEN, pairNumber=process.env.BRIDGE_PAIR_NUMBER, receiver=process.env.BRIDGE_RECIPIENT_NUMBER;
const configured=Boolean(secret&&secret.length>=32&&phoneNumber(pairNumber)&&phoneNumber(receiver)&&pairNumber!==receiver);
const logger=pino({level:'silent'});
let session=null,lastPhase='idle',cleanup=null;
const active=s=>session===s&&!s.closed;
const status=()=>{const s=session;return {version:'2026.11.26.45',phase:s?.phase||lastPhase,pairingCode:s?.phase==='pairing'&&Date.now()<s.codeUntil?s.code:undefined,expiresAt:s?.expiresAt||null,remaining:s?MAX_SENDS-s.budget.attempts:0,cooldownMs:s?.budget.last===null?0:Math.max(0,COOLDOWN_MS-(Date.now()-(s?.budget.last||0))),tiers:TIERS};};
async function close(s,next='closed'){
  if(!active(s))return cleanup;
  s.closed=true;lastPhase=next;s.phase=next;s.code='';clearTimeout(s.timer);
  cleanup=(async()=>{try{s.sock?.end(undefined)}catch{}await s.saving.catch(()=>{});if(s.folder)await rm(s.folder,{recursive:true,force:true}).catch(()=>{});if(session===s)session=null;})();
  try{await cleanup}finally{cleanup=null}
}
installSoundStickerCodec(proto);
async function connect(s){
  if(!active(s))return;
  const sock=makeWASocket({auth:s.auth.state,logger,browser:Browsers.windows('Chrome'),syncFullHistory:false,markOnlineOnConnect:false});
  s.sock=sock;
  sock.ev.on('creds.update',()=>{if(active(s)&&s.sock===sock)s.saving=s.saving.then(()=>active(s)?s.auth.saveCreds():undefined).catch(()=>{void close(s,'failed')});});
  sock.ev.on('connection.update',async u=>{
    if(!active(s)||s.sock!==sock)return;
    try{
      if(u.qr&&!s.requested&&!s.auth.state.creds.registered){
        s.requested=true;
        const c=await sock.requestPairingCode(pairNumber);
        if(!active(s)||s.sock!==sock||s.phase==='ready')return;
        s.code=c;s.codeUntil=Date.now()+120000;s.phase='pairing';
      }
      if(u.connection==='open'&&['connecting','pairing'].includes(s.phase)){s.code='';s.phase='ready'}
      if(u.connection==='close'){
        const n=u.lastDisconnect?.error?.output?.statusCode;
        if(n===DisconnectReason.restartRequired&&s.restarts++<2&&['connecting','pairing'].includes(s.phase)){s.code='';s.phase='connecting';await s.saving;await connect(s);}
        else await close(s,s.phase==='sending'?'uncertain':'failed');
      }
    }catch{await close(s,s.phase==='sending'?'uncertain':'failed')}
  });
}
async function start(){
  if(session||cleanup)return;
  const s={phase:'connecting',closed:false,code:'',codeUntil:0,requested:false,restarts:0,budget:newBudget(),saving:Promise.resolve(),expiresAt:Date.now()+SESSION_MS};
  session=s;
  s.timer=setTimeout(()=>void close(s,s.phase==='sending'?'uncertain':'closed'),SESSION_MS);
  try{const folder=await mkdtemp(join(tmpdir(),'sonoro-web-'));if(!active(s)){await rm(folder,{recursive:true,force:true});return;}s.folder=folder;s.auth=await useMultiFileAuthState(folder);if(active(s))await connect(s);}catch{await close(s,'failed')}
}
function reply(res,n,data){res.writeHead(n,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(data))}
const server=createServer({requestTimeout:20000,headersTimeout:10000},async(req,res)=>{
  if(req.url==='/health'&&req.method==='GET')return reply(res,200,{ok:true,configured,version:'2026.11.26.45'});
  if(req.headers.origin!==ORIGIN)return reply(res,403,{error:'origin'});
  res.setHeader('Access-Control-Allow-Origin',ORIGIN);res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Bridge-Tier','Cache-Control':'no-store'});return res.end()}
  if(!configured)return reply(res,503,{error:'not-configured'});
  if(!authorized(req.headers.authorization,secret))return reply(res,401,{error:'auth'});
  if(req.method==='GET'&&req.url==='/v1/status')return reply(res,200,status());
  if(req.method==='POST'&&req.url==='/v1/connect'){await start();return reply(res,200,status())}
  if(req.method==='POST'&&req.url==='/v1/stop'){const s=session;if(s&&['sending','validating'].includes(s.phase))return reply(res,409,{error:'busy',...status()});if(s)await close(s);return reply(res,200,status())}
  if(req.method==='POST'&&req.url==='/v1/send'){
    const s=session;
    if(!s||!active(s)||s.phase!=='ready')return reply(res,409,{error:'not-ready',...status()});
    if(req.headers['content-type']!=='application/json')return reply(res,415,{error:'type'});
    s.phase='validating';
    let p;
    try{
      const tier=req.headers['x-bridge-tier']||'small';
      p=trialPackage(preparePackage(await readPackage(req)),tier);
      // Bound decoded PCM to at most 60.5 s; do not trust JSON-declared duration.
      const audio=spawnSync('ffmpeg',['-v','error','-xerror','-f','ogg','-i','pipe:0','-map','0:a:0','-t',String(TIERS[tier].maxSeconds+0.5),'-ac','1','-ar','48000','-f','s16le','pipe:1'],{input:p.audioBuffer,timeout:10000,maxBuffer:6_000_000});
      if(audio.status!==0)throw Error('decode');
      checkDecodedAudio(audio.stdout.length,p.audioSeconds,tier);
      if(!active(s)||s.phase!=='validating')return reply(res,409,{error:'closed',...status()});
      claim(s.budget,p);
    }catch(e){if(active(s))s.phase='ready';const reason=['trial-limit','quota','cooldown','duplicate','size','decode'].includes(e.message)?e.message:'invalid-package';return reply(res,422,{error:reason,...status(),deliveryConfirmed:false});}
    s.phase='sending';
    try{
      const result=await sendSoundSticker(s.sock,receiver+'@s.whatsapp.net',{...p,baileys:await import('@whiskeysockets/baileys'),logger});
      if(!active(s)||result.hasAudio!==true){await close(s,'uncertain');return reply(res,502,{error:'uncertain',...status(),deliveryConfirmed:false})}
      if(s.budget.attempts>=MAX_SENDS)await close(s,'closed');else s.phase='ready';
      return reply(res,200,{...status(),relayed:true,deliveryConfirmed:false});
    }catch{await close(s,'uncertain');return reply(res,502,{error:'uncertain',...status(),deliveryConfirmed:false})}
  }
  return reply(res,404,{error:'route'});
});
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log(configured?'Private bounded bridge .45 ready; no pairing started.':'Private bridge inactive: configure environment in Render. No pairing started.'));
process.once('SIGTERM',()=>void (session?close(session):Promise.resolve()).finally(()=>server.close()));
