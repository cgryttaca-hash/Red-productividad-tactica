import {FIREBASE_CONFIG,FIREBASE_OWNER_UID,META_COLLECTION} from './firebase-config.js';
import {getSession,logout} from './local-auth.js';
import {getNotificationSettings,setNotificationSettings,requestNotificationPermission,showNotification} from './notifications.js';
import {SYSTEM_VERSION,RELEASE_NAME} from './system-version.js';
import {THEME_DOC_ID,applyAppearance,readAppearanceCache,writeAppearanceCache,normalizeAppearance} from './theme-settings.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const CACHE_KEY='rptMaintenanceCacheV1';
const DOC_ID='mantenimiento';
const $=id=>document.getElementById(id);
const labels={
  index:'Inicio',eventos:'Eventos',minuta:'Minuta',agenda_movil:'Agenda Móvil',usuarios:'Usuarios',
  diagnostico:'Diagnóstico',respaldos:'Respaldos',auditoria:'Auditoría',equipos:'Equipos',validacion:'Validación Excel',laboratorio:'Laboratorio'
};
const templates={
  mejoras:'Estamos realizando mejoras técnicas para ofrecer una experiencia más rápida y estable.',
  seguridad:'Estamos aplicando una actualización de seguridad. La página volverá automáticamente.',
  datos:'Estamos optimizando los datos y la sincronización del módulo.',
  personalizado:''
};
let sdk=null,auth=null,db=null,currentUser=null,config={pages:{}},appearance=readAppearanceCache(),unsubscribe=null,appearanceUnsubscribe=null,ticker=null;
applyAppearance('configuracion',appearance);

function message(value,type='info',target='configMessage'){
  const el=$(target);if(!el)return;el.hidden=!value;el.className=`message ${type}`;el.textContent=value||'';
}
function cache(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify(value));}catch(_){}}
function isOwner(){return Boolean(currentUser&&currentUser.uid===FIREBASE_OWNER_UID)}
function formatDate(value){
  if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}
