import {FIREBASE_CONFIG,FIREBASE_OWNER_UID} from './firebase-config.js';
const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const COLLECTION='equipos_autorizados';
const DEVICE_KEY='rptAuthDeviceV1';

let modulesPromise=null;
let ownerPromise=null;
let devicePromise=null;

function deviceId(){
  let value=localStorage.getItem(DEVICE_KEY);
  if(value)return value;
  const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);
  value=`device_${Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}`;
  localStorage.setItem(DEVICE_KEY,value);return value;
}
async function modules(){
  if(!modulesPromise)modulesPromise=Promise.all([
    import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`),import(`${SDK}/firebase-firestore.js`)
  ]).then(([appMod,authMod,fireMod])=>({appMod,authMod,fireMod}));
  return modulesPromise.catch(error=>{modulesPromise=null;throw error;});
}
async function ownerSdk(){
  if(!ownerPromise)ownerPromise=(async()=>{
    const {appMod,authMod,fireMod}=await modules();
    const app=appMod.getApps().find(item=>item.name==='[DEFAULT]')||appMod.initializeApp(FIREBASE_CONFIG);
    const auth=authMod.getAuth(app);const db=fireMod.getFirestore(app);
    try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
    if(typeof auth.authStateReady==='function')await auth.authStateReady();
    return{appMod,authMod,fireMod,auth,db};
  })();
  return ownerPromise;
}
async function deviceSdk(){
  if(!devicePromise)devicePromise=(async()=>{
    const {appMod,authMod,fireMod}=await modules();
    if(!appMod.getApps().some(item=>item.name==='[DEFAULT]'))appMod.initializeApp(FIREBASE_CONFIG);
    let app=appMod.getApps().find(item=>item.name==='rpt-device-registry');
    if(!app)app=appMod.initializeApp(FIREBASE_CONFIG,'rpt-device-registry');
    const auth=authMod.getAuth(app);const db=fireMod.getFirestore(app);
    try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
    if(typeof auth.authStateReady==='function')await auth.authStateReady();
    if(!auth.currentUser)await authMod.signInAnonymously(auth);
    return{appMod,authMod,fireMod,auth,db};
  })();
  return devicePromise.catch(error=>{devicePromise=null;throw error;});
}
function browserName(){
  const ua=navigator.userAgent;
  if(ua.includes('Edg/'))return'Edge';if(ua.includes('Chrome/'))return'Chrome';if(ua.includes('Firefox/'))return'Firefox';if(ua.includes('Safari/'))return'Safari';return'Navegador';
}
function platform(){return navigator.userAgentData?.platform||navigator.platform||'Equipo';}

function normalized(id,data={},extra={}){
 const status=data.schema===2&&data.authUid===id&&data.deviceId===id&&data.status==='approved'&&data.authorized===true&&!data.revoked?'approved':data.status==='revoked'||data.revoked?'revoked':'pending';
 return {id,...data,status,authorized:status==='approved',revoked:status==='revoked',...extra};
}
export async function registerCurrentDevice(session=null){
 const {auth,db,fireMod}=await deviceSdk(),id=auth.currentUser.uid,ref=fireMod.doc(db,COLLECTION,id);
 const snapshot=await fireMod.getDocFromServer(ref);
 if(!snapshot.exists()){
  await fireMod.setDoc(ref,{schema:2,deviceId:id,authUid:id,localDeviceId:deviceId(),deviceName:localStorage.getItem('rpt:deviceName')||`${platform()} · ${browserName()}`,platform:platform(),browser:browserName(),status:'pending',authorized:false,revoked:false,createdAt:fireMod.serverTimestamp(),clientCreatedAt:new Date().toISOString(),lastSeenAt:fireMod.serverTimestamp(),clientLastSeenAt:new Date().toISOString()});
  import('./system-log.js').then(m=>m.addSystemLog({source:'Dispositivos',title:'Solicitud de autorización registrada',detail:id})).catch(()=>{});
 }else{
  await fireMod.setDoc(ref,{lastSeenAt:fireMod.serverTimestamp(),clientLastSeenAt:new Date().toISOString(),...(session?{localUsername:session.username||'',localDisplayName:session.displayName||''}:{})},{merge:true});
 }
 return currentDeviceStatus();
}
export async function currentDeviceStatus(){
 const {auth,db,fireMod}=await deviceSdk(),id=auth.currentUser.uid;
 const snap=await fireMod.getDocFromServer(fireMod.doc(db,COLLECTION,id));
 return normalized(id,snap.exists()?snap.data():{}, {currentAuthUid:id,confirmed:true});
}
export async function watchCurrentDevice(callback,onError){
 const {auth,db,fireMod}=await deviceSdk(),id=auth.currentUser.uid;
 return fireMod.onSnapshot(fireMod.doc(db,COLLECTION,id),{includeMetadataChanges:true},snap=>{
  if(snap.metadata?.fromCache||snap.metadata?.hasPendingWrites)return;
  callback(normalized(id,snap.exists()?snap.data():{},{currentAuthUid:id,confirmed:true}));
 },onError);
}
export async function currentDeviceIdentity(){const {auth}=await deviceSdk();return auth.currentUser.uid;}
export async function listDevices(){
 const {auth,db,fireMod}=await ownerSdk();
 if(auth.currentUser?.uid!==FIREBASE_OWNER_UID)throw new Error('Conecta la cuenta propietaria de Firebase en Conexiones.');
 const snap=await fireMod.getDocsFromServer(fireMod.collection(db,COLLECTION));
 return snap.docs.map(doc=>normalized(doc.id,doc.data())).sort((a,b)=>String(b.clientLastSeenAt||'').localeCompare(String(a.clientLastSeenAt||'')));
}
export async function setDeviceRevoked(id,revoked){
 if(!window.RPTAdminAccess?.hasAccess())throw new Error('Se requiere validación administrativa.');
 if(!navigator.onLine)throw new Error('La autorización de dispositivos requiere conexión con Firebase.');
 const {auth,db,fireMod}=await ownerSdk();
 if(auth.currentUser?.uid!==FIREBASE_OWNER_UID)throw new Error('Conecta la cuenta propietaria de Firebase en Conexiones.');
 await fireMod.setDoc(fireMod.doc(db,COLLECTION,id),{status:revoked?'revoked':'approved',authorized:!revoked,revoked:Boolean(revoked),revokedAt:revoked?fireMod.serverTimestamp():null,...(!revoked?{approvedAt:fireMod.serverTimestamp()}:{}),updatedAt:fireMod.serverTimestamp()},{merge:true});
 import('./system-log.js').then(m=>m.addSystemLog({source:'Dispositivos',level:revoked?'warning':'success',title:revoked?'Autorización revocada':'Dispositivo autorizado',detail:id})).catch(()=>{});
}
export async function deleteDevice(id){
 if(!window.RPTAdminAccess?.hasAccess())throw new Error('Se requiere validación administrativa.');
 const {auth,db,fireMod}=await ownerSdk();if(auth.currentUser?.uid!==FIREBASE_OWNER_UID)throw new Error('Conecta la cuenta propietaria de Firebase.');
 await fireMod.deleteDoc(fireMod.doc(db,COLLECTION,id));
}
export async function ownerLogin(email,password){
 const {auth,authMod}=await ownerSdk();const result=await authMod.signInWithEmailAndPassword(auth,email,password);
 if(result.user.uid!==FIREBASE_OWNER_UID){await authMod.signOut(auth);throw new Error('La cuenta no corresponde al propietario autorizado.');}return result.user;
}
export async function ownerUser(){const {auth}=await ownerSdk();return auth.currentUser?.uid===FIREBASE_OWNER_UID?auth.currentUser:null;}
export function getLocalDeviceId(){return deviceId();}
