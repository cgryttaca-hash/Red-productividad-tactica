import {
  FIREBASE_CONFIG,
  FIREBASE_OWNER_UID,
  FIREBASE_COLLECTION,
  FIREBASE_META_COLLECTION,
  FIREBASE_META_DOCUMENT,
  FIREBASE_CHANGES_COLLECTION,
  isFirebaseConfigured
} from "./firebase-config.js?v=20260730-quota1";

const SDK_VERSION="12.16.0";
const DEVICE_AUTH_KEY="rpt:deviceAuthorized";
const DEVICE_NAME_KEY="rpt:deviceName";
const OWNER_EMAIL_KEY="firebase:ownerEmail";
const LAST_PUBLISHED_KEY="firebase:lastPublishedAt";
const FIELD_LABELS={
  fechaISO:"Fecha",empresa:"Empresa",escenario:"Escenario",piso:"Piso",
  horarioEvento:"Horario del evento",horarioAyB:"Horario A&B",
  alimentacion:"Descripción alimentación",cantidadPersonas:"Cantidad de personas",
  acomodacion:"Acomodación",modalidadServicio:"Modalidad de servicio",
  medioPago:"Medio de pago",estado:"Estado",observacion:"Observación"
};
const PUBLIC_FIELDS=Object.keys(FIELD_LABELS);
let initializeApp,getApps,getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,
  signInWithEmailAndPassword,sendPasswordResetEmail,signOut,getFirestore,collection,doc,
  getDocs,getDoc,writeBatch,serverTimestamp;
let auth=null,db=null,currentUser=null,publishing=false,publishTimer=null,ui={};

const text=v=>v===undefined||v===null?"":String(v).trim();
const normalize=v=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const upper=v=>normalize(v).toUpperCase();
function safeSetLocal(key,value){
  if(window.EventDataStore?.safeSetSmall) return window.EventDataStore.safeSetSmall(key,String(value));
  try{localStorage.setItem(key,String(value));return true;}catch(error){console.warn(`No fue posible guardar ${key}:`,error);return false;}
}
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function loadSdk(){
  const [appModule,authModule,firestoreModule]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
  ]);
  ({initializeApp,getApps}=appModule);
  ({getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,sendPasswordResetEmail,signOut}=authModule);
  ({getFirestore,collection,doc,getDocs,getDoc,writeBatch,serverTimestamp}=firestoreModule);
}

function localDateISO(value){
  if(!value)return "";
  if(value instanceof Date&&!Number.isNaN(value.getTime())){
    return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
  }
  const source=text(value);
  let m=source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m)return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  const d=new Date(source);
  return Number.isNaN(d.getTime())?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function numberValue(v){const n=Number(text(v).replace(/[^0-9,.-]/g,"").replace(",","."));return Number.isFinite(n)?n:0;}
function valueFrom(row,keys){for(const key of keys){if(row&&Object.prototype.hasOwnProperty.call(row,key)&&row[key]!==undefined&&row[key]!==null)return row[key];}return "";}
function floorFromScenario(value){return upper(value).includes("TERCER")?"Tercer piso":"Segundo piso";}
function hasFood(value){const s=upper(value);return Boolean(s)&&!["NO","N/A","NA","SIN ALIMENTACION","SIN SERVICIO","NO APLICA"].includes(s);}
function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}

