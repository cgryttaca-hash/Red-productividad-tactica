import {FIREBASE_CONFIG,FIREBASE_CHANGES_COLLECTION,isFirebaseConfigured} from "./firebase-config.js?v=20260730-ux5";
const SDK_VERSION="12.16.0";
let initialized=false,firstSnapshot=true,unsubscribe=null;
const text=v=>v===undefined||v===null?"":String(v);
function message(item){
  if(item.type==="cargue")return `${item.deviceName||"Un equipo"} publicó ${item.total||0} eventos.`;
  if(item.type==="actualizado"&&item.changes?.length){
    const c=item.changes[0];return `${item.empresa}: ${c.label} cambió de “${c.before||"sin dato"}” a “${c.after||"sin dato"}”.`;
  }
  return `${item.empresa||"Un evento"} fue ${item.type==="creado"?"agregado":"eliminado"}.`;
}
function showToast(content){
  const toast=document.createElement("div");toast.className="global-change-toast";
  toast.innerHTML=`<small>Actualización en tiempo real</small><strong>${content.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}</strong>`;
  document.body.appendChild(toast);setTimeout(()=>toast.remove(),6500);
}
async function notify(content){
  if(!("Notification"in window)||Notification.permission!=="granted")return;
  try{const reg=await navigator.serviceWorker?.ready;if(reg)await reg.showNotification("Agenda actualizada",{body:content,tag:"rpt-change",renotify:true});}catch(_){}
}
async function initialize(){
  if(initialized||!isFirebaseConfigured())return;initialized=true;
  try{
    const [{initializeApp,getApps},{getAuth,onAuthStateChanged},{getFirestore,collection,query,orderBy,limit,onSnapshot}]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
    ]);
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app);
    onAuthStateChanged(auth,user=>{
      if(unsubscribe){unsubscribe();unsubscribe=null;}if(!user)return;
      unsubscribe=onSnapshot(query(collection(db,FIREBASE_CHANGES_COLLECTION),orderBy("clientPublishedAt","desc"),limit(10)),snapshot=>{
        if(firstSnapshot){firstSnapshot=false;return;}
        snapshot.docChanges().filter(change=>change.type==="added").forEach(change=>{const content=message(change.doc.data());showToast(content);notify(content);});
      });
    });
  }catch(error){console.warn(error);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
