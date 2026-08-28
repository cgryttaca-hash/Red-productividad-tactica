import { FIREBASE_CONFIG, FIREBASE_OWNER_UID } from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const USERS_COLLECTION='app_users';
const SESSION_KEY='rptAuthSessionV1';
let primaryPromise=null;

function normalizeUsername(value){
  return String(value??'').trim().toLocaleLowerCase('es');
}
function hash(value){
  let result=2166136261;
  for(const char of String(value)){
    result^=char.charCodeAt(0);
    result=Math.imul(result,16777619);
  }
  return (result>>>0).toString(36);
}
export function cloudEmailForUsername(username){
  const normalized=normalizeUsername(username);
  if(!normalized) throw new Error('Escribe un usuario.');
  return `rpt.${hash(normalized)}@users.red-productividad.app`;
}
function safeProfile(data={},uid=''){
  return {
    id:uid || data.id || '',
    authUid:uid || data.authUid || '',
    username:String(data.username||''),
    displayName:String(data.displayName||data.username||'Usuario'),
    role:data.role==='admin'?'admin':'viewer',
    active:data.active!==false,
    createdAt:data.createdAt||null,
    updatedAt:data.updatedAt||null,
    lastLoginAt:data.lastLoginAt||null,
    source:'cloud'
  };
}
async function primary(){
  if(primaryPromise) return primaryPromise;
  primaryPromise=(async()=>{
    const [appMod,authMod,fireMod]=await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);
    const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
    const auth=authMod.getAuth(app);
    const db=fireMod.getFirestore(app);
    try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){ }
    return {appMod,authMod,fireMod,app,auth,db};
  })();
  return primaryPromise;
}
export async function getCloudContext(){return primary();}

export async function loginCloud(username,password){
  const ctx=await primary();
  const email=cloudEmailForUsername(username);
  let credential;
  try{
    credential=await ctx.authMod.signInWithEmailAndPassword(ctx.auth,email,String(password));
  }catch(error){
    const code=String(error?.code||'');
    if(code.includes('invalid-credential')||code.includes('user-not-found')||code.includes('wrong-password')){
      throw new Error('Usuario o contraseña incorrectos.');
    }
    if(code.includes('network-request-failed')) throw new Error('No hay conexión para validar este usuario.');
    throw new Error(error?.message||'No fue posible validar el usuario.');
  }
  const uid=credential.user.uid;
  const ref=ctx.fireMod.doc(ctx.db,USERS_COLLECTION,uid);
  const snap=await ctx.fireMod.getDoc(ref);
  if(!snap.exists()){
    await ctx.authMod.signOut(ctx.auth).catch(()=>{});
    throw new Error('El usuario no tiene permisos asignados.');
  }
  const profile=safeProfile(snap.data(),uid);
  if(!profile.active){
    await ctx.authMod.signOut(ctx.auth).catch(()=>{});
    throw new Error('Este usuario está desactivado.');
  }
  const now=new Date().toISOString();
  try{await ctx.fireMod.updateDoc(ref,{lastLoginAt:now,updatedAt:now});}catch(_){ }
  const session={
    userId:uid,authUid:uid,username:profile.username,displayName:profile.displayName,
    role:profile.role,active:true,source:'cloud',loginAt:now,lastActivityAt:Date.now()
  };
  localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  return {...session,user:profile};
}

export async function refreshCloudProfile(uid){
  if(!uid) return null;
  const ctx=await primary();
  const snap=await ctx.fireMod.getDoc(ctx.fireMod.doc(ctx.db,USERS_COLLECTION,uid));
  return snap.exists()?safeProfile(snap.data(),uid):null;
}


async function canManageUsers(ctx){
  const user=ctx.auth.currentUser;if(!user)return false;
  if(user.uid===FIREBASE_OWNER_UID)return true;
  try{
    const snap=await ctx.fireMod.getDoc(ctx.fireMod.doc(ctx.db,USERS_COLLECTION,user.uid));
    return snap.exists()&&snap.data()?.active!==false&&snap.data()?.role==='admin';
  }catch(_){return false;}
}
export async function connectOwner(email,password){
  const ctx=await primary();
  const credential=await ctx.authMod.signInWithEmailAndPassword(ctx.auth,String(email).trim(),String(password));
  if(credential.user.uid!==FIREBASE_OWNER_UID){
    await ctx.authMod.signOut(ctx.auth).catch(()=>{});
    throw new Error('Esta cuenta de Firebase no es la propietaria autorizada.');
  }
  return credential.user;
}
export async function ownerConnected(){
  const ctx=await primary();
  await new Promise(resolve=>{
    const stop=ctx.authMod.onAuthStateChanged(ctx.auth,()=>{stop();resolve();},()=>resolve());
  });
  return ctx.auth.currentUser?.uid===FIREBASE_OWNER_UID;
}

