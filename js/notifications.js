const KEY='rptNotificationsV1';
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||{enabled:false,excel:true,mobile:true,maintenance:true};}catch(_){return{enabled:false,excel:true,mobile:true,maintenance:true};}}
function write(value){localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new CustomEvent('rptNotificationSettingsChanged',{detail:value}));return value;}
export function getNotificationSettings(){return read();}
export function setNotificationSettings(changes){return write({...read(),...changes});}
export async function requestNotificationPermission(){
  if(!('Notification'in window))throw new Error('Este navegador no admite notificaciones.');
  const permission=await Notification.requestPermission();
  const enabled=permission==='granted';
  setNotificationSettings({enabled});
  return permission;
}
export async function showNotification(title,body,{tag='rpt-update',url='./agenda_movil.html',renotify=false}={}){
  const settings=read();
  if(!settings.enabled||!('Notification'in window)||Notification.permission!=='granted')return false;
  const registration=await navigator.serviceWorker?.getRegistration?.();
  if(registration?.active){
    registration.active.postMessage({type:'SHOW_NOTIFICATION',payload:{title,body,tag,renotify,data:{url}}});
    return true;
  }
  new Notification(title,{body,tag,renotify,icon:'./assets/icon-192.png'});
  return true;
}
function excelMessage(detail={}){
  const diff=detail.diff||{};
  const base=`${diff.created?.length||0} nuevos · ${diff.updated?.length||0} modificados · ${diff.deleted?.length||0} eliminados.`;
  const change=detail.auditEntries?.[0];
  if(!change)return base;
  const action=change.type==='actualizado'?`${change.field||'Campo'} actualizado`:change.type==='creado'?'Evento creado':'Evento eliminado';
  return `${base} ${action}${change.company?` · ${change.company}`:''}.`;
}

window.addEventListener('eventDataUpdated',event=>{
  const settings=read();if(!settings.excel)return;
  showNotification('Archivo Excel actualizado',excelMessage(event.detail||{}),{tag:'rpt-excel',url:'./index.html'});
});
window.addEventListener('firebaseEventsPublished',event=>{
  const settings=read();if(!settings.mobile)return;
  const detail=event.detail||{};
  showNotification('Agenda Móvil sincronizada',`${detail.total||0} eventos disponibles en tiempo real.`,{tag:'rpt-mobile'});
});
