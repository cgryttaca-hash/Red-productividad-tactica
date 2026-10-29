let deferredPrompt=null;
let reloadRequested=false;
function offerUpdate(registration){
  if(!registration.waiting||document.getElementById('pwaUpdateNotice'))return;
  const notice=document.createElement('div');
  notice.id='pwaUpdateNotice';
  notice.setAttribute('role','status');
  Object.assign(notice.style,{position:'fixed',bottom:'max(12px, env(safe-area-inset-bottom))',left:'12px',right:'12px',zIndex:'60000',padding:'12px 16px',background:'#143c50',color:'#fff',borderRadius:'10px',font:'13px/1.5 system-ui',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'});
  const text=document.createElement('span');
  text.textContent='Hay una actualización disponible. Guarda tu trabajo antes de actualizar.';
  const button=document.createElement('button');
  button.type='button';button.textContent='Actualizar';
  Object.assign(button.style,{padding:'8px 12px',border:'1px solid #d4e0e8',borderRadius:'6px',background:'#fff',color:'#143c50',font:'600 13px system-ui',cursor:'pointer'});
  button.addEventListener('click',()=>{reloadRequested=true;registration.waiting?.postMessage({type:'SKIP_WAITING'});});
  notice.append(text,button);document.body.append(notice);
}
async function register(){
  if(!('serviceWorker'in navigator)||!window.isSecureContext)return;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    registration.update().catch(()=>{});
    offerUpdate(registration);
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offerUpdate(registration);});
    });
    window.dispatchEvent(new CustomEvent('rptPwaReady',{detail:{registration}}));
  }catch(error){console.warn('PWA registration:',error);}
}
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(reloadRequested)location.reload();});
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
