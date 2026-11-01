import {requireControlAccess} from './admin-records.js';
import {SYSTEM_VERSION} from './system-version.js';
import {getSystemLogs} from './system-log.js';
import {formatBogota} from './maintenance-state.js';
import './technical-log.js';
const $=id=>document.getElementById(id),loaded=new Map(),sections=['system','activity','updates','maintenance'];let active='system';
function clock(){const now=new Date();$('todayLabel').textContent=now.toLocaleDateString('es-CO',{timeZone:'America/Bogota',weekday:'short',day:'2-digit',month:'short'});$('reloj').textContent=now.toLocaleTimeString('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit'});}
function resource(source,style=false){if(loaded.has(source))return loaded.get(source);const task=new Promise((resolve,reject)=>{const node=document.createElement(style?'link':'script');if(style){node.rel='stylesheet';node.href=source;}else node.src=source;node.onload=resolve;node.onerror=()=>{node.remove();loaded.delete(source);reject(Error('No se pudo cargar el recurso. Comprueba la conexión y vuelve a abrir esta sección.'));};document.head.append(node);});loaded.set(source,task);return task;}
let connections;
function startConnections(){return connections||(connections=(async()=>{await Promise.all(['css/excel-sync.css','css/firebase-sync.css'].map(source=>resource(source,true)));await resource('assets/vendor/xlsx-0.20.3.min.js');await resource('js/excel-sync.js');await import('./firebase-sync.js');renderConnections();})().catch(error=>{connections=null;throw error;}));}
function renderConnections(){
 const get=key=>localStorage.getItem(key),name=get('excelSync:fileName'),stamp=get('excelSync:lastCheck'),published=get('firebase:lastPublishedAt');
 $('excelFileName').textContent=name||'Sin archivo vinculado';$('excelLastCheck').textContent=stamp?formatBogota(stamp):'Sin comprobación registrada';
 $('excelSummary').textContent=name?'Archivo registrado en este navegador. El control de Excel muestra su permiso y estado actual.':'Vincula el archivo mediante el control original de Excel.';
 $('mobileLastPublish').textContent=published?formatBogota(published):'Sin publicación registrada';
 $('mobileSummary').textContent=published?'Última publicación registrada en este navegador. El control de Firebase informa la conexión actual.':'La conexión y publicación se gestionan con el control original de Firebase.';
 $('runtimeVersion').textContent=SYSTEM_VERSION;$('deploymentHost').textContent=location.origin;$('workerState').textContent=navigator.serviceWorker?.controller?'Gestor controla esta página':'Sin controlador activo en esta página';
}
function renderLogs(){
 const target=$('technicalLogList');target.replaceChildren();const entries=getSystemLogs({limit:120}).filter(entry=>entry&&Number.isFinite(Date.parse(entry.timestamp))).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
 $('logNote').textContent='Registro local de solo lectura · más reciente primero · hasta 120 entradas. No es una auditoría de servidor.';
 for(const entry of entries){const row=document.createElement('tr');for(const text of [formatBogota(entry.timestamp),entry.source,entry.level==='error'?'Error':entry.level==='warning'?'Aviso':entry.level==='success'?'Confirmado':'Información',entry.title,entry.detail]){const cell=document.createElement('td');cell.textContent=text||'—';row.append(cell);}target.append(row);}
 if(!entries.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.textContent='Todavía no hay actividad registrada en este navegador.';row.append(cell);target.append(row);}
}
const labels={checking:'Comprobando actualización',current:'Sistema actualizado',available:'Actualización disponible y verificada',downloading:'Descargando y verificando',verifying:'Verificando integridad',ready:'Actualización preparada',preparing:'Actualización en preparación',activating:'Actualización en progreso',activated:'Versión activada',completed:'Actualización confirmada',error:'Error de comprobación'};
function renderUpdates(){
 const updates=window.RPTUpdates,state=updates?.state||{};$('configuredRelease').textContent=SYSTEM_VERSION;
 $('availableRelease').textContent=state.phase==='current'?state.version||SYSTEM_VERSION:state.newVersion||'Pendiente de comprobación';$('technicalUpdateState').textContent=labels[state.phase]||'Pendiente de comprobación';$('technicalCheckedAt').textContent=state.checkedAt?formatBogota(state.checkedAt):'Sin comprobación registrada';
 $('automaticMode').textContent='Detección automática al iniciar, recuperar conexión y durante el uso. '+(updates?.automatic===false?'La activación automática está desactivada en las preferencias actuales.':'La activación conserva la protección de ediciones pendientes.');$('technicalUpdateError').textContent=state.phase==='error'?state.message||'La verificación no se completó. Se conserva la versión activa.':'';
 const progress=$('technicalUpdateProgress'),visible=['downloading','verifying'].includes(state.phase)&&state.total>0;progress.hidden=!visible;if(visible){progress.max=state.total;progress.value=state.verified||state.done||0;}$('technicalResources').textContent=visible?`${state.verified||state.done||0} de ${state.total} recursos verificados`:'';$('checkSystemUpdate').disabled=['checking','downloading','verifying','preparing','activating'].includes(state.phase);
}
async function select(name,focus=false){
 requireControlAccess();if(!sections.includes(name))return;active=name;document.documentElement.dataset.currentControlSection=name;
 for(const button of document.querySelectorAll('[data-control-section]')){const chosen=button.dataset.controlSection===name;button.setAttribute('aria-selected',String(chosen));button.tabIndex=chosen?0:-1;if(chosen&&focus)button.focus();}for(const section of document.querySelectorAll('.technical-panel'))section.hidden=section.id!=='admin-panel-'+name;$('controlSectionMessage').textContent='';
 try{if(name==='system')await startConnections();if(name==='activity')renderLogs();if(name==='updates'){renderUpdates();await window.__RPT_PWA_REGISTRATION__;try{await window.RPTUpdates?.status();}catch(_){}renderUpdates();}if(name==='maintenance'&&!loaded.has('maintenance')){const task=import('./maintenance-admin.js').then(module=>module.mount($('admin-panel-maintenance')));loaded.set('maintenance',task);task.catch(()=>loaded.delete('maintenance'));await task;}}catch(error){if(active===name)$('controlSectionMessage').textContent=error.message;if(!window.RPTPageLoad?.state.ready)window.RPTPageLoad?.fail('No fue posible preparar los controles técnicos. Comprueba la conexión y reintenta la carga.');}
}
if(window.RPTAdminAccess?.hasAccess()){
 clock();renderConnections();renderUpdates();$('logoutButton').addEventListener('click',async()=>{const{logout}=await import('./local-auth.js');logout();location.replace('login.html');});
 $('controlNavigation').addEventListener('click',event=>{const button=event.target.closest('[data-control-section]');if(button)select(button.dataset.controlSection);});
 $('controlNavigation').addEventListener('keydown',event=>{const buttons=[...document.querySelectorAll('[data-control-section]')],index=buttons.indexOf(document.activeElement);let n;if(['ArrowRight','ArrowDown'].includes(event.key))n=(index+1)%buttons.length;else if(['ArrowLeft','ArrowUp'].includes(event.key))n=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=buttons.length-1;else return;event.preventDefault();select(buttons[n].dataset.controlSection,true);});
 window.addEventListener('rptSystemLogUpdated',()=>{if(active==='activity')renderLogs();renderConnections();});window.addEventListener('rptUpdateState',renderUpdates);window.addEventListener('rptReleaseConfirmed',renderConnections);window.addEventListener('eventDataUpdated',renderConnections);window.addEventListener('storage',()=>{renderConnections();if(active==='activity')renderLogs();});
 const timer=setInterval(()=>{if(!document.hidden){clock();renderConnections();}},30000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});select('system').then(()=>window.RPTPageLoad?.ready());
}
