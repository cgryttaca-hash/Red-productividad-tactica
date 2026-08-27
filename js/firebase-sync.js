import {
  FIREBASE_CONFIG,
  FIREBASE_OWNER_UID,
  EVENTS_COLLECTION,
  META_COLLECTION,
  CHANGES_COLLECTION
} from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const LAST_PUBLISHED_KEY='firebase:lastPublishedAt';
const LAST_HASH_KEY='firebase:lastPublishedHash';
const LAST_REMOTE_COUNT_KEY='firebase:lastRemoteCount';
const OWNER_EMAIL_KEY='firebase:ownerEmail';
const CHUNK_PREFIX='agenda_chunk_';
const CHUNK_SIZE=75;
const VERIFY_INTERVAL_MS=15000;
const CHUNK_VERIFY_INTERVAL_MS=120000;
const LAST_CHUNK_VERIFY_KEY='firebase:lastChunkVerify';

let sdkPromise=null;
let authReadyPromise=null;
let auth=null;
let db=null;
let currentUser=null;
let publishing=false;
let ui={};

const text=value=>value===undefined||value===null?'':String(value);
const hash=value=>{
  let result=2166136261;
  for(const character of String(value)){result^=character.charCodeAt(0);result=Math.imul(result,16777619);}
  return (result>>>0).toString(36);
};

async function systemLog(entry){
  try{
    const module=await import('./system-log.js');
    module.addSystemLog(entry);
  }catch(_){}
}

