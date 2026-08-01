import {
  FIREBASE_CONFIG,
  FIREBASE_OWNER_UID,
  EVENTS_COLLECTION,
  META_COLLECTION,
  CHANGES_COLLECTION
} from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
const LAST_PUBLISHED_KEY = 'firebase:lastPublishedAt';
const LAST_HASH_KEY = 'firebase:lastPublishedHash';
const PROMPT_KEY = 'firebase:loginPrompted';
const OWNER_EMAIL_KEY = 'firebase:ownerEmail';
const LAST_REMOTE_VERIFY_KEY = 'firebase:lastRemoteVerifyAt';
const LAST_REMOTE_COUNT_KEY = 'firebase:lastRemoteCount';
const REMOTE_VERIFY_INTERVAL_MS = 60000;
const CACHE_DB = 'gestion-eventos-firebase-cache';
const CACHE_STORE = 'state';

let sdkBundlePromise = null;
let authReadyPromise = null;
let auth = null;
let db = null;
let currentUser = null;
let publishing = false;
let ui = {};

const text = value => value === undefined || value === null ? '' : String(value);
const parseJSON = (key,fallback) => {
  try{
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value ?? fallback;
  }catch(_){
    return fallback;
  }
};
const hash = value => {
  let result = 2166136261;
  for(const character of String(value)){
    result ^= character.charCodeAt(0);
    result = Math.imul(result,16777619);
  }
  return (result >>> 0).toString(36);
};

function openCacheDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){
      reject(new Error('IndexedDB no está disponible.'));
      return;
    }
    const request = indexedDB.open(CACHE_DB,1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if(!database.objectStoreNames.contains(CACHE_STORE)) database.createObjectStore(CACHE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No fue posible abrir la caché de Firebase.'));
  });
}

async function cacheGet(key,fallback){
  try{
    const database = await openCacheDb();
    return await new Promise((resolve,reject)=>{
      const request = database.transaction(CACHE_STORE,'readonly').objectStore(CACHE_STORE).get(key);
      request.onsuccess = () => {
        database.close();
        resolve(request.result ?? fallback);
      };
      request.onerror = () => {
        database.close();
        reject(request.error);
      };
    });
  }catch(_){
    return fallback;
  }
}

