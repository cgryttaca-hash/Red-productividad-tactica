import {applyAppearance,readAppearanceCache} from './theme-settings.js';

const $=id=>document.getElementById(id);
const text=value=>value===undefined||value===null?'':String(value);
const ACTIVITY_LIMIT=24;
let refreshPending=false;
let lastFingerprint='';
let eventCountCache={stamp:'',count:0};
let activityTab='changes';
let operationalModulesStarted=false;
let activityLoaded=false;

applyAppearance('index',readAppearanceCache());

function safeJson(key,fallback){
  try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_){return fallback;}
}
function formatDateTime(value,fallback='—'){
  if(!value)return fallback;
  const source=value?.toDate?value.toDate():new Date(value);
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
  let count=0;
  try{const rows=JSON.parse(localStorage.getItem('eventData')||'[]');count=Array.isArray(rows)?rows.length:0;}catch(_){}
  eventCountCache={stamp,count};
  return count;
}
function currentFingerprint(){
  return[
    localStorage.getItem('eventDataUpdatedAt'),localStorage.getItem('excelSync:fileName'),
    localStorage.getItem('excelSync:lastCheck'),localStorage.getItem('eventDataLastDiff'),
    localStorage.getItem('firebase:lastPublishedAt'),localStorage.getItem('firebase:lastRemoteCount'),
    localStorage.getItem('rptSystemLogV2')
  ].join('|');
}
function renderSummary(){
  const count=getEventCount();
  const fileName=localStorage.getItem('excelSync:fileName')||'Pendiente';
  const lastCheck=localStorage.getItem('excelSync:lastCheck');
  const updatedAt=localStorage.getItem('eventDataUpdatedAt');
  const lastPublished=localStorage.getItem('firebase:lastPublishedAt');
  const remoteCount=Number(localStorage.getItem('firebase:lastRemoteCount')||0);
  const diff=safeJson('eventDataLastDiff',{created:0,updated:0,deleted:0,total:count,at:''});
  const changeTotal=Number(diff.created||0)+Number(diff.updated||0)+Number(diff.deleted||0);
  const values={
    excelRecordCount:count.toLocaleString('es-CO'),excelRecordDetail:count.toLocaleString('es-CO'),excelFileName:fileName,
    excelLastCheck:formatDateTime(lastCheck,'Sin comprobación'),excelCheckDetail:formatDateTime(lastCheck,'—'),
    dataHealthText:count?'Información disponible':'Esperando información',
    excelSummary:count?`Última carga válida ${formatDateTime(updatedAt,'sin fecha registrada')}.`:'Vincula el archivo maestro para iniciar la actualización automática.',
    mobileRemoteCount:remoteCount.toLocaleString('es-CO'),mobileLastPublish:formatDateTime(lastPublished,'Sin publicación'),
    mobilePublishDetail:formatDateTime(lastPublished,'—'),mobileState:lastPublished&&remoteCount>0?'Sincronizada':lastPublished?'Verificando':'Pendiente',
    mobileSummary:lastPublished?`${remoteCount.toLocaleString('es-CO')} registros publicados en la Agenda Móvil.`:'La publicación se activará cuando Firebase y el archivo maestro estén disponibles.',
    diffCreated:Number(diff.created||0).toLocaleString('es-CO'),diffUpdated:Number(diff.updated||0).toLocaleString('es-CO'),
    diffDeleted:Number(diff.deleted||0).toLocaleString('es-CO'),changeTotal:changeTotal.toLocaleString('es-CO'),diffUpdatedAt:formatDateTime(diff.at,'Sin cambios')
  };
  Object.entries(values).forEach(([id,value])=>{const node=$(id);if(node)node.textContent=value;});
}
function escapeHtml(value){return text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
function emptyLog(title,detail){return`<div class="empty-log"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;}
function logItem(entry){
  return`<article class="log-item is-${escapeHtml(entry.level||'info')}"><div class="log-time">${escapeHtml(formatDateTime(entry.timestamp,'—'))}</div><div class="log-content"><strong>${escapeHtml(entry.title||'Actividad registrada')}</strong><p>${escapeHtml(entry.detail||'')}</p></div><span class="log-source">${escapeHtml(entry.source||'Sistema')}</span></article>`;
}
function changeItem(entry){
  const title=entry.type==='creado'?`Evento creado · ${entry.company||'Empresa'}`:entry.type==='eliminado'?`Evento eliminado · ${entry.company||'Empresa'}`:`${entry.field||'Campo'} actualizado · ${entry.company||'Empresa'}`;
  return`<article class="change-item"><div class="log-time">${escapeHtml(formatDateTime(entry.timestamp,'—'))}</div><div class="log-content"><strong>${escapeHtml(title)}</strong><p>${escapeHtml([entry.user,entry.host,entry.sheet,entry.cell].filter(Boolean).join(' · '))}</p>${entry.type==='actualizado'?`<div class="change-values"><span>${escapeHtml(entry.before||'Vacío')}</span><b>→</b><span>${escapeHtml(entry.after||'Vacío')}</span></div>`:''}</div><span class="log-source">${escapeHtml(entry.type||'Excel')}</span></article>`;
}
async function renderActivity(force=false){
  if(!force&&document.hidden)return;
  try{
    if(activityTab==='changes'){
      const audit=await import('./audit-store.js');
      const changes=await audit.getRecent(ACTIVITY_LIMIT);
      $('changeLogList').innerHTML=changes.length?changes.map(changeItem).join(''):emptyLog('Sin cambios recientes','Las modificaciones del Excel aparecerán aquí.');
      $('changeLogCount').textContent=changes.length;
    }else{
      const logModule=await import('./system-log.js');
      const logs=logModule.getSystemLogs({limit:60}).filter(entry=>!/recuperando|documentos faltantes/i.test(`${entry.title} ${entry.detail}`));
      const groups={
        excel:logs.filter(entry=>entry.source==='Excel'&&entry.level!=='error').slice(0,ACTIVITY_LIMIT),
        mobile:logs.filter(entry=>entry.source==='Firebase'&&entry.level!=='error').slice(0,ACTIVITY_LIMIT),
        errors:logs.filter(entry=>entry.level==='error'||entry.level==='warning').slice(0,ACTIVITY_LIMIT)
      };
      const entries=groups[activityTab]||[];
      const id=activityTab==='excel'?'excelLogList':activityTab==='mobile'?'mobileLogList':'errorLogList';
      const countId=activityTab==='excel'?'excelLogCount':activityTab==='mobile'?'mobileLogCount':'errorLogCount';
      const emptyTitle=activityTab==='excel'?'Sin cargues registrados':activityTab==='mobile'?'Sin publicaciones registradas':'Sin errores ni advertencias';
      $(id).innerHTML=entries.length?entries.map(logItem).join(''):emptyLog(emptyTitle,'La actividad aparecerá aquí automáticamente.');
      $(countId).textContent=entries.length;
    }
    activityLoaded=true;
  }catch(error){
    const current=document.querySelector('[data-activity-view].is-active .log-list,[data-activity-view].is-active .change-list');
    if(current)current.innerHTML=emptyLog('No fue posible leer la actividad',error.message||'Error desconocido');
  }
}
async function refreshDashboard(force=false){
  const fingerprint=currentFingerprint();
  if(!force&&fingerprint===lastFingerprint)return;
  lastFingerprint=fingerprint;
  renderSummary();
  if(activityLoaded||force)await renderActivity(force);
}
function scheduleRefresh(force=false){
  if(refreshPending)return;
  refreshPending=true;
  requestAnimationFrame(async()=>{refreshPending=false;await refreshDashboard(force);});
}
function activateTab(tab){
  activityTab=tab;
  document.querySelectorAll('[data-activity-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.activityTab===tab));
  document.querySelectorAll('[data-activity-view]').forEach(view=>view.classList.toggle('is-active',view.dataset.activityView===tab));
  renderActivity(true);
}
function idle(task,timeout=800){
  if('requestIdleCallback'in window)requestIdleCallback(()=>task(),{timeout});else setTimeout(task,160);
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const found=document.querySelector(`script[data-runtime-src="${src}"]`);if(found){if(found.dataset.loaded==='1')resolve();else found.addEventListener('load',resolve,{once:true});return;}
    const script=document.createElement('script');script.src=src;script.defer=true;script.dataset.runtimeSrc=src;
    script.addEventListener('load',()=>{script.dataset.loaded='1';resolve();},{once:true});script.addEventListener('error',()=>reject(new Error(`No se pudo cargar ${src}`)),{once:true});
    document.head.appendChild(script);
  });
}
async function loadExcelRuntime(){
  const placeholder=document.querySelector('[data-excel-sync-slot] .control-placeholder');
  try{
    if(!window.XLSX){
      try{await loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');}
      catch(_){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');}
    }
    await loadScript('js/excel-sync.js?v=20260826-1');
    placeholder?.remove();
  }catch(error){if(placeholder)placeholder.textContent='Excel no pudo iniciar. Usa Actualizar panel para reintentar.';console.error(error);}
}
async function startOperationalModules(){
  if(operationalModulesStarted)return;operationalModulesStarted=true;
  const cloudPlaceholder=document.querySelector('[data-firebase-sync-slot] .control-placeholder');
  await Promise.allSettled([import('./notifications.js'),import('./performance-monitor.js')]);
  loadExcelRuntime();
  import('./firebase-sync.js').then(()=>cloudPlaceholder?.remove()).catch(error=>{if(cloudPlaceholder)cloudPlaceholder.textContent='Firebase no pudo iniciar.';console.error(error);});
  import('./device-heartbeat.js').catch(()=>{});
  import('./theme-cloud.js').then(module=>module.watchCloudAppearance('index')).catch(()=>{});
}
function hideLoader(){
  const loader=$('loader');if(!loader)return;
  loader.classList.add('is-hidden');setTimeout(()=>loader.remove(),280);
}

for(const button of document.querySelectorAll('[data-activity-tab]'))button.addEventListener('click',()=>activateTab(button.dataset.activityTab));
$('refreshDashboard')?.addEventListener('click',()=>{scheduleRefresh(true);startOperationalModules();window.ExcelFileSync?.refresh?.();});
['eventDataUpdated','eventAuditUpdated','firebaseEventsPublished','rptSystemLogUpdated'].forEach(name=>window.addEventListener(name,()=>scheduleRefresh(true)));
window.addEventListener('storage',event=>{if(!event.key||/eventData|excelSync|firebase|rptSystemLog/.test(event.key))scheduleRefresh(false);});

updateClock();
renderSummary();
activateTab(activityTab);
Promise.allSettled([import('./session-ui.js'),import('./pwa.js')]).finally(hideLoader);
setInterval(updateClock,30000);
setInterval(()=>scheduleRefresh(false),30000);
idle(startOperationalModules,650);
