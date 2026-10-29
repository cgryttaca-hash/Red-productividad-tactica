const CACHE='rpt-shell-20261028-agenda-premium-v2';
const OFFLINE='./offline.html';
const ASSETS=[
  "./",
  "./agenda_movil.html",
  "./agendas.html",
  "./agenda.webmanifest",
  "./css/agenda-premium.css",
  "./js/food-alerts-core.js",
  "./assets/agenda-brand/logo-full-light.svg",
  "./assets/agenda-brand/logo-full-dark.svg",
  "./assets/agenda-brand/logo-symbol-dark.svg",
  "./assets/agenda-brand/logo-small.svg",
  "./assets/agenda-brand/favicon.svg",
  "./assets/agenda-brand/favicon.ico",
  "./assets/agenda-brand/apple-touch-icon.png",
  "./assets/agenda-brand/icon-192.png",
  "./assets/agenda-brand/icon-96.png",
  "./assets/agenda-brand/badge-96.png",
  "./assets/agenda-brand/icon-512.png",
  "./assets/agenda-brand/icon-maskable-192.png",
  "./assets/agenda-brand/icon-maskable-512.png",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./configuracion.html",
  "./css/admin-tools.css",
  "./css/agenda-movil.css",
  "./css/agendas.css",
  "./css/pwa-compat.css",
  "./css/configuracion.css",
  "./css/corporate-ui.css",
  "./css/estilos.css",
  "./css/eventos.css",
  "./css/excel-sync.css",
  "./css/firebase-sync.css",
  "./css/index.css",
  "./css/login.css",
  "./css/mantenimiento.css",
  "./css/professional-ui.css",
  "./css/minuta.css",
  "./css/nav-clean.css",
  "./css/usuarios.css",
  "./data/eventos_publicos.json",
  "./eventos.html",
  "./index.html",
  "./js/agenda-movil.js",
  "./js/agenda-content.js",
  "./js/agendas.js",
  "./js/push-config.js",
  "./js/push-client.js",
  "./js/push-ui.js",
  "./js/agenda-requirements.js",
  "./js/agenda-reminders.js",
  "./js/app.js",
  "./js/audit-store.js",
  "./js/auth-guard.js",
  "./js/backup-store.js",
  "./js/configuracion.js",
  "./js/data-core.js",
  "./js/device-heartbeat.js",
  "./js/device-registry.js",
  "./js/eventos.js",
  "./js/excel-sync.js",
  "./js/firebase-app-check.js",
  "./js/firebase-config.js",
  "./js/firebase-sync.js",
  "./js/index.js",
  "./js/laboratorio.js",
  "./js/loader-guard.js",
  "./js/local-auth.js",
  "./js/login.js",
  "./js/maintenance-guard.js",
  "./js/mantenimiento.js",
  "./js/minuta.js",
  "./js/notifications.js",
  "./js/performance-monitor.js",
  "./js/puente_movil_eventos.js",
  "./js/pwa.js",
  "./js/session-ui.js",
  "./js/system-log.js",
  "./js/system-version.js",
  "./js/usuarios.js",
  "./js/validacion-page.js",
  "./js/validation.js",
  "./laboratorio.html",
  "./login.html",
  "./manifest.webmanifest",
  "./mantenimiento.html",
  "./minuta.html",
  "./offline.html",
  "./usuarios.html",
  "./validacion.html"
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(asset=>new Request(asset,{cache:'reload'}))))
  );
  if(!self.registration.active)self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('rpt-shell-')&&key!==CACHE).map(key=>caches.delete(key))
    )).then(()=>self.clients.claim())
  );
});

