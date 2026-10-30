const $=id=>document.getElementById(id);
const text=value=>value===undefined||value===null?'':String(value);

let refreshPending=false;
let lastFingerprint='';
let eventCountCache={stamp:'',count:0};
let activityTab='excel';

function formatDateTime(value,fallback='—'){
  if(!value)return fallback;
  const date=new Date(value);
  return Number.isNaN(date.getTime())
    ?fallback
    :date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}
function updateClock(){
  const now=new Date();
  $('todayLabel').textContent=now.toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short'});
  $('reloj').textContent=now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
}
function getEventCount(){
  const stamp=localStorage.getItem('eventDataUpdatedAt')||'';
  if(eventCountCache.stamp===stamp)return eventCountCache.count;
  let count=0;
  try{
    const rows=JSON.parse(localStorage.getItem('eventData')||'[]');
    count=Array.isArray(rows)?rows.length:0;
  }catch(_){
    count=0;
  }
  eventCountCache={stamp,count};
  return count;
}
function currentFingerprint(){
  return[
    localStorage.getItem('eventDataUpdatedAt'),
    localStorage.getItem('excelSync:fileName'),
    localStorage.getItem('excelSync:lastCheck'),
    localStorage.getItem('firebase:lastPublishedAt'),
    localStorage.getItem('firebase:lastRemoteCount'),
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

  $('excelRecordCount').textContent=count.toLocaleString('es-CO');
  $('excelRecordDetail').textContent=count.toLocaleString('es-CO');
  $('excelFileName').textContent=fileName;
  $('excelLastCheck').textContent=formatDateTime(lastCheck,'Sin comprobación');
  $('excelCheckDetail').textContent=formatDateTime(lastCheck,'—');
  $('dataHealthText').textContent=count?'Información disponible':'Esperando información';
  $('excelSummary').textContent=count
    ?`Última carga válida ${formatDateTime(updatedAt,'sin fecha registrada')}.`
    :'Vincula el archivo maestro para iniciar la actualización automática.';

  $('mobileRemoteCount').textContent=remoteCount.toLocaleString('es-CO');
  $('mobileLastPublish').textContent=formatDateTime(lastPublished,'Sin publicación');
  $('mobilePublishDetail').textContent=formatDateTime(lastPublished,'—');
  $('mobileState').textContent=lastPublished&&remoteCount>0?'Sincronizada':lastPublished?'Verificando':'Pendiente';
  $('mobileSummary').textContent=lastPublished
    ?`${remoteCount.toLocaleString('es-CO')} registros publicados en la Agenda Móvil.`
    :'La publicación se activará cuando Firebase y el archivo maestro estén disponibles.';

}
function logItem(entry){
  const time=formatDateTime(entry.timestamp,'—');
  return`<article class="log-item is-${entry.level||'info'}">
    <div class="log-time">${time}</div>
    <div class="log-content">
      <strong>${escapeHtml(entry.title||'Actividad registrada')}</strong>
      <p>${escapeHtml(entry.detail||'')}</p>
    </div>
    <span class="log-source">${escapeHtml(entry.source||'Sistema')}</span>
  </article>`;
}
function escapeHtml(value){
  return text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
function emptyLog(title,detail){
  return`<div class="empty-log"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
}
function renderLogList(id,entries,emptyTitle){
  const target=$(id);
  target.innerHTML=entries.length
    ?entries.map(logItem).join('')
    :emptyLog(emptyTitle,'La actividad aparecerá aquí automáticamente.');
}
async function renderActivity(){
  try{
    const logModule=await import('./system-log.js');
    const rawLogs=logModule.getSystemLogs({limit:100})
      .filter(entry=>!/recuperando|documentos faltantes/i.test(`${entry.title} ${entry.detail}`));
    const excel=rawLogs.filter(entry=>entry.source==='Excel'&&entry.level!=='error');
    const mobile=rawLogs.filter(entry=>entry.source==='Firebase'&&entry.level!=='error');
    const errors=rawLogs.filter(entry=>entry.level==='error'||entry.level==='warning');

    renderLogList('excelLogList',excel,'Sin cargues registrados');
    renderLogList('mobileLogList',mobile,'Sin publicaciones registradas');
    renderLogList('errorLogList',errors,'Sin errores ni advertencias');

    $('excelLogCount').textContent=excel.length;
    $('mobileLogCount').textContent=mobile.length;
    $('errorLogCount').textContent=errors.length;
  }catch(error){
    $('errorLogList').innerHTML=emptyLog('No fue posible leer la actividad',error.message||'Error desconocido');
  }
}
async function refreshDashboard(force=false){
  const fingerprint=currentFingerprint();
  if(!force&&fingerprint===lastFingerprint)return;
  lastFingerprint=fingerprint;
  renderSummary();
  await renderActivity();
}
function scheduleRefresh(force=false){
  if(refreshPending&&!force)return;
  refreshPending=true;
  requestAnimationFrame(async()=>{
    refreshPending=false;
    await refreshDashboard(force);
  });
}
function activateTab(tab){
  activityTab=tab;
  document.querySelectorAll('[data-activity-tab]').forEach(button=>{
    button.classList.toggle('is-active',button.dataset.activityTab===tab);
  });
  document.querySelectorAll('[data-activity-view]').forEach(view=>{
    view.classList.toggle('is-active',view.dataset.activityView===tab);
  });
}

document.querySelectorAll('[data-activity-tab]').forEach(button=>{
  button.addEventListener('click',()=>activateTab(button.dataset.activityTab));
});
$('refreshDashboard').addEventListener('click',()=>scheduleRefresh(true));
window.addEventListener('eventDataUpdated',()=>scheduleRefresh(true));
window.addEventListener('firebaseEventsPublished',()=>scheduleRefresh(true));
window.addEventListener('rptSystemLogUpdated',()=>scheduleRefresh(true));
window.addEventListener('storage',()=>scheduleRefresh(true));
window.addEventListener('load',()=>{
  setTimeout(()=>$('loader')?.classList.add('is-hidden'),160);
});

updateClock();
setInterval(updateClock,30000);
setInterval(()=>scheduleRefresh(false),15000);
activateTab(activityTab);
scheduleRefresh(true);
