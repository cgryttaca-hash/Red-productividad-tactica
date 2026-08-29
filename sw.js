const CACHE='rpt-shell-3.6.4-notifications-only';
const OFFLINE='./offline.html';
const ASSETS=[
  "./",
  "./agenda_movil.html",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./auditoria.html",
  "./configuracion.html",
  "./css/admin-tools.css",
  "./css/agenda-movil.css",
  "./css/configuracion.css",
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
  "./diagnostico.html",
  "./equipos.html",
  "./eventos.html",
  "./index.html",
  "./js/agenda-movil.js",
  "./js/agenda-requirements.js",
  "./js/agenda-reminders.js",
  "./js/app.js",
  "./js/audit-store.js",
  "./js/auditoria.js",
  "./js/auth-guard.js",
  "./js/backup-store.js",
  "./js/configuracion.js",
  "./js/data-core.js",
  "./js/device-heartbeat.js",
  "./js/device-registry.js",
  "./js/diagnostico.js",
  "./js/equipos.js",
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
  "./js/respaldos.js",
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
  "./respaldos.html",
  "./usuarios.html",
  "./validacion.html",
  "./sw.js"
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>Promise.allSettled(ASSETS.map(asset=>cache.add(asset))))
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('rpt-shell-')&&key!==CACHE).map(key=>caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==location.origin)return;
  const isHtml=request.mode==='navigate'||request.headers.get('accept')?.includes('text/html');
  if(isHtml){
    event.respondWith(
      fetch(request).then(response=>{
        if(response.ok){
          const clone=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,clone));
        }
        return response;
      }).catch(async()=>await caches.match(request)||await caches.match(OFFLINE))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
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

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'./agenda_movil.html';
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      const match=list.find(client=>client.url.includes(url.replace('./','')));
      return match?match.focus():clients.openWindow(url);
    })
  );
});
