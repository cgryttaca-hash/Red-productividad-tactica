(function(){
  const SESSION_KEY='rptAuthSessionV1';
  const DEVICE_KEY='rptAuthDeviceV1';
  const USERS_KEY='rptAuthUsersV1';
  const IDLE_MS=60*60*1000;
  const WARN_MS=5*60*1000;
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(_){return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch(_){}};
  let session=read(SESSION_KEY);
  const page=document.documentElement.dataset.authPage||'protected';

  function endSession(reason){
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem('rptSessionEndReason',reason);
    location.replace('login.html');
  }
  function localValid(current){
    const device=localStorage.getItem(DEVICE_KEY);
    const users=read(USERS_KEY,[]);
    const user=current?users.find(item=>item.id===current.userId&&item.active):null;
    if(!current||current.source==='cloud') return null;
    if(!device||current.deviceId!==device||!user) return null;
    return {...current,source:'local',role:user.role||current.role,displayName:user.displayName,username:user.username,userId:user.id};
  }
  function cloudValid(current){
    if(!current||current.source!=='cloud'||current.active===false||!current.userId) return null;
    return current;
  }
  session=cloudValid(session)||localValid(session);
  if(!session){
    localStorage.removeItem(SESSION_KEY);
    const returnTo=encodeURIComponent(location.pathname.split('/').pop()||'index.html');
    location.replace(`login.html?return=${returnTo}`);
    return;
  }
  if(page==='admin'&&session.role!=='admin'){
    location.replace('index.html');
    return;
  }
  session.lastActivityAt=Number(session.lastActivityAt)||Date.now();
  write(SESSION_KEY,session);
  window.__RPT_AUTH_SESSION__={...session};
  document.documentElement.classList.remove('auth-pending');
  document.documentElement.classList.add('auth-ready');

  let warningOpen=false;
  let lastPersist=0;
  function midnightAt(){const d=new Date();d.setHours(24,0,0,0);return d.getTime();}
  const midnight=midnightAt();
  function persistActivity(){
    const now=Date.now();
    if(now-lastPersist<30000)return;
    lastPersist=now;session.lastActivityAt=now;write(SESSION_KEY,session);
    closeWarning();
  }
  function closeWarning(){
    warningOpen=false;
    document.getElementById('rptSessionWarning')?.remove();
  }
  function showWarning(remaining){
    if(warningOpen)return;
    warningOpen=true;
    const mount=()=>{
      if(document.getElementById('rptSessionWarning'))return;
      const el=document.createElement('div');el.id='rptSessionWarning';el.className='rpt-session-warning';
      el.innerHTML=`<div class="rpt-session-warning-card" role="dialog" aria-modal="true"><span>SEGURIDAD DE SESIÓN</span><h2>Tu sesión está por finalizar</h2><p>Detectamos inactividad. Se cerrará automáticamente en <strong id="rptSessionCountdown">${Math.ceil(remaining/60000)} min</strong>.</p><button id="rptContinueSession" type="button">Continuar trabajando</button></div>`;
      document.body.appendChild(el);
      document.getElementById('rptContinueSession')?.addEventListener('click',()=>{session.lastActivityAt=Date.now();write(SESSION_KEY,session);closeWarning();});
    };
    if(document.body)mount();else addEventListener('DOMContentLoaded',mount,{once:true});
  }
  function checkSession(){
    const now=Date.now();
    if(now>=midnight){endSession('Tu sesión se cerró automáticamente al finalizar el día.');return;}
    const idle=now-(Number(session.lastActivityAt)||now);
    if(idle>=IDLE_MS){endSession('Tu sesión se cerró por 1 hora de inactividad.');return;}
    if(idle>=IDLE_MS-WARN_MS){
      showWarning(IDLE_MS-idle);
      const target=document.getElementById('rptSessionCountdown');if(target)target.textContent=`${Math.max(1,Math.ceil((IDLE_MS-idle)/60000))} min`;
    }
  }
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>addEventListener(type,persistActivity,{passive:true}));
  setInterval(checkSession,15000);checkSession();

  if(session.source==='cloud'){
    import('./cloud-auth.js').then(async module=>{
      const stop=await module.watchCloudProfile(session.userId,profile=>{
        if(!profile||!profile.active){endSession('Tu acceso fue desactivado por el administrador.');return;}
        const changedRole=session.role!==profile.role;
        session={...session,displayName:profile.displayName,username:profile.username,role:profile.role,active:true};
        write(SESSION_KEY,session);window.__RPT_AUTH_SESSION__={...session};
        window.dispatchEvent(new CustomEvent('rpt:session-profile',{detail:profile}));
        if(changedRole){location.reload();}
      });
      addEventListener('pagehide',()=>stop?.(),{once:true});
    }).catch(()=>{});
  }
})();
