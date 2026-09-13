import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile(new URL('../lib/storage/assets.json',import.meta.url),'utf8'));
const origin=process.env.OUR_BLOCK_UPLOAD_ORIGIN;
const token=process.env.OUR_BLOCK_UPLOAD_TOKEN;
const access=process.env.OUR_BLOCK_SITE_ACCESS;
if(!origin||!token)throw Error('Set OUR_BLOCK_UPLOAD_ORIGIN and OUR_BLOCK_UPLOAD_TOKEN.');
const headers={Authorization:`Bearer ${token}`,...(access?{'OAI-Sites-Authorization':`Bearer ${access}`}:{})};
const sha=b=>createHash('sha256').update(b).digest('hex');
let completed=0;
async function request(url,options){
 for(let attempt=0;attempt<4;attempt++){
  try{
   const response=await fetch(url,{...options,signal:AbortSignal.timeout(120000),redirect:'follow'});
   if(response.ok)return response;
   const error=await response.text();
   if(response.status<500 && response.status!==429)throw Error(`${response.status}: ${error.slice(0,250)}`);
   if(attempt===3)throw Error(`${response.status}: ${error.slice(0,250)}`);
  }catch(e){if(attempt===3||/^40[01349]:/.test(e.message))throw e;}
  await new Promise(r=>setTimeout(r,1000*(attempt+1)));
 }
}
async function upload(entry){
 const bytes=await readFile(new URL('../public/'+entry.path,import.meta.url));
 if(bytes.length!==entry.size || sha(bytes)!==entry.sha256)throw Error(`Local asset changed: ${entry.path}`);
 const response=await request(`${origin}/api/asset-storage?path=${encodeURIComponent(entry.path)}`,{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream','Content-Length':String(bytes.length)},body:bytes});
 const data=await response.json();
 if(data.sha256!==entry.sha256)throw Error('Upload checksum response mismatch');
 // Validate streamed bytes from the same URL the game uses.
 const stored=await request(`${origin}/api/media?path=${encodeURIComponent(entry.path)}`,{headers:access?{'OAI-Sites-Authorization':`Bearer ${access}`}:{}});
 if(sha(Buffer.from(await stored.arrayBuffer()))!==entry.sha256)throw Error(`Stored asset checksum mismatch: ${entry.path}`);
 console.log(`Verified ${++completed}/${manifest.entries.length}: ${entry.path}`);
}
const queue=[...manifest.entries];
await Promise.all(Array.from({length:4},async()=>{while(queue.length)await upload(queue.shift());}));
const final=await request(`${origin}/api/asset-storage?action=finalize`,{method:'POST',headers});
console.log('STORAGE READY',await final.text());
