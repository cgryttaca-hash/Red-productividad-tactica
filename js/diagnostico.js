import {FIREBASE_CONFIG,EVENTS_COLLECTION,META_COLLECTION,FIREBASE_VAPID_KEY,FIREBASE_APP_CHECK_SITE_KEY} from './firebase-config.js';
import {getSession,logout} from './local-auth.js';
import {getValidationReport,validateRows,saveValidationReport} from './validation.js';
import {getMetrics} from './performance-monitor.js';
import {listSnapshots} from './backup-store.js';
import {SYSTEM_VERSION,PROTECTED_MODULES} from './system-version.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const $=id=>document.getElementById(id);
let lastReport=null;

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function formatBytes(bytes){
  const value=Number(bytes)||0;if(!value)return'0 B';
  const units=['B','KB','MB','GB'];const i=Math.min(units.length-1,Math.floor(Math.log(value)/Math.log(1024)));
  return `${(value/1024**i).toFixed(i?1:0)} ${units[i]}`;
}
function readRows(){try{const rows=JSON.parse(localStorage.getItem('eventData')||'[]');return Array.isArray(rows)?rows:[];}catch(_){return[];}}
function message(value,type='info'){
  const el=$('diagnosticMessage');el.hidden=!value;el.className=`message ${type}`;el.textContent=value||'';
}
function checkItem(check){
  return `<article class="list-item"><div><strong>${esc(check.label)}</strong><span>${esc(check.detail)}</span></div><span class="status ${check.state}">${esc(check.text)}</span></article>`;
}
async function firebaseCheck(){
  const [appMod,authMod,fireMod]=await Promise.all([
    import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`),import(`${SDK}/firebase-firestore.js`)
  ]);
  const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
  const auth=authMod.getAuth(app);const db=fireMod.getFirestore(app);
  try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  if(!auth.currentUser){
    try{await authMod.signInAnonymously(auth);}catch(error){throw new Error(`Firebase Authentication: ${error.code||error.message}`);}
  }
  const started=performance.now();
  const countSnapshot=await fireMod.getCountFromServer(fireMod.collection(db,EVENTS_COLLECTION));
  const metaSnapshot=await fireMod.getDoc(fireMod.doc(db,META_COLLECTION,'publicacion'));
  return {
    count:countSnapshot.data().count,
    duration:Math.round(performance.now()-started),
    user:auth.currentUser?.isAnonymous?'Sesión anónima':auth.currentUser?.email||'Sesión Firebase',
    meta:metaSnapshot.exists()?metaSnapshot.data():null
  };
}

async function sha256(buffer){
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function protectedIntegrity(){
  const results=[];
  for(const [path,expected] of Object.entries(PROTECTED_MODULES)){
    try{
      const response=await fetch(path,{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const actual=await sha256(await response.arrayBuffer());
      results.push({path,ok:actual===expected,actual,expected});
    }catch(error){results.push({path,ok:false,error:error.message,expected});}
  }
  return results;
}

async function serviceWorkerCheck(){
  if(!('serviceWorker'in navigator))return{supported:false,active:false};
  const registration=await navigator.serviceWorker.getRegistration();
  return{supported:true,active:Boolean(registration?.active),scope:registration?.scope||''};
}
async function runDiagnostics(){
  $('runDiagnostics').disabled=true;message('');
  const rows=readRows();
  const checks=[];
  const started=performance.now();
  $('localCount').textContent=rows.length.toLocaleString('es-CO');
  $('localDetail').textContent=localStorage.getItem('excelSync:fileName')||'Archivo no vinculado';

  const excelMeta=(()=>{try{return JSON.parse(localStorage.getItem('excelSync:fileMeta')||'null');}catch(_){return null;}})();
  checks.push({
    label:'Archivo maestro',
    state:excelMeta?'ok':'warn',text:excelMeta?'Vinculado':'Pendiente',
    detail:excelMeta?`${excelMeta.name} · última modificación ${new Date(excelMeta.lastModified).toLocaleString('es-CO')}`:'Selecciona el Excel desde el Index.'
  });
  checks.push({
    label:'Base local de eventos',
    state:rows.length?'ok':'error',text:rows.length?'Disponible':'Vacía',
    detail:`${rows.length} registros en el navegador.`
  });

  let storage={usage:0,quota:0};
  try{storage=await navigator.storage.estimate();}catch(_){}
  const percentage=storage.quota?Math.round((storage.usage/storage.quota)*100):0;
  $('storageUsage').textContent=storage.quota?`${percentage}%`:'—';
  $('storageDetail').textContent=storage.quota?`${formatBytes(storage.usage)} de ${formatBytes(storage.quota)}`:'Estimación no disponible';
  checks.push({label:'Almacenamiento del navegador',state:percentage<75?'ok':percentage<90?'warn':'error',text:`${percentage}% usado`,detail:`${formatBytes(storage.usage)} utilizados.`});

  let firebase=null;
  try{
    firebase=await firebaseCheck();
    $('remoteCount').textContent=firebase.count.toLocaleString('es-CO');
    $('remoteDetail').textContent=`Respuesta en ${firebase.duration} ms · ${firebase.user}`;
    checks.push({
      label:'Firebase y Agenda Móvil',state:firebase.count===rows.length?'ok':'warn',
      text:firebase.count===rows.length?'Sincronizado':'Diferencia detectada',
      detail:`Local ${rows.length} · remoto ${firebase.count} · ${firebase.duration} ms.`
    });
  }catch(error){
    $('remoteCount').textContent='Error';$('remoteDetail').textContent=error.message;
    checks.push({label:'Firebase y Agenda Móvil',state:'error',text:'Sin conexión',detail:error.message});
  }

  const sw=await serviceWorkerCheck();
  checks.push({
    label:'Aplicación instalable y caché offline',state:sw.active?'ok':sw.supported?'warn':'error',
    text:sw.active?'Activo':sw.supported?'Pendiente':'No compatible',
    detail:sw.active?`Service worker activo en ${sw.scope}`:'Abre el Index y actualiza la aplicación.'
  });

  const integrity=await protectedIntegrity();
  const integrityFailures=integrity.filter(item=>!item.ok);
  checks.push({
    label:'Integridad de Eventos y Minuta',
    state:integrityFailures.length?'error':'ok',
    text:integrityFailures.length?`${integrityFailures.length} diferencias`:'Protegidos',
    detail:integrityFailures.length?integrityFailures.map(item=>item.path).join(', '):'Los seis archivos coinciden con la versión estable.'
  });

  let validation=getValidationReport();
  if(!validation&&rows.length){validation=saveValidationReport(validateRows(rows,{fileName:localStorage.getItem('excelSync:fileName')||''}));}
  checks.push({
    label:'Validación del Excel',
    state:!validation?'warn':validation.errorCount?'error':validation.warningCount?'warn':'ok',
    text:!validation?'Sin informe':validation.errorCount?`${validation.errorCount} errores`:validation.warningCount?`${validation.warningCount} advertencias`:'Correcto',
    detail:validation?`${validation.totalRows} filas revisadas · ${validation.validRows} válidas.`:'Vuelve a comprobar el archivo maestro.'
  });

  const snapshots=await listSnapshots(20);
  checks.push({label:'Copias automáticas',state:snapshots.length?'ok':'warn',text:`${snapshots.length} disponibles`,detail:snapshots.length?'Últimos estados guardados en IndexedDB.':'Se crearán al actualizar el Excel.'});

  const online=navigator.onLine;
  checks.push({label:'Conexión de red',state:online?'ok':'warn',text:online?'En línea':'Sin conexión',detail:online?'El navegador detecta acceso a internet.':'Se mostrará la última información disponible.'});
  checks.push({
    label:'Firebase App Check',state:FIREBASE_APP_CHECK_SITE_KEY?'ok':'info',
    text:FIREBASE_APP_CHECK_SITE_KEY?'Configurado':'Opcional',
    detail:FIREBASE_APP_CHECK_SITE_KEY?'Protección de cliente habilitada.':'Requiere una clave reCAPTCHA creada en Firebase Console.'
  });
  checks.push({
    label:'Notificaciones push con navegador cerrado',state:FIREBASE_VAPID_KEY?'ok':'info',
    text:FIREBASE_VAPID_KEY?'Configuradas':'Opcional',
    detail:FIREBASE_VAPID_KEY?'Clave VAPID disponible.':'Requiere una clave VAPID de Firebase Cloud Messaging y un emisor de mensajes.'
  });

  $('checksList').innerHTML=checks.map(checkItem).join('');
  const errors=checks.filter(c=>c.state==='error').length;
  const warnings=checks.filter(c=>c.state==='warn').length;
  $('overallState').textContent=errors?'Revisar':warnings?'Atención':'Correcto';
  $('overallDetail').textContent=errors?`${errors} comprobaciones requieren corrección.`:warnings?`${warnings} comprobaciones requieren atención.`:'Todos los componentes principales respondieron correctamente.';
  const validationEl=$('validationSummary');
  validationEl.innerHTML=validation?`
    <div class="grid cols-2" style="margin-top:0">
      <article class="metric" style="min-height:110px"><small>Filas revisadas</small><strong>${validation.totalRows}</strong><span>${validation.validRows} válidas</span></article>
      <article class="metric" style="min-height:110px"><small>Incidencias</small><strong>${validation.errorCount+validation.warningCount}</strong><span>${validation.errorCount} errores · ${validation.warningCount} advertencias</span></article>
    </div>`:`<div class="empty"><strong>Sin informe todavía</strong><span>Actualiza el Excel para generar la validación.</span></div>`;

  const metrics=getMetrics(8);
  $('performanceList').innerHTML=metrics.length?metrics.map(item=>`
    <article class="list-item"><div><strong>${esc(item.name||item.kind)}</strong><span>${new Date(item.timestamp).toLocaleString('es-CO')} · ${esc(JSON.stringify(item.meta||{}).slice(0,140))}</span></div><code>${Number(item.duration||0)} ms</code></article>
  `).join(''):`<div class="empty"><strong>Sin mediciones</strong><span>Las métricas aparecerán al utilizar el sistema.</span></div>`;

  $('generatedAt').textContent=`Informe generado ${new Date().toLocaleString('es-CO')} · v${SYSTEM_VERSION}`;
  lastReport={generatedAt:new Date().toISOString(),duration:Math.round(performance.now()-started),checks,localCount:rows.length,firebase,storage,validation,serviceWorker:sw,integrity,userAgent:navigator.userAgent,version:SYSTEM_VERSION};
  $('runDiagnostics').disabled=false;
  return lastReport;
}
async function repairSync(){
  const button=$('repairSync');button.disabled=true;message('Comprobando y republicando únicamente los registros necesarios…','info');
  try{
    const rows=readRows();
    if(!rows.length)throw new Error('No hay eventos locales para publicar.');
    const module=await import('./firebase-sync.js');
    const result=await module.publishIfReady(rows,null,{manual:true,forceRemote:true});
    message(result?'Sincronización reparada correctamente.':'Firebase no pudo completar la publicación. Revisa la cuenta propietaria.',result?'success':'error');
    await runDiagnostics();
  }catch(error){message(error.message||'No fue posible reparar la sincronización.','error');}
  finally{button.disabled=false;}
}
async function clearTechnicalCache(){
  [
    'firebase:lastPublishedHash','firebase:lastRemoteCount','firebase:lastChunkVerify',
    'rptPerformanceV1','rptSystemLogV2'
  ].forEach(key=>localStorage.removeItem(key));
  if('caches'in window){
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('rpt-')).map(name=>caches.delete(name)));
  }
  message('Caché técnica eliminada. Usuarios, sesión, eventos y archivo vinculado se conservaron.','success');
}
async function refreshServiceWorker(){
  const registrations=await navigator.serviceWorker?.getRegistrations?.()||[];
  await Promise.all(registrations.map(reg=>reg.update()));
  message('Actualización de la aplicación solicitada.','success');
}
function exportReport(){
  if(!lastReport)return message('Ejecuta primero la comprobación del sistema.','error');
  const blob=new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=`diagnostico-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const session=getSession();$('sessionName').textContent=session?.displayName||session?.username||'Administrador';
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html');});
$('runDiagnostics').addEventListener('click',runDiagnostics);
$('repairSync').addEventListener('click',repairSync);
$('exportDiagnostic').addEventListener('click',exportReport);
$('clearTechnicalCache').addEventListener('click',clearTechnicalCache);
$('refreshServiceWorker').addEventListener('click',refreshServiceWorker);
runDiagnostics().catch(error=>message(error.message,'error'));
