import {requireControlAccess} from './admin-records.js';
const byId=id=>document.getElementById(id),loaded=new Map(),modules={summary:'./admin-summary.js',statistics:'./admin-statistics.js',assistant:null,quality:'./admin-quality.js',reports:'./admin-reports.js',system:null,administration:null};
let active='summary',clockTimer;
function clock(){const now=new Date();byId('todayLabel').textContent=now.toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short',timeZone:'America/Bogota'});byId('reloj').textContent=now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',timeZone:'America/Bogota'});}
const resources=new Map();
function resource(source,stylesheet=false){if(resources.has(source))return resources.get(source);const task=new Promise((resolve,reject)=>{const node=document.createElement(stylesheet?'link':'script');if(stylesheet){node.rel='stylesheet';node.href=source;}else node.src=source;node.onload=resolve;node.onerror=()=>{node.remove();resources.delete(source);reject(new Error('No se pudo cargar esta sección. Conserva la página abierta y reintenta cuando la conexión esté disponible.'));};document.head.append(node);});resources.set(source,task);return task;}
const script=source=>resource(source);
function mountTemplate(name){const host=byId('admin-panel-'+name);if(!host.dataset.mounted){host.replaceChildren(byId('admin-template-'+name).content.cloneNode(true));host.dataset.mounted='true';}return host;}
let firebaseTask;
const firebase=()=>firebaseTask||(firebaseTask=import('./firebase-sync.js'));
async function backgroundSources(){
 if(!window.RPTAdminAccess?.hasAccess())return;
 const excel=Boolean(localStorage.getItem('excelSync:fileName')&&window.isSecureContext&&typeof window.showOpenFilePicker==='function'),connected=Boolean(localStorage.getItem('firebase:ownerEmail')||localStorage.getItem('firebase:lastPublishedAt'));
 if(!excel&&!connected)return;
 // Mantener los procesos ya vinculados aunque Sistema todavía no esté abierto.
 // Sus controles originales quedan dentro del panel oculto, sin duplicarlos.
 mountTemplate('system');const tasks=[];
 if(excel)tasks.push(script('assets/vendor/xlsx-0.20.3.min.js').then(()=>script('js/excel-sync.js')));
 if(connected)tasks.push(firebase());
 await Promise.all(tasks);
}
async function createSection(name){
 requireControlAccess();const host=byId('admin-panel-'+name);
 if(modules[name])return(await import(modules[name])).mount(host);
 mountTemplate(name);
 if(name==='system'){
  await Promise.all(['css/index.css','css/excel-sync.css','css/firebase-sync.css','css/operating-center.css'].map(source=>resource(source,true)));
  await script('assets/vendor/xlsx-0.20.3.min.js');await script('js/excel-sync.js');await script('js/index.js');clearInterval(clockTimer);
  await firebase();await import('./admin-center.js');
  await window.__RPT_PWA_REGISTRATION__;
  try{await window.RPTUpdates?.status();}catch(_){byId('activeRelease').textContent='No disponible';}
  return{refresh(){window.dispatchEvent(new CustomEvent('rptAdminSectionChanged',{detail:{section:'system'}}));window.RPTUpdates?.status().catch(()=>{});}};
 }
 if(name==='assistant'){
  await script('js/assistant-core.js');await import('./assistant.js');
  return{refresh(){window.dispatchEvent(new CustomEvent('rptAdminSectionChanged',{detail:{section:'assistant'}}));}};
 }
 return{refresh(){requireControlAccess();}};
}
async function select(name,focus=false){
 if(!Object.hasOwn(modules,name))return;requireControlAccess();active=name;document.documentElement.dataset.currentControlSection=name;
 document.querySelectorAll('[data-control-section]').forEach(button=>{const selected=button.dataset.controlSection===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&focus)button.focus();});
 document.querySelectorAll('.control-panel').forEach(panel=>{panel.hidden=panel.id!=='admin-panel-'+name;});
 byId('controlSectionMessage').textContent='Cargando sección…';
 try{
  const fresh=!loaded.has(name);if(fresh){const task=createSection(name);loaded.set(name,task);task.catch(()=>loaded.delete(name));}
  const section=await loaded.get(name);requireControlAccess();
  if(active!==name)return;if(!fresh)section.refresh?.();byId('controlSectionMessage').textContent='';
 }catch(error){if(active===name)byId('controlSectionMessage').textContent=error.message;}
}
if(window.RPTAdminAccess?.hasAccess()){
 clock();clockTimer=setInterval(()=>{if(!document.hidden)clock();},30000);
 const nav=byId('controlNavigation');nav.addEventListener('click',event=>{const button=event.target.closest('[data-control-section]');if(button)select(button.dataset.controlSection);});
 nav.addEventListener('keydown',event=>{const buttons=[...nav.querySelectorAll('[data-control-section]')],index=buttons.indexOf(document.activeElement);if(index<0)return;let target;if(['ArrowDown','ArrowRight'].includes(event.key))target=(index+1)%buttons.length;else if(['ArrowUp','ArrowLeft'].includes(event.key))target=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')target=0;else if(event.key==='End')target=buttons.length-1;else return;event.preventDefault();select(buttons[target].dataset.controlSection,true);});
 let refreshPending=false;function changed(){if(refreshPending||!window.RPTAdminAccess?.hasAccess())return;refreshPending=true;queueMicrotask(async()=>{refreshPending=false;if(loaded.has(active))try{(await loaded.get(active)).refresh?.();}catch(error){byId('controlSectionMessage').textContent=error.message;}});}
 window.addEventListener('eventDataUpdated',changed);window.addEventListener('storage',event=>{if(['eventData','eventDataUpdatedAt','excelSync:fileName'].includes(event.key))changed();});
 window.addEventListener('storage',event=>{if(['excelSync:fileName','firebase:ownerEmail','firebase:lastPublishedAt'].includes(event.key))backgroundSources().catch(()=>{});});
 window.addEventListener('pagehide',()=>clearInterval(clockTimer),{once:true});
 select('summary');
 if('requestIdleCallback'in window)requestIdleCallback(()=>backgroundSources().catch(()=>{}),{timeout:1500});else setTimeout(()=>backgroundSources().catch(()=>{}),0);
}
