const $ = id => document.getElementById(id);
const text = value => value === undefined || value === null ? '' : String(value);

function parseJSON(key,fallback){
  try{
    const value=JSON.parse(localStorage.getItem(key)||'');
    return value ?? fallback;
  }catch(_){
    return fallback;
  }
}

function formatDate(value){
  if(!value) return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}

function escapeHtml(value){
  return text(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));
}

function eventCount(){
  try{
    const rows=JSON.parse(localStorage.getItem('eventData')||'[]');
    return Array.isArray(rows) ? rows.length : 0;
  }catch(_){
    return 0;
  }
}

function updateClock(){
  const now=new Date();
  $('todayLabel').textContent=now.toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short'});
  $('reloj').textContent=now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
}

function renderSummary(){
  const fileMeta=parseJSON('excelSync:fileMeta',null);
  const diff=parseJSON('eventDataLastDiff',{});
  const records=eventCount();
  const published=localStorage.getItem('firebase:lastPublishedAt');
  const remoteCount=Number(localStorage.getItem('firebase:lastRemoteCount')||0);

  $('excelFileName').textContent=fileMeta?.name || localStorage.getItem('excelSync:fileName') || 'Pendiente';
  $('excelLastCheck').textContent=formatDate(localStorage.getItem('excelSync:lastCheck'));
  $('excelRecordCount').textContent=records.toLocaleString('es-CO');
  $('excelSummary').textContent=records
    ? `Archivo disponible. Comprobación automática cada 15 segundos.`
    : 'Selecciona el archivo maestro para iniciar la sincronización.';

  $('mobileLastPublish').textContent=formatDate(published);
  $('mobileRemoteCount').textContent=remoteCount.toLocaleString('es-CO');
  $('mobileState').textContent=published ? 'Sincronizado' : 'Pendiente';
  $('mobileSummary').textContent=published
    ? `Última publicación registrada correctamente.`
    : 'La publicación comenzará cuando Firebase y el Excel estén disponibles.';

  $('diffCreated').textContent=Number(diff.created||0).toLocaleString('es-CO');
  $('diffUpdated').textContent=Number(diff.updated||0).toLocaleString('es-CO');
  $('diffDeleted').textContent=Number(diff.deleted||0).toLocaleString('es-CO');
  $('diffUpdatedAt').textContent=formatDate(diff.at || localStorage.getItem('eventDataUpdatedAt'));
}

function logItem(entry){
  const time=formatDate(entry.timestamp);
  return `
    <article class="log-item is-${escapeHtml(entry.level||'info')}">
      <i class="log-dot"></i>
      <div class="log-main">
        <strong>${escapeHtml(entry.title||'Actividad')}</strong>
        <p>${escapeHtml(entry.detail||'')}</p>
      </div>
      <span class="log-time">${escapeHtml(time)}</span>
    </article>
  `;
}

function empty(message){
  return `<div class="empty-list"><strong>Sin registros</strong><span>${escapeHtml(message)}</span></div>`;
}

async function renderSystemLogs(){
  try{
    const module=await import('./system-log.js');
    const logs=module.getSystemLogs({limit:100});
    const excel=logs.filter(item=>item.source==='Excel').slice(0,35);
    const mobile=logs.filter(item=>item.source==='Firebase'||item.source==='Agenda Móvil').slice(0,35);
    const errors=logs.filter(item=>item.level==='error'||item.level==='warning').slice(0,35);

    $('excelLogCount').textContent=excel.length;
    $('mobileLogCount').textContent=mobile.length;
    $('errorLogCount').textContent=errors.length;
    $('excelLogList').innerHTML=excel.length ? excel.map(logItem).join('') : empty('Los cargues y comprobaciones del Excel aparecerán aquí.');
    $('mobileLogList').innerHTML=mobile.length ? mobile.map(logItem).join('') : empty('Las publicaciones de la Agenda Móvil aparecerán aquí.');
    $('errorLogList').innerHTML=errors.length ? errors.map(logItem).join('') : empty('No hay errores ni advertencias registrados.');
  }catch(error){
    $('errorLogList').innerHTML=empty(error.message||'No fue posible abrir el diagnóstico.');
  }
}

function changeItem(entry){
  const title=entry.type==='creado'
    ? `Registro creado · ${entry.company||'Empresa'}`
    : entry.type==='eliminado'
      ? `Registro eliminado · ${entry.company||'Empresa'}`
      : `${entry.field||'Campo'} modificado · ${entry.company||'Empresa'}`;

  return `
    <article class="change-item">
      <strong>${escapeHtml(title)}</strong>
      <div class="change-meta">
        <span>${escapeHtml(formatDate(entry.timestamp))}</span>
        <span>${escapeHtml(entry.host||'Equipo')}</span>
        <span>${escapeHtml(entry.user||'Usuario')}</span>
        <span>${escapeHtml(entry.cell||entry.sheet||'')}</span>
      </div>
      ${entry.type==='actualizado' ? `
        <div class="change-values">
          <span>${escapeHtml(entry.before||'Vacío')}</span><b>→</b><span>${escapeHtml(entry.after||'Vacío')}</span>
        </div>
      ` : ''}
    </article>
  `;
}

async function renderChanges(){
  try{
    const module=await import('./audit-store.js');
    const entries=await module.getRecent(80);
    $('changeLogCount').textContent=entries.length;
    $('changeLogList').innerHTML=entries.length ? entries.map(changeItem).join('') : empty('Los cambios de celdas del Excel aparecerán automáticamente.');
  }catch(error){
    $('changeLogList').innerHTML=empty(error.message||'No fue posible abrir la auditoría.');
  }
}

async function refreshDashboard(){
  renderSummary();
  await Promise.all([renderSystemLogs(),renderChanges()]);
}

window.addEventListener('load',()=>setTimeout(()=>$('loader')?.classList.add('is-hidden'),180));
window.addEventListener('eventDataUpdated',refreshDashboard);
window.addEventListener('eventAuditUpdated',renderChanges);
window.addEventListener('rptSystemLogUpdated',renderSystemLogs);
window.addEventListener('firebaseEventsPublished',refreshDashboard);
window.addEventListener('storage',event=>{
  if([
    'eventData','eventDataUpdatedAt','eventDataLastDiff','excelSync:fileMeta',
    'excelSync:lastCheck','firebase:lastPublishedAt','firebase:lastRemoteCount'
  ].includes(event.key)) refreshDashboard();
});

$('refreshDashboard').addEventListener('click',refreshDashboard);
updateClock();
setInterval(updateClock,30000);
setInterval(refreshDashboard,15000);
refreshDashboard();
