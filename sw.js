const CACHE='rpt-shell-3.6.0';
const OFFLINE='./offline.html';
const CORE=['./','./index.html','./login.html','./agenda_movil.html','./offline.html','./manifest.webmanifest','./agenda.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./css/index.css','./css/agenda-movil.css','./css/login.css','./css/pro-suite.css','./js/auth-guard.js','./js/local-auth.js','./js/cloud-auth.js','./js/login.js','./js/index.js','./js/agenda-movil.js','./js/pwa.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(asset=>cache.add(asset)))));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rpt-shell-')&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin)return;
  const html=request.mode==='navigate'||request.headers.get('accept')?.includes('text/html');
  if(html){event.respondWith(fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response;}).catch(async()=>await caches.match(request)||await caches.match(OFFLINE)));return;}
  event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response;}).catch(()=>cached);return cached||network;}));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='SHOW_NOTIFICATION'){const p=event.data.payload||{};self.registration.showNotification(p.title||'Gestión de Eventos',{body:p.body||'La información fue actualizada.',icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',tag:p.tag||'rpt-update',renotify:Boolean(p.renotify),data:p.data||{url:'./agenda_movil.html'}});}});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url||'./agenda_movil.html';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const match=list.find(client=>client.url.includes(url.replace('./','')));return match?match.focus():clients.openWindow(url);}));});