const STATIC_URLS=new Set(ASSETS.map(asset=>new URL(asset,self.registration.scope).href));

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==location.origin)return;
  const assetUrl=new URL(url);
  assetUrl.search='';
  assetUrl.hash='';
  if(!STATIC_URLS.has(assetUrl.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(assetUrl.href);
    const isPublicData=assetUrl.pathname.endsWith('/data/eventos_publicos.json');
    if(cached&&!isPublicData)return cached;
    try{
      const response=await fetch(request);
      if(response.ok)await cache.put(assetUrl.href,response.clone());
      return response;
    }catch(_){
      if(cached)return cached;
      if(request.mode==='navigate')return await cache.match(OFFLINE)||Response.error();
      return Response.error();
    }
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='SHOW_NOTIFICATION'){
    const payload=event.data.payload||{};
    event.waitUntil(displayNotification({...payload,...payload.data}));
  }
});

function notificationUrl(value){
  try{
    const url=new URL(value||'./agenda_movil.html',self.registration.scope);
    if(url.origin===location.origin&&url.pathname.startsWith(new URL(self.registration.scope).pathname))return url.href;
  }catch(_){}
  return new URL('./agenda_movil.html',self.registration.scope).href;
}

async function claimFoodReceipt(payload) {
  return new Promise(resolve=>{
    const request=indexedDB.open('agenda-notification-receipts',1);
    request.onupgradeneeded=()=>{const records=request.result.createObjectStore('food',{keyPath:'id'});records.createIndex('expiresOn','expiresOn');};
    request.onerror=()=>resolve(false);
    request.onsuccess=()=>{
      const database=request.result;
      const transaction=database.transaction('food','readwrite');
      const records=transaction.objectStore('food');
      let claimed=false;
      const existing=records.get(payload.alertId);
      existing.onsuccess=()=>{if(!existing.result){records.put({id:payload.alertId,expiresOn:Number(payload.foodAt)+86400000});claimed=true;}};
      const expired=records.index('expiresOn').openCursor(IDBKeyRange.upperBound(Date.now()));
      expired.onsuccess=()=>{const cursor=expired.result;if(cursor){cursor.delete();cursor.continue();}};
      transaction.oncomplete=()=>{database.close();resolve(claimed);};
      transaction.onerror=transaction.onabort=()=>{database.close();resolve(false);};
    };
  });
}

async function displayNotification(payload) {
  if(['end','tomorrow','upcoming'].includes(payload.kind)||/^(end|tomorrow):/.test(payload.tag||''))return;
  const isFood=payload.kind==='food';
  if(isFood){
    const now=Date.now();
    const alertAt=Number(payload.alertAt),foodAt=Number(payload.foodAt),expiresAt=Number(payload.expiresAt);
    if(typeof payload.alertId!=='string'||!payload.alertId.startsWith('food_')||![alertAt,foodAt,expiresAt].every(Number.isFinite)||foodAt-alertAt!==900000||expiresAt-alertAt!==45000||now<alertAt||now>expiresAt||now>=foodAt)return;
    if(!await claimFoodReceipt(payload)||Date.now()>expiresAt)return;
  }
  const title=typeof payload.title==='string'?payload.title.slice(0,120):'Agenda de eventos';
  const body=typeof payload.body==='string'?payload.body.slice(0,1000):'Hay información disponible en la agenda.';
  return self.registration.showNotification(title,{
    body,icon:'./assets/agenda-brand/icon-192.png',badge:'./assets/agenda-brand/badge-96.png',
    tag:isFood?payload.alertId:typeof payload.tag==='string'?payload.tag.slice(0,100):'rpt-push-update',
    data:{url:notificationUrl(payload.url),...(isFood?{alertId:payload.alertId,kind:'food'}:{})},renotify:false
  });
}

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json()||{};}catch(_){}
  event.waitUntil(displayNotification(payload.data&&typeof payload.data==='object'?payload.data:payload));
});

self.addEventListener('pushsubscriptionchange',event=>{
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    list.forEach(client=>client.postMessage({type:'RPT_PUSH_SUBSCRIPTION_CHANGED'}));
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=notificationUrl(event.notification.data?.url);
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      const match=list.find(client=>new URL(client.url).pathname===new URL(url).pathname);
      return match?match.focus():clients.openWindow(url);
    })
  );
});
