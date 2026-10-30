const scope=self.registration.scope,scopeId=btoa(scope).replace(/[^a-z0-9]/gi,'').slice(-70);
const CACHE=`rpt-shell-${scopeId}-${RELEASE.version}-${RELEASE.digest.slice(0,12)}`;
const META='rpt-release-meta',STATE=scope+'__rpt_state__',COMPLETE=scope+'__rpt_complete__';
const assetUrls=new Set(RELEASE.assets.map(asset=>new URL(asset.path,scope).href));
assetUrls.add(new URL('data/eventos_publicos.json',scope).href);
const operations=new Map();let progress=null;
const DETAILS=scope+'__rpt_release_details__';let details,downloaded=0;
async function releaseDetails(){const response=await(await caches.open(META)).match(DETAILS);return response?response.json():null;}
async function saveDetails(){if(details)await(await caches.open(META)).put(DETAILS,new Response(JSON.stringify(details),{headers:{'Content-Type':'application/json'}}));}
async function differences(){
 const state=await metadata(),active=await completed(state.active),old=new Map();
 if(active?.assets)for(const item of active.assets)old.set(item.path,item.sha256);
 else if(active){const cache=await caches.open(state.active);for(const request of await cache.keys()){const url=new URL(request.url),name=url.href.slice(scope.length);if(!url.href.startsWith(scope)||name.startsWith('__rpt_')||name==='data/eventos_publicos.json')continue;const bytes=await(await cache.match(request)).arrayBuffer();old.set(name,[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''));}}
 const next=new Map(RELEASE.assets.map(a=>[a.path,a.sha256]));return{fromVersion:active?.version||null,toVersion:RELEASE.version,added:[...next.keys()].filter(k=>!old.has(k)),modified:[...next.keys()].filter(k=>old.has(k)&&old.get(k)!==next.get(k)),removed:[...old.keys()].filter(k=>!next.has(k)),unchanged:[...next.keys()].filter(k=>old.get(k)===next.get(k)).length};
}