export async function listCloudUsers(){
  const ctx=await primary();
  if(!(await canManageUsers(ctx))) throw new Error('Conecta una cuenta administradora de Firebase para gestionar usuarios.');
  const snap=await ctx.fireMod.getDocs(ctx.fireMod.collection(ctx.db,USERS_COLLECTION));
  return snap.docs.map(doc=>safeProfile(doc.data(),doc.id)).sort((a,b)=>a.displayName.localeCompare(b.displayName,'es'));
}

export async function createCloudUser({username,displayName,password,role='viewer'}){
  const ctx=await primary();
  if(!(await canManageUsers(ctx))) throw new Error('Conecta una cuenta administradora de Firebase para gestionar usuarios.');
  const normalized=normalizeUsername(username);
  if(!normalized) throw new Error('Escribe un nombre de usuario.');
  if(String(password).length<8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const existing=await listCloudUsers();
  if(existing.some(user=>normalizeUsername(user.username)===normalized)) throw new Error('Ese usuario ya existe en la nube.');
  const secondaryName=`rpt-user-create-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const secondaryApp=ctx.appMod.initializeApp(FIREBASE_CONFIG,secondaryName);
  const secondaryAuth=ctx.authMod.getAuth(secondaryApp);
  let credential;
  try{
    credential=await ctx.authMod.createUserWithEmailAndPassword(secondaryAuth,cloudEmailForUsername(username),String(password));
    const now=new Date().toISOString();
    const profile={
      username:String(username).trim(),normalizedUsername:normalized,
      displayName:String(displayName||username).trim(),role:role==='admin'?'admin':'viewer',
      active:true,createdAt:now,updatedAt:now,lastLoginAt:null
    };
    await ctx.fireMod.setDoc(ctx.fireMod.doc(ctx.db,USERS_COLLECTION,credential.user.uid),profile);
    return safeProfile(profile,credential.user.uid);
  }finally{
    try{await ctx.authMod.signOut(secondaryAuth);}catch(_){ }
    try{await ctx.appMod.deleteApp(secondaryApp);}catch(_){ }
  }
}

export async function updateCloudUser(uid,changes={}){
  const ctx=await primary();
  if(!(await canManageUsers(ctx))) throw new Error('Conecta una cuenta administradora de Firebase para gestionar usuarios.');
  const ref=ctx.fireMod.doc(ctx.db,USERS_COLLECTION,uid);
  const snap=await ctx.fireMod.getDoc(ref);
  if(!snap.exists()) throw new Error('Usuario no encontrado.');
  const current=snap.data();
  const next={...current,updatedAt:new Date().toISOString()};
  if(changes.displayName!==undefined) next.displayName=String(changes.displayName).trim();
  if(changes.role!==undefined) next.role=changes.role==='admin'?'admin':'viewer';
  if(changes.active!==undefined) next.active=Boolean(changes.active);
  await ctx.fireMod.setDoc(ref,next,{merge:true});
  return safeProfile(next,uid);
}

export async function changeOwnCloudPassword(password){
  if(String(password).length<8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const ctx=await primary();
  if(!ctx.auth.currentUser) throw new Error('La sesión de Firebase no está disponible.');
  await ctx.authMod.updatePassword(ctx.auth.currentUser,String(password));
}

export async function signOutCloud(){
  const ctx=await primary();
  try{await ctx.authMod.signOut(ctx.auth);}catch(_){ }
}

export async function watchCloudProfile(uid,callback){
  const ctx=await primary();
  return ctx.fireMod.onSnapshot(ctx.fireMod.doc(ctx.db,USERS_COLLECTION,uid),snapshot=>{
    callback(snapshot.exists()?safeProfile(snapshot.data(),uid):null);
  },()=>{});
}
