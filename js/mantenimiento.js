import {subscribe,connect,refresh,getState} from './maintenance-client.js';
import {PAGE_LABELS,MESSAGES,isBlocked,stateOf,remaining,duration,formatBogota} from './maintenance-state.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),requested=params.get('page');
const page=Object.hasOwn(PAGE_LABELS,requested||'')?requested:'index',returnPage=window.RPTNavigation.safePage(page+'.html'),moduleLabel=PAGE_LABELS[page];
let lastCheck=Date.now(),checking=false,endingChecked=false;
async function verify(){if(checking||!navigator.onLine)return;checking=true;lastCheck=Date.now();$('maintenanceCheck').disabled=true;try{await refresh();}catch(_){}finally{checking=false;$('maintenanceCheck').disabled=false;render();}}
function render(){
 const state=getState(),item=state.config?.pages?.[page],active=isBlocked(item),ms=remaining(item);
 $('maintenanceTitle').textContent=`${moduleLabel} en mantenimiento`;$('maintenanceModule').textContent=moduleLabel;$('maintenanceMessage').textContent=item?.message||MESSAGES.mejoras;
 $('maintenanceState').textContent=active?'Mantenimiento activo':state.confirmed?'Sección disponible':'Comprobando disponibilidad';
 $('maintenanceEstimate').textContent=item?.until?formatBogota(item.until)+' · America/Bogota':'Sin hora estimada de finalización';
 $('maintenanceCountdown').hidden=!active||ms===null;$('maintenanceClock').textContent=duration(ms);$('maintenanceCountdownLabel').textContent=ms===0?'Estimación cumplida · comprobando disponibilidad':'Tiempo hasta la finalización estimada';
 const confirmed=state.confirmed&&!state.error;
 $('maintenanceStatus').textContent=state.error||(!confirmed?'Pendiente de confirmación con el servidor.':active&&ms===0?'La estimación terminó. El mantenimiento sigue activo; estamos esperando su finalización.':active?'El módulo está temporalmente cerrado. Su acceso se restablecerá cuando se confirme la finalización.':'El servidor confirma que el módulo está disponible.');
 $('maintenanceVerifiedAt').textContent=state.checkedAt?formatBogota(state.checkedAt)+' · America/Bogota':'Sin lectura confirmada';
 $('returnToModule').hidden=!confirmed||active;$('returnToModule').href=returnPage;
 if(confirmed&&!active&&stateOf(item)!=='invalid'){location.replace(returnPage);return;}
 if(active&&ms===0&&!endingChecked){endingChecked=true;verify();}if(ms!==0)endingChecked=false;
}
subscribe(render);connect().catch(()=>{});
function tick(){if(document.hidden)return;render();if(Date.now()-lastCheck>=30000)verify();}
let ticker=setInterval(tick,1000);
$('maintenanceCheck').addEventListener('click',verify);window.addEventListener('online',()=>connect().catch(()=>{}));window.addEventListener('focus',verify);window.addEventListener('pagehide',()=>clearInterval(ticker));
window.addEventListener('pageshow',event=>{if(event.persisted){clearInterval(ticker);ticker=setInterval(tick,1000);verify();}});
