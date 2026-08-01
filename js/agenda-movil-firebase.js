import {
  FIREBASE_CONFIG,
  FIREBASE_COLLECTION,
  FIREBASE_META_COLLECTION,
  FIREBASE_META_DOCUMENT,
  FIREBASE_CHANGES_COLLECTION,
  isFirebaseConfigured
} from "./firebase-config.js?v=20260730-ux5";

const SDK_VERSION="12.16.0";
let initializeApp,getApps,getAuth,setPersistence,browserLocalPersistence,signInAnonymously,onAuthStateChanged,
  getFirestore,collection,doc,query,orderBy,limit,onSnapshot;
const state={mode:"today",events:[],changes:[],publishedAt:null,initialChanges:true,unsubscribers:[]};
const $=id=>document.getElementById(id);
const text=v=>v===undefined||v===null?"":String(v).trim();
const normalize=v=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function loadSdk(){
  const [appModule,authModule,firestoreModule]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
  ]);
  ({initializeApp,getApps}=appModule);
  ({getAuth,setPersistence,browserLocalPersistence,signInAnonymously,onAuthStateChanged}=authModule);
  ({getFirestore,collection,doc,query,orderBy,limit,onSnapshot}=firestoreModule);
}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function parseDate(value){const m=text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function displayDate(value,options={weekday:"long",day:"numeric",month:"long"}){const d=parseDate(value);return d?d.toLocaleDateString("es-CO",options):value;}
function dateTime(value){const d=value?.toDate?value.toDate():new Date(value||0);return Number.isNaN(d.getTime())?"—":d.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});}
function actualFloor(event){return normalize(event.piso).includes("TERCER")||normalize(event.escenario).includes("TERCER")?"third":"second";}
function salonRank(value){
  const s=normalize(value);
  if(/\bSALON\s*1\b/.test(s))return 1;
  if(/\bSALON\s*2\b/.test(s)&&!/[+Y]\s*3/.test(s))return 2;
  if(/\bSALON\s*3\b/.test(s)&&!/\b2\s*[+Y]\s*3\b/.test(s))return 3;
  if(/\b2\s*[+Y]\s*3\b/.test(s)||s.includes("SALON 2+3"))return 4;
  if(s.includes("COMPLETO"))return 5;
  return 20;
}
function sortFloor(events,floor){
  return events.sort((a,b)=>{
    if(floor==="second"){
      const rank=salonRank(a.escenario)-salonRank(b.escenario);
      if(rank)return rank;
    }
    return a.escenario.localeCompare(b.escenario,"es",{numeric:true,sensitivity:"base"})||
      a.empresa.localeCompare(b.empresa,"es",{sensitivity:"base"});
  });
}
function normalizeEvent(id,data){
  return{id,fechaISO:text(data.fechaISO),empresa:text(data.empresa)||"Sin empresa",escenario:text(data.escenario)||"Sin escenario",
    piso:actualFloor(data)==="third"?"Tercer piso":"Segundo piso",horarioEvento:text(data.horarioEvento)||"Sin horario",
    horarioAyB:text(data.horarioAyB)||"Sin horario A&B",alimentacion:text(data.alimentacion)||"Sin alimentación registrada",
    cantidadPersonas:Number(data.cantidadPersonas)||0,acomodacion:text(data.acomodacion),modalidadServicio:text(data.modalidadServicio),
    medioPago:text(data.medioPago),estado:text(data.estado),observacion:text(data.observacion)};
}
function visibleEvents(){
  const today=todayISO(),search=normalize($("mobileSearch").value);
  return state.events.filter(event=>{
    if(state.mode==="today"&&event.fechaISO!==today)return false;
    if(state.mode==="upcoming"&&event.fechaISO<=today)return false;
    if(search&&!normalize([event.empresa,event.escenario,event.horarioEvento,event.alimentacion].join(" ")).includes(search))return false;
    return true;
  });
}
function combinedFood(event){
  const schedule=event.horarioAyB&&event.horarioAyB!=="Sin horario A&B"?event.horarioAyB:"Horario A&B sin registrar";
  const food=event.alimentacion&&event.alimentacion!=="Sin alimentación registrada"?event.alimentacion:"Sin alimentación";
  return `${schedule} · ${food}`;
}
function eventCard(event){
  const floor=actualFloor(event);
  return `<button class="mobile-event-card is-${floor}" type="button" data-event-id="${escapeHtml(event.id)}">
    <span class="card-floor">${floor==="second"?"Segundo piso":"Tercer piso"}</span>
    <div class="card-heading"><div><small>${escapeHtml(event.escenario)}</small><h3>${escapeHtml(event.empresa)}</h3></div><b>${event.cantidadPersonas||"—"}<small>PAX</small></b></div>
    <div class="card-time"><span>${escapeHtml(event.horarioEvento)}</span>${event.estado?`<i>${escapeHtml(event.estado)}</i>`:""}</div>
    <p class="card-food-line">${escapeHtml(combinedFood(event))}</p>
  </button>`;
}
function floorSection(title,floor,events){
  const sorted=sortFloor(events,floor);
  return `<section class="mobile-floor is-${floor}">
    <header><div><small>Programación</small><h2>${title}</h2></div><b>${sorted.length}</b></header>
    <div class="floor-list">${sorted.length?sorted.map(eventCard).join(""):`<div class="floor-empty">Sin eventos en ${title.toLowerCase()}.</div>`}</div>
  </section>`;
}
function dateGroup(date,events){
  const second=events.filter(event=>actualFloor(event)==="second");
  const third=events.filter(event=>actualFloor(event)==="third");
  return `<article class="date-group">
    <div class="date-group-title"><span>${displayDate(date,{weekday:"short",day:"2-digit",month:"short"})}</span><strong>${events.length} eventos</strong></div>
    ${floorSection("Segundo piso","second",second)}
    ${floorSection("Tercer piso","third",third)}
  </article>`;
}
function renderEvents(){
  const events=visibleEvents();
  $("mobileEventCount").textContent=`${events.length} ${events.length===1?"evento":"eventos"}`;
  $("mobileContext").textContent=state.mode==="today"?"Eventos de hoy":"Próximos eventos";
  if(!events.length){
    $("mobileEvents").innerHTML=`<div class="mobile-empty"><strong>${state.mode==="today"?"No hay eventos hoy":"No hay próximos eventos"}</strong><span>La agenda se actualizará automáticamente cuando el administrador publique cambios.</span></div>`;
    return;
  }
  const groups=new Map();
  events.forEach(event=>{if(!groups.has(event.fechaISO))groups.set(event.fechaISO,[]);groups.get(event.fechaISO).push(event);});
  $("mobileEvents").innerHTML=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,items])=>dateGroup(date,items)).join("");
}
function changeText(item){
  if(item.type==="cargue")return `${item.deviceName||"Equipo"} publicó ${item.total||0} eventos: ${item.created||0} nuevos, ${item.updated||0} modificados y ${item.deleted||0} eliminados.`;
  if(item.type==="actualizado"&&item.changes?.length){
    const change=item.changes[0];
    return `${item.empresa}: ${change.label} cambió de “${change.before||"sin dato"}” a “${change.after||"sin dato"}”.`;
  }
  return `${item.empresa||"Evento"} fue ${item.type==="creado"?"agregado":"eliminado"}.`;
}
function renderChanges(){
  const host=$("mobileChanges");
  if(!state.changes.length){host.innerHTML=`<div class="change-empty">No hay cambios publicados todavía.</div>`;return;}
  host.innerHTML=state.changes.slice(0,20).map(item=>`<article class="mobile-change">
    <div><small>${escapeHtml(dateTime(item.clientPublishedAt||item.publishedAt))}</small><strong>${escapeHtml(changeText(item))}</strong></div>
    <footer>${escapeHtml(item.deviceName||"Equipo")} · ${escapeHtml(item.authorEmail||"Administrador")}</footer>
    ${item.changes?.length?`<details><summary>Ver detalle</summary>${item.changes.map(c=>`<p><b>${escapeHtml(c.label)}</b><span>${escapeHtml(c.before||"Sin dato")} → ${escapeHtml(c.after||"Sin dato")}</span></p>`).join("")}</details>`:""}
  </article>`).join("");
}
function toast(message){
  const element=document.createElement("div");element.className="mobile-toast";element.textContent=message;
  document.body.appendChild(element);setTimeout(()=>element.remove(),6500);
}
async function browserNotification(message){
  if(!("Notification"in window)||Notification.permission!=="granted")return;
  try{
    const registration=await navigator.serviceWorker?.ready;
    if(registration)await registration.showNotification("Agenda de eventos actualizada",{body:message,tag:"agenda-change",renotify:true,data:{url:location.href}});
    else new Notification("Agenda de eventos actualizada",{body:message});
  }catch(error){console.warn(error);}
}
function notifyNewChanges(snapshot){
  if(state.initialChanges){state.initialChanges=false;return;}
  snapshot.docChanges().filter(change=>change.type==="added").forEach(change=>{
    const item={id:change.doc.id,...change.doc.data()},message=changeText(item);
    toast(message);browserNotification(message);
  });
}
function openDetail(event){
  $("mobileDetailTitle").textContent=event.empresa;
  $("mobileDetailSubtitle").textContent=`${displayDate(event.fechaISO)} · ${event.escenario}`;
  const rows=[["Piso",event.piso],["Horario del evento",event.horarioEvento],["Horario A&B y alimentación",combinedFood(event)],
    ["Cantidad de personas",event.cantidadPersonas||"—"],["Acomodación",event.acomodacion||"—"],["Modalidad",event.modalidadServicio||"—"],
    ["Medio de pago",event.medioPago||"—"],["Estado",event.estado||"—"],["Observación",event.observacion||"—"]];
  $("mobileDetailBody").innerHTML=rows.map(([label,value])=>`<div class="mobile-detail-row"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join("");
  $("mobileDetail").classList.add("is-open");$("mobileDetail").setAttribute("aria-hidden","false");
}
function closeDetail(){$("mobileDetail").classList.remove("is-open");$("mobileDetail").setAttribute("aria-hidden","true");}
function bindUi(){
  document.querySelectorAll("[data-mobile-mode]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll("[data-mobile-mode]").forEach(item=>item.classList.remove("is-active"));
    button.classList.add("is-active");state.mode=button.dataset.mobileMode;renderEvents();
  }));
  $("mobileSearch").addEventListener("input",renderEvents);
  $("mobileEvents").addEventListener("click",event=>{const card=event.target.closest("[data-event-id]");if(card){const item=state.events.find(e=>e.id===card.dataset.eventId);if(item)openDetail(item);}});
  $("mobileDetailClose").addEventListener("click",closeDetail);
  $("mobileDetail").addEventListener("click",event=>{if(event.target===$("mobileDetail"))closeDetail();});
  $("notificationButton").addEventListener("click",async()=>{
    if(!("Notification"in window)){toast("Este navegador no admite notificaciones.");return;}
    const permission=await Notification.requestPermission();
    $("notificationButton").textContent=permission==="granted"?"Notificaciones activas":"Activar notificaciones";
    if(permission==="granted")toast("Los avisos quedaron activados en este equipo.");
  });
  $("changesToggle").addEventListener("click",()=>document.body.classList.toggle("show-changes"));
}
function protectMobileRoute(){
  history.replaceState({mobile:true},"",location.href);
  history.pushState({mobile:true},"",location.href);
  window.addEventListener("popstate",()=>history.pushState({mobile:true},"",location.href));
}
async function initialize(){
  bindUi();protectMobileRoute();
  $("todayMobileLabel").textContent=new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"});
  if("serviceWorker"in navigator)navigator.serviceWorker.register("sw-mobile.js").catch(()=>{});
  if("Notification"in window&&Notification.permission==="granted")$("notificationButton").textContent="Notificaciones activas";
  if(!isFirebaseConfigured()){toast("Firebase no está configurado.");return;}
  try{
    await loadSdk();
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app);
    await setPersistence(auth,browserLocalPersistence);
    onAuthStateChanged(auth,async user=>{if(!user){await signInAnonymously(auth);return;}
      $("mobileLive").classList.add("is-online");$("mobileLiveText").textContent="En línea";
      state.unsubscribers.push(onSnapshot(query(collection(db,FIREBASE_COLLECTION),orderBy("fechaISO","asc")),snapshot=>{
        state.events=snapshot.docs.map(document=>normalizeEvent(document.id,document.data()));renderEvents();
      },error=>{console.error(error);$("mobileLiveText").textContent="Error de lectura";}));
      state.unsubscribers.push(onSnapshot(doc(db,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT),snapshot=>{
        const data=snapshot.exists()?snapshot.data():null;state.publishedAt=data?.clientPublishedAt||data?.publishedAt||null;
        $("mobilePublishedAt").textContent=state.publishedAt?`Última publicación ${dateTime(state.publishedAt)}`:"Sin publicación";
      }));
      state.unsubscribers.push(onSnapshot(query(collection(db,FIREBASE_CHANGES_COLLECTION),orderBy("clientPublishedAt","desc"),limit(30)),snapshot=>{
        notifyNewChanges(snapshot);state.changes=snapshot.docs.map(document=>({id:document.id,...document.data()}));renderChanges();
      }));
    });
  }catch(error){console.error(error);$("mobileLiveText").textContent="No se pudo conectar";}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
