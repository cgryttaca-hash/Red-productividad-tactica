import {
  FIREBASE_CONFIG,
  FIREBASE_OWNER_UID,
  META_COLLECTION
} from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const CACHE_KEY='rptMaintenanceCacheV1';
const DOC_ID='mantenimiento';
const $=id=>document.getElementById(id);
const labels={index:'Inicio',eventos:'Eventos',minuta:'Minuta',agenda_movil:'Agenda Móvil',usuarios:'Usuarios'};
let sdk=null,auth=null,db=null,currentUser=null,config={pages:{}},unsubscribe=null,ticker=null;

function message(value,type='success'){
  const el=$('configMessage');
  el.hidden=!value;el.className=`config-message is-${type}`;el.textContent=value||'';
}
function ownerMessage(value,type='error'){
  const el=$('ownerLoginMessage');
  el.hidden=!value;el.className=`config-message is-${type}`;el.textContent=value||'';
}
function cache(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify(value));}catch(_){}}
function isOwner(){return Boolean(currentUser&&currentUser.uid===FIREBASE_OWNER_UID)}
function formatRemaining(until){
  const ms=new Date(until).getTime()-Date.now();
  if(ms<=0)return'Finalizado';
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function renderOwner(){
  const state=$('cloudOwnerState');
  const login=$('ownerLoginPanel');
  if(isOwner()){
    state.className='owner-state is-ready';
    state.querySelector('strong').textContent='Cuenta propietaria conectada';
    state.querySelector('span').textContent=currentUser.email||'Sesión persistente';
    login.hidden=true;
    $('activateMaintenance').disabled=false;
  }else{
    state.className='owner-state is-error';
    state.querySelector('strong').textContent='Conexión requerida';
    state.querySelector('span').textContent='Conecta la cuenta propietaria para guardar globalmente.';
    login.hidden=false;
    $('activateMaintenance').disabled=true;
  }
}
function renderList(){
  const pages=config?.pages||{};
  const entries=Object.entries(labels).map(([key,label])=>{
    const item=pages[key]||{};
    const active=Boolean(item.active&&new Date(item.until).getTime()>Date.now());
    return `
      <article class="maintenance-item ${active?'':'is-inactive'}">
        <div>
          <strong>${label} · ${active?'En actualización':'Disponible'}</strong>
          <p>${item.message||'Sin mantenimiento programado.'}</p>
          <small>${active?`Tiempo restante ${formatRemaining(item.until)} · Finaliza ${new Date(item.until).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})}`:'Sin temporizador activo'}</small>
        </div>
        ${active?`<button type="button" data-stop="${key}">Finalizar ahora</button>`:''}
      </article>
    `;
  });
  $('maintenanceList').innerHTML=entries.join('');
}
async function saveConfig(next){
  if(!isOwner())throw new Error('La cuenta propietaria no está conectada.');
  config=next;cache(config);renderList();
  await sdk.fireMod.setDoc(
    sdk.fireMod.doc(db,META_COLLECTION,DOC_ID),
    {
      ...config,
      updatedAt:sdk.fireMod.serverTimestamp(),
      clientUpdatedAt:new Date().toISOString(),
      updatedBy:currentUser.email||''
    },
    {merge:false}
  );
}
async function initializeFirebase(){
  const [appMod,authMod,fireMod]=await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`)
  ]);
  const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
  auth=authMod.getAuth(app);db=fireMod.getFirestore(app);sdk={appMod,authMod,fireMod};
  try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
  authMod.onAuthStateChanged(auth,user=>{
    currentUser=user;
    renderOwner();
  });
  const ref=fireMod.doc(db,META_COLLECTION,DOC_ID);
  const snap=await fireMod.getDoc(ref);
  config=snap.exists()?snap.data():{pages:{}};
  cache(config);renderList();
  unsubscribe=fireMod.onSnapshot(ref,next=>{
    config=next.exists()?next.data():{pages:{}};
    cache(config);renderList();
  });
}
$('ownerLoginForm').addEventListener('submit',async event=>{
  event.preventDefault();ownerMessage('');
  $('ownerLoginButton').disabled=true;
  try{
    const result=await sdk.authMod.signInWithEmailAndPassword(auth,$('ownerEmail').value.trim(),$('ownerPassword').value);
    $('ownerPassword').value='';
    if(result.user.uid!==FIREBASE_OWNER_UID){
      await sdk.authMod.signOut(auth);
      throw new Error('La cuenta no corresponde al propietario autorizado.');
    }
    ownerMessage('Conexión guardada correctamente.','success');
  }catch(error){
    ownerMessage(error?.message||'No fue posible conectar Firebase.');
  }finally{$('ownerLoginButton').disabled=false;}
});
$('maintenanceForm').addEventListener('submit',async event=>{
  event.preventDefault();message('');
  try{
    const page=$('maintenancePage').value;
    const minutes=Math.max(1,Number($('maintenanceMinutes').value)||1);
    const now=Date.now();
    const next=structuredClone(config||{pages:{}});
    next.pages=next.pages||{};
    next.pages[page]={
      active:true,
      startedAt:new Date(now).toISOString(),
      until:new Date(now+minutes*60000).toISOString(),
      durationMs:minutes*60000,
      message:$('maintenanceMessage').value.trim()||'Estamos realizando mejoras en esta página.'
    };
    await saveConfig(next);
    message(`Mantenimiento activado para ${labels[page]}.`);
  }catch(error){message(error.message||'No fue posible activar el mantenimiento.','error');}
});
$('maintenanceList').addEventListener('click',async event=>{
  const button=event.target.closest('[data-stop]');
  if(!button)return;
  try{
    const next=structuredClone(config||{pages:{}});
    next.pages=next.pages||{};
    next.pages[button.dataset.stop]={...(next.pages[button.dataset.stop]||{}),active:false,until:new Date().toISOString()};
    await saveConfig(next);
    message(`Mantenimiento finalizado para ${labels[button.dataset.stop]}.`);
  }catch(error){message(error.message||'No fue posible finalizar el mantenimiento.','error');}
});
ticker=setInterval(renderList,1000);
window.addEventListener('pagehide',()=>{unsubscribe?.();clearInterval(ticker);},{once:true});
initializeFirebase().catch(error=>{
  $('cloudOwnerState').className='owner-state is-error';
  $('cloudOwnerState').querySelector('strong').textContent='Firebase no disponible';
  $('cloudOwnerState').querySelector('span').textContent=error.message||'Revisa la conexión.';
  $('ownerLoginPanel').hidden=false;
});
