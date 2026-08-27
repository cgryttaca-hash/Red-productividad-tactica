import {applyAppearance,readAppearanceCache} from './theme-settings.js';

const $=id=>document.getElementById(id);
const text=value=>value===undefined||value===null?'':String(value);
const ACTIVITY_LIMIT=16;
let refreshPending=false;
let lastFingerprint='';
let eventCountCache={stamp:'',count:0};
let activityTab='changes';
let operationalModulesStarted=false;
let activityLoaded=false;
let excelRuntimePromise=null;

applyAppearance('index',readAppearanceCache());

function safeJson(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_){return fallback;}}
function formatDateTime(value,fallback='—'){
  if(!value)return fallback;const source=value?.toDate?value.toDate():new Date(value);
  return Number.isNaN(source.getTime())?fallback:source.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}
function updateClock(){
  const now=new Date();
  if($('todayLabel'))$('todayLabel').textContent=now.toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short'});
  if($('reloj'))$('reloj').textContent=now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
}
function getEventCount(){
  const stamp=localStorage.getItem('eventDataUpdatedAt')||'';
  if(eventCountCache.stamp===stamp)return eventCountCache.count;
  let count=0;try{const rows=JSON.parse(localStorage.getItem('eventData')||'[]');count=Array.isArray(rows)?rows.length:0;}catch(_){}
  eventCountCache={stamp,count};return count;
}
function currentFingerprint(){return[
  localStorage.getItem('eventDataUpdatedAt'),localStorage.getItem('excelSync:fileName'),localStorage.getItem('excelSync:lastCheck'),
  localStorage.getItem('eventDataLastDiff'),localStorage.getItem('firebase:lastPublishedAt'),localStorage.getItem('firebase:lastRemoteCount'),localStorage.getItem('rptSystemLogV2')
].join('|');}
function setText(id,value){const node=$(id);if(node)node.textContent=value;}
function renderSummary(){
  const count=getEventCount();
  const fileName=localStorage.getItem('excelSync:fileName')||'Pendiente';
  const lastCheck=localStorage.getItem('excelSync:lastCheck');
  const updatedAt=localStorage.getItem('eventDataUpdatedAt');
  const lastPublished=localStorage.getItem('firebase:lastPublishedAt');
  const remoteCount=Number(localStorage.getItem('firebase:lastRemoteCount')||0);
  const diff=safeJson('eventDataLastDiff',{created:0,updated:0,deleted:0,total:count,at:''});
  const changeTotal=Number(diff.created||0)+Number(diff.updated||0)+Number(diff.deleted||0);
  const excelReady=Boolean(count&&fileName!=='Pendiente');
  const cloudReady=Boolean(lastPublished&&remoteCount>=0);
  const health=Math.round((excelReady?50:count?30:10)+(cloudReady?50:lastPublished?30:10));
  const status=excelReady&&cloudReady?'Operativo':count?'Parcial':'Preparando';

  const values={
    excelRecordCount:count.toLocaleString('es-CO'),excelRecordDetail:count.toLocaleString('es-CO'),excelFileName:fileName,
    excelLastCheck:formatDateTime(lastCheck,'Sin comprobación'),excelCheckDetail:formatDateTime(lastCheck,'—'),
    dataHealthText:count?'Información disponible':'Esperando información',
    excelSummary:count?`Última carga válida ${formatDateTime(updatedAt,'sin fecha registrada')}.`:'Vincula el archivo maestro para iniciar la actualización automática.',
    mobileRemoteCount:remoteCount.toLocaleString('es-CO'),mobileLastPublish:formatDateTime(lastPublished,'Sin publicación'),
    mobilePublishDetail:formatDateTime(lastPublished,'—'),mobileState:lastPublished&&remoteCount>0?'Sincronizada':lastPublished?'Verificando':'Pendiente',
    mobileSummary:lastPublished?`${remoteCount.toLocaleString('es-CO')} registros publicados en la Agenda Móvil.`:'La publicación se activará cuando Firebase y el archivo maestro estén disponibles.',
    diffCreated:Number(diff.created||0).toLocaleString('es-CO'),diffUpdated:Number(diff.updated||0).toLocaleString('es-CO'),diffDeleted:Number(diff.deleted||0).toLocaleString('es-CO'),
    changeTotal:changeTotal.toLocaleString('es-CO'),diffUpdatedAt:formatDateTime(diff.at,'Sin cambios'),healthPercent:`${health}%`,healthTitle:status,
    healthDetail:excelReady&&cloudReady?'Excel y Agenda Móvil están disponibles.':count?'Los datos locales están listos; verificando nube.':'Esperando el archivo maestro.',
    topSystemStatus:status,sidebarSyncText:cloudReady?'Agenda conectada':excelReady?'Excel disponible':'Sincronización iniciando',
    excelLaneState:excelReady?'Listo':count?'Datos locales':'Preparando',firebaseLaneState:cloudReady?'En línea':lastPublished?'Verificando':'Conectando'
  };
  Object.entries(values).forEach(([id,value])=>setText(id,value));
  $('excelLaneState')?.classList.toggle('is-ready',excelReady);$('firebaseLaneState')?.classList.toggle('is-ready',cloudReady);
  $('excelLaneState')?.classList.toggle('is-warning',!excelReady);$('firebaseLaneState')?.classList.toggle('is-warning',!cloudReady);
}
function escapeHtml(value){return text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
function emptyLog(title,detail){return`<div class="empty-log"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div></div>`;}
function logItem(entry){return`<article class="log-item is-${escapeHtml(entry.level||'info')}"><div class="log-time">${escapeHtml(formatDateTime(entry.timestamp,'—'))}</div><div class="log-content"><strong>${escapeHtml(entry.title||'Actividad registrada')}</strong><p>${escapeHtml(entry.detail||'')}</p></div><span class="log-source">${escapeHtml(entry.source||'Sistema')}</span></article>`;}
function changeItem(entry){
  const title=entry.type==='creado'?`Evento creado · ${entry.company||'Empresa'}`:entry.type==='eliminado'?`Evento eliminado · ${entry.company||'Empresa'}`:`${entry.field||'Campo'} actualizado · ${entry.company||'Empresa'}`;
  const context=[entry.user,entry.host,entry.sheet,entry.cell].filter(Boolean).join(' · ');
  return`<article class="change-item"><div class="log-time">${escapeHtml(formatDateTime(entry.timestamp,'—'))}</div><div class="log-content"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(context||'Cambio detectado en el archivo maestro')}</p>${entry.type==='actualizado'?`<div class="change-values"><span title="${escapeHtml(entry.before||'Vacío')}">${escapeHtml(entry.before||'Vacío')}</span><b>→</b><span title="${escapeHtml(entry.after||'Vacío')}">${escapeHtml(entry.after||'Vacío')}</span></div>`:''}</div><span class="log-source">${escapeHtml(entry.type||'Excel')}</span></article>`;
}
async function renderActivity(force=false){
  if(!force&&document.hidden)return;
  try{
    if(activityTab==='changes'){
      const audit=await import('./audit-store.js');const changes=await audit.getRecent(ACTIVITY_LIMIT);
      $('changeLogList').innerHTML=changes.length?changes.map(changeItem).join(''):emptyLog('Sin cambios recientes','Las modificaciones del Excel aparecerán aquí.');setText('changeLogCount',changes.length);
    }else{
      const logModule=await import('./system-log.js');
      const logs=logModule.getSystemLogs({limit:48}).filter(entry=>!/recuperando|documentos faltantes/i.test(`${entry.title} ${entry.detail}`));
      const groups={excel:logs.filter(entry=>entry.source==='Excel'&&entry.level!=='error').slice(0,ACTIVITY_LIMIT),mobile:logs.filter(entry=>entry.source==='Firebase'&&entry.level!=='error').slice(0,ACTIVITY_LIMIT),errors:logs.filter(entry=>entry.level==='error'||entry.level==='warning').slice(0,ACTIVITY_LIMIT)};
      const entries=groups[activityTab]||[];const id=activityTab==='excel'?'excelLogList':activityTab==='mobile'?'mobileLogList':'errorLogList';const countId=activityTab==='excel'?'excelLogCount':activityTab==='mobile'?'mobileLogCount':'errorLogCount';
      const emptyTitle=activityTab==='excel'?'Sin cargues registrados':activityTab==='mobile'?'Sin publicaciones registradas':'Sin alertas recientes';
      $(id).innerHTML=entries.length?entries.map(logItem).join(''):emptyLog(emptyTitle,'La actividad aparecerá aquí automáticamente.');setText(countId,entries.length);
    }
    activityLoaded=true;
  }catch(error){const current=document.querySelector('[data-activity-view].is-active .log-list,[data-activity-view].is-active .change-list');if(current)current.innerHTML=emptyLog('No fue posible leer la actividad',error.message||'Error desconocido');}
}
async function refreshDashboard(force=false){const fingerprint=currentFingerprint();if(!force&&fingerprint===lastFingerprint)return;lastFingerprint=fingerprint;renderSummary();if(activityLoaded||force)await renderActivity(force);}
function scheduleRefresh(force=false){if(refreshPending)return;refreshPending=true;requestAnimationFrame(async()=>{refreshPending=false;await refreshDashboard(force);});}
function activateTab(tab){activityTab=tab;document.querySelectorAll('[data-activity-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.activityTab===tab));document.querySelectorAll('[data-activity-view]').forEach(view=>view.classList.toggle('is-active',view.dataset.activityView===tab));renderActivity(true);}
function idle(task,timeout=900){if('requestIdleCallback'in window)requestIdleCallback(()=>task(),{timeout});else setTimeout(task,180);}
function loadScript(src){return new Promise((resolve,reject)=>{const found=document.querySelector(`script[data-runtime-src="${src}"]`);if(found){if(found.dataset.loaded==='1')resolve();else found.addEventListener('load',resolve,{once:true});return;}const script=document.createElement('script');script.src=src;script.defer=true;script.dataset.runtimeSrc=src;script.addEventListener('load',()=>{script.dataset.loaded='1';resolve();},{once:true});script.addEventListener('error',()=>reject(new Error(`No se pudo cargar ${src}`)),{once:true});document.head.appendChild(script);});}
async function loadExcelRuntime(){
  if(excelRuntimePromise)return excelRuntimePromise;
  excelRuntimePromise=(async()=>{const placeholder=document.querySelector('[data-excel-sync-slot] .runtime-placeholder');try{if(!window.XLSX){try{await loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');}catch(_){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');}}await loadScript('js/excel-sync.js?v=20260827-5');placeholder?.remove();}catch(error){if(placeholder)placeholder.innerHTML='<div><strong>Excel no pudo iniciar</strong><small>Pulsa Gestionar Excel para reintentar.</small></div>';excelRuntimePromise=null;console.error(error);}})();
  return excelRuntimePromise;
}
async function startOperationalModules(){
  if(operationalModulesStarted)return;operationalModulesStarted=true;
  const cloudPlaceholder=document.querySelector('[data-firebase-sync-slot] .runtime-placeholder');
  loadExcelRuntime();
  import('./firebase-sync.js').then(()=>cloudPlaceholder?.remove()).catch(error=>{if(cloudPlaceholder)cloudPlaceholder.innerHTML='<div><strong>Firebase no pudo iniciar</strong><small>Comprueba la conexión.</small></div>';console.error(error);});
  idle(()=>import('./notifications.js').catch(()=>{}),1400);idle(()=>import('./device-heartbeat.js').catch(()=>{}),1800);idle(()=>import('./theme-cloud.js').then(module=>module.watchCloudAppearance('index')).catch(()=>{}),2000);
}
function hideLoader(){const loader=$('loader');if(!loader)return;loader.classList.add('is-hidden');setTimeout(()=>loader.remove(),260);}
function openSidebar(){const sidebar=$('appSidebar');sidebar?.classList.add('is-open');$('sidebarToggle')?.setAttribute('aria-expanded','true');if($('sidebarBackdrop'))$('sidebarBackdrop').hidden=false;}
function closeSidebar(){const sidebar=$('appSidebar');sidebar?.classList.remove('is-open');$('sidebarToggle')?.setAttribute('aria-expanded','false');if($('sidebarBackdrop'))$('sidebarBackdrop').hidden=true;}
async function openExcel(){await loadExcelRuntime();document.getElementById('excelSyncControl')?.click();}

const session=window.__RPT_AUTH_SESSION__||{};
const isViewer=session.role!=='admin';

function dailyMessage(){
  const messages=[
    'Cada detalle bien hecho hace que el evento se sienta extraordinario.',
    'La excelencia se construye con pequeños cuidados repetidos cada día.',
    'Un equipo coordinado convierte una agenda exigente en una gran experiencia.',
    'Hoy es una nueva oportunidad para hacer el trabajo con calma, precisión y orgullo.',
    'Cuando la información está clara, el servicio fluye y las personas lo sienten.',
    'Lo profesional también se nota en lo simple: puntualidad, orden y atención.',
    'Cada evento es una oportunidad para dejar una impresión positiva y duradera.',
    'Organizar bien hoy hace que mañana sea más fácil para todo el equipo.',
    'La actitud transforma una tarea cotidiana en un servicio memorable.',
    'Avanza paso a paso: lo importante es mantener la calidad en cada decisión.',
    'Tu trabajo suma. Cada dato correcto ayuda a que todo el equipo funcione mejor.',
    'La mejor operación es la que se siente sencilla porque detrás hubo buen trabajo.'
  ];
  const now=new Date();
  const seed=Number(`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`);
  return messages[seed%messages.length];
}
function initViewer(){
  const now=new Date();
  const hour=now.getHours();
  setText('viewerUserName',session.displayName||session.username||'Usuario');
  setText('viewerGreeting',`${hour<12?'Buenos días':hour<18?'Buenas tardes':'Buenas noches'}, ${session.displayName||session.username||'equipo'}.`);
  setText('viewerDate',now.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
  setText('viewerDailyMessage',dailyMessage());
  $('viewerLogoutButton')?.addEventListener('click',()=>import('./local-auth.js').then(module=>{module.logout();location.replace('login.html');}));
  requestAnimationFrame(()=>requestAnimationFrame(hideLoader));
  import('./pwa.js').catch(()=>{});
}
function initAdmin(){
  for(const button of document.querySelectorAll('[data-activity-tab]'))button.addEventListener('click',()=>activateTab(button.dataset.activityTab));
  $('refreshDashboard')?.addEventListener('click',()=>{scheduleRefresh(true);startOperationalModules();window.ExcelFileSync?.refresh?.();});
  $('quickExcelButton')?.addEventListener('click',openExcel);
  $('toolCenter')?.addEventListener('toggle',event=>{if(event.currentTarget.open){startOperationalModules();renderActivity(true);}});
  $('sidebarToggle')?.addEventListener('click',openSidebar);$('sidebarClose')?.addEventListener('click',closeSidebar);$('sidebarBackdrop')?.addEventListener('click',closeSidebar);
  window.addEventListener('resize',()=>{if(innerWidth>960)closeSidebar();},{passive:true});
  ['eventDataUpdated','eventAuditUpdated','firebaseEventsPublished','rptSystemLogUpdated'].forEach(name=>window.addEventListener(name,()=>scheduleRefresh(true)));
  window.addEventListener('storage',event=>{if(!event.key||/eventData|excelSync|firebase|rptSystemLog/.test(event.key))scheduleRefresh(false);});
  updateClock();renderSummary();
  requestAnimationFrame(()=>requestAnimationFrame(hideLoader));
  Promise.allSettled([import('./session-ui.js'),import('./pwa.js')]);
  setInterval(updateClock,30000);setInterval(()=>scheduleRefresh(false),60000);idle(startOperationalModules,1400);
}

if(isViewer)initViewer();else initAdmin();
