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
  usuarios:'Usuarios',
  diagnostico:'Diagnóstico',respaldos:'Respaldos',auditoria:'Auditoría',equipos:'Equipos',validacion:'Validación',laboratorio:'Laboratorio'
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
  const nowTime=Date.now();
  const startsAt=item.startsAt?new Date(item.startsAt).getTime():0;
  if(startsAt&&startsAt>nowTime){goBack();return;}
  const until=new Date(item.until).getTime();
  const remaining=Math.max(0,until-nowTime);
  if(!remaining){goBack();return;}

  const total=Math.max(1000,Number(item.durationMs)||remaining);
  const completed=Math.min(100,Math.max(0,100-(remaining/total)*100));
  const hours=Math.floor(remaining/3600000);
  const minutes=Math.floor((remaining%3600000)/60000);
  const seconds=Math.floor((remaining%60000)/1000);
  const totalMinutes=Math.max(1,Math.ceil(remaining/60000));
  const moduleLabel=labels[page]||'Página';
  const cleanText=value=>String(value||'').replace(/&#x20;|&nbsp;/gi,' ').replace(/\\+/g,' ').replace(/\s{2,}/g,' ').trim();

  document.getElementById('hours').textContent=String(hours).padStart(2,'0');
  document.getElementById('minutes').textContent=String(minutes).padStart(2,'0');
  document.getElementById('seconds').textContent=String(seconds).padStart(2,'0');
  document.getElementById('maintenanceTitle').textContent=`${moduleLabel} en actualización`;
  document.getElementById('maintenanceModule').textContent=moduleLabel;
  document.getElementById('maintenanceMessage').textContent=cleanText(item.message)||'Estamos aplicando mejoras técnicas para ofrecer una experiencia más rápida y estable.';
  const visualModule=document.getElementById('maintenanceVisualModule');if(visualModule)visualModule.textContent=moduleLabel;
  document.getElementById('maintenanceStatus').textContent=`Regreso automático: ${new Date(until).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})}`;
  document.getElementById('progressBar').style.width=`${completed.toFixed(1)}%`;
  document.getElementById('progressPercent').textContent=`${Math.round(completed)}%`;
  document.getElementById('estimatedTime').textContent=hours?`${hours} h ${minutes} min`:`${totalMinutes} min`;

  const now=new Date();
  [1,2,3,4,5].forEach((index)=>{
    const value=new Date(now.getTime()-(5-index)*60000);
    const target=document.getElementById(`activityTime${index}`);
    if(target)target.textContent=value.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  });

  const cpu=Math.round(35+completed*.18);
  const memory=Math.round(48+completed*.15);
  const disk=Math.round(28+completed*.12);
  const network=Math.round(62+completed*.24);
  [
    ['cpu',cpu],['memory',memory],['disk',disk],['network',network]
  ].forEach(([name,value])=>{
    const label=document.getElementById(`${name}Value`);
    const bar=document.getElementById(`${name}Bar`);
    if(label)label.textContent=`${value}%`;
    if(bar)bar.style.width=`${value}%`;
  });
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
