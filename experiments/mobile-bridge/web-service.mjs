// Private, opt-in, one-shot experiment. Separate service; never deploy into the public importer.
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import makeWASocket,{useMultiFileAuthState,DisconnectReason,proto,Browsers} from '@whiskeysockets/baileys';
import {sendSoundSticker,installSoundStickerCodec} from 'wa-sound-sticker';
import pino from 'pino';
import {preparePackage} from './package-adapter.mjs';
import {ORIGIN,authorized,phoneNumber,trialPackage,readPackage} from './web-policy.mjs';
const secret=process.env.BRIDGE_TOKEN, pairNumber=process.env.BRIDGE_PAIR_NUMBER, receiver=process.env.BRIDGE_RECIPIENT_NUMBER;
if(!secret||secret.length<32||!phoneNumber(pairNumber)||!phoneNumber(receiver)||pairNumber===receiver)throw Error('Configure a strong BRIDGE_TOKEN and distinct owned secondary / receiving numbers in the service environment.');
const logger=pino({level:'silent'});
let phase='idle',code='',codeUntil=0,sock,folder,timer,auth,closed=false,requested=false,restarts=0;
const status=()=>({phase,pairingCode:phase==='pairing'&&Date.now()<codeUntil?code:undefined,trial:{maxSeconds:3,maxComponentBytes:500000}});
async function close(next='closed'){
  if(closed)return;closed=true;phase=next;code='';clearTimeout(timer);
  try{sock?.end(undefined)}catch{}
  if(folder)await rm(folder,{recursive:true,force:true}).catch(()=>{});
}
installSoundStickerCodec(proto);
async function connect(){
  if(closed)return;
  const s=makeWASocket({auth:auth.state,logger,browser:Browsers.windows('Chrome'),syncFullHistory:false,markOnlineOnConnect:false});
  sock=s;
  s.ev.on('creds.update',()=>{if(!closed)void auth.saveCreds().catch(()=>close('failed'))});
  s.ev.on('connection.update',async u=>{
    if(closed||sock!==s)return;
    try{
      if(u.qr&&!requested&&!auth.state.creds.registered){
        requested=true;
        const c=await s.requestPairingCode(pairNumber);
        if(closed||sock!==s||phase==='ready')return;
        code=c;codeUntil=Date.now()+120000;phase='pairing';
      }
      if(u.connection==='open'){code='';phase='ready'}
      if(u.connection==='close'){
        const n=u.lastDisconnect?.error?.output?.statusCode;
        if(n===DisconnectReason.restartRequired&&restarts++<2&&phase!=='sending'){code='';phase='connecting';await connect();}
        else await close('failed');
      }
    }catch{await close('failed')}
  });
}
async function start(){
  if(phase!=='idle')return;
  phase='connecting';
  timer=setTimeout(()=>void close('closed'),10*60*1000);
  try{folder=await mkdtemp(join(tmpdir(),'sonoro-web-'));auth=await useMultiFileAuthState(folder);await connect();}catch{await close('failed')}
}
function reply(res,n,data){res.writeHead(n,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(data))}
const server=createServer({requestTimeout:20000,headersTimeout:10000},async(req,res)=>{
  if(req.url==='/health'&&req.method==='GET')return reply(res,200,{ok:true});
  if(req.headers.origin!==ORIGIN)return reply(res,403,{error:'origin'});
  res.setHeader('Access-Control-Allow-Origin',ORIGIN);res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Cache-Control':'no-store'});return res.end()}
  if(!authorized(req.headers.authorization,secret))return reply(res,401,{error:'auth'});
  if(req.method==='GET'&&req.url==='/v1/status')return reply(res,200,status());
  if(req.method==='POST'&&req.url==='/v1/connect'){await start();return reply(res,200,status())}
  if(req.method==='POST'&&req.url==='/v1/stop'){await close();return reply(res,200,status())}
  if(req.method==='POST'&&req.url==='/v1/send'){
    if(phase!=='ready'||closed)return reply(res,409,{error:'not-ready'});
    if(req.headers['content-type']!=='application/json')return reply(res,415,{error:'type'});
    phase='validating';
    try{
      const p=trialPackage(preparePackage(await readPackage(req)));
      const audio=spawnSync('ffmpeg',['-v','error','-xerror','-f','ogg','-i','pipe:0','-f','null','-'],{input:p.audioBuffer,timeout:10000,maxBuffer:65536});
      if(audio.status!==0)throw Error('decode');
      if(closed||phase!=='validating')return reply(res,409,{error:'closed'});
      phase='sending';
      const result=await sendSoundSticker(sock,receiver+'@s.whatsapp.net',{...p,baileys:await import('@whiskeysockets/baileys'),logger});
      const ok=result.hasAudio===true;
      await close(ok?'relayed':'failed');
      return reply(res,ok?200:502,{phase,deliveryConfirmed:false});
    }catch{await close('failed');return reply(res,422,{error:'trial-failed',phase,deliveryConfirmed:false})}
  }
  return reply(res,404,{error:'route'});
});
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Private one-shot bridge ready; no pairing started.'));
process.once('SIGTERM',()=>void close().finally(()=>server.close()));