async function cacheSet(key,value){
  try{
    const database = await openCacheDb();
    await new Promise((resolve,reject)=>{
      const transaction = database.transaction(CACHE_STORE,'readwrite');
      transaction.objectStore(CACHE_STORE).put(value,key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }catch(error){
    console.warn('Firebase cache unavailable:',error);
  }
}

function cleanupLegacyStorage(){
  ['firebase:publishedSnapshot','firebase:publishedIds'].forEach(key=>localStorage.removeItem(key));
}

async function loadSdk(){
  if(!sdkBundlePromise){
    sdkBundlePromise = (async()=>{
      const [appMod,authMod,fireMod] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`)
      ]);

      const app = appMod.getApps().length
        ? appMod.getApps()[0]
        : appMod.initializeApp(FIREBASE_CONFIG);

      auth = authMod.getAuth(app);
      db = fireMod.getFirestore(app);

      if(!auth) throw new Error('Firebase Authentication no pudo inicializarse.');
      if(typeof authMod.setPersistence !== 'function'){
        throw new Error('El módulo de persistencia de Firebase no está disponible.');
      }

      try{
        await authMod.setPersistence(auth,authMod.browserLocalPersistence);
      }catch(error){
        console.warn('Firebase persistence fallback:',error);
      }

      authReadyPromise = new Promise(resolve=>{
        const unsubscribe = authMod.onAuthStateChanged(
          auth,
          user=>{
            currentUser = user;
            updateUi();
            resolve(user);
          },
          error=>{
            setState('error','Firebase Authentication no respondió',friendlyError(error));
            resolve(null);
          }
        );
        window.addEventListener('pagehide',()=>unsubscribe(),{once:true});
      });

      return {appMod,authMod,fireMod,app};
    })();
  }
  return sdkBundlePromise;
}

function isOwner(user){
  return Boolean(user && user.uid === FIREBASE_OWNER_UID);
}

function normalizeDate(value){
  if(!value) return '';
  const source = text(value);
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return source;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function publicEvent(row,index){
  const id = row.__EVENT_ID || hash(`${row.HOJA_ORIGEN || ''}|${row.__FILA_ORIGEN || index}|${row['NOMBRE DE LA EMPRESA'] || ''}`);
  const event = {
    id,
    fechaISO:normalizeDate(row.FECHA),
    escenario:text(row['ESCENARIO ASIGNADO']),
    horarioEvento:text(row['HORARIO DEL EVENTO']),
    empresa:text(row['NOMBRE DE LA EMPRESA']),
    cantidadPersonas:Number(row['CANTIDAD DE PERSONAS']) || 0,
    horarioAyB:text(row['HORARIO AYB']),
    descripcionAlimentacion:text(row['DESCRIPCION ALIMENTACION']),
    acomodacion:text(row.ACOMODACION),
    medioPago:text(row['MEDIO DE PAGO']),
    modalidadServicio:text(row['MODALIDAD DE SERVICIO']),
    observacion:text(row.OBSERVACION),
    estado:text(row.ESTADO),
    desarrolloActividad:text(row['DESARROLLO ACTIVIDAD']),
    hojaOrigen:text(row.HOJA_ORIGEN),
    filaOrigen:Number(row.__FILA_ORIGEN) || 0
  };
  event.piso = /TERCER|PISO\s*3|\b3\d{2}\b/i.test(event.escenario)
    ? 'Tercer piso'
    : 'Segundo piso';
  event.contentHash = hash(JSON.stringify(event));
  return event;
}

function currentRows(){
  try{
    const rows = JSON.parse(localStorage.getItem('eventData') || '[]');
    return Array.isArray(rows) ? rows : [];
  }catch(_){
    return [];
  }
}

function friendlyError(error){
  const code = text(error?.code);
  const messages = {
    'auth/invalid-credential':'El correo o la contraseña no coinciden.',
    'auth/invalid-email':'El correo no tiene un formato válido.',
    'auth/operation-not-allowed':'El acceso con correo y contraseña no está habilitado en Firebase.',
    'auth/too-many-requests':'Firebase bloqueó temporalmente los intentos. Espera unos minutos.',
    'auth/network-request-failed':'No hay conexión con Firebase.',
    'permission-denied':'La sesión no tiene permisos suficientes en Firestore.'
  };
  return messages[code] || error?.message || 'No fue posible completar la operación.';
}

function ensureUi(){
  if(!/\/(?:index\.html)?$/.test(location.pathname) || document.getElementById('firebaseSyncControl')) return;

  const control = document.createElement('button');
  control.id = 'firebaseSyncControl';
  control.className = 'firebase-sync-control is-idle';
  control.type = 'button';
  control.innerHTML = `
    <span class="firebase-sync-icon">☁</span>
    <span><small>Agenda móvil</small><strong id="firebaseSyncControlText">Inicializando…</strong></span>
    <i></i>
  `;

  const target = document.querySelector('[data-firebase-sync-slot]') || document.querySelector('.header-tools');
  if(target) target.appendChild(control);
  else document.body.appendChild(control);

  const modal = document.createElement('div');
  modal.id = 'firebaseSyncModal';
  modal.className = 'firebase-sync-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML = `
    <div class="firebase-sync-dialog" role="dialog" aria-modal="true" aria-labelledby="firebaseSyncTitle">
      <button class="firebase-sync-close" type="button" aria-label="Cerrar">×</button>
      <div class="firebase-sync-heading">
        <span>☁</span>
        <div>
          <small>Firebase · tiempo real</small>
          <h2 id="firebaseSyncTitle">Publicación móvil</h2>
          <p>La sesión permanece guardada en este navegador.</p>
        </div>
      </div>
      <div id="firebaseSyncState" class="firebase-sync-state is-syncing">
        <i></i>
        <div><small>Estado</small><strong>Inicializando Firebase</strong><span>Espera un momento…</span></div>
      </div>
      <form id="firebaseLoginForm" hidden>
        <label>Correo<input id="firebaseEmail" type="email" autocomplete="username" required></label>
        <label>Contraseña<input id="firebasePassword" type="password" autocomplete="current-password" required></label>
        <button id="firebaseLoginButton" type="submit" disabled>Conectar Firebase</button>
      </form>
      <div id="firebaseSession" class="firebase-session" hidden>
        <div><small>Administrador conectado</small><strong id="firebaseIdentity">—</strong></div>
        <button id="firebaseLogout" type="button">Cerrar sesión</button>
      </div>
      <div class="firebase-sync-metrics">
        <div><small>Eventos locales</small><strong id="firebaseLocalCount">0</strong></div>
        <div><small>Última publicación</small><strong id="firebaseLastPublished">—</strong></div>
      </div>
      <div id="firebaseMessage" class="firebase-message" hidden></div>
      <div class="firebase-sync-actions">
        <button id="firebasePublish" type="button" disabled>Publicar ahora</button>
        <a href="agenda_movil.html" target="_blank" rel="noopener">Abrir agenda móvil</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  ui = {
    control,
    controlText:document.getElementById('firebaseSyncControlText'),
    modal,
    state:document.getElementById('firebaseSyncState'),
    form:document.getElementById('firebaseLoginForm'),
    email:document.getElementById('firebaseEmail'),
    password:document.getElementById('firebasePassword'),
    loginButton:document.getElementById('firebaseLoginButton'),
    session:document.getElementById('firebaseSession'),
    identity:document.getElementById('firebaseIdentity'),
    localCount:document.getElementById('firebaseLocalCount'),
    lastPublished:document.getElementById('firebaseLastPublished'),
    message:document.getElementById('firebaseMessage'),
    publish:document.getElementById('firebasePublish')
  };

  ui.email.value = localStorage.getItem(OWNER_EMAIL_KEY) || 'cgryttaca@gmail.com';
  control.addEventListener('click',openPanel);
  modal.querySelector('.firebase-sync-close').addEventListener('click',closePanel);
  modal.addEventListener('click',event=>{ if(event.target === modal) closePanel(); });
  ui.form.addEventListener('submit',login);
  document.getElementById('firebaseLogout').addEventListener('click',logout);
  ui.publish.addEventListener('click',()=>publishIfReady(currentRows(),null,{manual:true}));
  refreshMetrics();
}

function openPanel(){
  ui.modal?.classList.add('is-open');
  ui.modal?.setAttribute('aria-hidden','false');
  refreshMetrics();
}

function closePanel(){
  ui.modal?.classList.remove('is-open');
  ui.modal?.setAttribute('aria-hidden','true');
}

function showMessage(message,type='info'){
  if(!ui.message) return;
  ui.message.hidden = !message;
  ui.message.className = `firebase-message is-${type}`;
  ui.message.textContent = message || '';
}

function setState(type,title,detail){
  if(!ui.control) return;
  ui.control.className = `firebase-sync-control is-${type}`;
  ui.controlText.textContent = type === 'ready'
    ? 'Conectado'
    : type === 'syncing'
      ? 'Conectando…'
      : type === 'error'
        ? 'Revisar'
        : 'Conectar';

  ui.state.className = `firebase-sync-state is-${type}`;
  ui.state.querySelector('strong').textContent = title;
  ui.state.querySelector('span').textContent = detail || '—';
}

function refreshMetrics(){
  if(!ui.localCount) return;
  ui.localCount.textContent = currentRows().length;
  const last = localStorage.getItem(LAST_PUBLISHED_KEY);
  ui.lastPublished.textContent = last
    ? new Date(last).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})
    : 'Sin publicación';
}

function updateUi(){
  if(!ui.form) return;
  const owner = isOwner(currentUser);
  const sdkReady = Boolean(auth);

  ui.form.hidden = owner;
  ui.session.hidden = !owner;
  ui.publish.disabled = !owner || publishing;
  ui.loginButton.disabled = !sdkReady;

  if(owner){
    ui.identity.textContent = currentUser.email || 'Propietario';
    setState('ready','Nube conectada','Sincronización automática activa');
    showMessage('');
  }else if(currentUser){
    setState('error','Cuenta sin permiso','Esta cuenta no corresponde al propietario autorizado.');
    ui.form.hidden = false;
  }else if(sdkReady){
    setState('idle','Administrador desconectado','Inicia sesión una sola vez en este equipo.');
    ui.form.hidden = false;
  }
}

async function login(event){
  event.preventDefault();
  showMessage('');
  ui.loginButton.disabled = true;

  try{
    const {authMod} = await loadSdk();
    if(!auth) throw new Error('Firebase Authentication todavía no está listo.');

    localStorage.setItem(OWNER_EMAIL_KEY,ui.email.value.trim());
    const result = await authMod.signInWithEmailAndPassword(
      auth,
      ui.email.value.trim(),
      ui.password.value
    );
    ui.password.value = '';

    if(!isOwner(result.user)){
      await authMod.signOut(auth);
      throw new Error('Esta cuenta no corresponde al propietario autorizado.');
    }
    showMessage('Sesión guardada correctamente.','success');
  }catch(error){
    showMessage(friendlyError(error),'error');
  }finally{
    ui.loginButton.disabled = false;
  }
}

async function logout(){
  try{
    const {authMod} = await loadSdk();
    if(auth) await authMod.signOut(auth);
  }catch(error){
    showMessage(friendlyError(error),'error');
  }
}

async function commit(operations,fireMod){
  for(let index=0; index<operations.length; index+=400){
    const batch = fireMod.writeBatch(db);
    operations.slice(index,index+400).forEach(operation=>{
      if(operation.type === 'delete') batch.delete(operation.ref);
      else batch.set(operation.ref,operation.data,{merge:false});
    });
    await batch.commit();
  }
}

function eventFromDiffRow(row){
  return publicEvent(row,Number(row?.__FILA_ORIGEN)||0);
}

async function buildOperations(source,diff,fireMod,{forceRemote=false}={}){
  const operations = [];
  const changedEvents = [];

  if(!forceRemote && diff && (diff.created?.length || diff.updated?.length || diff.deleted?.length)){
    diff.created.forEach(row=>{
      const event = eventFromDiffRow(row);
      changedEvents.push(event);
      operations.push({
        type:'set',
        ref:fireMod.doc(db,EVENTS_COLLECTION,event.id),
        data:{...event,updatedAt:fireMod.serverTimestamp()}
      });
    });

    diff.updated.forEach(item=>{
      const row = item.after || item;
      const event = eventFromDiffRow(row);
      changedEvents.push(event);
      operations.push({
        type:'set',
        ref:fireMod.doc(db,EVENTS_COLLECTION,event.id),
        data:{...event,updatedAt:fireMod.serverTimestamp()}
      });
    });

    diff.deleted.forEach(row=>{
      const event = eventFromDiffRow(row);
      operations.push({
        type:'delete',
        ref:fireMod.doc(db,EVENTS_COLLECTION,event.id)
      });
    });

    return {operations,events:source.map(publicEvent),changedEvents};
  }

  const events = source.map(publicEvent);
  let cachedSnapshot = await cacheGet('snapshot',{});
  let remoteCount = Number(localStorage.getItem(LAST_REMOTE_COUNT_KEY) || 0);

  if(forceRemote || !Object.keys(cachedSnapshot || {}).length){
    try{
      const remoteSnapshot = await fireMod.getDocs(fireMod.collection(db,EVENTS_COLLECTION));
      cachedSnapshot = {};
      remoteSnapshot.docs.forEach(snapshot=>{
        const data = snapshot.data();
        cachedSnapshot[snapshot.id] = data.contentHash || '';
      });
      remoteCount = remoteSnapshot.size;
      localStorage.setItem(LAST_REMOTE_COUNT_KEY,String(remoteCount));
      localStorage.setItem(LAST_REMOTE_VERIFY_KEY,new Date().toISOString());
      await cacheSet('snapshot',cachedSnapshot);
    }catch(error){
      console.warn('Remote snapshot unavailable; continuing with local comparison:',error);
      if(forceRemote) cachedSnapshot = {};
    }
  }

  if(forceRemote && remoteCount !== events.length){
    console.warn(`Firebase consistency repair: local ${events.length}, remote ${remoteCount}.`);
  }

  const cachedIds = new Set(Object.keys(cachedSnapshot || {}));

  events.forEach(event=>{
    if(cachedSnapshot?.[event.id] === event.contentHash) return;
    changedEvents.push(event);
    operations.push({
      type:'set',
      ref:fireMod.doc(db,EVENTS_COLLECTION,event.id),
      data:{...event,updatedAt:fireMod.serverTimestamp()}
    });
    cachedIds.delete(event.id);
  });

  cachedIds.forEach(id=>{
    operations.push({
      type:'delete',
      ref:fireMod.doc(db,EVENTS_COLLECTION,id)
    });
  });

  return {operations,events,changedEvents};
}

async function writeAudit(entries,fireMod){
  if(!Array.isArray(entries) || !entries.length) return;
  const operations = entries.slice(0,300).map(entry=>({
    type:'set',
    ref:fireMod.doc(fireMod.collection(db,CHANGES_COLLECTION)),
    data:{
      ...entry,
      publishedAt:fireMod.serverTimestamp(),
      ownerEmail:currentUser?.email || ''
    }
  }));
  try{
    await commit(operations,fireMod);
  }catch(error){
    console.warn('Firebase history unavailable:',error);
  }
}

export async function publishIfReady(rows=null,diff=null,meta={}){
  if(publishing) return false;
  publishing = true;
  updateUi();

  try{
    const {fireMod} = await loadSdk();
    await authReadyPromise;

    if(!isOwner(currentUser)){
      if(meta.manual) openPanel();
      return false;
    }

    const source = Array.isArray(rows) ? rows : currentRows();
    if(!source.length) return false;

    const dataHash = meta.hash || localStorage.getItem('excelSync:dataHash') || hash(JSON.stringify(source));
    const lastVerify = new Date(localStorage.getItem(LAST_REMOTE_VERIFY_KEY) || 0).getTime();
    const verifyExpired = !Number.isFinite(lastVerify) || (Date.now() - lastVerify) >= REMOTE_VERIFY_INTERVAL_MS;
    const forceRemote = Boolean(meta.manual || meta.forceRemote || verifyExpired);

    if(!forceRemote && dataHash === localStorage.getItem(LAST_HASH_KEY)){
      setState('ready','Nube conectada','Sin cambios pendientes');
      return true;
    }

    setState('syncing','Verificando y publicando',`${source.length} eventos`);
    const {operations,events} = await buildOperations(source,diff,fireMod,{forceRemote});

    if(operations.length) await commit(operations,fireMod);

    const publishedAt = new Date().toISOString();
    await fireMod.setDoc(
      fireMod.doc(db,META_COLLECTION,'publicacion'),
      {
        count:events.length,
        publishedAt:fireMod.serverTimestamp(),
        clientPublishedAt:publishedAt,
        fileName:meta.fileName || localStorage.getItem('excelSync:fileName') || '',
        ownerUid:currentUser.uid,
        dataHash
      },
      {merge:false}
    );

    await writeAudit(meta.auditEntries || diff?.auditEntries || [],fireMod);

    const snapshot = {};
    events.forEach(event=>{ snapshot[event.id] = event.contentHash; });
    await cacheSet('snapshot',snapshot);
    localStorage.setItem(LAST_REMOTE_COUNT_KEY,String(events.length));
    localStorage.setItem(LAST_REMOTE_VERIFY_KEY,publishedAt);

    localStorage.setItem(LAST_PUBLISHED_KEY,publishedAt);
    localStorage.setItem(LAST_HASH_KEY,dataHash);

    setState(
      'ready',
      'Nube conectada',
      operations.length ? `${operations.length} cambios publicados` : 'Sin cambios pendientes'
    );
    showMessage(
      operations.length ? 'Agenda móvil actualizada.' : 'La nube ya estaba actualizada.',
      'success'
    );
    refreshMetrics();
    window.dispatchEvent(new CustomEvent('firebaseEventsPublished',{detail:{operations:operations.length}}));
    return true;
  }catch(error){
    const message = friendlyError(error);
    setState('error','No fue posible publicar',message);
    if(meta.manual){
      openPanel();
      showMessage(message,'error');
    }
    return false;
  }finally{
    publishing = false;
    updateUi();
  }
}

async function initialize(){
  cleanupLegacyStorage();
  ensureUi();
  setState('syncing','Inicializando Firebase','Espera un momento…');

  try{
    await loadSdk();
    await authReadyPromise;
    updateUi();

    if(ui.form && !currentUser && !localStorage.getItem(PROMPT_KEY) && currentRows().length){
      localStorage.setItem(PROMPT_KEY,'1');
      setTimeout(openPanel,700);
    }

    if(isOwner(currentUser) && currentRows().length){
      const run = () => publishIfReady(currentRows(),null,{forceRemote:true});
      if('requestIdleCallback' in window) requestIdleCallback(run,{timeout:1200});
      else setTimeout(run,250);
    }

    setInterval(()=>{
      if(!document.hidden && isOwner(currentUser) && currentRows().length){
        publishIfReady(currentRows(),null,{forceRemote:true});
      }
    },REMOTE_VERIFY_INTERVAL_MS);
  }catch(error){
    setState('error','Firebase no disponible',friendlyError(error));
    if(ui.form) ui.loginButton.disabled = true;
  }
}

window.addEventListener('eventDataUpdated',event=>{
  if(!isOwner(currentUser)) return;
  const detail = event.detail || {};
  publishIfReady(currentRows(),detail.diff,{
    fileName:detail.fileName,
    updatedAt:detail.updatedAt,
    hash:detail.hash,
    auditEntries:detail.auditEntries
  });
});

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded',initialize,{once:true});
}else{
  initialize();
}