function publicEvent(row,occurrences){
  const event={
    schemaVersion:2,
    fechaISO:localDateISO(valueFrom(row,["FECHA","fecha","date"])),
    empresa:text(valueFrom(row,["NOMBRE DE LA EMPRESA","EMPRESA","empresa","cliente"])),
    escenario:text(valueFrom(row,["ESCENARIO ASIGNADO","ESCENARIO","escenario","salon","salón"]))||"Sin espacio asignado",
    horarioEvento:text(valueFrom(row,["HORARIO DEL EVENTO","HORARIO","horario"]))||"Sin horario registrado",
    horarioAyB:text(valueFrom(row,["HORARIO AYB","HORARIO A&B","horario ayb"]))||"Sin horario A&B",
    alimentacion:text(valueFrom(row,["DESCRIPCION ALIMENTACION","DESCRIPCIÓN ALIMENTACIÓN","ALIMENTACION","alimentacion"]))||"Sin alimentación registrada",
    cantidadPersonas:numberValue(valueFrom(row,["CANTIDAD DE PERSONAS","PAX","personas"])),
    acomodacion:text(valueFrom(row,["ACOMODACION","ACOMODACIÓN","acomodacion"])),
    modalidadServicio:text(valueFrom(row,["MODALIDAD DE SERVICIO","MODALIDAD","servicio"])),
    medioPago:text(valueFrom(row,["MEDIO DE PAGO","PAGO","pago"])),
    estado:text(valueFrom(row,["ESTADO","STATUS","estado"])),
    observacion:text(valueFrom(row,["OBSERVACION","OBSERVACIÓN","observacion"])),
    hojaOrigen:text(valueFrom(row,["HOJA_ORIGEN","HOJA ORIGEN"]))
  };
  if(!event.fechaISO||!event.empresa)return null;
  event.piso=floorFromScenario(event.escenario);
  event.tieneAlimentacion=hasFood(event.alimentacion);
  const sourceRow=text(valueFrom(row,["__FILA_ORIGEN","FILA_ORIGEN"]));
  const sourceSheet=text(valueFrom(row,["HOJA_ORIGEN","HOJA ORIGEN"]));
  const stable=sourceRow
    ? ["ROW",upper(sourceSheet),sourceRow].join("|")
    : [event.fechaISO,upper(event.empresa),upper(event.escenario)].join("|");
  const occurrence=(occurrences.get(stable)||0)+1;occurrences.set(stable,occurrence);
  const id=`ev_${hash(`${stable}|${occurrence}`)}`;
  return{id,contentHash:hash(JSON.stringify(event)),...event};
}
async function localEvents(){
  let rows=[];
  try{
    if(window.EventDataStore){
      const dataset=await window.EventDataStore.load();
      rows=Array.isArray(dataset.rows)?dataset.rows:[];
    }
  }catch(error){
    console.error("No fue posible leer los eventos locales para Firebase:",error);
  }
  const occurrences=new Map();
  return rows.map(row=>publicEvent(row,occurrences)).filter(Boolean)
    .sort((a,b)=>a.fechaISO.localeCompare(b.fechaISO)||a.piso.localeCompare(b.piso)||a.escenario.localeCompare(b.escenario,"es",{numeric:true}));
}
function isOwner(user){return Boolean(user&&user.uid===FIREBASE_OWNER_UID);}
function deviceName(){return localStorage.getItem(DEVICE_NAME_KEY)||"Equipo principal";}
function formatDate(value){if(!value)return"—";const d=value?.toDate?value.toDate():new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});}

function authMessage(error){
  const code=String(error?.code||"");
  const map={
    "auth/invalid-credential":"El correo o la contraseña no coinciden.",
    "auth/invalid-email":"El correo no tiene un formato válido.",
    "auth/operation-not-allowed":"Habilita Correo electrónico/contraseña en Firebase Authentication.",
    "auth/too-many-requests":"Firebase bloqueó temporalmente varios intentos. Espera y vuelve a intentar.",
    "auth/network-request-failed":"No hay conexión con Firebase."
  };
  return map[code]||`No fue posible iniciar sesión (${code||"error desconocido"}).`;
}

