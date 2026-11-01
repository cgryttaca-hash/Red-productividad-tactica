(function(){
 if(window.RPTDeviceAccess)return;
 let allowed=false,started=false,completed=false,loading=false,checking,registry,store,unsubscribe,timer,previous='',record={status:'checking'},resolveReady;
 const ready=new Promise(resolve=>resolveReady=resolve),page=location.pathname.split('/').pop()||'index.html';
 document.documentElement.classList.add('device-pending');
 window.RPTPageInit=Object.freeze({onReady(callback){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',callback,{once:true});else queueMicrotask(callback);}});
 function log(title,level='info'){import('./system-log.js').then(m=>m.addSystemLog({source:'Dispositivos',level,title,detail:record.id||''})).catch(()=>{});}
 function render(){
  if(!document.body)return;let host=document.getElementById('deviceAccessGate');
  if(allowed){host?.remove();document.documentElement.classList.remove('device-pending');document.documentElement.classList.toggle('device-starting',!completed);document.body.inert=!completed||Boolean(window.RPTUpdateGuard?.locked);return;}
  document.documentElement.classList.add('device-pending');document.body.inert=true;
  if(!host){host=document.createElement('section');host.id='deviceAccessGate';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.innerHTML='<div class="device-gate-content"><span class="device-gate-brand">GESTIÓN DE EVENTOS</span><span class="device-gate-symbol" aria-hidden="true"></span><h1 id="deviceGateTitle"></h1><strong>ALERTA: Esta página solo puede ser activada por el administrador.</strong><p>Comuníquese con él para autorizar el acceso a este dispositivo.</p><dl><div><dt>Identificador del dispositivo</dt><dd id="deviceGateId"></dd></div><div><dt>Estado</dt><dd id="deviceGateState"></dd></div><div><dt>Fecha de solicitud</dt><dd id="deviceGateDate"></dd></div></dl><p id="deviceGateMessage"></p><button id="deviceGateRetry" type="button">Comprobar autorización</button></div>';document.documentElement.append(host);host.querySelector('button').addEventListener('click',()=>refresh());}
  const labels={checking:'Comprobando autorización',pending:'Pendiente de autorización',revoked:'Revocado',error:'No se pudo confirmar con Firebase'};
  host.querySelector('#deviceGateTitle').textContent=record.status==='checking'?'VALIDANDO DISPOSITIVO':'ACCESO NO AUTORIZADO';
  host.querySelector('#deviceGateId').textContent=record.id||'Pendiente de conexión';host.querySelector('#deviceGateState').textContent=labels[record.status]||'Pendiente de autorización';
  host.querySelector('#deviceGateDate').textContent=record.clientCreatedAt?new Date(record.clientCreatedAt).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'Sin solicitud confirmada';
  host.querySelector('#deviceGateMessage').textContent=record.status==='error'?'Recupera la conexión para confirmar el permiso. Los datos y el archivo vinculado se conservan.':record.status==='revoked'?'La autorización fue revocada. El administrador debe restablecerla.':'La solicitud se consulta en Firebase. Esta validación no solicita Excel ni configura la publicación.';
  host.querySelector('button').disabled=record.status==='checking';
 }
 async function loadPage(){
  if(started||loading||!allowed)return;loading=true;
  try{
   // La validación local conserva sus decisiones y puede redirigir antes de cargar módulos.
   await Promise.resolve();if(document.documentElement.classList.contains('auth-pending'))return;
   started=true;
   const scripts=[...document.querySelectorAll('script[data-device-src]')].sort((a,b)=>Number(b.dataset.deviceSrc==='js/loading.js')-Number(a.dataset.deviceSrc==='js/loading.js'));
   for(const placeholder of scripts){
    if(!allowed)return;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=placeholder.dataset.deviceSrc;if(placeholder.dataset.deviceType==='module')script.type='module';script.onload=resolve;script.onerror=()=>reject(Error('No fue posible cargar un recurso de esta página.'));placeholder.after(script);});
   }
   completed=true;window.__RPT_PAGE_SCRIPTS_READY__=true;render();window.dispatchEvent(new Event('rptPageScriptsReady'));
  }catch(_){window.RPTPageLoad?.fail('No fue posible preparar la página. Comprueba la conexión y reintenta.');}
  finally{loading=false;}
 }
 async function accept(value,confirmed=true){
  record=value;const next=value.status;allowed=next==='approved';
  if(confirmed)try{await store.saveDecision(value.id,{id:value.id,status:next,authorized:allowed,revoked:next==='revoked',clientCreatedAt:value.clientCreatedAt||'',confirmedAt:new Date().toISOString()});}catch(_){}
  if(next!==previous){if(next==='revoked')log('Acceso del dispositivo revocado','warning');else if(next==='approved')log(confirmed?'Autorización de dispositivo confirmada':'Consulta sin red con autorización previamente confirmada');else if(next==='pending')log('Acceso pendiente de autorización','warning');previous=next;}
  if(!allowed&&started){location.replace(location.href);return;}
  render();if(allowed){localStorage.removeItem('rptDeviceRevokedV1');resolveReady();window.dispatchEvent(new CustomEvent('rptDeviceAuthorized',{detail:{confirmed}}));loadPage();}
 }
 async function refresh(){
  if(checking)return checking;
  checking=(async()=>{record={...record,status:'checking'};render();
   try{
    registry=registry||await import('./device-registry.js');store=store||await import('./device-approval-store.js');
    const id=await registry.currentDeviceIdentity();record={...record,id};
    if(!navigator.onLine){const cached=await store.readDecision(id);if(cached){await accept(cached,false);return;}throw Error('Sin autorización confirmada.');}
    await accept(await registry.registerCurrentDevice());
    if(!unsubscribe)unsubscribe=await registry.watchCurrentDevice(value=>accept(value),()=>{if(navigator.onLine){record={...record,status:'error'};allowed=false;if(started)location.replace(location.href);else render();}});
   }catch(_){allowed=false;record={...record,status:'error'};if(started){location.replace(location.href);return;}render();log('Error al validar la autorización','error');}
  })().finally(()=>checking=null);return checking;
 }
 window.RPTDeviceAccess=Object.freeze({ready,get allowed(){return allowed;},get state(){return {...record};},refresh});
 function start(){render();refresh();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden&&navigator.onLine&&!allowed)refresh();},30000);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('online',refresh);window.addEventListener('pagehide',()=>{clearInterval(timer);unsubscribe?.();unsubscribe=null;});
 window.addEventListener('pageshow',event=>{if(event.persisted)start();});
})();
