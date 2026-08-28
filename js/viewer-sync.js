import {FIREBASE_CONFIG,META_COLLECTION,CHANGES_COLLECTION} from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const CHUNK_PREFIX='agenda_chunk_';
const HASH_KEY='rptViewerPublishedHashV1';
const LAST_CHANGE_KEY='rptViewerLastChangeV1';
const $=id=>document.getElementById(id);
let state={db:null,auth:null,fireMod:null,lastHash:localStorage.getItem(HASH_KEY)||'',changesReady:false,lastChangeId:localStorage.getItem(LAST_CHANGE_KEY)||'',unread:0};

function setStatus(label,detail='',type='online'){
  if($('viewerSyncState'))$('viewerSyncState').textContent=label;
  if($('viewerSyncDetail'))$('viewerSyncDetail').textContent=detail;
  $('viewerCloudStatus')?.classList.remove('is-online','is-syncing','is-error');
  $('viewerCloudStatus')?.classList.add(`is-${type}`);
}
function chunkId(index){return`${CHUNK_PREFIX}${String(index).padStart(4,'0')}`;}
function mapEvent(event){
  return {
    FECHA:event.fechaISO||'',
    'ESCENARIO ASIGNADO':event.escenario||'',
    'HORARIO DEL EVENTO':event.horarioEvento||'',
    'NOMBRE DE LA EMPRESA':event.empresa||'',
    'CANTIDAD DE PERSONAS':Number(event.cantidadPersonas)||0,
    'HORARIO AYB':event.horarioAyB||'',
    'DESCRIPCION ALIMENTACION':event.descripcionAlimentacion||'',
    ACOMODACION:event.acomodacion||'',
    'MEDIO DE PAGO':event.medioPago||'',
    'MODALIDAD DE SERVICIO':event.modalidadServicio||'',
    OBSERVACION:event.observacion||'',
    ESTADO:event.estado||'',
    'DESARROLLO ACTIVIDAD':event.desarrolloActividad||'',
    HOJA_ORIGEN:event.hojaOrigen||'',
    __FILA_ORIGEN:Number(event.filaOrigen)||0,
    __EVENT_ID:event.id||''
  };
}
function updateUnread(){
  const count=Math.max(0,Math.min(99,state.unread));
  if($('viewerNotificationCount')){$('viewerNotificationCount').textContent=String(count);$('viewerNotificationCount').hidden=count===0;}
  try{if(count&&navigator.setAppBadge)navigator.setAppBadge(count).catch(()=>{});else if(!count&&navigator.clearAppBadge)navigator.clearAppBadge().catch(()=>{});}catch(_){ }
}
function toast(title,detail='',type='success'){
  let stack=document.getElementById('viewerToastStack');
  if(!stack){
    const style=document.createElement('style');style.textContent='.viewer-toast-stack{position:fixed;right:18px;bottom:18px;z-index:9990;display:grid;gap:9px;width:min(360px,calc(100vw - 28px))}.viewer-toast{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:start;padding:13px 14px;border:1px solid #dbe7ee;border-radius:15px;background:#fff;color:#173047;box-shadow:0 18px 55px rgba(6,25,43,.18);animation:viewerToastIn .2s ease}.viewer-toast>i{width:9px;height:9px;margin-top:4px;border-radius:50%;background:#28b48a}.viewer-toast.is-warning>i{background:#dd9a32}.viewer-toast strong{display:block;font:800 12px Inter,"Segoe UI",Arial,sans-serif}.viewer-toast small{display:block;margin-top:3px;color:#708297;font:500 10px/1.4 Inter,"Segoe UI",Arial,sans-serif}.viewer-toast button{border:0;background:transparent;color:#8090a0;cursor:pointer}@keyframes viewerToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';document.head.appendChild(style);
    stack=document.createElement('div');stack.id='viewerToastStack';stack.className='viewer-toast-stack';document.body.appendChild(stack);
  }
  const item=document.createElement('article');item.className=`viewer-toast is-${type}`;item.innerHTML='<i></i><div><strong></strong><small></small></div><button type="button" aria-label="Cerrar">×</button>';item.querySelector('strong').textContent=title;item.querySelector('small').textContent=detail;item.querySelector('button').onclick=()=>item.remove();stack.prepend(item);while(stack.children.length>3)stack.lastElementChild.remove();setTimeout(()=>item.remove(),5200);
}
async function notificationModule(){return import('./notifications.js').catch(()=>null);}
async function refreshNotificationButton(){
  const button=$('viewerNotificationButton');if(!button)return;
  if(!('Notification'in window)){button.disabled=true;button.querySelector('strong').textContent='Avisos no disponibles';return;}
  const mod=await notificationModule();const settings=mod?.getNotificationSettings?.()||{};const enabled=Notification.permission==='granted'&&settings.enabled!==false;
  button.classList.toggle('is-active',enabled);button.querySelector('strong').textContent=enabled?'Notificaciones activas':Notification.permission==='denied'?'Avisos bloqueados':'Activar notificaciones';
}
async function enableNotifications(){
  if(!('Notification'in window))return;
  const mod=await notificationModule();if(!mod)return;
  if(Notification.permission==='denied'){toast('Notificaciones bloqueadas','Actívalas desde los permisos del navegador.','warning');return;}
  const permission=Notification.permission==='granted'?'granted':await mod.requestNotificationPermission();
  if(permission==='granted'){mod.setNotificationSettings?.({enabled:true,excel:true,mobile:true,maintenance:true});toast('Notificaciones activadas','Recibirás avisos generales cuando cambie la agenda.');}
  refreshNotificationButton();
}
async function hydratePublished(meta){
  if(!meta||!Number(meta.chunkCount))return;
  if(meta.dataHash&&meta.dataHash===state.lastHash){setStatus('Actualizado','Sin cambios pendientes','online');return;}
  setStatus('Sincronizando','Recibiendo la última publicación','syncing');
  const refs=Array.from({length:Number(meta.chunkCount)},(_,index)=>state.fireMod.doc(state.db,META_COLLECTION,chunkId(index)));
  const snaps=await Promise.all(refs.map(ref=>state.fireMod.getDoc(ref)));
  const events=snaps.flatMap(snap=>snap.exists()&&Array.isArray(snap.data()?.events)?snap.data().events:[]);
  const rows=events.map(mapEvent);
  localStorage.setItem('eventData',JSON.stringify(rows));
  localStorage.setItem('eventDataSheets',JSON.stringify([...new Set(rows.map(row=>row.HOJA_ORIGEN).filter(Boolean))]));
  const updatedAt=meta.clientPublishedAt||new Date().toISOString();
  localStorage.setItem('eventDataUpdatedAt',updatedAt);
  if(meta.dataHash){localStorage.setItem(HASH_KEY,meta.dataHash);state.lastHash=meta.dataHash;}
  window.dispatchEvent(new CustomEvent('eventDataUpdated',{detail:{source:'firebase-auto',rows:rows.length,updatedAt}}));
  setStatus('Actualizado',`${rows.length.toLocaleString('es-CO')} registros sincronizados automáticamente`,'online');
  if($('viewerLastSync'))$('viewerLastSync').textContent=new Date(updatedAt).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}
