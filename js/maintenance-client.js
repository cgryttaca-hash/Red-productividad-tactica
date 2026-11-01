import {FIREBASE_CONFIG,META_COLLECTION} from './firebase-config.js';
import {CACHE_KEY} from './maintenance-state.js';
const SDK='https://www.gstatic.com/firebasejs/12.16.0',listeners=new Set();
let sdkTask,connecting,stop,disposed=false;
let value={config:readCache(),confirmed:false,error:'',checkedAt:null};
export function readCache(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null');}catch(_){return null;}}
function emit(config,{confirmed=false,error=''}={}){value={config,confirmed,error,checkedAt:confirmed?new Date().toISOString():value.checkedAt};if(confirmed)try{localStorage.setItem(CACHE_KEY,JSON.stringify(config));}catch(_){}for(const callback of listeners)callback(value);}
export function subscribe(callback){listeners.add(callback);callback(value);return()=>listeners.delete(callback);}
export function getState(){return value;}
export function getSDK(){return sdkTask||(sdkTask=(async()=>{
 const [appMod,authMod,fireMod]=await Promise.all(['app','auth','firestore'].map(name=>import(`${SDK}/firebase-${name}.js`)));
 const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG),auth=authMod.getAuth(app),db=fireMod.getFirestore(app);
 try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
 if(typeof auth.authStateReady==='function')await auth.authStateReady();
 if(!auth.currentUser)try{await authMod.signInAnonymously(auth);}catch(_){}
 return{appMod,authMod,fireMod,app,auth,db,ref:fireMod.doc(db,META_COLLECTION,'mantenimiento')};
})().catch(error=>{sdkTask=null;throw error;}));}
export async function refresh(){
 const sdk=await getSDK();
 try{const snap=await sdk.fireMod.getDocFromServer(sdk.ref);const config=snap.exists()?snap.data():{pages:{}};emit(config,{confirmed:true});return config;}
 catch(error){emit(value.config,{error:'No fue posible confirmar el mantenimiento con el servidor.'});throw error;}
}
export function connect(){return connecting||(connecting=(async()=>{
 const sdk=await getSDK();if(disposed)return;
 if(!stop)stop=sdk.fireMod.onSnapshot(sdk.ref,{includeMetadataChanges:true},snap=>{
  const config=snap.exists()?snap.data():{pages:{}};
  if(snap.metadata?.hasPendingWrites)return;
  if(snap.metadata?.fromCache){if(!value.confirmed)emit(config);return;}
  emit(config,{confirmed:true});
 },()=>emit(value.config,{error:'La conexión de mantenimiento se interrumpió.'}));
 await refresh();
})().catch(error=>{emit(value.config,{error:'No fue posible confirmar el mantenimiento con el servidor.'});throw error;}).finally(()=>{connecting=null;}));}
window.addEventListener('storage',event=>{if(event.key===CACHE_KEY&&!value.confirmed)emit(readCache());});
window.addEventListener('pagehide',event=>{disposed=true;stop?.();stop=null;if(!event.persisted)listeners.clear();});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;connect().catch(()=>{});}});
