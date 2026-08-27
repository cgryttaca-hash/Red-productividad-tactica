const CACHE='rpt-shell-3.4.0';
const OFFLINE='./offline.html';
const CORE=[
  './','./index.html','./login.html','./agenda_movil.html','./offline.html','./manifest.webmanifest','./agenda.webmanifest',
  './assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png','./assets/app-icon.svg',
  './css/index.css','./css/login.css','./css/agenda-movil.css','./css/offline.css','./css/excel-sync.css','./css/firebase-sync.css','./css/themes.css',
  './js/index.js','./js/login.js','./js/agenda-movil.js','./js/pwa.js','./js/notifications.js','./js/theme-settings.js',
  './js/firebase-config.js','./js/maintenance-guard.js','./js/auth-guard.js','./js/local-auth.js','./js/session-ui.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rpt-shell-')&&key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

async function networkFirst(request){
  try{
    const response=await fetch(request);
    if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}
    return response;
  }catch(_){
    return await caches.match(request)||await caches.match(OFFLINE);
  }
}
async function staleWhileRevalidate(request){
  const cached=await caches.match(request);
  const update=fetch(request).then(async response=>{
    if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}
    return response;
  }).catch(()=>null);
  return cached||await update||Response.error();
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  const isHtml=request.mode==='navigate'||request.headers.get('accept')?.includes('text/html');
  if(isHtml){event.respondWith(networkFirst(request));return;}
  if(url.pathname.endsWith('.json')){event.respondWith(networkFirst(request));return;}
  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='SHOW_NOTIFICATION'){
    const payload=event.data.payload||{};
    self.registration.showNotification(payload.title||'Gestión de Eventos',{
      body:payload.body||'La información fue actualizada.',icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',
      tag:payload.tag||'rpt-update',renotify:Boolean(payload.renotify),data:payload.data||{url:'./agenda_movil.html'}
    });
  }
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'./agenda_movil.html';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    const match=list.find(client=>client.url.includes(url.replace('./','')));
    return match?match.focus():clients.openWindow(url);
  }));
});
