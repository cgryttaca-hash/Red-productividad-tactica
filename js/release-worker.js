const scope=self.registration.scope,scopeId=btoa(scope).replace(/[^a-z0-9]/gi,'').slice(-70);
const CACHE=`rpt-shell-${scopeId}-${RELEASE.version}-${RELEASE.digest.slice(0,12)}`;
const META='rpt-release-meta',STATE=scope+'__rpt_state__',COMPLETE=scope+'__rpt_complete__';
const assetUrls=new Set(RELEASE.assets.map(asset=>new URL(asset.path,scope).href));
assetUrls.add(new URL('data/eventos_publicos.json',scope).href);
const operations=new Map();
async function metadata(){const response=await(await caches.open(META)).match(STATE);return response?response.json():{};}
async function setMetadata(value){await(await caches.open(META)).put(STATE,new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}));}
async function completed(name){if(!name||!await caches.has(name))return null;const response=await(await caches.open(name)).match(COMPLETE);return response?response.json():null;}
async function clientsInScope(){return(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(client=>client.url.startsWith(scope));}
async function broadcast(value){for(const client of await clientsInScope())client.postMessage(value);}
async function bind(clientId,cache){if(clientId&&cache)await(await caches.open(META)).put(scope+'__rpt_client__/'+clientId,new Response(cache));}
async function bound(clientId,fallback){const value=clientId&&await(await caches.open(META)).match(scope+'__rpt_client__/'+clientId);return value?value.text():fallback;}
async function status(){const state=await metadata();return{active:await completed(state.active),previous:await completed(state.previous),candidate:await completed(CACHE)};}
async function prepare(){
  const existing=await completed(CACHE);if(existing?.digest===RELEASE.digest)return;
  const cache=await caches.open(CACHE);
  try{
    let cursor=0;
    await Promise.all(Array.from({length:6},async()=>{while(cursor<RELEASE.assets.length){const asset=RELEASE.assets[cursor++],url=new URL(asset.path,scope);const response=await fetch(new Request(url,{cache:'no-store',credentials:'same-origin'}));if(!response.ok||response.redirected)throw new Error('Release resource unavailable');const bytes=await response.clone().arrayBuffer();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');if(digest!==asset.sha256)throw new Error('Release integrity mismatch');await cache.put(url.href,response);}}));
    try{const url=new URL('data/eventos_publicos.json',scope),response=await fetch(new Request(url,{cache:'no-store'}));if(response.ok)await cache.put(url.href,response);}catch(_){}
    await cache.put(COMPLETE,new Response(JSON.stringify({cache:CACHE,version:RELEASE.version,digest:RELEASE.digest,verified:true}),{headers:{'Content-Type':'application/json'}}));
  }catch(error){await caches.delete(CACHE);throw error;}
}
self.addEventListener('install',event=>{event.waitUntil(prepare());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const state=await metadata();if(!await completed(CACHE))throw new Error('Incomplete release');
  const previous=state.active&&state.active!==CACHE?state.active:state.previous;
  const retired=[...new Set([...(state.retired||[]),state.previous].filter(name=>name&&name!==CACHE&&name!==previous))];
  await setMetadata({active:CACHE,previous:await completed(previous)?previous:null,retired});
  await self.clients.claim();await broadcast({type:'RPT_RELEASE_ACTIVATED',version:RELEASE.version});
})());});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(scope))return;
  const canonical=new URL(url);canonical.search='';canonical.hash='';
  if(request.mode==='navigate'&&canonical.pathname.endsWith('/'))canonical.pathname+='index.html';
  if(!assetUrls.has(canonical.href)&&request.mode!=='navigate')return;
  event.respondWith((async()=>{
    const state=await metadata(),selected=request.mode==='navigate'?state.active:await bound(event.clientId,state.active);
    const cacheName=await completed(selected)?selected:CACHE;const cache=await caches.open(cacheName);
    if(request.mode==='navigate')await bind(event.resultingClientId,cacheName);else if(event.clientId)await bind(event.clientId,cacheName);
    const cached=await cache.match(canonical.href);
    if(canonical.pathname.endsWith('/data/eventos_publicos.json')){try{const response=await fetch(new Request(request,{cache:'no-store'}));if(response.ok)await cache.put(canonical.href,response.clone());return response;}catch(_){return cached||Response.error();}}
    if(cached)return cached;
    if(request.mode==='navigate'&&canonical.pathname.endsWith('.html'))return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Actualización disponible</title><body style="font:16px/1.6 system-ui;max-width:640px;margin:10vh auto;padding:24px;color:#10283f"><h1>Esta ventana requiere una actualización</h1><p>La versión activa no incluye esta página. Abre Inicio para aplicar la actualización cuando hayas guardado tu trabajo.</p><a href="index.html">Volver a Inicio</a></body></html>',{status:409,headers:{'Content-Type':'text/html; charset=utf-8'}});
    if(assetUrls.has(canonical.href))return Response.error();
    try{return await fetch(request);}catch(_){return request.mode==='navigate'?(await cache.match(new URL('offline.html',scope).href)||Response.error()):Response.error();}
  })());
});
async function transition(kind){
  if(operations.size)return{ok:false,message:'Otra actualización está en curso.'};
  const state=await metadata(),target=kind==='rollback'?state.previous:CACHE;
  const destination=await completed(target);if(!destination)return{ok:false,message:'No hay una versión completa verificada para aplicar.'};
  const clients=await clientsInScope(),nonce=crypto.randomUUID();let resolveVotes;
  const ready=new Promise(resolve=>{resolveVotes=resolve;});
  const operation={votes:new Map(),clients:new Set(clients.map(client=>client.id)),resolve:resolveVotes};operations.set(nonce,operation);
  for(const client of clients)client.postMessage({type:'RPT_RELEASE_PREPARE',nonce,kind,version:destination.version});
  let timer;try{
    if(!clients.length)resolveVotes();
    await Promise.race([ready,new Promise(resolve=>{timer=setTimeout(resolve,3500);})]);
    const current=await clientsInScope();const safe=current.every(client=>operation.clients.has(client.id)&&operation.votes.get(client.id)===true);
    if(!safe){await broadcast({type:'RPT_RELEASE_CANCEL',nonce});return{ok:false,message:'Hay otra pestaña con cambios, una tarea en curso o una versión que no puede comprobarse. Guarda el trabajo y cierra las otras pestañas para actualizar.'};}
    for(const client of current)await bind(client.id,state.active);
    if(kind==='rollback')await setMetadata({...state,active:target,previous:state.active});
    await broadcast({type:'RPT_RELEASE_SWITCH',nonce,kind,version:destination.version});
    if(kind==='rollback')await broadcast({type:'RPT_RELEASE_RELOAD',nonce,version:destination.version});else await self.skipWaiting();
    return{ok:true,version:destination.version};
  }finally{clearTimeout(timer);operations.delete(nonce);}
}
self.addEventListener('message',event=>{
  const value=event.data||{};if(!event.source?.id)return;
  if(value.type==='RPT_RELEASE_VOTE'){const operation=operations.get(value.nonce);if(operation?.clients.has(event.source.id)){operation.votes.set(event.source.id,value.safe===true);if(operation.votes.size===operation.clients.size)operation.resolve();}return;}
  const reply=value=>event.ports[0]?.postMessage(value);
  if(value.type==='RPT_RELEASE_STATUS')event.waitUntil(status().then(reply));
  if(value.type==='RPT_RELEASE_APPLY')event.waitUntil(transition('activate').then(reply));
  if(value.type==='RPT_RELEASE_ROLLBACK')event.waitUntil(transition('rollback').then(reply));
  if(value.type==='RPT_RELEASE_CONFIRM')event.waitUntil((async()=>{const state=await metadata(),active=await completed(state.active);if(active?.version!==value.version)return;const pinned=new Set(await Promise.all((await clientsInScope()).map(client=>bound(client.id,state.active))));for(const name of state.retired||[]){const latest=await metadata();if(name!==latest.active&&name!==latest.previous&&!pinned.has(name)&&name.startsWith('rpt-shell-'+scopeId+'-'))await caches.delete(name);}})());
  if(value.type==='SHOW_NOTIFICATION'){const payload=value.payload||{};event.waitUntil(displayNotification({...payload,...payload.data}));}
});
