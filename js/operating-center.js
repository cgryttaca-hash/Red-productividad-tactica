const byId=id=>document.getElementById(id);
function clock(){const now=new Date();byId('todayLabel').textContent=now.toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short'});byId('reloj').textContent=now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});}
clock();const timer=setInterval(()=>{if(!document.hidden)clock();},30000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)clock();});
byId('logoutButton').addEventListener('click',async()=>{const{logout}=await import('./local-auth.js');logout();location.replace('login.html');});
function script(path){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=path;node.onload=resolve;node.onerror=reject;document.head.append(node);});}
let excelStarted=false,firebaseStarted=false,backgroundTask,backgroundAgain=false;
async function background(){
 if(backgroundTask){backgroundAgain=true;return;}if(!window.RPTNavigation?.session())return;
 const linked=Boolean(localStorage.getItem('excelSync:fileName')&&window.isSecureContext&&typeof window.showOpenFilePicker==='function'),connected=Boolean(localStorage.getItem('firebase:ownerEmail')||localStorage.getItem('firebase:lastPublishedAt'));
 if((!linked||excelStarted)&&(!connected||firebaseStarted))return;
 backgroundTask=(async()=>{try{if(linked&&!excelStarted){await script('assets/vendor/xlsx-0.20.3.min.js');await script('js/excel-sync.js');excelStarted=true;}if(connected&&!firebaseStarted){await import('./firebase-sync.js');firebaseStarted=true;}}catch(_){/* La reconexión se consulta en el área protegida. */}})().finally(()=>{backgroundTask=null;if(backgroundAgain){backgroundAgain=false;queueMicrotask(background);}});return backgroundTask;
}
if('requestIdleCallback'in window)requestIdleCallback(background,{timeout:1500});else setTimeout(background,0);
window.addEventListener('storage',event=>{if(['excelSync:fileName','firebase:ownerEmail','firebase:lastPublishedAt'].includes(event.key))background();});
