export {getApps} from 'firebase-runtime/app';
import {initializeApp as app} from 'firebase-runtime/app';
import {getAuth as auth,connectAuthEmulator} from 'firebase-runtime/auth';
export {browserLocalPersistence,setPersistence,signInAnonymously,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'firebase-runtime/auth';
const connected=new WeakSet();
export function initializeApp(_config,name){return app({apiKey:'fake-api-key',projectId:'demo-rpt-devices',authDomain:'demo-rpt-devices.firebaseapp.com',appId:'1:123:web:qa'},name);}
export function getAuth(application){const instance=auth(application);if(!connected.has(instance)){connectAuthEmulator(instance,'http://127.0.0.1:9098',{disableWarnings:true});connected.add(instance);}return instance;}
