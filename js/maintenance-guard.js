import {subscribe,connect} from './maintenance-client.js';
import {isBlocked,stateOf} from './maintenance-state.js';
const page=document.documentElement.dataset.maintenancePage||'';let current,timer,disposed=false;
const release=()=>document.documentElement.classList.remove('maintenance-pending');
function check(){
 clearTimeout(timer);if(disposed||!page)return;const item=current?.pages?.[page];
 if(isBlocked(item)){const query=new URLSearchParams({page,return:location.pathname.split('/').pop()||'index.html'});location.replace('mantenimiento.html?'+query);return;}
 release();if(stateOf(item)==='scheduled')timer=setTimeout(check,Math.min(2147483647,Math.max(1,Date.parse(item.startsAt)-Date.now())));
}
if(page&&!document.documentElement.classList.contains('auth-pending')){
 subscribe(state=>{current=state.config;check();});
 const visibility=setTimeout(release,8000);connect().catch(()=>{}).finally(()=>clearTimeout(visibility));
 window.addEventListener('online',()=>connect().catch(()=>{}));window.addEventListener('focus',check);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
 window.addEventListener('pagehide',()=>{disposed=true;clearTimeout(timer);clearTimeout(visibility);});
 window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;check();connect().catch(()=>{});}});
}else release();
