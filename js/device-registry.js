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
  return modulesPromise;
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
    let app=appMod.getApps().find(item=>item.name==='rpt-device-registry');
    if(!app)app=appMod.initializeApp(FIREBASE_CONFIG,'rpt-device-registry');
    const auth=authMod.getAuth(app);const db=fireMod.getFirestore(app);
    try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
    if(typeof auth.authStateReady==='function')await auth.authStateReady();
    if(!auth.currentUser)await authMod.signInAnonymously(auth);
    return{appMod,authMod,fireMod,auth,db};
  })();
  return devicePromise;
}
function browserName(){
  const ua=navigator.userAgent;
  if(ua.includes('Edg/'))return'Edge';if(ua.includes('Chrome/'))return'Chrome';if(ua.includes('Firefox/'))return'Firefox';if(ua.includes('Safari/'))return'Safari';return'Navegador';
}
function platform(){return navigator.userAgentData?.platform||navigator.platform||'Equipo';}

export async function registerCurrentDevice(session=null){
  const {auth,db,fireMod}=await deviceSdk();
  const id=deviceId();const ref=fireMod.doc(db,COLLECTION,id);
  let current={};
  try{const snap=await fireMod.getDoc(ref);current=snap.exists()?snap.data():{};}catch(_){}
  const data={
    deviceId:id,authUid:auth.currentUser.uid,
    deviceName:localStorage.getItem('rpt:deviceName')||`${platform()} · ${browserName()}`,
    platform:platform(),browser:browserName(),userAgent:navigator.userAgent,
    localUsername:session?.username||'',localDisplayName:session?.displayName||'',
    lastSeenAt:fireMod.serverTimestamp(),clientLastSeenAt:new Date().toISOString(),
    createdAt:current.createdAt||new Date().toISOString(),
    revoked:Boolean(current.revoked),revokedAt:current.revokedAt||null
  };
  await fireMod.setDoc(ref,data,{merge:true});
  return{...data,id};
}
export async function currentDeviceStatus(){
  const {auth,db,fireMod}=await deviceSdk();const id=deviceId();
  const snap=await fireMod.getDoc(fireMod.doc(db,COLLECTION,id));
  return snap.exists()?{id,...snap.data(),currentAuthUid:auth.currentUser.uid}:{id,revoked:false};
}
export async function listDevices(){
  const {auth,db,fireMod}=await ownerSdk();
  if(auth.currentUser?.uid!==FIREBASE_OWNER_UID)throw new Error('Conecta la cuenta propietaria de Firebase.');
  const snap=await fireMod.getDocs(fireMod.collection(db,COLLECTION));
  return snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>String(b.clientLastSeenAt||'').localeCompare(String(a.clientLastSeenAt||'')));
}
export async function setDeviceRevoked(id,revoked){
  const {auth,db,fireMod}=await ownerSdk();
  if(auth.currentUser?.uid!==FIREBASE_OWNER_UID)throw new Error('Conecta la cuenta propietaria de Firebase.');
  await fireMod.setDoc(fireMod.doc(db,COLLECTION,id),{
    revoked:Boolean(revoked),revokedAt:revoked?fireMod.serverTimestamp():null,updatedAt:fireMod.serverTimestamp()
  },{merge:true});
}
export async function deleteDevice(id){
  const {auth,db,fireMod}=await ownerSdk();
  if(auth.currentUser?.uid!==FIREBASE_OWNER_UID)throw new Error('Conecta la cuenta propietaria de Firebase.');
  await fireMod.deleteDoc(fireMod.doc(db,COLLECTION,id));
}
export async function ownerLogin(email,password){
  const {auth,authMod}=await ownerSdk();
  const result=await authMod.signInWithEmailAndPassword(auth,email,password);
  if(result.user.uid!==FIREBASE_OWNER_UID){await authMod.signOut(auth);throw new Error('La cuenta no corresponde al propietario autorizado.');}
  return result.user;
}
export async function ownerUser(){
  const {auth}=await ownerSdk();return auth.currentUser?.uid===FIREBASE_OWNER_UID?auth.currentUser:null;
}
export function getLocalDeviceId(){return deviceId();}
