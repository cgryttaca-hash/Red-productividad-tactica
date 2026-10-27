let deferredPrompt=null;
async function register(){
  if(!('serviceWorker'in navigator)||location.protocol==='file:')return;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
    registration.update().catch(()=>{});
    window.dispatchEvent(new CustomEvent('rptPwaReady',{detail:{registration}}));
  }catch(error){console.warn('PWA registration:',error);}
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferredPrompt=event;
  document.querySelectorAll('[data-install-app]').forEach(button=>{button.hidden=false;});
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-install-app]');if(!button||!deferredPrompt)return;
  deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;button.hidden=true;
});
function networkState(){
  document.documentElement.classList.toggle('is-offline',!navigator.onLine);
  window.dispatchEvent(new CustomEvent('rptNetworkChanged',{detail:{online:navigator.onLine}}));
}
window.addEventListener('online',networkState);window.addEventListener('offline',networkState);networkState();
register();
