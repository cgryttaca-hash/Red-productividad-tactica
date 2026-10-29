const CACHE='rpt-shell-20261028-agendas-pwa-v1';
const OFFLINE='./offline.html';
const ASSETS=[
  "./",
  "./agenda_movil.html",
  "./agendas.html",
  "./agenda.webmanifest",
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
    self.registration.showNotification(payload.title||'Gestión de Eventos',{
      body:payload.body||'La información fue actualizada.',
      icon:'./assets/icon-192.png',
      badge:'./assets/icon-192.png',
      tag:payload.tag||'rpt-update',
      renotify:Boolean(payload.renotify),
      data:payload.data||{url:'./agenda_movil.html'}
    });
  }
});

function notificationUrl(value){
  try{
    const url=new URL(value||'./agenda_movil.html',self.registration.scope);
    if(url.origin===location.origin&&url.pathname.startsWith(new URL(self.registration.scope).pathname))return url.href;
  }catch(_){}
  return new URL('./agenda_movil.html',self.registration.scope).href;
}

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json()||{};}catch(_){}
  const title=typeof payload.title==='string'?payload.title.slice(0,120):'Agenda de eventos';
  const body=typeof payload.body==='string'?payload.body.slice(0,500):'Hay información disponible en la agenda.';
  event.waitUntil(self.registration.showNotification(title,{
    body,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',
    tag:typeof payload.tag==='string'?payload.tag.slice(0,100):'rpt-push-update',
    data:{url:notificationUrl(payload.url)},renotify:false
  }));
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