async function loadSdk(){
  if(!sdkPromise){
    sdkPromise=(async()=>{
      const [appMod,authMod,fireMod]=await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`)
      ]);
      const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
      import('./firebase-app-check.js').then(module=>module.initializeAppCheck()).catch(()=>{});
      auth=authMod.getAuth(app);
      db=fireMod.getFirestore(app);
      if(!auth||!db)throw new Error('Firebase no pudo inicializarse.');

      try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(error){
        console.warn('Firebase persistence:',error);
      }

      authReadyPromise=new Promise(resolve=>{
        let first=true;
        authMod.onAuthStateChanged(auth,user=>{
          currentUser=user;
          updateUi();
          if(first){first=false;resolve(user);}
        },error=>{
          setState('error','Firebase no disponible',friendlyError(error));
          if(first){first=false;resolve(null);}
        });
      });
      return {appMod,authMod,fireMod,app};
    })();
  }
  return sdkPromise;
}

function isOwner(user){return Boolean(user&&user.uid===FIREBASE_OWNER_UID)}

function normalizeDate(value){
  if(!value)return'';
  const source=text(value);
  const match=source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return`${match[1]}-${match[2]}-${match[3]}`;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return source;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function publicEvent(row,index){
  const id=row.__EVENT_ID||hash(`${row.HOJA_ORIGEN||''}|${row.__FILA_ORIGEN||index}|${row['NOMBRE DE LA EMPRESA']||''}`);
  const event={
    id,
    fechaISO:normalizeDate(row.FECHA),
    escenario:text(row['ESCENARIO ASIGNADO']),
    horarioEvento:text(row['HORARIO DEL EVENTO']),
    empresa:text(row['NOMBRE DE LA EMPRESA']),
    cantidadPersonas:Number(row['CANTIDAD DE PERSONAS'])||0,
    horarioAyB:text(row['HORARIO AYB']),
    descripcionAlimentacion:text(row['DESCRIPCION ALIMENTACION']),
    acomodacion:text(row.ACOMODACION),
    medioPago:text(row['MEDIO DE PAGO']),
    modalidadServicio:text(row['MODALIDAD DE SERVICIO']),
    observacion:text(row.OBSERVACION),
    estado:text(row.ESTADO),
    desarrolloActividad:text(row['DESARROLLO ACTIVIDAD']),
    hojaOrigen:text(row.HOJA_ORIGEN),
    filaOrigen:Number(row.__FILA_ORIGEN)||0
  };
  event.piso=/TERCER|PISO\s*3|\b3\d{2}\b/i.test(event.escenario)?'Tercer piso':'Segundo piso';
  event.contentHash=hash(JSON.stringify(event));
  return event;
}

function currentRows(){
  try{
    const rows=JSON.parse(localStorage.getItem('eventData')||'[]');
    return Array.isArray(rows)?rows:[];
  }catch(_){return[];}
}

function friendlyError(error){
  const code=text(error?.code);
  const messages={
    'auth/invalid-credential':'El correo o la contraseña no coinciden.',
    'auth/invalid-email':'El correo no tiene un formato válido.',
    'auth/operation-not-allowed':'Habilita el acceso con correo y contraseña en Firebase.',
    'auth/too-many-requests':'Firebase bloqueó temporalmente los intentos. Espera unos minutos.',
    'auth/network-request-failed':'No hay conexión con Firebase.',
    'permission-denied':'La cuenta no tiene permisos suficientes en Firestore.'
  };
  return messages[code]||error?.message||'No fue posible completar la operación.';
}

function ensureUi(){
  if(!/\/(?:index\.html)?$/.test(location.pathname)||document.getElementById('firebaseSyncControl'))return;
  const control=document.createElement('button');
  control.id='firebaseSyncControl';
  control.className='firebase-sync-control is-idle';
  control.type='button';
  control.innerHTML=`<span class="firebase-sync-icon">☁</span><span><small>Agenda móvil</small><strong id="firebaseSyncControlText">Inicializando…</strong></span><i></i>`;
  const target=document.querySelector('[data-firebase-sync-slot]')||document.querySelector('.header-tools');
  target?.appendChild(control);

  const modal=document.createElement('div');
  modal.id='firebaseSyncModal';modal.className='firebase-sync-modal';modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="firebase-sync-dialog" role="dialog" aria-modal="true" aria-labelledby="firebaseSyncTitle">
    <button class="firebase-sync-close" type="button" aria-label="Cerrar">×</button>
    <div class="firebase-sync-heading"><span>☁</span><div><small>Firebase · tiempo real</small><h2 id="firebaseSyncTitle">Publicación móvil</h2><p>La cuenta propietaria se recuerda en este navegador.</p></div></div>
    <div id="firebaseSyncState" class="firebase-sync-state is-syncing"><i></i><div><small>Estado</small><strong>Inicializando Firebase</strong><span>Espera un momento…</span></div></div>
    <form id="firebaseLoginForm" hidden>
      <label>Correo<input id="firebaseEmail" type="email" autocomplete="username" required></label>
      <label>Contraseña<input id="firebasePassword" type="password" autocomplete="current-password" required></label>
      <button id="firebaseLoginButton" type="submit" disabled>Conectar Firebase</button>
    </form>
    <div id="firebaseSession" class="firebase-session" hidden><div><small>Administrador conectado</small><strong id="firebaseIdentity">—</strong></div><button id="firebaseLogout" type="button">Cerrar sesión</button></div>
    <div class="firebase-sync-metrics"><div><small>Registros locales</small><strong id="firebaseLocalCount">0</strong></div><div><small>Última publicación</small><strong id="firebaseLastPublished">—</strong></div></div>
    <div id="firebaseMessage" class="firebase-message" hidden></div>
    <div class="firebase-sync-actions"><button id="firebasePublish" type="button" disabled>Publicar ahora</button><a href="agenda_movil.html" target="_blank" rel="noopener">Abrir agenda móvil</a></div>
  </div>`;
  document.body.appendChild(modal);
  ui={
    control,controlText:document.getElementById('firebaseSyncControlText'),modal,
    state:document.getElementById('firebaseSyncState'),form:document.getElementById('firebaseLoginForm'),
    email:document.getElementById('firebaseEmail'),password:document.getElementById('firebasePassword'),
    loginButton:document.getElementById('firebaseLoginButton'),session:document.getElementById('firebaseSession'),
    identity:document.getElementById('firebaseIdentity'),localCount:document.getElementById('firebaseLocalCount'),
    lastPublished:document.getElementById('firebaseLastPublished'),message:document.getElementById('firebaseMessage'),
    publish:document.getElementById('firebasePublish')
  };
  ui.email.value=localStorage.getItem(OWNER_EMAIL_KEY)||'cgryttaca@gmail.com';
  control.addEventListener('click',openPanel);
  modal.querySelector('.firebase-sync-close').addEventListener('click',closePanel);
  modal.addEventListener('click',event=>{if(event.target===modal)closePanel();});
  ui.form.addEventListener('submit',login);
  document.getElementById('firebaseLogout').addEventListener('click',logout);
  ui.publish.addEventListener('click',()=>publishIfReady(currentRows(),null,{manual:true,forceRemote:true}));
  refreshMetrics();
}

function openPanel(){ui.modal?.classList.add('is-open');ui.modal?.setAttribute('aria-hidden','false');refreshMetrics();}
function closePanel(){ui.modal?.classList.remove('is-open');ui.modal?.setAttribute('aria-hidden','true');}
function showMessage(message,type='info'){
  if(!ui.message)return;
  ui.message.hidden=!message;ui.message.className=`firebase-message is-${type}`;ui.message.textContent=message||'';
}
function setState(type,title,detail){
  if(!ui.control)return;
  ui.control.className=`firebase-sync-control is-${type}`;
  ui.controlText.textContent=type==='ready'?'Conectado':type==='syncing'?'Publicando…':type==='error'?'Revisar':'Conectar';
  ui.state.className=`firebase-sync-state is-${type}`;
  ui.state.querySelector('strong').textContent=title;
  ui.state.querySelector('span').textContent=detail||'—';
}
function refreshMetrics(){
  if(!ui.localCount)return;
  ui.localCount.textContent=currentRows().length;
  const last=localStorage.getItem(LAST_PUBLISHED_KEY);
  ui.lastPublished.textContent=last?new Date(last).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'Sin publicación';
}
function updateUi(){
  if(!ui.form)return;
  const owner=isOwner(currentUser);
  ui.form.hidden=owner;
  ui.session.hidden=!owner;
  ui.publish.disabled=!owner||publishing;
  ui.loginButton.disabled=!auth;
  if(owner){
    ui.identity.textContent=currentUser.email||'Propietario';
    setState('ready','Nube conectada','Publicación automática activa');
    showMessage('');
  }else if(currentUser){
    setState('error','Cuenta sin permiso','Conecta la cuenta propietaria.');
    ui.form.hidden=false;
  }else if(auth){
    setState('idle','Administrador desconectado','Conecta Firebase una sola vez en este navegador.');
    ui.form.hidden=false;
  }
}
async function login(event){
  event.preventDefault();showMessage('');ui.loginButton.disabled=true;
  try{
    const {authMod}=await loadSdk();
    localStorage.setItem(OWNER_EMAIL_KEY,ui.email.value.trim());
    const result=await authMod.signInWithEmailAndPassword(auth,ui.email.value.trim(),ui.password.value);
    ui.password.value='';
    if(!isOwner(result.user)){await authMod.signOut(auth);throw new Error('Esta cuenta no corresponde al propietario autorizado.');}
    showMessage('Sesión guardada correctamente.','success');
    setTimeout(()=>publishIfReady(currentRows(),null,{forceRemote:true}),250);
  }catch(error){showMessage(friendlyError(error),'error');}
  finally{ui.loginButton.disabled=false;}
}
async function logout(){
  try{const {authMod}=await loadSdk();if(auth)await authMod.signOut(auth);}
  catch(error){showMessage(friendlyError(error),'error');}
}
async function commit(operations,fireMod){
  for(let i=0;i<operations.length;i+=350){
    const batch=fireMod.writeBatch(db);
    operations.slice(i,i+350).forEach(op=>op.type==='delete'?batch.delete(op.ref):batch.set(op.ref,op.data,{merge:false}));
    await batch.commit();
  }
}
function chunkId(index){return`${CHUNK_PREFIX}${String(index).padStart(4,'0')}`}
function chunksOf(events){
  const chunks=[];
  for(let i=0;i<events.length;i+=CHUNK_SIZE)chunks.push(events.slice(i,i+CHUNK_SIZE));
  return chunks;
}
async function publishChunks(events,dataHash,remoteMeta,fireMod){
  const chunks=chunksOf(events);
  const previousHashes=Array.isArray(remoteMeta?.chunkHashes)?remoteMeta.chunkHashes:[];
  const chunkHashes=chunks.map(items=>hash(JSON.stringify(items)));
  const operations=[];

  chunks.forEach((items,index)=>{
    if(previousHashes[index]===chunkHashes[index]&&remoteMeta?.dataHash===dataHash)return;
    operations.push({
      type:'set',
      ref:fireMod.doc(db,META_COLLECTION,chunkId(index)),
      data:{
        index,
        count:items.length,
        dataHash,
        chunkHash:chunkHashes[index],
        events:items,
        updatedAt:fireMod.serverTimestamp()
      }
    });
  });

  for(let index=chunks.length;index<Number(remoteMeta?.chunkCount||0);index++){
    operations.push({type:'delete',ref:fireMod.doc(db,META_COLLECTION,chunkId(index))});
  }

  if(operations.length)await commit(operations,fireMod);
  return{chunkCount:chunks.length,chunkHashes,changedChunks:operations.length};
}

async function chunkDocumentsValid(remoteMeta,fireMod){
  const count=Number(remoteMeta?.chunkCount)||0;
  if(!count)return false;
  const snapshots=await Promise.all(
    Array.from({length:count},(_,index)=>
      fireMod.getDoc(fireMod.doc(db,META_COLLECTION,chunkId(index)))
    )
  );
  return snapshots.every(snapshot=>{
    if(!snapshot.exists())return false;
    const data=snapshot.data()||{};
    return data.dataHash===remoteMeta.dataHash&&Array.isArray(data.events);
  });
}
async function syncEventDocuments(events,fireMod){
  const remote=await fireMod.getDocs(fireMod.collection(db,EVENTS_COLLECTION));
  const remoteMap=new Map(remote.docs.map(doc=>[doc.id,doc.data()?.contentHash||'']));
  const desired=new Set(events.map(event=>event.id));
  const operations=[];
  events.forEach(event=>{
    if(remoteMap.get(event.id)===event.contentHash)return;
    operations.push({type:'set',ref:fireMod.doc(db,EVENTS_COLLECTION,event.id),data:{...event,updatedAt:fireMod.serverTimestamp()}});
  });
  remote.docs.forEach(doc=>{if(!desired.has(doc.id))operations.push({type:'delete',ref:doc.ref});});
  if(operations.length)await commit(operations,fireMod);
  return operations.length;
}
async function writeAudit(entries,fireMod){
  if(!Array.isArray(entries)||!entries.length)return;
  const operations=entries.slice(0,300).map(entry=>({
    type:'set',
    ref:fireMod.doc(fireMod.collection(db,CHANGES_COLLECTION)),
    data:{...entry,publishedAt:fireMod.serverTimestamp(),ownerEmail:currentUser?.email||''}
  }));
  try{await commit(operations,fireMod);}catch(error){
    systemLog({source:'Firebase',level:'warning',title:'Auditoría remota no disponible',detail:friendlyError(error)});
  }
}

export async function publishIfReady(rows=null,diff=null,meta={}){
  if(publishing)return false;
  const operationStarted=performance.now();
  publishing=true;updateUi();
  try{
    const {fireMod}=await loadSdk();
    await authReadyPromise;
    if(!isOwner(currentUser)){if(meta.manual)openPanel();return false;}

    const source=Array.isArray(rows)?rows:currentRows();
    if(!source.length)return false;
    const events=source.map(publicEvent);
    const dataHash=meta.hash||localStorage.getItem('excelSync:dataHash')||hash(JSON.stringify(source));
    const metaRef=fireMod.doc(db,META_COLLECTION,'publicacion');
    const remoteMetaSnap=await fireMod.getDoc(metaRef);
    const remoteMeta=remoteMetaSnap.exists()?remoteMetaSnap.data():{};
    let chunksValid=remoteMeta.dataHash===dataHash&&Number(remoteMeta.count)===events.length&&Number(remoteMeta.chunkCount)>0;

    const lastChunkVerify=Number(localStorage.getItem(LAST_CHUNK_VERIFY_KEY)||0);
    const mustVerify=Boolean(meta.forceRemote||Date.now()-lastChunkVerify>CHUNK_VERIFY_INTERVAL_MS);
    if(chunksValid&&mustVerify){
      chunksValid=await chunkDocumentsValid(remoteMeta,fireMod);
      localStorage.setItem(LAST_CHUNK_VERIFY_KEY,String(Date.now()));
    }

    const needsPublish=Boolean(meta.manual||!chunksValid||localStorage.getItem(LAST_HASH_KEY)!==dataHash);

    if(!needsPublish){
      localStorage.setItem(LAST_REMOTE_COUNT_KEY,String(Number(remoteMeta.count)||events.length));
      localStorage.setItem(LAST_HASH_KEY,dataHash);
      setState('ready','Nube conectada','Sin cambios pendientes');
      refreshMetrics();
      import('./performance-monitor.js').then(module=>module.markOperation(
        'Comprobación Firebase sin cambios',performance.now()-operationStarted,{rows:events.length}
      )).catch(()=>{});
      return true;
    }

    setState('syncing','Publicando Agenda Móvil',`${events.length} registros`);
    const chunkResult=await publishChunks(events,dataHash,remoteMeta,fireMod);
    const publishedAt=new Date().toISOString();

    await fireMod.setDoc(metaRef,{
      count:events.length,
      chunkCount:chunkResult.chunkCount,
      chunkSize:CHUNK_SIZE,
      chunkHashes:chunkResult.chunkHashes,
      dataHash,
      publishedAt:fireMod.serverTimestamp(),
      clientPublishedAt:publishedAt,
      fileName:meta.fileName||localStorage.getItem('excelSync:fileName')||'',
      ownerUid:currentUser.uid,
      changedChunks:chunkResult.changedChunks
    },{merge:false});

    localStorage.setItem(LAST_PUBLISHED_KEY,publishedAt);
    localStorage.setItem(LAST_HASH_KEY,dataHash);
    localStorage.setItem(LAST_REMOTE_COUNT_KEY,String(events.length));
    localStorage.setItem(LAST_CHUNK_VERIFY_KEY,String(Date.now()));
    setState('ready','Nube conectada',`${events.length} registros disponibles`);
    showMessage('Agenda Móvil actualizada.','success');
    refreshMetrics();

    const backgroundTasks=async()=>{
      let documentChanges=0;
      try{
        documentChanges=await syncEventDocuments(events,fireMod);
      }catch(error){
        console.warn('Event documents fallback:',error);
      }
      try{
        await writeAudit(meta.auditEntries||diff?.auditEntries||[],fireMod);
      }catch(_){}
      await systemLog({
        source:'Firebase',
        level:'success',
        title:'Agenda Móvil publicada',
        detail:`${events.length} registros · ${chunkResult.changedChunks} bloques modificados · ${documentChanges} documentos detallados.`
      });
    };
    setTimeout(()=>backgroundTasks().catch(error=>console.warn('Firebase background sync:',error)),0);

    window.dispatchEvent(new CustomEvent('firebaseEventsPublished',{
      detail:{total:events.length,chunkCount:chunkResult.chunkCount,changedChunks:chunkResult.changedChunks}
    }));
    import('./performance-monitor.js').then(module=>module.markOperation(
      'Publicación incremental Firebase',performance.now()-operationStarted,
      {rows:events.length,chunks:chunkResult.changedChunks,totalChunks:chunkResult.chunkCount}
    )).catch(()=>{});
    return true;
  }catch(error){
    const message=friendlyError(error);
    import('./performance-monitor.js').then(module=>module.markOperation(
      'Error de publicación Firebase',performance.now()-operationStarted,{message}
    )).catch(()=>{});
    setState('error','No fue posible publicar',message);
    await systemLog({source:'Firebase',level:'error',title:'Error de publicación',detail:message});
    if(meta.manual){openPanel();showMessage(message,'error');}
    return false;
  }finally{publishing=false;updateUi();}
}

async function initialize(){
  ensureUi();setState('syncing','Inicializando Firebase','Espera un momento…');
  try{
    await loadSdk();await authReadyPromise;updateUi();
    if(isOwner(currentUser)&&currentRows().length){
      const run=()=>publishIfReady(currentRows(),null,{forceRemote:true});
      if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1000});else setTimeout(run,200);
    }
    setInterval(()=>{
      if(!document.hidden&&isOwner(currentUser)&&currentRows().length)publishIfReady(currentRows(),null,{forceRemote:false});
    },VERIFY_INTERVAL_MS);
  }catch(error){
    const message=friendlyError(error);
    setState('error','Firebase no disponible',message);
    await systemLog({source:'Firebase',level:'error',title:'Error de inicialización',detail:message});
    if(ui.loginButton)ui.loginButton.disabled=true;
  }
}
window.addEventListener('eventDataUpdated',event=>{
  if(!isOwner(currentUser))return;
  const detail=event.detail||{};
  publishIfReady(Array.isArray(detail.rowsData)?detail.rowsData:currentRows(),detail.diff,{
    fileName:detail.fileName,updatedAt:detail.updatedAt,hash:detail.hash,auditEntries:detail.auditEntries,forceRemote:false
  });
});
window.FirebaseEventPublisher={publish:()=>publishIfReady(currentRows(),null,{manual:true,forceRemote:true}),openPanel};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