function itemState(item){
  if(!item?.active||!item.until)return'inactive';
  const now=Date.now();const start=item.startsAt?new Date(item.startsAt).getTime():0;const end=new Date(item.until).getTime();
  if(end<=now)return'expired';if(start>now)return'scheduled';return'active';
}
function remaining(until){
  const ms=Math.max(0,new Date(until).getTime()-Date.now());
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function renderAppearance(){
  appearance=normalizeAppearance(appearance||{});
  if($('globalTheme'))$('globalTheme').value=appearance.global||'classic';
  if($('indexTheme'))$('indexTheme').value=appearance.pages?.index||'inherit';
  if($('agendaTheme'))$('agendaTheme').value=appearance.pages?.agenda_movil||'inherit';
  if($('configTheme'))$('configTheme').value=appearance.pages?.configuracion||'inherit';
  const badge=$('appearanceState');if(badge){badge.className='status ok';badge.textContent='Sincronizada';}
  applyAppearance('configuracion',appearance);
}
async function saveAppearance(){
  if(!isOwner())throw new Error('Conecta la cuenta propietaria de Firebase.');
  const next=normalizeAppearance({global:$('globalTheme').value,pages:{index:$('indexTheme').value,agenda_movil:$('agendaTheme').value,configuracion:$('configTheme').value}});
  await sdk.fireMod.setDoc(sdk.fireMod.doc(db,META_COLLECTION,THEME_DOC_ID),{
    global:next.global,pages:next.pages,updatedAt:sdk.fireMod.serverTimestamp(),clientUpdatedAt:new Date().toISOString(),updatedBy:currentUser.email||''
  },{merge:false});
  appearance=writeAppearanceCache(next);renderAppearance();
}

function renderOwner(){
  const owner=isOwner();
  $('ownerLoginPanel').hidden=owner;
  $('activateMaintenance').disabled=!owner;
  const badge=$('ownerStateBadge');
  if(badge){badge.className=`status ${owner?'ok':'warn'}`;badge.textContent=owner?'Conectado':'Desconectado';}
}
function renderList(){
  const pages=config?.pages||{};
  $('maintenanceList').innerHTML=Object.entries(labels).map(([key,label])=>{
    const item=pages[key]||{};const state=itemState(item);
    const statusText=state==='active'?'En actualización':state==='scheduled'?'Programado':'Disponible';
    const detail=state==='active'
      ?`Tiempo restante ${remaining(item.until)} · Finaliza ${formatDate(item.until)}`
      :state==='scheduled'?`Inicia ${formatDate(item.startsAt)} · Finaliza ${formatDate(item.until)}`:'Sin temporizador activo';
    return `<article class="list-item"><div><strong>${label} · ${statusText}</strong><span>${item.message||'Sin mantenimiento programado.'}<br>${detail}</span></div>
      <div class="tool-actions">
        ${state==='active'?`<button class="btn" type="button" data-extend="${key}">+15 min</button>`:''}
        ${state==='active'||state==='scheduled'?`<button class="btn danger" type="button" data-stop="${key}">Finalizar</button>`:''}
      </div></article>`;
  }).join('');
}
async function saveConfig(next){
  if(!isOwner())throw new Error('Conecta la cuenta propietaria de Firebase.');
  config=next;cache(config);renderList();
  await sdk.fireMod.setDoc(sdk.fireMod.doc(db,META_COLLECTION,DOC_ID),{
    ...config,updatedAt:sdk.fireMod.serverTimestamp(),clientUpdatedAt:new Date().toISOString(),updatedBy:currentUser.email||''
  },{merge:false});
}
async function initializeFirebase(){
  const [appMod,authMod,fireMod]=await Promise.all([
    import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`),import(`${SDK}/firebase-firestore.js`)
  ]);
  const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
  import('./firebase-app-check.js').then(module=>module.initializeAppCheck()).catch(()=>{});
  auth=authMod.getAuth(app);db=fireMod.getFirestore(app);sdk={appMod,authMod,fireMod};
  $('ownerLoginButton').disabled=false;
  try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  authMod.onAuthStateChanged(auth,user=>{currentUser=user;renderOwner();});
  const ref=fireMod.doc(db,META_COLLECTION,DOC_ID);
  const snap=await fireMod.getDoc(ref);config=snap.exists()?snap.data():{pages:{}};cache(config);renderList();
  unsubscribe=fireMod.onSnapshot(ref,next=>{config=next.exists()?next.data():{pages:{}};cache(config);renderList();});
  const appearanceRef=fireMod.doc(db,META_COLLECTION,THEME_DOC_ID);
  const appearanceSnap=await fireMod.getDoc(appearanceRef);
  if(appearanceSnap.exists()){appearance=writeAppearanceCache(appearanceSnap.data()||{});renderAppearance();}
  appearanceUnsubscribe=fireMod.onSnapshot(appearanceRef,next=>{if(!next.exists())return;appearance=writeAppearanceCache(next.data()||{});renderAppearance();});
}
function setDefaultStart(){
  const date=new Date(Date.now()+60000);date.setSeconds(0,0);
  $('maintenanceStart').value=date.toISOString().slice(0,16);
}
$('maintenanceTemplate').addEventListener('change',()=>{
  const value=$('maintenanceTemplate').value;if(value!=='personalizado')$('maintenanceMessage').value=templates[value];
});
$('ownerLoginForm').addEventListener('submit',async event=>{
  event.preventDefault();message('','info','ownerLoginMessage');$('ownerLoginButton').disabled=true;
  try{
    const result=await sdk.authMod.signInWithEmailAndPassword(auth,$('ownerEmail').value.trim(),$('ownerPassword').value);
    $('ownerPassword').value='';
    if(result.user.uid!==FIREBASE_OWNER_UID){await sdk.authMod.signOut(auth);throw new Error('La cuenta no corresponde al propietario autorizado.');}
    message('Conexión guardada correctamente.','success','ownerLoginMessage');
  }catch(error){message(error?.message||'No fue posible conectar Firebase.','error','ownerLoginMessage');}
  finally{$('ownerLoginButton').disabled=false;}
});
$('maintenanceForm').addEventListener('submit',async event=>{
  event.preventDefault();message('');
  try{
    const page=$('maintenancePage').value;const minutes=Math.max(1,Number($('maintenanceMinutes').value)||1);
    const startsAt=$('maintenanceStart').value?new Date($('maintenanceStart').value).getTime():Date.now();
    if(Number.isNaN(startsAt))throw new Error('La fecha de inicio no es válida.');
    const next=structuredClone(config||{pages:{}});next.pages=next.pages||{};
    next.pages[page]={
      active:true,startsAt:new Date(startsAt).toISOString(),startedAt:new Date().toISOString(),
      until:new Date(startsAt+minutes*60000).toISOString(),durationMs:minutes*60000,
      message:$('maintenanceMessage').value.trim()||templates.mejoras,template:$('maintenanceTemplate').value
    };
    await saveConfig(next);
    message(`Mantenimiento ${startsAt>Date.now()+30000?'programado':'activado'} para ${labels[page]}.`,'success');
    const settings=getNotificationSettings();
    if(settings.maintenance)showNotification('Mantenimiento programado',`${labels[page]} · ${formatDate(next.pages[page].startsAt)}`,{tag:`maintenance-${page}`,url:'./configuracion.html'});
  }catch(error){message(error.message||'No fue posible programar el mantenimiento.','error');}
});
$('maintenanceList').addEventListener('click',async event=>{
  const stop=event.target.closest('[data-stop]');const extend=event.target.closest('[data-extend]');
  try{
    if(stop){
      const next=structuredClone(config||{pages:{}});next.pages=next.pages||{};
      next.pages[stop.dataset.stop]={...(next.pages[stop.dataset.stop]||{}),active:false,until:new Date().toISOString()};
      await saveConfig(next);message(`Mantenimiento finalizado para ${labels[stop.dataset.stop]}.`,'success');
    }
    if(extend){
      const key=extend.dataset.extend;const next=structuredClone(config||{pages:{}});const item=next.pages?.[key];
      if(!item)throw new Error('No existe mantenimiento activo.');
      item.until=new Date(new Date(item.until).getTime()+15*60000).toISOString();item.durationMs=Number(item.durationMs||0)+15*60000;
      await saveConfig(next);message(`Mantenimiento extendido 15 minutos para ${labels[key]}.`,'success');
    }
  }catch(error){message(error.message,'error');}
});
function renderNotifications(){
  const settings=getNotificationSettings();
  $('notifyExcel').checked=settings.excel!==false;$('notifyMobile').checked=settings.mobile!==false;$('notifyMaintenance').checked=settings.maintenance!==false;
  const allowed='Notification'in window&&Notification.permission==='granted';
  $('notificationState').className=`status ${allowed?'ok':Notification.permission==='denied'?'error':'info'}`;
  $('notificationState').textContent=allowed?'Autorizadas':Notification.permission==='denied'?'Bloqueadas':'Sin autorizar';
}
$('enableNotifications').addEventListener('click',async()=>{
  try{const permission=await requestNotificationPermission();renderNotifications();message(permission==='granted'?'Notificaciones autorizadas.':'El navegador no concedió el permiso.',permission==='granted'?'success':'error','notificationMessage');}
  catch(error){message(error.message,'error','notificationMessage');}
});
$('saveAppearance')?.addEventListener('click',async()=>{
  try{await saveAppearance();message('Apariencia guardada para Inicio y Agenda Móvil.','success','appearanceMessage');}
  catch(error){message(error.message||'No fue posible guardar la apariencia.','error','appearanceMessage');}
});
$('saveNotifications').addEventListener('click',()=>{
  setNotificationSettings({excel:$('notifyExcel').checked,mobile:$('notifyMobile').checked,maintenance:$('notifyMaintenance').checked});
  message('Preferencias guardadas.','success','notificationMessage');
});
const session=getSession();$('sessionName').textContent=session?.displayName||session?.username||'Administrador';
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html')});
$('systemVersion').textContent=SYSTEM_VERSION;$('releaseLabel').textContent=RELEASE_NAME;
$('pwaState').textContent=window.matchMedia('(display-mode: standalone)').matches?'Instalada':'Web';
$('pwaDetail').textContent=window.matchMedia('(display-mode: standalone)').matches?'Ejecutándose como aplicación':'Puedes instalarla desde este panel';
setDefaultStart();renderNotifications();renderList();renderAppearance();ticker=setInterval(renderList,1000);
window.addEventListener('pagehide',()=>{unsubscribe?.();appearanceUnsubscribe?.();clearInterval(ticker);},{once:true});
initializeFirebase().catch(error=>{message(error.message||'Firebase no disponible.','error','ownerLoginMessage');$('ownerLoginPanel').hidden=false;});
