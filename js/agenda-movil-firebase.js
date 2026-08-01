import{
  FIREBASE_CONFIG,FIREBASE_COLLECTION,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT,
  FIREBASE_CHANGES_COLLECTION,FIREBASE_SDK_VERSION,isFirebaseConfigured
}from"./firebase-config.js?v=20260801-index3";

const state={mode:"today",events:[],changes:[],publishedAt:null,initialChanges:true,unsubs:[]};
const $=id=>document.getElementById(id);
const text=v=>v===undefined||v===null?"":String(v);
const normalize=v=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/\s+/g," ");
const escape=v=>text(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function todayISO(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function dateLabel(value,long=false){const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?value:d.toLocaleDateString("es-CO",long?{weekday:"long",day:"2-digit",month:"long",year:"numeric"}:{weekday:"long",day:"2-digit",month:"short"});}
function floor(event){return normalize(event.piso||event.escenario).includes("TERCER")?"third":"second";}
function scenarioOrder(value){const s=normalize(value);if(/SALON\s*1\b/.test(s))return 1;if(/SALON\s*2\s*(\+|Y)\s*3/.test(s)||/SALON\s*2\+3/.test(s))return 4;if(/SALON\s*2\b/.test(s))return 2;if(/SALON\s*3\b/.test(s))return 3;if(s.includes("COMPLETO"))return 5;return 100;}
function sortEvents(list,type){return [...list].sort((a,b)=>{if(type==="second"){const rank=scenarioOrder(a.escenario)-scenarioOrder(b.escenario);if(rank)return rank;}return text(a.escenario).localeCompare(text(b.escenario),"es",{numeric:true,sensitivity:"base"})||text(a.empresa).localeCompare(text(b.empresa),"es",{sensitivity:"base"});});}
function formatTimestamp(value){if(!value)return"Sin publicación";const d=value?.toDate?value.toDate():new Date(value);return Number.isNaN(d.getTime())?"Sin publicación":d.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});}
function setConnection(status,message){const live=$("mobileLive");live.className=`live-state ${status==="online"?"is-online":status==="error"?"is-error":""}`;$("mobileLiveText").textContent=message;}
function toast(message){const item=document.createElement("div");item.className="mobile-toast";item.textContent=message;$("mobileToastHost").appendChild(item);setTimeout(()=>item.remove(),6000);}
function eventCard(event,type){
  const service=`${event.horarioAyB||"Sin horario A&B"} · ${event.alimentacion||"Sin alimentación registrada"}`;
  return`<button class="mobile-event-card ${type==="third"?"is-third":""}" data-event="${escape(event.id)}" type="button"><div class="event-main"><div class="event-kicker"><span>${type==="third"?"Tercer piso":"Segundo piso"}</span><b>${escape(event.horarioEvento||"Sin horario")}</b></div><h3>${escape(event.empresa||"Sin empresa")}</h3><p class="event-scenario">${escape(event.escenario||"Sin escenario")}</p><p class="event-service"><strong>A&B y alimentación:</strong> ${escape(service)}</p></div><div class="event-pax"><b>${escape(event.cantidadPersonas||"—")}</b><small>personas</small></div></button>`;
}
function floorSection(title,list,type){
  return`<section class="mobile-floor is-${type}"><header><div><small>Programación</small><h2>${title}</h2></div><b>${list.length}</b></header><div class="floor-list">${list.length?list.map(event=>eventCard(event,type)).join(""):'<div class="floor-empty">Sin eventos en este piso.</div>'}</div></section>`;
}
function render(){
  const query=normalize($("mobileSearch").value),today=todayISO();
  let events=state.events.filter(event=>state.mode==="today"?event.fechaISO===today:event.fechaISO>today);
  if(query)events=events.filter(event=>normalize(`${event.empresa} ${event.escenario}`).includes(query));
  const groups=new Map();events.forEach(event=>{if(!groups.has(event.fechaISO))groups.set(event.fechaISO,[]);groups.get(event.fechaISO).push(event);});
  const dates=[...groups.keys()].sort(),host=$("mobileEvents");
  $("mobileContext").textContent=state.mode==="today"?"Eventos de hoy":"Próximos eventos";$("mobileEventCount").textContent=`${events.length} eventos`;
  if(!dates.length){host.innerHTML='<div class="mobile-empty"><strong>Sin eventos para mostrar</strong><span>No hay programación que coincida con la consulta actual.</span></div>';return;}
  host.innerHTML=dates.map(date=>{
    const list=groups.get(date),second=sortEvents(list.filter(event=>floor(event)==="second"),"second"),third=sortEvents(list.filter(event=>floor(event)==="third"),"third");
    return`<section class="date-group"><div class="date-group-title"><span>${dateLabel(date,true)}</span><strong>${list.length} eventos</strong></div>${floorSection("Segundo piso",second,"second")}${floorSection("Tercer piso",third,"third")}</section>`;
  }).join("");
  host.querySelectorAll("[data-event]").forEach(button=>button.onclick=()=>openDetail(state.events.find(event=>event.id===button.dataset.event)));
}
function openDetail(event){
  if(!event)return;$("mobileDetailTitle").textContent=event.empresa||"Evento";$("mobileDetailSubtitle").textContent=`${dateLabel(event.fechaISO,true)} · ${event.piso||""}`;
  const rows=[["Escenario",event.escenario],["Horario del evento",event.horarioEvento],["A&B y alimentación",`${event.horarioAyB||"Sin horario A&B"} · ${event.alimentacion||"Sin alimentación"}`],["Personas",event.cantidadPersonas],["Acomodación",event.acomodacion],["Modalidad",event.modalidadServicio],["Medio de pago",event.medioPago],["Estado",event.estado],["Observación",event.observacion]];
  $("mobileDetailBody").innerHTML=rows.map(([label,value])=>`<div class="mobile-detail-row"><small>${escape(label)}</small><strong>${escape(value||"Sin registrar")}</strong></div>`).join("");
  $("mobileDetail").classList.add("is-open");$("mobileDetail").setAttribute("aria-hidden","false");
}
function closeDetail(){$("mobileDetail").classList.remove("is-open");$("mobileDetail").setAttribute("aria-hidden","true");}
function changeTitle(change){
  if(change.type==="cargue")return`Cargue publicado: ${change.total||0} eventos`;
  if(change.type==="creado")return`Evento nuevo: ${change.empresa||"Sin empresa"}`;
  if(change.type==="eliminado")return`Evento eliminado: ${change.empresa||"Sin empresa"}`;
  return`Evento modificado: ${change.empresa||"Sin empresa"}`;
}
function renderChanges(){
  const host=$("mobileChanges");if(!state.changes.length){host.innerHTML='<div class="mobile-empty"><strong>Sin cambios recientes</strong></div>';return;}
  host.innerHTML=state.changes.map(change=>`<article class="mobile-change"><small>${escape(change.type||"actualización")}</small><strong>${escape(changeTitle(change))}</strong>${Array.isArray(change.changes)&&change.changes.length?`<details><summary>Ver qué cambió</summary>${change.changes.map(item=>`<p><b>${escape(item.label||item.field)}</b><span class="before">${escape(item.before||"Vacío")}</span><span class="after">${escape(item.after||"Vacío")}</span></p>`).join("")}</details>`:""}<footer>${escape(change.deviceName||"Equipo")} · ${escape(change.authorEmail||"Propietario")} · ${formatTimestamp(change.clientPublishedAt||change.publishedAt)}</footer></article>`).join("");
}
async function notifyChange(change){
  const message=change.type==="actualizado"&&change.changes?.length?`${change.empresa}: ${change.changes.map(item=>item.label).join(", ")}`:changeTitle(change);
  toast(message);
  if("Notification"in window&&Notification.permission==="granted"){try{new Notification("Agenda de eventos actualizada",{body:`${message} · ${change.deviceName||"Equipo"}`,tag:change.batchId||change.eventId||Date.now()});}catch(_){}}
}
async function initialize(){
  $("todayMobileLabel").textContent=new Date().toLocaleDateString("es-CO",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  if(!isFirebaseConfigured()){setConnection("error","Sin configuración");$("mobileEvents").innerHTML='<div class="mobile-empty"><strong>Firebase no está configurado</strong></div>';return;}
  try{
    const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [{initializeApp,getApps},{getAuth,setPersistence,browserLocalPersistence,signInAnonymously},{getFirestore,collection,doc,onSnapshot}]=await Promise.all([import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`)]);
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app);
    try{await setPersistence(auth,browserLocalPersistence);if(!auth.currentUser)await signInAnonymously(auth);}catch(error){console.warn("Acceso anónimo no disponible; se intentará lectura pública.",error);}
    state.unsubs.push(onSnapshot(collection(db,FIREBASE_COLLECTION),snapshot=>{state.events=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));setConnection("online","En tiempo real");render();},error=>{console.error(error);setConnection("error","Sin permisos");$("mobileEvents").innerHTML='<div class="mobile-empty"><strong>No se pudo leer la agenda</strong><span>La publicación móvil no tiene permisos de lectura en Firestore.</span></div>';}));
    state.unsubs.push(onSnapshot(doc(db,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT),snapshot=>{
      if(!snapshot.exists()){
        state.publishedAt=null;
        state.changes=[];
        $("mobilePublishedAt").textContent="Sin publicación";
        renderChanges();
        return;
      }
      const data=snapshot.data();
      state.publishedAt=data.publishedAt||data.clientPublishedAt||null;
      $("mobilePublishedAt").textContent=`Última publicación: ${formatTimestamp(state.publishedAt)}`;
      const incoming=Array.isArray(data.recentChanges)?data.recentChanges:[];
      if(!state.initialChanges&&incoming.length){
        const previousIds=new Set(state.changes.map(item=>`${item.batchId}|${item.type}|${item.eventId}`));
        incoming.filter(item=>!previousIds.has(`${item.batchId}|${item.type}|${item.eventId}`)).reverse().forEach(notifyChange);
      }
      state.initialChanges=false;
      state.changes=incoming;
      renderChanges();
    },error=>{
      console.warn("Meta no disponible:",error);
      $("mobileChanges").innerHTML='<div class="mobile-empty"><strong>Historial no disponible</strong><span>La agenda de eventos continúa funcionando.</span></div>';
    }));
  }catch(error){console.error(error);setConnection("error","Sin conexión");$("mobileEvents").innerHTML='<div class="mobile-empty"><strong>No fue posible conectar con Firebase</strong><span>Revisa la conexión a internet.</span></div>';}
}
document.querySelectorAll("[data-mobile-mode]").forEach(button=>button.onclick=()=>{state.mode=button.dataset.mobileMode;document.querySelectorAll("[data-mobile-mode]").forEach(item=>item.classList.toggle("is-active",item===button));render();});
$("mobileSearch").addEventListener("input",render);$("changesToggle").onclick=()=>document.body.classList.add("show-changes");$("changesClose").onclick=()=>document.body.classList.remove("show-changes");$("changesBackdrop").onclick=()=>document.body.classList.remove("show-changes");$("mobileDetailClose").onclick=closeDetail;$("mobileDetail").onclick=e=>{if(e.target===$("mobileDetail"))closeDetail();};
$("notificationButton").onclick=async()=>{if(!("Notification"in window)){toast("Este navegador no admite notificaciones.");return;}const permission=await Notification.requestPermission();$("notificationButton").textContent=permission==="granted"?"Avisos activados":"Avisos bloqueados";};
window.addEventListener("beforeunload",()=>state.unsubs.forEach(unsub=>unsub?.()));initialize();