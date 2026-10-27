import {requestNotificationPermission,setNotificationSettings} from './notifications.js';

const $=id=>document.getElementById(id);
let installPrompt=null;
const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

function notificationReady(){return 'Notification' in window&&Notification.permission==='granted';}
function setRow(id,ready,text){
  const row=$(id);if(!row)return;
  row.classList.toggle('is-ready',ready);
  const target=id==='agendaInstallStatus'?$('agendaInstallText'):$('agendaNotifyText');
  if(target)target.textContent=text;
}
function unlockIfReady(){
  const installed=isStandalone();
  const notified=notificationReady();
  if(installed&&notified){
    setNotificationSettings({enabled:true,mobile:true});
    document.body.classList.remove('agenda-requirements-pending');
    $('agendaRequirementsGate').hidden=true;
    window.dispatchEvent(new CustomEvent('rptAgendaRequirementsReady'));
    return true;
  }
  document.body.classList.add('agenda-requirements-pending');
  $('agendaRequirementsGate').hidden=false;
  return false;
}
function updateUI(){
  const installed=isStandalone();
  if(installed){
    setRow('agendaInstallStatus',true,'Agenda instalada y abierta como aplicación.');
    $('agendaInstallButton').hidden=true;
  }else{
    setRow('agendaInstallStatus',false,isiOS?'Instálala desde Compartir → Añadir a pantalla de inicio y ábrela desde su icono.':'Debes instalar y abrir la Agenda como aplicación.');
    $('agendaInstallButton').hidden=!(installPrompt&&!isiOS);
  }
  if(!('Notification'in window)){
    setRow('agendaNotifyStatus',false,'Este navegador no admite notificaciones. Usa un navegador compatible.');
    $('agendaNotifyButton').disabled=true;
  }else if(Notification.permission==='granted'){
    setRow('agendaNotifyStatus',true,'Notificaciones autorizadas.');
    $('agendaNotifyButton').hidden=true;
  }else if(Notification.permission==='denied'){
    setRow('agendaNotifyStatus',false,'Permiso bloqueado. Activa Notificaciones para este sitio desde la configuración del navegador.');
    $('agendaNotifyButton').textContent='Revisar permiso de notificaciones';
  }else{
    setRow('agendaNotifyStatus',false,'Autoriza los avisos para alimentación, finalización y agenda del día siguiente.');
    $('agendaNotifyButton').hidden=false;
    $('agendaNotifyButton').textContent='Activar notificaciones';
  }
  unlockIfReady();
}

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  updateUI();
});
window.addEventListener('appinstalled',()=>{
  installPrompt=null;
  updateUI();
  const help=$('agendaGateHelp');
  if(help&&!isStandalone())help.textContent='Instalación completada. Abre la Agenda desde el nuevo icono instalado para continuar.';
});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',updateUI);

$('agendaInstallButton')?.addEventListener('click',async()=>{
  if(!installPrompt){updateUI();return;}
  try{
    await installPrompt.prompt();
    await installPrompt.userChoice;
  }catch(_){ }
  installPrompt=null;
  updateUI();
});
$('agendaNotifyButton')?.addEventListener('click',async()=>{
  if(!('Notification'in window))return;
  if(Notification.permission==='denied'){
    $('agendaGateHelp').textContent='El navegador ya bloqueó el permiso. Abre la información/configuración del sitio, cambia Notificaciones a “Permitir” y vuelve a abrir la Agenda.';
    updateUI();return;
  }
  try{await requestNotificationPermission();}catch(error){$('agendaGateHelp').textContent=error?.message||'No fue posible solicitar el permiso.';}
  updateUI();
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateUI();});
window.addEventListener('focus',updateUI);
updateUI();
