import{
  FIREBASE_CONFIG,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT,
  FIREBASE_SDK_VERSION,isFirebaseConfigured
}from"./firebase-config.js?v=20260801-index3";

const state={items:[],filter:"all",unsubscribe:null};
const $=id=>document.getElementById(id);
const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));

function formatDate(value){
  if(!value)return"—";
  const date=value?.toDate?value.toDate():new Date(value);
  return Number.isNaN(date.getTime())?"—":date.toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});
}
function title(item){
  if(item.type==="cargue")return`Cargue de ${item.total||0} eventos`;
  if(item.type==="creado")return`Nuevo evento: ${item.empresa||"Sin empresa"}`;
  if(item.type==="eliminado")return`Evento eliminado: ${item.empresa||"Sin empresa"}`;
  return`Evento actualizado: ${item.empresa||"Sin empresa"}`;
}
function render(){
  const host=$("activityList");
  if(!host)return;
  const items=state.filter==="all"?state.items:state.items.filter(item=>item.type===state.filter);
  if(!items.length){
    host.innerHTML='<div class="empty-state"><strong>Sin actividad para este filtro</strong><span>Los cambios aparecerán después de una publicación.</span></div>';
    return;
  }
  host.innerHTML=items.map(item=>`
    <article class="activity-item is-${escape(item.type||"cargue")}">
      <span class="activity-marker"></span>
      <div>
        <div class="activity-top">
          <div><small>${escape(item.type||"actualización")}</small><h3>${escape(title(item))}</h3></div>
          <time>${formatDate(item.clientPublishedAt)}</time>
        </div>
        <p class="activity-context">${escape(item.fechaISO||"")} ${item.escenario?`· ${escape(item.escenario)}`:""}</p>
        ${Array.isArray(item.changes)&&item.changes.length?`
          <div class="change-list">${item.changes.map(change=>`
            <div class="change-row">
              <strong>${escape(change.label||change.field)}</strong>
              <span class="before">${escape(change.before||"Vacío")}</span>
              <i>→</i>
              <span class="after">${escape(change.after||"Vacío")}</span>
            </div>`).join("")}</div>`:""}
        <footer class="activity-footer">
          <span>Equipo: ${escape(item.deviceName||"No identificado")}</span>
          <span>Usuario: ${escape(item.authorEmail||"Propietario")}</span>
          ${item.type==="cargue"?`<span>${item.created||0} nuevos · ${item.updated||0} modificados · ${item.deleted||0} eliminados</span>`:""}
        </footer>
      </div>
    </article>`).join("");
}
async function initialize(){
  document.querySelectorAll("[data-activity-filter]").forEach(button=>{
    button.onclick=()=>{
      state.filter=button.dataset.activityFilter;
      document.querySelectorAll("[data-activity-filter]").forEach(item=>item.classList.toggle("is-active",item===button));
      render();
    };
  });
  if(!isFirebaseConfigured())return;
  try{
    const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [{initializeApp,getApps},{getAuth,onAuthStateChanged},{getFirestore,doc,onSnapshot}]=await Promise.all([
      import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`)
    ]);
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG);
    const auth=getAuth(app),db=getFirestore(app);
    let started=false;
    const startListener=()=>{
      if(started)return;
      started=true;
      state.unsubscribe=onSnapshot(doc(db,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT),snapshot=>{
      if(!snapshot.exists()){
        state.items=[];
        render();
        return;
      }
      const data=snapshot.data();
      state.items=Array.isArray(data.recentChanges)?data.recentChanges:[];
      render();
      const published=data.publishedAt||data.clientPublishedAt;
      if($("lastCloudUpdate"))$("lastCloudUpdate").textContent=formatDate(published);
      },error=>{
        console.warn(error);
        $("activityList").innerHTML='<div class="empty-state"><strong>Historial no disponible</strong><span>La operación local continúa funcionando.</span></div>';
      });
    };
    onAuthStateChanged(auth,()=>startListener());
    setTimeout(startListener,2200);
  }catch(error){console.warn(error);}
}
window.addEventListener("beforeunload",()=>state.unsubscribe?.());
initialize();