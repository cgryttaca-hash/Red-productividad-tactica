import {notices,NOTICES_KEY,RECEIPTS_PREFIX,addSystemNotice,nextNoticeTransition} from './notices-store.js';
import {currentSession} from './local-record-store.js';
let timer;
const host=document.querySelector('.header-tools')||document.querySelector('.tool-session')||document.querySelector('.agenda-live')||document.querySelector('.command-right')||document.querySelector('.tool-header-inner');
let link=document.getElementById('internalNoticesLink');
if(!link&&host&&currentSession()){
  link=document.createElement('a');link.id='internalNoticesLink';link.className='internal-notices-link';link.href='avisos.html';link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0v6l-2 3h16l-2-3Zm-8 12h4"/></svg> Avisos <b>0</b>';host.prepend(link);
}
export function refreshNoticeCounter(){
  clearTimeout(timer);if(!link)return;
  try{const values=notices(),count=values.filter(item=>item.phase==='active'&&!item.closed&&!item.read).length;link.querySelector('b').textContent=count;link.setAttribute('aria-label',`Avisos internos: ${count} pendientes`);link.title='Avisos guardados en este navegador';
    const wake=nextNoticeTransition();if(wake)timer=setTimeout(refreshNoticeCounter,Math.min(Math.max(10,wake-Date.now()),2147483647));
  }catch(error){link.querySelector('b').textContent='!';link.title=error.message;}
}
window.addEventListener('rptLocalStoreChanged',refreshNoticeCounter);
window.addEventListener('rptInternalNoticeError',event=>{if(link){link.querySelector('b').textContent='!';link.title=event.detail.message;}});
window.addEventListener('storage',event=>{if(event.key===NOTICES_KEY||event.key?.startsWith(RECEIPTS_PREFIX))refreshNoticeCounter();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshNoticeCounter();});
window.addEventListener('pagehide',()=>clearTimeout(timer),{once:true});
async function record(title,body,tag){try{await addSystemNotice(title,body,{tag});}catch(error){window.dispatchEvent(new CustomEvent('rptInternalNoticeError',{detail:{message:error.message}}));}}
window.addEventListener('eventDataUpdated',event=>{const diff=event.detail?.diff;record('Archivo Excel actualizado',diff?`${diff.created?.length||0} nuevos · ${diff.updated?.length||0} modificados · ${diff.deleted?.length||0} eliminados.`:'Se recibió una actualización de los eventos del archivo vinculado.','excel');});
window.addEventListener('firebaseEventsPublished',event=>record('Agenda Móvil sincronizada',`${event.detail?.total||0} eventos publicados. Consulta la última publicación desde Inicio.`,'mobile'));
refreshNoticeCounter();
