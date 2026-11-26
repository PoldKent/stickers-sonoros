// One private trial, no public service, no bulk sending, no automatic retries.
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {spawnSync} from 'node:child_process';
import makeWASocket,{useMultiFileAuthState,DisconnectReason,downloadMediaMessage,proto} from '@whiskeysockets/baileys';
import {sendSoundSticker,installSoundStickerCodec} from 'wa-sound-sticker';
import pino from 'pino';
import qr from 'qrcode-terminal';
import {preparePackage,MAX_JSON_BYTES} from './package-adapter.mjs';
if(!stdin.isTTY||!stdout.isTTY)throw Error('Run interactively on your own computer, never on public hosting.');
const cli=createInterface({input:stdin,output:stdout});
if(await cli.question('Unofficial connection; account restrictions possible. Use a secondary account you own. Type TEST to continue: ')!=='TEST'){cli.close();process.exit(0);}
const number=(await cli.question('Your authorized receiving phone, international digits only (entered locally): ')).trim();
if(!/^[1-9][0-9]{7,14}$/.test(number)){cli.close();throw Error('Invalid international number');}
const allowed=number+'@s.whatsapp.net';
if(spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status!==0){cli.close();throw Error('Install FFmpeg locally first.');}
const folder=await mkdtemp(join(tmpdir(),'sonoro-private-'));
const logger=pino({level:'silent'});
let sock,finished=false,claimed=false,restarts=0,timer;
async function finish(code){
  if(finished)return;finished=true;clearTimeout(timer);cli.close();
  try{sock?.end(undefined);}catch{}
  await rm(folder,{recursive:true,force:true}).catch(()=>console.error('Remove the temporary session directory locally.'));
  console.log('Unlink this experimental device from WhatsApp > Linked devices.');
  process.exitCode=code;
}
process.once('SIGINT',()=>void finish(1));process.once('SIGTERM',()=>void finish(1));
timer=setTimeout(()=>void finish(1),10*60*1000);
installSoundStickerCodec(proto);
const {state,saveCreds}=await useMultiFileAuthState(folder);
function eligible(m){
  const k=m?.key,d=m?.message?.documentMessage;
  if(!k?.id||k.fromMe||!/^\d+(?::\d+)?@(s\.whatsapp\.net|lid)$/.test(k.remoteJid||'')||!d)return false;
  if(k.remoteJid!==allowed&&k.remoteJidAlt!==allowed)return false;
  const size=Number(d.fileLength),age=Date.now()-Number(m.messageTimestamp)*1000;
  return Number.isFinite(age)&&age>=-30000&&age<=120000&&Number.isSafeInteger(size)&&size>0&&size<=MAX_JSON_BYTES&&typeof d.fileName==='string'&&d.fileName.toLowerCase().endsWith('.sonoro.json');
}
async function connect(){
  if(finished)return;
  const s=makeWASocket({auth:state,logger,syncFullHistory:false,markOnlineOnConnect:false});sock=s;
  s.ev.on('creds.update',()=>{if(!finished)void saveCreds().catch(()=>finish(1));});
  s.ev.on('connection.update',u=>{
    if(finished||sock!==s)return;
    if(u.qr){console.log('Scan locally with SECONDARY account > Linked devices. Do not share QR.');qr.generate(u.qr,{small:true});}
    if(u.connection==='open')console.log('Connected. Send one small .sonoro.json document from the authorized phone to this secondary account.');
    if(u.connection==='close'){
      const status=u.lastDisconnect?.error?.output?.statusCode;
      if(status===DisconnectReason.restartRequired&&!claimed&&restarts++<2)void connect().catch(()=>finish(1));
      else{console.error('Connection closed; no automatic retry.');void finish(1);}
    }
  });
  s.ev.on('messages.upsert',async({type,messages})=>{
    if(finished||claimed||sock!==s||type!=='notify')return;
    const m=messages.find(eligible);if(!m)return;claimed=true;
    try{
      const stream=await downloadMediaMessage(m,'stream',{},{logger});
      let length=0;const chunks=[];
      for await(const piece of stream){const b=Buffer.from(piece);length+=b.length;if(length>MAX_JSON_BYTES)throw Error('Document exceeds limit');chunks.push(b);}
      const data=preparePackage(Buffer.concat(chunks,length));
      if(data.webpBuffer.length>=500000||data.audioBuffer.length>=500000||data.audioSeconds<1||data.audioSeconds>3)throw Error('First trial requires 1–3 s and each component below 500 KB');
      const decoded=spawnSync('ffmpeg',['-v','error','-xerror','-f','ogg','-i','pipe:0','-f','null','-'],{input:data.audioBuffer,timeout:10000,maxBuffer:65536});
      if(decoded.status!==0)throw Error('Audio decode failed');
      console.log('Validated package:',data.width+'px',data.audioSeconds+'s',data.webpBuffer.length+' WebP bytes',data.audioBuffer.length+' Ogg bytes');
      const confirm=await cli.question('Send exactly one sticker to the authorized chat that supplied it? Type SEND: ');
      if(confirm!=='SEND'||finished)return await finish(1);
      const result=await sendSoundSticker(s,m.key.remoteJid,{...data,baileys:await import('@whiskeysockets/baileys'),logger});
      console.log('Relay returned; local audio:',result.hasAudio===true,'. This is not proof of delivery. Check the phone.');
      await cli.question('Press Enter after checking sticker, sound, favorites and forwarding. No further sends.');
      await finish(0);
    }catch{console.error('Trial failed or was interrupted. Check the phone before retrying; no automatic resend.');await finish(1);}
  });
}
await connect().catch(()=>finish(1));
