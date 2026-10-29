import {requestNotificationPermission,setNotificationSettings} from './notifications.js';

const $=id=>document.getElementById(id);
let installPrompt=null;
const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
document.documentElement.classList.toggle('is-apple-mobile',isiOS);
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
    setRow('agendaInstallStatus',false,isiOS?'En Safari: Compartir → Añadir a pantalla de inicio. Si aparece, activa «Abrir como app web». Después abre el icono Agenda.':'Debes instalar y abrir la Agenda como aplicación. Usa Instalar aplicación o Añadir a pantalla de inicio en el menú del navegador.');
    $('agendaInstallButton').hidden=!(installPrompt&&!isiOS);
  }
  if(!('Notification'in window)){
    setRow('agendaNotifyStatus',false,isiOS&&!installed?'Primero instala y abre Agenda desde su icono. Las notificaciones requieren iOS/iPadOS 16.4 o posterior y un dispositivo compatible.':'Este contexto no admite notificaciones. Usa una aplicación instalada y un navegador compatible.');
    $('agendaNotifyButton').disabled=true;
  }else if(Notification.permission==='granted'){
    setRow('agendaNotifyStatus',true,'Permiso autorizado para los avisos locales. Los avisos push de fondo se comprueban dentro de la agenda.');
    $('agendaNotifyButton').hidden=true;
  }else if(Notification.permission==='denied'){
    setRow('agendaNotifyStatus',false,'Permiso bloqueado. Activa Notificaciones para este sitio desde la configuración del navegador.');
    $('agendaNotifyButton').textContent='Revisar permiso de notificaciones';
  }else{
    setRow('agendaNotifyStatus',false,'Autoriza las alertas de alimentación y los avisos de actualización de la agenda.');
    $('agendaNotifyButton').hidden=false;
    $('agendaNotifyButton').textContent='Activar notificaciones';
  }
  unlockIfReady();
  if(!window.isSecureContext){
    $('agendaGateHelp').textContent='Abre la agenda mediante HTTPS para instalarla y utilizar notificaciones.';
    $('agendaNotifyButton').disabled=true;
  }
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
