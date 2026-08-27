(function(){
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