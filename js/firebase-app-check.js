import {FIREBASE_CONFIG,FIREBASE_APP_CHECK_SITE_KEY} from './firebase-config.js';
const SDK='https://www.gstatic.com/firebasejs/12.16.0';
let initialized;
export async function initializeAppCheck(){
  if(!FIREBASE_APP_CHECK_SITE_KEY)return{enabled:false,reason:'Sin clave de App Check'};
  if(initialized)return initialized;
  initialized=prepare().catch(error=>{initialized=null;throw error;});
  return initialized;
}
async function prepare(){
  const [appMod,checkMod]=await Promise.all([
    import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-app-check.js`)
  ]);
  const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
  checkMod.initializeAppCheck(app,{
    provider:new checkMod.ReCaptchaV3Provider(FIREBASE_APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled:true
  });
  return{enabled:true};
}
