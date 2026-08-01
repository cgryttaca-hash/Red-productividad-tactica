import {FIREBASE_CONFIG,META_COLLECTION} from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const CACHE_KEY='rptMaintenanceCacheV1';
const params=new URLSearchParams(location.search);
const page=params.get('page')||'index';
const returnPage=params.get('return')||'index.html';
const labels={
  index:'Inicio',
  eventos:'Eventos',
  minuta:'Minuta',
  agenda_movil:'Agenda Móvil',
  usuarios:'Usuarios'
};
let config=null;
let timer=null;

function readCache(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null');}catch(_){return null;}}
function writeCache(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify(value));}catch(_){}}
function currentItem(){return config?.pages?.[page]||null;}
function goBack(){location.replace(returnPage);}
function render(){
  const item=currentItem();
  if(!item?.active || !item.until){goBack();return;}
  const until=new Date(item.until).getTime();
  const remaining=Math.max(0,until-Date.now());
  if(!remaining){goBack();return;}
  const total=Math.max(1000,Number(item.durationMs)||remaining);
  const hours=Math.floor(remaining/3600000);
  const minutes=Math.floor((remaining%3600000)/60000);
  const seconds=Math.floor((remaining%60000)/1000);
  document.getElementById('hours').textContent=String(hours).padStart(2,'0');
  document.getElementById('minutes').textContent=String(minutes).padStart(2,'0');
  document.getElementById('seconds').textContent=String(seconds).padStart(2,'0');
  document.getElementById('maintenanceTitle').textContent=`${labels[page]||'Página'} en actualización`;
  document.getElementById('maintenanceMessage').textContent=item.message||'Esta sección estará disponible nuevamente cuando finalice el temporizador.';
  document.getElementById('maintenanceStatus').textContent=`Regreso automático: ${new Date(until).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})}`;
  document.getElementById('progressBar').style.width=`${Math.min(100,Math.max(0,(remaining/total)*100))}%`;
}
async function connect(){
  config=readCache()||{pages:{}};
  render();
  clearInterval(timer);timer=setInterval(render,1000);
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
    if(!auth.currentUser){
      try{await authMod.signInAnonymously(auth);}catch(_){}
    }
    const ref=fireMod.doc(db,META_COLLECTION,'mantenimiento');
    fireMod.onSnapshot(ref,snapshot=>{
      config=snapshot.exists()?snapshot.data():{pages:{}};
      writeCache(config);
      render();
    });
  }catch(_){}
}
connect();
