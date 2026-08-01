import{
  FIREBASE_CONFIG,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT,
  FIREBASE_SDK_VERSION,isFirebaseConfigured
}from"./firebase-config.js?v=20260801-index3";

let first=true,unsubscribe=null,known=new Set();
function changeTitle(change){
  if(change.type==="cargue")return`Nuevo cargue: ${change.total||0} eventos`;
  if(change.type==="creado")return`Evento nuevo: ${change.empresa||""}`;
  if(change.type==="eliminado")return`Evento eliminado: ${change.empresa||""}`;
  return`Evento actualizado: ${change.empresa||""}`;
}
function show(change){
  const fields=change.type==="actualizado"&&change.changes?.length
    ?` · ${change.changes.map(item=>item.label||item.field).join(", ")}`
    :"";
  const message=`${changeTitle(change)}${fields}`;
  const host=document.getElementById("toastContainer");
  if(host){
    const item=document.createElement("div");
    item.className="toast";
    item.textContent=message;
    host.appendChild(item);
    setTimeout(()=>item.remove(),5500);
  }
  if("Notification"in window&&Notification.permission==="granted"){
    try{
      new Notification("Gestión de Eventos",{
        body:`${message} · ${change.deviceName||"Equipo"}`,
        tag:`${change.batchId||""}|${change.type||""}|${change.eventId||""}`
      });
    }catch(_){}
  }
}
async function initialize(){
  if(!isFirebaseConfigured())return;
  try{
    const base=`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [{initializeApp,getApps},{getFirestore,doc,onSnapshot}]=await Promise.all([
      import(`${base}/firebase-app.js`),import(`${base}/firebase-firestore.js`)
    ]);
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG);
    const db=getFirestore(app);
    unsubscribe=onSnapshot(doc(db,FIREBASE_META_COLLECTION,FIREBASE_META_DOCUMENT),snapshot=>{
      if(!snapshot.exists())return;
      const recent=Array.isArray(snapshot.data().recentChanges)?snapshot.data().recentChanges:[];
      if(first){
        recent.forEach(item=>known.add(`${item.batchId}|${item.type}|${item.eventId}`));
        first=false;
        return;
      }
      recent.slice().reverse().forEach(item=>{
        const key=`${item.batchId}|${item.type}|${item.eventId}`;
        if(known.has(key))return;
        known.add(key);
        show(item);
      });
      if(known.size>400)known=new Set(recent.map(item=>`${item.batchId}|${item.type}|${item.eventId}`));
    },()=>{});
  }catch(_){}
}
window.addEventListener("beforeunload",()=>unsubscribe?.());
initialize();