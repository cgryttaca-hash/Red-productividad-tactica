import {FIREBASE_CONFIG,FIREBASE_OWNER_UID,EVENTS_COLLECTION,META_COLLECTION,CHANGES_COLLECTION} from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const SNAPSHOT_KEY='firebase:publishedSnapshot';
const IDS_KEY='firebase:publishedIds';
const LAST_PUBLISHED_KEY='firebase:lastPublishedAt';
const PROMPT_KEY='firebase:loginPrompted';
const OWNER_EMAIL_KEY='firebase:ownerEmail';

let sdkPromise=null, auth=null, db=null, currentUser=null, authReady=null, publishing=false, ui={};

const text=v=>v===undefined||v===null?'':String(v);
const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const parseJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch(_){return fallback}};
const hash=v=>{let h=2166136261;for(const c of String(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};

async function loadSdk(){
  if(sdkPromise) return sdkPromise;
  sdkPromise=Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`)
  ]);
  const [appMod,authMod,fireMod]=await sdkPromise;
  const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
  auth=authMod.getAuth(app); db=fireMod.getFirestore(app);
  if(!authReady){
    authReady=new Promise(resolve=>authMod.onAuthStateChanged(auth,user=>{currentUser=user;updateUi();resolve(user)}));
  }
  return {appMod,authMod,fireMod};
}

function isOwner(user){return Boolean(user&&user.uid===FIREBASE_OWNER_UID)}
function normalizeDate(value){
  const d=new Date(value);return Number.isNaN(d.getTime())?text(value):d.toISOString().slice(0,10);
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
function currentRows(){try{const rows=JSON.parse(localStorage.getItem('eventData')||'[]');return Array.isArray(rows)?rows:[]}catch(_){return[]}}

function ensureUi(){
  if(!/\/(?:index\.html)?$/.test(location.pathname)||document.getElementById('firebaseSyncControl')) return;
  const control=document.createElement('button');
  control.id='firebaseSyncControl';control.className='firebase-sync-control is-idle';control.type='button';
  control.innerHTML='<span class="firebase-sync-icon">☁</span><span><small>Agenda móvil</small><strong id="firebaseSyncControlText">Conectar</strong></span><i></i>';
  const target=document.querySelector('[data-firebase-sync-slot]')||document.querySelector('.header-tools');if(target)target.appendChild(control);else document.body.appendChild(control);
  const modal=document.createElement('div');modal.id='firebaseSyncModal';modal.className='firebase-sync-modal';modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="firebase-sync-dialog" role="dialog" aria-modal="true" aria-labelledby="firebaseSyncTitle"><button class="firebase-sync-close" type="button" aria-label="Cerrar">×</button><div class="firebase-sync-heading"><span>☁</span><div><small>Firebase · tiempo real</small><h2 id="firebaseSyncTitle">Publicación móvil</h2><p>La sesión permanece guardada en este navegador.</p></div></div><div id="firebaseSyncState" class="firebase-sync-state"><i></i><div><small>Estado</small><strong>Comprobando conexión</strong><span>—</span></div></div><form id="firebaseLoginForm"><label>Correo<input id="firebaseEmail" type="email" autocomplete="username" required></label><label>Contraseña<input id="firebasePassword" type="password" autocomplete="current-password" required></label><button type="submit">Ingresar como administrador</button></form><div id="firebaseSession" class="firebase-session" hidden><div><small>Administrador conectado</small><strong id="firebaseIdentity">—</strong></div><button id="firebaseLogout" type="button">Cerrar sesión</button></div><div class="firebase-sync-metrics"><div><small>Eventos locales</small><strong id="firebaseLocalCount">0</strong></div><div><small>Última publicación</small><strong id="firebaseLastPublished">—</strong></div></div><div id="firebaseMessage" class="firebase-message" hidden></div><div class="firebase-sync-actions"><button id="firebasePublish" type="button">Publicar ahora</button><a href="agenda_movil.html" target="_blank" rel="noopener">Abrir agenda móvil</a></div></div>`;
  document.body.appendChild(modal);
  ui={control,controlText:document.getElementById('firebaseSyncControlText'),modal,state:document.getElementById('firebaseSyncState'),form:document.getElementById('firebaseLoginForm'),email:document.getElementById('firebaseEmail'),password:document.getElementById('firebasePassword'),session:document.getElementById('firebaseSession'),identity:document.getElementById('firebaseIdentity'),localCount:document.getElementById('firebaseLocalCount'),lastPublished:document.getElementById('firebaseLastPublished'),message:document.getElementById('firebaseMessage'),publish:document.getElementById('firebasePublish')};
  ui.email.value=localStorage.getItem(OWNER_EMAIL_KEY)||'cgryttaca@gmail.com';
  control.addEventListener('click',openPanel);modal.querySelector('.firebase-sync-close').addEventListener('click',closePanel);
  modal.addEventListener('click',e=>{if(e.target===modal)closePanel()});
  ui.form.addEventListener('submit',login);
  document.getElementById('firebaseLogout').addEventListener('click',logout);
  ui.publish.addEventListener('click',()=>publishIfReady(currentRows(),null,{manual:true}));
  refreshMetrics();
}
function openPanel(){ui.modal?.classList.add('is-open');ui.modal?.setAttribute('aria-hidden','false');refreshMetrics()}
function closePanel(){ui.modal?.classList.remove('is-open');ui.modal?.setAttribute('aria-hidden','true')}
function showMessage(message,type='info'){if(!ui.message)return;ui.message.hidden=!message;ui.message.className=`firebase-message is-${type}`;ui.message.textContent=message||''}
function setState(type,title,detail){
  if(!ui.control)return;
  ui.control.className=`firebase-sync-control is-${type}`;ui.controlText.textContent=type==='ready'?'Conectado':type==='syncing'?'Publicando…':type==='error'?'Revisar':'Conectar';
  ui.state.className=`firebase-sync-state is-${type}`;ui.state.querySelector('strong').textContent=title;ui.state.querySelector('span').textContent=detail||'—';
}
function refreshMetrics(){
  if(!ui.localCount)return;ui.localCount.textContent=currentRows().length;const last=localStorage.getItem(LAST_PUBLISHED_KEY);
  ui.lastPublished.textContent=last?new Date(last).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'Sin publicación';
}
function updateUi(){
  if(!ui.form)return;
  const owner=isOwner(currentUser);ui.form.hidden=owner;ui.session.hidden=!owner;ui.publish.disabled=!owner;
  if(owner){ui.identity.textContent=currentUser.email||'Propietario';setState('ready','Nube conectada','Sincronización automática activa')}
  else setState('idle','Administrador desconectado','Inicia sesión una sola vez en este equipo');
}
async function login(event){
  event.preventDefault();showMessage('');
  try{
    const {authMod}=await loadSdk();
    localStorage.setItem(OWNER_EMAIL_KEY,ui.email.value.trim());
    await authMod.setPersistence(auth,authMod.browserLocalPersistence);
    const result=await authMod.signInWithEmailAndPassword(auth,ui.email.value.trim(),ui.password.value);
    ui.password.value='';
    if(!isOwner(result.user)) throw new Error('Esta cuenta no corresponde al propietario autorizado.');
    showMessage('Sesión guardada correctamente.','success');
  }catch(error){showMessage(error.message||'No fue posible iniciar sesión.','error')}
}
async function logout(){const {authMod}=await loadSdk();await authMod.signOut(auth)}

async function commit(operations,fireMod){
  for(let i=0;i<operations.length;i+=400){
    const batch=fireMod.writeBatch(db);
    operations.slice(i,i+400).forEach(op=>op.type==='delete'?batch.delete(op.ref):batch.set(op.ref,op.data,{merge:false}));
    await batch.commit();
  }
}

export async function publishIfReady(rows=null,diff=null,meta={}){
  if(publishing)return false;publishing=true;
  try{
    const {fireMod}=await loadSdk();await authReady;
    if(!isOwner(currentUser)){if(meta.manual)openPanel();return false}
    const source=Array.isArray(rows)?rows:currentRows();if(!source.length)return false;
    setState('syncing','Publicando cambios',`${source.length} eventos`);
    const events=source.map(publicEvent);
    const previous=parseJSON(SNAPSHOT_KEY,{});
    const previousIds=new Set(parseJSON(IDS_KEY,[]));
    const nextIds=new Set(events.map(e=>e.id));
    const operations=[];const changes=[];
    for(const event of events){
      if(previous[event.id]===event.contentHash)continue;
      operations.push({type:'set',ref:fireMod.doc(db,EVENTS_COLLECTION,event.id),data:{...event,updatedAt:fireMod.serverTimestamp()}});
      changes.push({eventId:event.id,empresa:event.empresa,fechaISO:event.fechaISO,escenario:event.escenario,type:previous[event.id]?'actualizado':'creado'});
    }
    previousIds.forEach(id=>{if(!nextIds.has(id))operations.push({type:'delete',ref:fireMod.doc(db,EVENTS_COLLECTION,id)})});
    await commit(operations,fireMod);
    const publishedAt=new Date().toISOString();
    await fireMod.setDoc(
      fireMod.doc(db,META_COLLECTION,'publicacion'),
      {count:events.length,publishedAt:fireMod.serverTimestamp(),clientPublishedAt:publishedAt,fileName:meta.fileName||localStorage.getItem('excelSync:fileName')||'',ownerUid:currentUser.uid},
      {merge:false}
    );
    // El historial es complementario: nunca debe bloquear la publicación principal.
    if(changes.length){
      try{
        const historyBatch=fireMod.writeBatch(db);
        changes.slice(0,80).forEach(change=>historyBatch.set(
          fireMod.doc(fireMod.collection(db,CHANGES_COLLECTION)),
          {...change,publishedAt:fireMod.serverTimestamp(),ownerEmail:currentUser.email||''}
        ));
        await historyBatch.commit();
      }catch(historyError){
        console.warn('Firebase history unavailable:',historyError);
      }
    }
    const snapshot={};events.forEach(e=>snapshot[e.id]=e.contentHash);
    localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snapshot));localStorage.setItem(IDS_KEY,JSON.stringify([...nextIds]));localStorage.setItem(LAST_PUBLISHED_KEY,publishedAt);
    setState('ready','Nube conectada',operations.length?`${operations.length} cambios publicados`:'Sin cambios pendientes');
    showMessage(operations.length?'Agenda móvil actualizada.':'La nube ya estaba actualizada.','success');refreshMetrics();
    return true;
  }catch(error){
    console.error('Firebase publish:',error);setState('error','No fue posible publicar',error.message||'Revisa Firestore');
    if(meta.manual){openPanel();showMessage(error.message||'No fue posible publicar.','error')}return false;
  }finally{publishing=false}
}

async function initialize(){
  ensureUi();
  try{
    await loadSdk();await authReady;updateUi();
    if(ui.form&&!currentUser&&!localStorage.getItem(PROMPT_KEY)&&currentRows().length){
      localStorage.setItem(PROMPT_KEY,'1');setTimeout(openPanel,900);
    }
    if(isOwner(currentUser)&&currentRows().length)publishIfReady(currentRows(),null,{});
  }catch(error){setState('error','Firebase no disponible',error.message)}
}
initialize();