function changeTitle(entry){
  if(entry.type==='creado')return `Evento creado${entry.company?` · ${entry.company}`:''}`;
  if(entry.type==='eliminado')return `Evento eliminado${entry.company?` · ${entry.company}`:''}`;
  return `${entry.field||'Información'} actualizada${entry.company?` · ${entry.company}`:''}`;
}
function bindChanges(){
  const q=state.fireMod.query(state.fireMod.collection(state.db,CHANGES_COLLECTION),state.fireMod.orderBy('timestamp','desc'),state.fireMod.limit(15));
  state.fireMod.onSnapshot(q,snapshot=>{
    const records=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
    if(!state.changesReady){
      if(!state.lastChangeId&&records[0]){state.lastChangeId=records[0].id;localStorage.setItem(LAST_CHANGE_KEY,state.lastChangeId);}
      else if(state.lastChangeId){const index=records.findIndex(item=>item.id===state.lastChangeId);state.unread=index>0?index:0;}
      state.changesReady=true;updateUnread();return;
    }
    const added=snapshot.docChanges().filter(change=>change.type==='added').map(change=>({id:change.doc.id,...change.doc.data()}));
    if(!added.length)return;
    state.unread=Math.min(99,state.unread+added.length);updateUnread();
    const latest=added[0];const title=changeTitle(latest);const context=[latest.user,latest.host,latest.sheet,latest.cell].filter(Boolean).join(' · ')||'Cambio publicado por administración';
    toast(title,context);
    notificationModule().then(mod=>mod?.showNotification?.('Actualización general',added.length>1?`${title} · ${added.length-1} cambio(s) adicional(es).`:title,{tag:'rpt-viewer-change',url:'./index.html',renotify:true})).catch(()=>{});
  },error=>console.warn('Cambios de usuario:',error));
}
function markRead(){
  state.unread=0;updateUnread();
  state.fireMod?.getDocs?.(state.fireMod.query(state.fireMod.collection(state.db,CHANGES_COLLECTION),state.fireMod.orderBy('timestamp','desc'),state.fireMod.limit(1))).then(snapshot=>{const first=snapshot.docs[0];if(first){state.lastChangeId=first.id;localStorage.setItem(LAST_CHANGE_KEY,first.id);}}).catch(()=>{});
}
async function initialize(){
  try{
    const [appMod,authMod,fireMod]=await Promise.all([import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`),import(`${SDK}/firebase-firestore.js`)]);
    let app=appMod.getApps()[0];if(!app)app=appMod.initializeApp(FIREBASE_CONFIG);
    const auth=authMod.getAuth(app);const db=fireMod.getFirestore(app);try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){ }
    if(typeof auth.authStateReady==='function')await auth.authStateReady();if(!auth.currentUser){try{await authMod.signInAnonymously(auth);}catch(_){throw new Error('Inicia sesión nuevamente para sincronizar la agenda.');}}
    state={...state,db,auth,fireMod};
    setStatus('Conectado','Sincronización automática activa','online');
    const metaRef=fireMod.doc(db,META_COLLECTION,'publicacion');
    fireMod.onSnapshot(metaRef,snapshot=>{if(snapshot.exists())hydratePublished(snapshot.data()).catch(error=>setStatus('Revisar conexión',error.message||'No fue posible actualizar','error'));},error=>setStatus('Sin conexión',error.message||'Firebase no disponible','error'));
    bindChanges();
  }catch(error){setStatus('Sin conexión',error.message||'No fue posible iniciar Firebase','error');console.warn(error);}
}

$('viewerNotificationButton')?.addEventListener('click',enableNotifications);
$('viewerNotificationButton')?.addEventListener('dblclick',markRead);
$('viewerNotificationClear')?.addEventListener('click',markRead);
refreshNotificationButton();
initialize();
