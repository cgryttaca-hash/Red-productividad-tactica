import{
  FIREBASE_CONFIG,FIREBASE_OWNER_UID,FIREBASE_COLLECTION,FIREBASE_META_COLLECTION,
  FIREBASE_META_DOCUMENT,FIREBASE_CHANGES_COLLECTION,FIREBASE_SDK_VERSION,isFirebaseConfigured
}from"./firebase-config.js?v=20260801-index3";

let initializeApp,getApps,getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,
signInWithEmailAndPassword,sendPasswordResetEmail,signOut,getFirestore,collection,doc,getDocs,
getDoc,writeBatch,serverTimestamp;

const DEVICE_KEY="rpt:deviceAuthorized";
const DEVICE_NAME_KEY="rpt:deviceName";
const EMAIL_KEY="firebase:ownerEmail";
const LAST_PUBLISHED_KEY="firebase:lastPublishedAt";
const PUBLISH_LOCK_KEY="rpt:firebasePublishLock";
const PUBLISHED_STATE_KEY="firebase:lastPublishedState";
const FAILED_SOURCE_KEY="firebase:lastFailedSource";
const TAB_ID=`tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const FIELD_LABELS={fechaISO:"Fecha",empresa:"Empresa",escenario:"Escenario",horarioEvento:"Horario del evento",horarioAyB:"Horario A&B",alimentacion:"Alimentación",cantidadPersonas:"Cantidad de personas",acomodacion:"Acomodación",modalidadServicio:"Modalidad",medioPago:"Medio de pago",estado:"Estado",observacion:"Observación"};
const PUBLIC_FIELDS=Object.keys(FIELD_LABELS);
let auth=null,db=null,user=null,initialized=false,publishing=false,publishTimer=null;
let state={status:"loading",message:"Inicializando Firebase",user:null,lastPublished:localStorage.getItem(LAST_PUBLISHED_KEY)||""};

const text=v=>v===undefined||v===null?"":String(v).trim();
const normalize=v=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/\s+/g," ");
function emit(next){state={...state,...next};window.dispatchEvent(new CustomEvent("firebasePublisherState",{detail:{...state}}));updatePanel();}
function isOwner(value){return Boolean(value&&value.uid===FIREBASE_OWNER_UID);}
function floor(value){return normalize(value).includes("TERCER")?"Tercer piso":"Segundo piso";}
function numberValue(value){const n=Number(text(value).replace(/[^0-9,.-]/g,"").replace(",","."));return Number.isFinite(n)?n:0;}
function dateISO(value){
  const s=text(value);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  const d=new Date(value);return Number.isNaN(d.getTime())?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function value(row,keys){for(const key of keys){if(row&&Object.prototype.hasOwnProperty.call(row,key)&&row[key]!==undefined&&row[key]!==null)return row[key];}return"";}
function hash(source){let h=2166136261;for(const c of String(source)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}
function publicEvent(row,occurrences){
  const event={
    schemaVersion:3,fechaISO:dateISO(value(row,["FECHA","fecha"])),
    empresa:text(value(row,["NOMBRE DE LA EMPRESA","EMPRESA","empresa"])),
    escenario:text(value(row,["ESCENARIO ASIGNADO","ESCENARIO","escenario"]))||"Sin espacio asignado",
    horarioEvento:text(value(row,["HORARIO DEL EVENTO","HORARIO","horario"]))||"Sin horario registrado",
    horarioAyB:text(value(row,["HORARIO AYB","HORARIO A&B"]))||"Sin horario A&B",
    alimentacion:text(value(row,["DESCRIPCION ALIMENTACION","DESCRIPCIÓN ALIMENTACIÓN","ALIMENTACION"]))||"Sin alimentación registrada",
    cantidadPersonas:numberValue(value(row,["CANTIDAD DE PERSONAS","PAX"])),
    acomodacion:text(value(row,["ACOMODACION","ACOMODACIÓN"])),
    modalidadServicio:text(value(row,["MODALIDAD DE SERVICIO","MODALIDAD"])),
    medioPago:text(value(row,["MEDIO DE PAGO","PAGO"])),
    estado:text(value(row,["ESTADO","STATUS"])),
    observacion:text(value(row,["OBSERVACION","OBSERVACIÓN"])),
    hojaOrigen:text(value(row,["HOJA_ORIGEN"]))
  };
  if(!event.fechaISO||!event.empresa)return null;
  event.piso=floor(event.escenario);
  const sheet=normalize(value(row,["HOJA_ORIGEN"])),line=text(value(row,["__FILA_ORIGEN"]));
  const stable=line?`ROW|${sheet}|${line}`:`DATA|${event.fechaISO}|${normalize(event.empresa)}|${normalize(event.escenario)}|${normalize(event.horarioEvento)}`;
  const occurrence=(occurrences.get(stable)||0)+1;occurrences.set(stable,occurrence);
  const id=`ev_${hash(`${stable}|${occurrence}`)}`;
  return{id,contentHash:hash(JSON.stringify(event)),...event};
}
async function localEvents(){
  const rows=await window.EventDataStore.getRows(),occurrences=new Map();
  return rows.map(row=>publicEvent(row,occurrences)).filter(Boolean).sort((a,b)=>a.fechaISO.localeCompare(b.fechaISO)||a.piso.localeCompare(b.piso)||a.escenario.localeCompare(b.escenario,"es",{numeric:true}));
}
function authMessage(error){
  const code=String(error?.code||"");
  const map={
    "auth/invalid-credential":"El correo o la contraseña no coinciden.",
    "auth/invalid-email":"El correo no tiene un formato válido.",
    "auth/operation-not-allowed":"Habilita Correo electrónico/contraseña en Firebase Authentication.",
    "auth/too-many-requests":"Firebase bloqueó temporalmente varios intentos. Espera unos minutos.",
    "auth/network-request-failed":"No hay conexión con Firebase.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.":"La clave API de Firebase no es válida."
  };
  return map[code]||`No fue posible iniciar sesión${code?` (${code})`:""}.`;
}
function acquirePublishLock(){
  const now=Date.now();
  try{
    const current=JSON.parse(localStorage.getItem(PUBLISH_LOCK_KEY)||"null");
    if(current&&current.tabId!==TAB_ID&&now-Number(current.at||0)<45000)return false;
    localStorage.setItem(PUBLISH_LOCK_KEY,JSON.stringify({tabId:TAB_ID,at:now}));
    const saved=JSON.parse(localStorage.getItem(PUBLISH_LOCK_KEY)||"null");
    return saved?.tabId===TAB_ID;
  }catch(_){return true;}
}
function releasePublishLock(){
  try{
    const current=JSON.parse(localStorage.getItem(PUBLISH_LOCK_KEY)||"null");
    if(current?.tabId===TAB_ID)localStorage.removeItem(PUBLISH_LOCK_KEY);
  }catch(_){}
}
function permissionMessage(error){
  const code=String(error?.code||"");
  if(code.includes("permission-denied")){
    return"El propietario está conectado, pero Firestore no autorizó esta publicación. La información local sigue disponible y puedes reintentar sin volver a iniciar sesión.";
  }
  return error?.message||"No fue posible publicar en Firebase.";
}
async function loadSDK(){
  const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appModule,authModule,firestoreModule]=await Promise.all([import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`)]);
  ({initializeApp,getApps}=appModule);
  ({getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,sendPasswordResetEmail,signOut}=authModule);
  ({getFirestore,collection,doc,getDocs,getDoc,writeBatch,serverTimestamp}=firestoreModule);
}
function deviceName(){return localStorage.getItem(DEVICE_NAME_KEY)||"Equipo principal";}
function formatDate(value){if(!value)return"—";const d=value?.toDate?value.toDate():new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});}
function buildPanel(){
  const host=document.getElementById("cloudModal");if(!host||host.dataset.ready)return;
  host.dataset.ready="1";host.innerHTML=`<div class="sync-panel-shell" role="dialog" aria-modal="true" aria-labelledby="cloudPanelTitle">
    <div class="sync-panel-head"><div class="sync-panel-title"><span class="sync-panel-icon">☁</span><div><small>Firebase · tiempo real</small><h2 id="cloudPanelTitle">Publicación móvil</h2><p>La sesión del propietario permanece guardada en este navegador.</p></div></div><button class="sync-close" type="button">×</button></div>
    <div id="cloudPanelState" class="sync-state is-warning"><i></i><div><small>Estado</small><strong>Esperando conexión</strong><span>—</span></div></div>
    <form id="cloudLoginForm" class="sync-form"><label>Correo<input id="cloudEmail" type="email" autocomplete="username" required></label><label>Contraseña<input id="cloudPassword" type="password" autocomplete="current-password" required></label><button class="btn primary full" type="submit">Ingresar como propietario</button><button id="cloudReset" class="btn secondary full" type="button">Restablecer contraseña</button></form>
    <div id="cloudSession" class="sync-session" hidden><div><small>Propietario conectado</small><strong id="cloudIdentity">—</strong><span id="cloudDevice">—</span></div><button id="cloudLogout" class="btn danger" type="button">Cerrar sesión</button></div>
    <div class="sync-details"><div><small>Eventos locales</small><strong id="cloudLocalCount">0</strong></div><div><small>Último Excel</small><strong id="cloudLocalUpdate">—</strong></div><div><small>Última publicación</small><strong id="cloudPublished">—</strong></div></div>
    <div id="cloudMessage" class="sync-message" hidden></div>
    <div class="sync-actions"><button id="cloudPublish" class="btn primary" type="button">Publicar ahora</button><a class="btn secondary" href="agenda_movil.html" target="_blank" rel="noopener">Abrir agenda móvil</a></div>
    <p class="sync-note">La sesión, los eventos y la agenda móvil se administran desde este panel.</p>
  </div>`;
  const close=()=>{host.classList.remove("is-open");host.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");};
  host.querySelector(".sync-close").onclick=close;host.onclick=e=>{if(e.target===host)close();};
  host.querySelector("#cloudLoginForm").onsubmit=async e=>{e.preventDefault();const email=host.querySelector("#cloudEmail").value.trim(),password=host.querySelector("#cloudPassword").value;panelMessage("");try{await signInOwner(email,password);host.querySelector("#cloudPassword").value="";}catch(error){panelMessage(error.userMessage||authMessage(error),"error");}};
  host.querySelector("#cloudReset").onclick=async()=>{const email=host.querySelector("#cloudEmail").value.trim();if(!email){panelMessage("Escribe el correo primero.","error");return;}try{await sendPasswordResetEmail(auth,email);panelMessage("Se envió el enlace de restablecimiento.","success");}catch(error){panelMessage(error.userMessage||authMessage(error),"error");}};
  host.querySelector("#cloudLogout").onclick=()=>signOutOwner();
  host.querySelector("#cloudPublish").onclick=()=>publish({manual:true});
  host.querySelector("#cloudEmail").value=localStorage.getItem(EMAIL_KEY)||"cgryttaca@gmail.com";
}
function panelMessage(message,type=""){const el=document.getElementById("cloudMessage");if(!el)return;el.hidden=!message;el.className=`sync-message ${type?`is-${type}`:""}`;el.textContent=message||"";}
async function refreshPanel(){
  const box=document.getElementById("cloudPanelState");
  if(!box)return;

  const owner=isOwner(user);
  const degraded=owner&&state.status==="error";
  box.className=`sync-state ${state.status==="ready"?"is-ready":degraded?"is-warning":state.status==="error"?"is-error":"is-warning"}`;
  box.querySelector("strong").textContent=
    state.status==="ready"?"Nube conectada":
    state.status==="publishing"?"Publicando":
    degraded?"Sesión activa · publicación pendiente":
    state.status==="error"?"Revisar conexión":
    "Propietario desconectado";
  box.querySelector("span").textContent=state.message||"—";

  const form=document.getElementById("cloudLoginForm");
  const session=document.getElementById("cloudSession");
  form.hidden=owner;
  session.hidden=!owner;

  if(owner){
    document.getElementById("cloudIdentity").textContent=user.email||user.uid;
    document.getElementById("cloudDevice").textContent=deviceName();
  }

  document.getElementById("cloudLocalCount").textContent=String((await localEvents()).length);
  document.getElementById("cloudLocalUpdate").textContent=formatDate(localStorage.getItem("eventDataUpdatedAt"));
  document.getElementById("cloudPublished").textContent=formatDate(localStorage.getItem(LAST_PUBLISHED_KEY));
  document.getElementById("cloudPublish").disabled=!owner||publishing;
}
function openPanel(){buildPanel();refreshPanel();const host=document.getElementById("cloudModal");if(host){host.classList.add("is-open");host.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");}}
async function signInOwner(email,password){
  if(!auth)throw new Error("Firebase aún no está listo.");
  localStorage.setItem(EMAIL_KEY,email);
  try{
    await setPersistence(auth,browserLocalPersistence);
    const result=await signInWithEmailAndPassword(auth,email,password);
    if(!isOwner(result.user)){
      await signOut(auth);
      throw new Error("La cuenta no corresponde al propietario autorizado.");
    }
    return result.user;
  }catch(error){
    if(!error.userMessage)error.userMessage=error.message?.includes("propietario autorizado")?error.message:authMessage(error);
    throw error;
  }
}
async function signOutOwner(){if(auth)await signOut(auth);}
function readPublishedState(){
  try{
    const value=JSON.parse(localStorage.getItem(PUBLISHED_STATE_KEY)||"null");
    return value&&typeof value==="object"?value:{ids:[],hashes:{}};
  }catch(_){return{ids:[],hashes:{}};}
}
function savePublishedState(events){
  const hashes={};
  events.forEach(event=>{hashes[event.id]=event.contentHash;});
  try{localStorage.setItem(PUBLISHED_STATE_KEY,JSON.stringify({ids:events.map(event=>event.id),hashes}));}catch(_){}
}
function shouldAutoPublish(){
  const sourceValue=localStorage.getItem("eventDataUpdatedAt")||"";
  if(sourceValue&&localStorage.getItem(FAILED_SOURCE_KEY)===sourceValue)return false;
  const source=Date.parse(sourceValue);
  const published=Date.parse(localStorage.getItem(LAST_PUBLISHED_KEY)||"");
  return Number.isFinite(source)&&(!Number.isFinite(published)||source>published+1000);
}
function diffs(before,after){return PUBLIC_FIELDS.filter(field=>String(before?.[field]??"")!==String(after?.[field]??"")).map(field=>({field,label:FIELD_LABELS[field],before:String(before?.[field]??""),after:String(after?.[field]??"")}));}
async function commit(operations){
  for(let i=0;i<operations.length;i+=400){const batch=writeBatch(db);operations.slice(i,i+400).forEach(op=>op.type==="delete"?batch.delete(op.ref):batch.set(op.ref,op.data,{merge:false}));await batch.commit();}
}
async function publish({manual=false}={}){
  if(publishing||!isOwner(user)){
    if(manual)openPanel();
    return false;
  }
  if(!acquirePublishLock()){
    if(manual){
      openPanel();
      panelMessage("Otra pestaña está publicando en este momento. Espera unos segundos.","error");
    }
    return false;
  }

  const events=await localEvents();
  if(!events.length){
    releasePublishLock();
    if(manual){
      openPanel();
      panelMessage("No hay eventos locales. Vincula y actualiza el Excel.","error");
    }
    return false;
  }

  publishing=true;
  emit({status:"publishing",message:`Preparando ${events.length} eventos…`,user:{uid:user.uid,email:user.email}});
  panelMessage("");

  try{
    await user.getIdToken(true);
    const sourceUpdatedAt=localStorage.getItem("eventDataUpdatedAt")||new Date().toISOString();
    const metaRef=doc(db,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT);

    let previousMeta={};
    let existing=new Map();
    let remoteReadAvailable=true;

    try{
      const [previousMetaSnapshot,existingSnapshot]=await Promise.all([
        getDoc(metaRef),
        getDocs(collection(db,FIREBASE_COLLECTION))
      ]);
      previousMeta=previousMetaSnapshot.exists()?previousMetaSnapshot.data():{};
      existing=new Map(existingSnapshot.docs.map(snapshot=>[snapshot.id,snapshot.data()]));

      if(!manual&&previousMeta.sourceUpdatedAt===sourceUpdatedAt&&Number(previousMeta.count||0)===events.length){
        emit({
          status:"ready",
          message:`${events.length} eventos · sin cambios pendientes`,
          lastPublished:previousMeta.clientPublishedAt||state.lastPublished,
          user:{uid:user.uid,email:user.email}
        });
        return true;
      }
    }catch(readError){
      if(String(readError?.code||"").includes("permission-denied")){
        remoteReadAvailable=false;
        console.warn("Firestore no permitió lectura previa; se usará publicación directa.",readError);
      }else{
        throw readError;
      }
    }

    const desired=new Set(events.map(event=>event.id));
    const operations=[];
    const logs=[];
    let created=0,updated=0,deleted=0;
    const batchId=`pub_${Date.now().toString(36)}`;
    const base={
      batchId,
      deviceName:deviceName(),
      authorEmail:user.email||"",
      authorUid:user.uid,
      sourceUpdatedAt,
      clientPublishedAt:new Date().toISOString(),
      publishedAt:serverTimestamp()
    };

    if(remoteReadAvailable){
      for(const event of events){
        const old=existing.get(event.id);
        const ref=doc(db,FIREBASE_COLLECTION,event.id);
        if(!old){
          created++;
          operations.push({type:"set",ref,data:{...event,sourceUpdatedAt,publishedBy:user.uid,updatedAt:serverTimestamp()}});
          logs.push({...base,type:"creado",eventId:event.id,empresa:event.empresa,fechaISO:event.fechaISO,escenario:event.escenario,piso:event.piso,changes:[]});
        }else if(old.contentHash!==event.contentHash){
          updated++;
          operations.push({type:"set",ref,data:{...event,sourceUpdatedAt,publishedBy:user.uid,updatedAt:serverTimestamp()}});
          logs.push({...base,type:"actualizado",eventId:event.id,empresa:event.empresa,fechaISO:event.fechaISO,escenario:event.escenario,piso:event.piso,changes:diffs(old,event)});
        }
      }

      for(const [id,old] of existing){
        if(!desired.has(id)){
          deleted++;
          operations.push({type:"delete",ref:doc(db,FIREBASE_COLLECTION,id)});
          logs.push({...base,type:"eliminado",eventId:id,empresa:old.empresa||"",fechaISO:old.fechaISO||"",escenario:old.escenario||"",piso:old.piso||"Segundo piso",changes:[]});
        }
      }
    }else{
      const previousState=readPublishedState();
      const previousIds=new Set(previousState.ids||[]);
      const previousHashes=previousState.hashes||{};

      for(const event of events){
        const isNew=!previousIds.has(event.id);
        const isChanged=previousHashes[event.id]!==event.contentHash;
        if(isNew)created++;
        else if(isChanged)updated++;

        if(isNew||isChanged||manual){
          operations.push({
            type:"set",
            ref:doc(db,FIREBASE_COLLECTION,event.id),
            data:{...event,sourceUpdatedAt,publishedBy:user.uid,updatedAt:serverTimestamp()}
          });
        }
      }

      for(const id of previousIds){
        if(!desired.has(id)){
          deleted++;
          operations.push({type:"delete",ref:doc(db,FIREBASE_COLLECTION,id)});
        }
      }
    }

    await commit(operations);

    logs.push({...base,type:"cargue",eventId:"",empresa:"",fechaISO:"",escenario:"",piso:"",created,updated,deleted,total:events.length,changes:[]});

    const compactLogs=logs.map(log=>({
      batchId:log.batchId,
      type:log.type,
      eventId:log.eventId||"",
      empresa:log.empresa||"",
      fechaISO:log.fechaISO||"",
      escenario:log.escenario||"",
      piso:log.piso||"",
      deviceName:log.deviceName||"",
      authorEmail:log.authorEmail||"",
      authorUid:log.authorUid||"",
      sourceUpdatedAt:log.sourceUpdatedAt||"",
      clientPublishedAt:log.clientPublishedAt||"",
      created:Number(log.created||0),
      updated:Number(log.updated||0),
      deleted:Number(log.deleted||0),
      total:Number(log.total||0),
      changes:Array.isArray(log.changes)?log.changes.slice(0,16).map(item=>({
        field:item.field||"",
        label:item.label||item.field||"",
        before:String(item.before??"").slice(0,450),
        after:String(item.after??"").slice(0,450)
      })):[]
    }));

    const previousLogs=Array.isArray(previousMeta.recentChanges)?previousMeta.recentChanges:[];
    const recentChanges=[...compactLogs,...previousLogs]
      .filter((item,index,array)=>array.findIndex(other=>`${other.batchId}|${other.type}|${other.eventId}`===`${item.batchId}|${item.type}|${item.eventId}`)===index)
      .slice(0,80);

    const metaBatch=writeBatch(db);
    metaBatch.set(metaRef,{
      count:events.length,
      created,
      updated,
      deleted,
      sourceUpdatedAt,
      sourceFileName:localStorage.getItem("excelSync:fileName")||"",
      deviceName:deviceName(),
      publishedBy:user.uid,
      publishedByEmail:user.email||"",
      clientPublishedAt:base.clientPublishedAt,
      recentChanges,
      publishedAt:serverTimestamp()
    },{merge:false});
    await metaBatch.commit();

    try{
      const logOps=logs.map(log=>({
        type:"set",
        ref:doc(collection(db,FIREBASE_CHANGES_COLLECTION)),
        data:log
      }));
      await commit(logOps);
    }catch(logError){
      console.warn("La agenda se publicó; la colección histórica adicional no está disponible.",logError);
    }

    savePublishedState(events);
    localStorage.removeItem(FAILED_SOURCE_KEY);
    localStorage.setItem(LAST_PUBLISHED_KEY,base.clientPublishedAt);
    emit({
      status:"ready",
      message:`${events.length} eventos publicados · ${created} nuevos · ${updated} modificados · ${deleted} eliminados`,
      lastPublished:base.clientPublishedAt,
      user:{uid:user.uid,email:user.email}
    });
    panelMessage("Agenda móvil actualizada correctamente.","success");
    window.dispatchEvent(new CustomEvent("firebaseEventsPublished",{detail:{created,updated,deleted,total:events.length}}));
    return true;
  }catch(error){
    console.error(error);
    const message=permissionMessage(error);
    if(String(error?.code||"").includes("permission-denied")){
      localStorage.setItem(FAILED_SOURCE_KEY,localStorage.getItem("eventDataUpdatedAt")||"");
    }
    emit({
      status:"error",
      message,
      user:isOwner(user)?{uid:user.uid,email:user.email}:null,
      lastPublished:localStorage.getItem(LAST_PUBLISHED_KEY)||state.lastPublished
    });
    if(manual){
      openPanel();
      panelMessage(message,"error");
    }
    return false;
  }finally{
    publishing=false;
    releasePublishLock();
    refreshPanel();
  }
}
function schedulePublish(){clearTimeout(publishTimer);publishTimer=setTimeout(()=>publish({manual:false}),1800);}
async function initialize(){
  if(initialized)return;initialized=true;buildPanel();
  if(!isFirebaseConfigured()){emit({status:"error",message:"Firebase no está configurado."});return;}
  try{
    await loadSDK();const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG);
    auth=getAuth(app);db=getFirestore(app);await setPersistence(auth,browserLocalPersistence);
    onAuthStateChanged(auth,current=>{
      user=current;
      if(current&&!isOwner(current)){signOut(auth).catch(()=>{});emit({status:"disconnected",message:"La sesión no pertenece al propietario."});return;}
      if(isOwner(current)){
        emit({status:"ready",message:"Sesión guardada en este navegador",user:{uid:current.uid,email:current.email}});
        if(shouldAutoPublish())schedulePublish();
      }else emit({status:"disconnected",message:"Inicia sesión una sola vez en este equipo",user:null});
      refreshPanel();
    });
  }catch(error){console.error(error);emit({status:"error",message:error.message||"No se pudo iniciar Firebase."});}
  window.addEventListener("eventDataUpdated",()=>{if(isOwner(user))schedulePublish();});
}
window.FirebaseEventPublisher={initialize,openPanel,signInOwner,signOutOwner,publish,getState:()=>({...state}),getUser:()=>user,isOwner:()=>isOwner(user),setDeviceAuthorized:(name)=>{localStorage.setItem(DEVICE_NAME_KEY,name);localStorage.setItem(DEVICE_KEY,"1");emit({deviceName:name});},isDeviceAuthorized:()=>localStorage.getItem(DEVICE_KEY)==="1",deviceName};
window.addEventListener("firebasePublisherState",refreshPanel);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();