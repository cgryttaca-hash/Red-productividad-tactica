import {FIREBASE_CONFIG,META_COLLECTION} from './firebase-config.js';
import {THEME_DOC_ID,applyAppearance,readAppearanceCache,writeAppearanceCache} from './theme-settings.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
let unsubscribe=null;

export async function watchCloudAppearance(pageKey){
  applyAppearance(pageKey,readAppearanceCache());
  try{
    const [appMod,authMod,fireMod]=await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);
    const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
    const auth=authMod.getAuth(app);
    if(typeof auth.authStateReady==='function')await auth.authStateReady();
    if(!auth.currentUser){
      try{await authMod.signInAnonymously(auth);}catch(_){return null;}
    }
    const db=fireMod.getFirestore(app);
    const ref=fireMod.doc(db,META_COLLECTION,THEME_DOC_ID);
    unsubscribe?.();
    unsubscribe=fireMod.onSnapshot(ref,snapshot=>{
      if(!snapshot.exists())return;
      const next=writeAppearanceCache(snapshot.data()||{});
      applyAppearance(pageKey,next);
    },()=>{});
    return unsubscribe;
  }catch(_){
    return null;
  }
}

export function stopCloudAppearance(){unsubscribe?.();unsubscribe=null;}