const FAILURE=scope+'__rpt_release_failure__';
async function failureRecord(){const response=await(await caches.open(META)).match(FAILURE);return response?response.json():null;}
async function clearFailure(){await(await caches.open(META)).delete(FAILURE);}
function resourceError(code,asset,extra={}){return Object.assign(new Error(code),{detail:{stage:code==='INTEGRITY'||code==='HTML_RESPONSE'?'verification':'download',code,resource:asset.path,version:RELEASE.version,...extra}});}
async function saveFailure(error){const detail={stage:'preparation',code:'PREPARATION',resource:'',version:RELEASE.version,...error.detail,at:Date.now()};await(await caches.open(META)).put(FAILURE,new Response(JSON.stringify(detail),{headers:{'Content-Type':'application/json'}}));console.error('[rpt-update]',detail);await broadcast({type:'RPT_RELEASE_FAILURE',failure:detail});}
async function verifiedResponse(asset){
  const canonical=new URL(asset.path,scope),url=new URL(canonical);url.searchParams.set('__rpt_release',RELEASE.digest);
  for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(new Request(url,{cache:'no-store',credentials:'same-origin',signal:controller.signal}));
      if(response.redirected)throw resourceError('REDIRECT',asset);
      if(!response.ok)throw resourceError('HTTP',asset,{status:response.status});
      if(/text\/html/i.test(response.headers.get('Content-Type')||'')&&!asset.path.endsWith('.html'))throw resourceError('HTML_RESPONSE',asset);
      const bytes=await response.clone().arrayBuffer();downloaded++;if(details)details.lastResource=asset.path;
      const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
      if(digest!==asset.sha256)throw resourceError('INTEGRITY',asset,{expected:asset.sha256,received:digest,bytes:bytes.byteLength});
      return response;
    }catch(error){const failure=error.detail?error:resourceError(error.name==='AbortError'?'TIMEOUT':'NETWORK',asset);if(attempt===0&&['NETWORK','TIMEOUT'].includes(failure.detail.code)||attempt===0&&failure.detail.code==='HTTP'&&[408,429,500,502,503,504].includes(failure.detail.status))continue;throw failure;}finally{clearTimeout(timer);}
  }
}
async function reportProgress(phase,done=0,total=RELEASE.assets.length){const at=Date.now();if(!details){details=await releaseDetails();downloaded=details?.downloaded||downloaded;}progress={phase,done,total,downloaded,verified:['preparing','activating','activated','error'].includes(phase)?(details?.verified||done):done,version:RELEASE.version,at,resource:details?.lastResource||''};if(details){details={...details,...progress,history:[...(details.history||[]),{phase,at,downloaded,verified:progress.verified,resource:progress.resource}].slice(-80)};await saveDetails();}await broadcast({type:'RPT_RELEASE_PROGRESS',...progress});}
async function metadata(){const response=await(await caches.open(META)).match(STATE);return response?response.json():{};}
async function setMetadata(value){await(await caches.open(META)).put(STATE,new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}));}
async function completed(name){if(!name||!await caches.has(name))return null;const response=await(await caches.open(name)).match(COMPLETE);return response?response.json():null;}
async function clientsInScope(){return(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(client=>client.url.startsWith(scope));}
async function broadcast(value){for(const client of await clientsInScope())client.postMessage(value);}
async function bind(clientId,cache){if(clientId&&cache)await(await caches.open(META)).put(scope+'__rpt_client__/'+clientId,new Response(cache));}
async function bound(clientId,fallback){const value=clientId&&await(await caches.open(META)).match(scope+'__rpt_client__/'+clientId);return value?value.text():fallback;}
async function status(){const state=await metadata();return{active:await completed(state.active),previous:await completed(state.previous),candidate:await completed(CACHE),progress,failure:await failureRecord(),details:await releaseDetails()};}
async function prepare(){
  const existing=await completed(CACHE);if(existing?.digest===RELEASE.digest){await clearFailure();return;}
  const cache=await caches.open(CACHE);let failed=false;
  try{
    let cursor=0,done=0;downloaded=0;await clearFailure();details={changes:await differences(),detectedAt:Date.now(),history:[],downloaded:0,verified:0};await saveDetails();await broadcast({type:'RPT_RELEASE_DETECTED',details});await reportProgress('downloading',0);
    const results=await Promise.allSettled(Array.from({length:6},async()=>{
      try{while(!failed&&cursor<RELEASE.assets.length){
        const asset=RELEASE.assets[cursor++],response=await verifiedResponse(asset);if(failed)return;
        await cache.put(new URL(asset.path,scope).href,response);done++;if(details)details.verified=done;
        if(done%8===0||done===RELEASE.assets.length)await reportProgress('verifying',done);
      }}catch(error){failed=true;throw error;}
    }));
    const rejected=results.find(result=>result.status==='rejected');if(rejected)throw rejected.reason;
    try{const url=new URL('data/eventos_publicos.json',scope),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetch(new Request(url,{cache:'no-store',signal:controller.signal}));if(response.ok&&!/text\/html/i.test(response.headers.get('Content-Type')||''))await cache.put(url.href,response);}finally{clearTimeout(timer);}}catch(_){}
    await cache.put(COMPLETE,new Response(JSON.stringify({cache:CACHE,version:RELEASE.version,digest:RELEASE.digest,verified:true,assets:RELEASE.assets}),{headers:{'Content-Type':'application/json'}}));
    await reportProgress('ready',RELEASE.assets.length);await clearFailure();
  }catch(error){failed=true;await saveFailure(error);await reportProgress('error');await caches.delete(CACHE);throw error;}
}
self.addEventListener('install',event=>{event.waitUntil(prepare());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const state=await metadata();if(!await completed(CACHE))throw new Error('Incomplete release');
  const previous=state.active&&state.active!==CACHE?state.active:state.previous;
  const retired=[...new Set([...(state.retired||[]),state.previous].filter(name=>name&&name!==CACHE&&name!==previous))];
  await setMetadata({active:CACHE,previous:await completed(previous)?previous:null,retired});
  await reportProgress('activated',RELEASE.assets.length);await self.clients.claim();await broadcast({type:'RPT_RELEASE_ACTIVATED',version:RELEASE.version});
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
    if(request.mode==='navigate'&&['avisos.html','generacion_agenda.html'].includes(canonical.pathname.split('/').pop()))return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ventana retirada</title><p>Esta ventana se retiró de la versión actual.</p><a href="index.html">Volver al sistema</a></html>',{status:410,headers:{'Content-Type':'text/html; charset=utf-8'}});
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
  const operation={protocols:new Map(),votes:new Map(),clients:new Set(clients.map(client=>client.id)),resolve:resolveVotes};operations.set(nonce,operation);
  for(const client of clients)client.postMessage({type:'RPT_RELEASE_PREPARE',nonce,kind,version:destination.version,startedAt:Date.now(),until:Date.now()+10000});
  let timer;try{
    if(!clients.length)resolveVotes();
    await Promise.race([ready,new Promise(resolve=>{timer=setTimeout(resolve,3500);})]);
    const current=await clientsInScope();const safe=current.every(client=>operation.clients.has(client.id)&&operation.votes.get(client.id)===true);
    if(!safe){await broadcast({type:'RPT_RELEASE_CANCEL',nonce});return{ok:false,message:'Hay otra pestaña con cambios, una tarea en curso o una versión que no puede comprobarse. Guarda el trabajo y cierra las otras pestañas para actualizar.'};}
    const modern=current.every(client=>operation.protocols.get(client.id)>=2);
    if(modern){await reportProgress('preparing');await new Promise(resolve=>setTimeout(resolve,10000));const latest=await clientsInScope();if(!latest.every(client=>operation.clients.has(client.id)&&operation.votes.get(client.id)===true)){await broadcast({type:'RPT_RELEASE_CANCEL',nonce});return{ok:false,message:'Cambió el conjunto de pestañas abiertas. Vuelve a intentar la actualización.'};}}
    await reportProgress('activating');if(modern)await new Promise(resolve=>setTimeout(resolve,250));
    for(const client of current)await bind(client.id,state.active);
    if(kind==='rollback')await setMetadata({...state,active:target,previous:state.active});
    await broadcast({type:'RPT_RELEASE_SWITCH',nonce,kind,version:destination.version});
    if(kind==='rollback')await broadcast({type:'RPT_RELEASE_RELOAD',nonce,version:destination.version});else await self.skipWaiting();
    return{ok:true,version:destination.version};
  }catch(error){await broadcast({type:'RPT_RELEASE_CANCEL',nonce});return{ok:false,message:'No se pudo activar la versión. Se conserva la versión guardada. Reintenta con conexión.'};}finally{clearTimeout(timer);operations.delete(nonce);}
}
self.addEventListener('message',event=>{
  const value=event.data||{};if(!event.source?.id)return;
  if(value.type==='RPT_RELEASE_VOTE'){const operation=operations.get(value.nonce);if(operation?.clients.has(event.source.id)){operation.votes.set(event.source.id,value.safe===true);operation.protocols.set(event.source.id,value.protocol||1);if(operation.votes.size===operation.clients.size)operation.resolve();}return;}
  const reply=value=>event.ports[0]?.postMessage(value);
  if(value.type==='RPT_RELEASE_STATUS')event.waitUntil(status().then(reply));
  if(value.type==='RPT_RELEASE_APPLY')event.waitUntil(transition('activate').then(reply));
  if(value.type==='RPT_RELEASE_ROLLBACK')event.waitUntil(transition('rollback').then(reply));
  if(value.type==='RPT_RELEASE_CONFIRM')event.waitUntil((async()=>{const state=await metadata(),active=await completed(state.active);if(active?.version!==value.version)return;const pinned=new Set(await Promise.all((await clientsInScope()).map(client=>bound(client.id,state.active))));for(const name of state.retired||[]){const latest=await metadata();if(name!==latest.active&&name!==latest.previous&&!pinned.has(name)&&name.startsWith('rpt-shell-'+scopeId+'-'))await caches.delete(name);}})());
  if(value.type==='SHOW_NOTIFICATION'){const payload=value.payload||{};event.waitUntil(displayNotification({...payload,...payload.data}));}
});
