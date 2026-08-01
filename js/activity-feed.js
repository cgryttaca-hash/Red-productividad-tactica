import {
  FIREBASE_CONFIG,
  FIREBASE_CHANGES_COLLECTION,
  FIREBASE_META_COLLECTION,
  FIREBASE_META_DOCUMENT,
  isFirebaseConfigured
} from "./firebase-config.js?v=20260730-ux5";

const SDK_VERSION="12.16.0";
let initializeApp,getApps,getAuth,onAuthStateChanged,getFirestore,collection,doc,query,orderBy,limit,onSnapshot;
const state={items:[],filter:"all",unsubscribe:null,metaUnsubscribe:null};
const $=id=>document.getElementById(id);
const text=v=>v===undefined||v===null?"":String(v);
const escapeHtml=v=>text(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function loadSdk(){
  const [appModule,authModule,firestoreModule]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
  ]);
  ({initializeApp,getApps}=appModule);
  ({getAuth,onAuthStateChanged}=authModule);
  ({getFirestore,collection,doc,query,orderBy,limit,onSnapshot}=firestoreModule);
}
function when(value){
  const d=value?.toDate?value.toDate():new Date(value||0);
  return Number.isNaN(d.getTime())?"Sin hora":d.toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"});
}
function dateLabel(value){
  if(!value)return"";
  const [y,m,d]=value.split("-").map(Number);
  const date=new Date(y,m-1,d);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString("es-CO",{weekday:"short",day:"2-digit",month:"short"});
}
function typeLabel(type){
  return {cargue:"Cargue publicado",actualizado:"Evento modificado",creado:"Evento agregado",eliminado:"Evento eliminado"}[type]||"Actualización";
}
function filtered(){
  return state.filter==="all"?state.items:state.items.filter(item=>item.type===state.filter);
}
function changeRows(changes=[]){
  if(!changes.length)return"";
  return `<div class="change-list">${changes.map(change=>`
    <div class="change-row">
      <strong>${escapeHtml(change.label||change.field)}</strong>
      <span class="before">${escapeHtml(change.before||"Sin dato")}</span>
      <i>→</i>
      <span class="after">${escapeHtml(change.after||"Sin dato")}</span>
    </div>`).join("")}</div>`;
}
function render(){
  const host=$("activityList"),items=filtered();
  $("updateCount").textContent=String(items.length);
  if(!items.length){
    host.innerHTML=`<div class="activity-empty"><strong>No hay cambios en este filtro</strong><span>Cuando se publique un cargue, aparecerá aquí con el detalle.</span></div>`;
    return;
  }
  host.innerHTML=items.map(item=>{
    const isLoad=item.type==="cargue";
    const summary=isLoad
      ? `<div class="load-summary"><span><b>${item.created||0}</b> nuevos</span><span><b>${item.updated||0}</b> modificados</span><span><b>${item.deleted||0}</b> eliminados</span><span><b>${item.total||0}</b> total</span></div>`
      : `<p class="activity-context">${escapeHtml(dateLabel(item.fechaISO))}${item.empresa?` · ${escapeHtml(item.empresa)}`:""}${item.escenario?` · ${escapeHtml(item.escenario)}`:""}</p>`;
    return `<article class="activity-item is-${escapeHtml(item.type)}">
      <div class="activity-marker"></div>
      <div class="activity-content">
        <div class="activity-top"><div><small>${escapeHtml(typeLabel(item.type))}</small><h3>${isLoad?"Sincronización de agenda":escapeHtml(item.empresa||"Evento")}</h3></div><time>${escapeHtml(when(item.clientPublishedAt||item.publishedAt))}</time></div>
        ${summary}
        ${changeRows(item.changes)}
        <footer><span>${escapeHtml(item.deviceName||"Equipo sin identificar")}</span><span>${escapeHtml(item.authorEmail||"Administrador")}</span></footer>
      </div>
    </article>`;
  }).join("");
}
function bind(){
  document.querySelectorAll("[data-activity-filter]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll("[data-activity-filter]").forEach(item=>item.classList.remove("is-active"));
    button.classList.add("is-active");state.filter=button.dataset.activityFilter;render();
  }));
}
async function initialize(){
  bind();
  if(!isFirebaseConfigured())return;
  try{
    await loadSdk();
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG);
    const auth=getAuth(app),db=getFirestore(app);
    onAuthStateChanged(auth,user=>{
      if(state.unsubscribe){state.unsubscribe();state.unsubscribe=null;}
      if(state.metaUnsubscribe){state.metaUnsubscribe();state.metaUnsubscribe=null;}
      if(!user){
        $("activityList").innerHTML=`<div class="activity-empty"><strong>Autoriza este equipo</strong><span>El historial estará disponible después del primer ingreso administrativo.</span></div>`;
        return;
      }
      state.unsubscribe=onSnapshot(query(collection(db,FIREBASE_CHANGES_COLLECTION),orderBy("clientPublishedAt","desc"),limit(100)),snapshot=>{
        state.items=snapshot.docs.map(document=>({id:document.id,...document.data()}));render();
      },error=>{
        console.error(error);
        $("activityList").innerHTML=`<div class="activity-empty"><strong>No se pudo leer el historial</strong><span>Publica las reglas actualizadas de Firestore.</span></div>`;
      });
      state.metaUnsubscribe=onSnapshot(doc(db,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT),snapshot=>{
        const data=snapshot.exists()?snapshot.data():null;
        $("cloudPublishedAt").textContent=data?when(data.clientPublishedAt||data.publishedAt):"Sin publicación";
        $("cloudPublishedCount").textContent=data?`${data.count||0} eventos publicados`:"Agenda móvil pendiente";
      });
    });
  }catch(error){console.error(error);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