function ensureUi(){
  if(document.getElementById("firebaseCloudModal"))return;
  const control=document.createElement("button");
  control.id="firebaseCloudControl";control.className="sync-control cloud-control is-warning";control.type="button";
  control.innerHTML=`<span class="sync-icon">☁</span><span class="sync-copy"><small>Publicación móvil</small><strong id="firebaseCloudControlText">Conectar nube</strong></span><i class="sync-dot"></i>`;
  const slot=document.querySelector("[data-sync-slot]")||document.querySelector(".header-tools")||document.querySelector(".command-left")||document.querySelector(".minute-actions");
  if(slot)slot.insertBefore(control,slot.firstChild);else{control.classList.add("is-floating");document.body.appendChild(control);}

  const modal=document.createElement("div");
  modal.id="firebaseCloudModal";modal.className="sync-modal";modal.setAttribute("aria-hidden","true");
  modal.innerHTML=`<div class="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="firebaseTitle">
    <button id="firebaseClose" class="sync-close" type="button">×</button>
    <div class="sync-heading"><span class="sync-heading-icon">☁</span><div><small>Firebase · tiempo real</small><h2 id="firebaseTitle">Publicación móvil</h2><p>La sesión queda guardada en este navegador. No se solicitará la contraseña en cada visita.</p></div></div>
    <div id="firebaseState" class="sync-state is-warning"><i class="sync-dot"></i><div><small>Estado</small><strong id="firebaseStateText">Esperando autenticación</strong><span id="firebaseStateDetail">—</span></div></div>
    <form id="ownerForm" class="owner-form">
      <label>Correo<input id="ownerEmail" type="email" autocomplete="username" required></label>
      <label>Contraseña<input id="ownerPassword" type="password" autocomplete="current-password" required></label>
      <button class="sync-primary" type="submit">Ingresar como administrador</button>
      <button id="ownerReset" class="sync-secondary" type="button">Restablecer contraseña</button>
    </form>
    <div id="ownerSession" class="owner-session" hidden><div><small>Administrador conectado</small><strong id="ownerIdentity">—</strong><span id="ownerDevice">—</span></div><button id="ownerLogout" class="sync-danger" type="button">Cerrar sesión</button></div>
    <div class="sync-details"><div><small>Eventos locales</small><strong id="firebaseLocalCount">0</strong></div><div><small>Último Excel</small><strong id="firebaseLocalUpdated">—</strong></div><div><small>Última publicación</small><strong id="firebasePublishedAt">—</strong></div></div>
    <div id="firebaseMessage" class="sync-message" hidden></div>
    <div class="sync-actions"><button id="publishNow" class="sync-primary" type="button">Publicar ahora</button><a class="sync-secondary link-button" href="agenda_movil.html" target="_blank" rel="noopener">Abrir agenda móvil</a></div>
  </div>`;
  document.body.appendChild(modal);

  const setup=document.createElement("div");
  setup.id="deviceSetupModal";setup.className="device-setup";setup.setAttribute("aria-hidden","true");
  setup.innerHTML=`<div class="device-dialog" role="dialog" aria-modal="true" aria-labelledby="deviceTitle">
    <div class="device-badge">PRIMER ACCESO</div><h2 id="deviceTitle">Autorizar este equipo</h2>
    <p>Esta verificación se realiza una sola vez en este navegador. Después el sistema abrirá normalmente.</p>
    <form id="deviceForm">
      <label>Nombre del equipo<input id="deviceNameInput" required placeholder="Ejemplo: Portátil administración"></label>
      <label>Correo administrador<input id="deviceEmailInput" type="email" autocomplete="username" required></label>
      <label>Contraseña administrador<input id="devicePasswordInput" type="password" autocomplete="current-password" required></label>
      <label class="permission-check"><input id="deviceNotifications" type="checkbox" checked><span>Permitir avisos de cambios mientras la aplicación esté abierta</span></label>
      <button type="submit">Autorizar equipo</button>
    </form>
    <div id="deviceMessage" class="sync-message" hidden></div>
  </div>`;
  document.body.appendChild(setup);

  ui={
    control,controlText:document.getElementById("firebaseCloudControlText"),modal,close:document.getElementById("firebaseClose"),
    state:document.getElementById("firebaseState"),stateText:document.getElementById("firebaseStateText"),stateDetail:document.getElementById("firebaseStateDetail"),
    form:document.getElementById("ownerForm"),email:document.getElementById("ownerEmail"),password:document.getElementById("ownerPassword"),
    reset:document.getElementById("ownerReset"),session:document.getElementById("ownerSession"),identity:document.getElementById("ownerIdentity"),
    ownerDevice:document.getElementById("ownerDevice"),logout:document.getElementById("ownerLogout"),localCount:document.getElementById("firebaseLocalCount"),
    localUpdated:document.getElementById("firebaseLocalUpdated"),publishedAt:document.getElementById("firebasePublishedAt"),
    message:document.getElementById("firebaseMessage"),publish:document.getElementById("publishNow"),
    setup,deviceForm:document.getElementById("deviceForm"),deviceNameInput:document.getElementById("deviceNameInput"),
    deviceEmailInput:document.getElementById("deviceEmailInput"),devicePasswordInput:document.getElementById("devicePasswordInput"),
    deviceNotifications:document.getElementById("deviceNotifications"),deviceMessage:document.getElementById("deviceMessage")
  };
  const savedEmail=localStorage.getItem(OWNER_EMAIL_KEY)||"cgryttaca@gmail.com";
  ui.email.value=savedEmail;ui.deviceEmailInput.value=savedEmail;
  ui.deviceNameInput.value=localStorage.getItem(DEVICE_NAME_KEY)||suggestDeviceName();
  control.addEventListener("click",openModal);ui.close.addEventListener("click",closeModal);
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
  ui.form.addEventListener("submit",loginOwner);ui.reset.addEventListener("click",resetPassword);
  ui.logout.addEventListener("click",()=>signOut(auth));ui.publish.addEventListener("click",()=>publishEvents({manual:true}));
  ui.deviceForm.addEventListener("submit",authorizeDevice);
}
function suggestDeviceName(){
  const platform=navigator.userAgentData?.platform||navigator.platform||"Equipo";
  return `${platform} principal`;
}
function openModal(){refreshSummary();ui.modal.classList.add("is-open");ui.modal.setAttribute("aria-hidden","false");}
function closeModal(){ui.modal.classList.remove("is-open");ui.modal.setAttribute("aria-hidden","true");}
function show(el,message,type="info"){el.hidden=!message;el.className=`sync-message is-${type}`;el.textContent=message||"";}
function setState(type,detail=""){
  const map={ready:["is-ready","Nube conectada","Listo para publicar"],warning:["is-warning","Reconectar nube","Administrador desconectado"],syncing:["is-syncing","Publicando…","Actualizando agenda móvil"],error:["is-error","Error de nube","Revisar configuración"]};
  const [cls,controlText,stateText]=map[type]||map.warning;
  [ui.control,ui.state].forEach(el=>{el.classList.remove("is-ready","is-warning","is-syncing","is-error");el.classList.add(cls);});
  ui.controlText.textContent=controlText;ui.stateText.textContent=stateText;ui.stateDetail.textContent=detail||"—";
}
async function refreshSummary(){
  const events=await localEvents();
  ui.localCount.textContent=String(events.length);
  ui.localUpdated.textContent=formatDate(localStorage.getItem("eventDataUpdatedAt"));
  ui.publishedAt.textContent=formatDate(localStorage.getItem(LAST_PUBLISHED_KEY));
}
async function loginOwner(event){
  event.preventDefault();show(ui.message,"");
  try{
    safeSetLocal(OWNER_EMAIL_KEY,ui.email.value.trim());
    await setPersistence(auth,browserLocalPersistence);
    await signInWithEmailAndPassword(auth,ui.email.value.trim(),ui.password.value);
    ui.password.value="";
  }catch(error){show(ui.message,authMessage(error),"error");}
}
async function resetPassword(){
  const email=ui.email.value.trim();if(!email){show(ui.message,"Escribe el correo primero.","error");return;}
  try{await sendPasswordResetEmail(auth,email);show(ui.message,"Se envió el enlace de restablecimiento al correo.","success");}
  catch(error){show(ui.message,authMessage(error),"error");}
}
async function authorizeDevice(event){
  event.preventDefault();show(ui.deviceMessage,"");
  try{
    if(ui.deviceNotifications.checked&&"Notification"in window&&Notification.permission==="default"){
      await Notification.requestPermission();
    }
    await setPersistence(auth,browserLocalPersistence);
    const result=await signInWithEmailAndPassword(auth,ui.deviceEmailInput.value.trim(),ui.devicePasswordInput.value);
    if(!isOwner(result.user))throw new Error("La cuenta no corresponde al administrador autorizado.");
    safeSetLocal(DEVICE_NAME_KEY,ui.deviceNameInput.value.trim()||suggestDeviceName());
    safeSetLocal(DEVICE_AUTH_KEY,"1");
    safeSetLocal(OWNER_EMAIL_KEY,ui.deviceEmailInput.value.trim());
    ui.setup.classList.remove("is-open");ui.setup.setAttribute("aria-hidden","true");
    window.dispatchEvent(new CustomEvent("deviceAuthorized"));
    setTimeout(()=>{if(!window.ExcelFileSync?.hasHandle())window.ExcelFileSync?.openPanel();},300);
  }catch(error){show(ui.deviceMessage,error?.code?authMessage(error):error.message,"error");}
}
function diffEvents(previous,next){
  return PUBLIC_FIELDS.filter(field=>String(previous?.[field]??"")!==String(next?.[field]??"")).map(field=>({
    field,label:FIELD_LABELS[field],before:String(previous?.[field]??""),after:String(next?.[field]??"")
  }));
}
async function commitOperations(ops){
  for(let i=0;i<ops.length;i+=350){
    const batch=writeBatch(db);
    ops.slice(i,i+350).forEach(op=>op.type==="delete"?batch.delete(op.ref):batch.set(op.ref,op.data,{merge:false}));
    await batch.commit();
  }
}
async function publishEvents({manual=false}={}){
  if(publishing||!isOwner(currentUser))return false;
  const events=await localEvents();if(!events.length){if(manual){openModal();show(ui.message,"No hay eventos locales para publicar.","error");}return false;}
  publishing=true;setState("syncing",`${events.length} eventos preparados`);
  try{
    const sourceUpdatedAt=localStorage.getItem("eventDataUpdatedAt")||new Date().toISOString();
    const metaRef=doc(db,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT);
    const metaSnap=await getDoc(metaRef);const meta=metaSnap.exists()?metaSnap.data():null;
    if(!manual&&meta?.sourceUpdatedAt===sourceUpdatedAt&&meta?.count===events.length){setState("ready","Sin cambios pendientes");return true;}
    const existingSnap=await getDocs(collection(db,FIREBASE_COLLECTION));
    const existing=new Map(existingSnap.docs.map(s=>[s.id,s.data()]));
    const desired=new Map(events.map(e=>[e.id,e]));
    const eventOps=[],changeOps=[];const batchId=`pub_${Date.now().toString(36)}`;
    let created=0,updated=0,deleted=0;
    const baseLog={batchId,deviceName:deviceName(),authorEmail:currentUser.email||"",authorUid:currentUser.uid,sourceUpdatedAt,clientPublishedAt:new Date().toISOString(),publishedAt:serverTimestamp()};
    for(const event of events){
      const old=existing.get(event.id);const ref=doc(db,FIREBASE_COLLECTION,event.id);
      if(!old){
        created++;eventOps.push({type:"set",ref,data:{...event,sourceUpdatedAt,publishedBy:currentUser.uid,updatedAt:serverTimestamp()}});
        const logRef=doc(collection(db,FIREBASE_CHANGES_COLLECTION));
        changeOps.push({type:"set",ref:logRef,data:{...baseLog,type:"creado",eventId:event.id,empresa:event.empresa,fechaISO:event.fechaISO,escenario:event.escenario,piso:event.piso,changes:[]}});
      }else if(old.contentHash!==event.contentHash){
        updated++;const changes=diffEvents(old,event);
        eventOps.push({type:"set",ref,data:{...event,sourceUpdatedAt,publishedBy:currentUser.uid,updatedAt:serverTimestamp()}});
        const logRef=doc(collection(db,FIREBASE_CHANGES_COLLECTION));
        changeOps.push({type:"set",ref:logRef,data:{...baseLog,type:"actualizado",eventId:event.id,empresa:event.empresa,fechaISO:event.fechaISO,escenario:event.escenario,piso:event.piso,changes}});
      }
    }
    for(const snapshot of existingSnap.docs){
      if(!desired.has(snapshot.id)){
        deleted++;eventOps.push({type:"delete",ref:snapshot.ref});
        const old=snapshot.data(),logRef=doc(collection(db,FIREBASE_CHANGES_COLLECTION));
        changeOps.push({type:"set",ref:logRef,data:{...baseLog,type:"eliminado",eventId:snapshot.id,empresa:old.empresa||"",fechaISO:old.fechaISO||"",escenario:old.escenario||"",piso:old.piso||"Segundo piso",changes:[]}});
      }
    }
    const summaryRef=doc(collection(db,FIREBASE_CHANGES_COLLECTION));
    changeOps.push({type:"set",ref:summaryRef,data:{...baseLog,type:"cargue",eventId:"",empresa:"",fechaISO:"",escenario:"",piso:"",created,updated,deleted,total:events.length,changes:[]}});
    await commitOperations(eventOps);await commitOperations(changeOps);
    const metaBatch=writeBatch(db);
    metaBatch.set(metaRef,{count:events.length,created,updated,deleted,sourceUpdatedAt,sourceFileName:localStorage.getItem("excelSync:fileName")||"",deviceName:deviceName(),publishedBy:currentUser.uid,publishedByEmail:currentUser.email||"",clientPublishedAt:baseLog.clientPublishedAt,publishedAt:serverTimestamp()},{merge:false});
    await metaBatch.commit();
    safeSetLocal(LAST_PUBLISHED_KEY,baseLog.clientPublishedAt);refreshSummary();
    setState("ready",`${events.length} eventos · ${created} nuevos · ${updated} modificados · ${deleted} eliminados`);
    show(ui.message,"La agenda móvil quedó actualizada.","success");
    window.dispatchEvent(new CustomEvent("firebaseEventsPublished",{detail:{created,updated,deleted,total:events.length}}));
    return true;
  }catch(error){
    console.error(error);setState("error",error?.message||"No se pudo publicar");
    if(manual){openModal();show(ui.message,"No se pudo publicar. Revisa Firestore y las reglas.","error");}
    return false;
  }finally{publishing=false;}
}
function schedulePublish(){clearTimeout(publishTimer);publishTimer=setTimeout(()=>publishEvents({manual:false}),1200);}
async function initialize(){
  ensureUi();refreshSummary();
  if(!isFirebaseConfigured()){setState("error","Firebase no está configurado");return;}
  try{
    await loadSdk();
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG);
    auth=getAuth(app);db=getFirestore(app);
    await setPersistence(auth,browserLocalPersistence);
    onAuthStateChanged(auth,user=>{
      currentUser=user;const owner=isOwner(user);
      ui.form.hidden=owner;ui.session.hidden=!owner;
      ui.identity.textContent=owner?(user?.email||"—"):"—";ui.ownerDevice.textContent=deviceName();
      ui.publish.disabled=!owner;
      if(owner){setState("ready","Sesión guardada en este navegador");schedulePublish();}
      else {
        setState("warning",user?"Cerrando una sesión sin permiso…":"Inicia sesión una sola vez en este equipo");
        if(user) signOut(auth).catch(()=>{});
      }
      if(location.pathname.endsWith("/")||location.pathname.endsWith("/index.html")){
        if(localStorage.getItem(DEVICE_AUTH_KEY)!=="1"&&!owner){
          ui.setup.classList.add("is-open");ui.setup.setAttribute("aria-hidden","false");
        }else if(owner&&localStorage.getItem(DEVICE_AUTH_KEY)!=="1"){
          safeSetLocal(DEVICE_AUTH_KEY,"1");
        }
      }
    });
    window.addEventListener("eventDataUpdated",()=>{refreshSummary();if(isOwner(currentUser))schedulePublish();});
    window.addEventListener("storage",e=>{if(["eventDataSignal","eventDataUpdatedAt"].includes(e.key)){refreshSummary();if(isOwner(currentUser))schedulePublish();}});
  }catch(error){console.error(error);setState("error",error?.message||"No se pudo iniciar Firebase");}
}
window.FirebaseEventPublisher={publish:()=>publishEvents({manual:true}),openPanel:openModal,getLocalEvents:localEvents};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
