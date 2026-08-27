import {
  FIREBASE_CONFIG,
  META_COLLECTION
} from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const DOC_ID='mantenimiento';
const CACHE_KEY='rptMaintenanceCacheV1';
const pageId=document.documentElement.dataset.maintenancePage || '';

function readCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null');}catch(_){return null;}
}
function writeCache(value){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(value));}catch(_){}
}
function activeConfig(config){
  const item=config?.pages?.[pageId];
  if(!item?.active || !item.until) return null;
  const now=Date.now();
  const startsAt=item.startsAt?new Date(item.startsAt).getTime():0;
  const until=new Date(item.until).getTime();
  if(Number.isNaN(until) || until<=now || (startsAt && startsAt>now)) return null;
  return {...item,until:item.until};
}
function release(){
  document.documentElement.classList.remove('maintenance-pending');
}
function redirectIfNeeded(config){
  const item=activeConfig(config);
  if(!item) return false;
  const query=new URLSearchParams({
    page:pageId,
    return:location.pathname.split('/').pop()||'index.html'
  });
  location.replace(`mantenimiento.html?${query}`);
  return true;
}
async function waitForAuth(auth,authMod){
  try{
    if(typeof auth.authStateReady==='function') await auth.authStateReady();
  }catch(_){}
  if(auth.currentUser) return auth.currentUser;
  try{
    const result=await authMod.signInAnonymously(auth);
    return result.user;
  }catch(_){
    return null;
  }
}
async function initialize(){
  if(!pageId){release();return;}
  const cached=readCache();
  if(redirectIfNeeded(cached)) return;

  try{
    const [appMod,authMod,fireMod]=await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);
    const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
    const auth=authMod.getAuth(app);
    const db=fireMod.getFirestore(app);
    try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch(_){}
    await waitForAuth(auth,authMod);

    const ref=fireMod.doc(db,META_COLLECTION,DOC_ID);
    const snapshot=await fireMod.getDoc(ref);
    const data=snapshot.exists()?snapshot.data():{pages:{}};
    writeCache(data);
    if(redirectIfNeeded(data)) return;
    release();

    fireMod.onSnapshot(ref,next=>{
      const value=next.exists()?next.data():{pages:{}};
      writeCache(value);
      redirectIfNeeded(value);
    },()=>release());
  }catch(_){
    release();
  }
}
initialize();
