(function(){
  if(window.RPTNavigation){
    let expiryTimer;
    function validate(){clearTimeout(expiryTimer);const navigation=window.RPTNavigation,session=navigation.session(),page=document.documentElement.dataset.authPage||'protected';
      if(navigation.mobile()){if(!['mobile','updates'].includes(page)){location.replace('agenda_movil.html');return;}delete window.__RPT_AUTH_SESSION__;document.documentElement.classList.remove('auth-pending');document.documentElement.classList.add('auth-ready');return;}
      if(!session){location.replace(navigation.loginURL());return;}
      if(page==='admin'&&session.role!=='admin'){location.replace('index.html');return;}
      window.__RPT_AUTH_SESSION__=session;document.documentElement.classList.remove('auth-pending');document.documentElement.classList.add('auth-ready');
      if(session.expiresAt)expiryTimer=setTimeout(validate,Math.min(2147483647,Math.max(1,Date.parse(session.expiresAt)-Date.now())));
    }
    validate();window.addEventListener('storage',event=>{if(['rptAuthUsersV1','rptAuthSessionV1','rptMobileAuthSessionV1','rptDeviceRevokedV1','rptAuthDeviceV1'].includes(event.key))validate();});window.addEventListener('pageshow',validate);window.addEventListener('focus',validate);document.addEventListener('visibilitychange',()=>{if(!document.hidden)validate();});window.addEventListener('pagehide',()=>clearTimeout(expiryTimer));return;
  }
  const SESSION_KEY='rptAuthSessionV1';
  const DEVICE_KEY='rptAuthDeviceV1';
  const USERS_KEY='rptAuthUsersV1';
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
  const session=read(SESSION_KEY);
  const device=localStorage.getItem(DEVICE_KEY);
  const users=read(USERS_KEY) || [];
  const user=session ? users.find(item=>item.id===session.userId && item.active) : null;
  const page=document.documentElement.dataset.authPage || 'protected';
  const revoked=localStorage.getItem('rptDeviceRevokedV1')==='1';
  const valid=Boolean(!revoked && session && device && session.deviceId===device && user);

  if(!valid){
    localStorage.removeItem(SESSION_KEY);
    const returnTo=encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    location.replace(`login.html?return=${returnTo}`);
    return;
  }
  const effectiveRole=user.role || session.role;
  if(page==='admin' && effectiveRole!=='admin'){
    location.replace('index.html');
    return;
  }
  window.__RPT_AUTH_SESSION__={...session,role:effectiveRole,displayName:user.displayName,username:user.username};
  document.documentElement.classList.remove('auth-pending');
  document.documentElement.classList.add('auth-ready');
})();
