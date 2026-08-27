(function(){
  const SESSION_KEY='rptAuthSessionV1';
  const DEVICE_KEY='rptAuthDeviceV1';
  const USERS_KEY='rptAuthUsersV1';
  const NOTICE_KEY='rptSessionNoticeV1';
  const MAX_IDLE=60*60*1000;
  const WARN_BEFORE=5*60*1000;
  const ACTIVITY_WRITE_INTERVAL=20000;
  let lastWrite=0;
  let warningOpen=false;
  let warningMode='idle';
  let timer=null;

  function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(_){}}
  function currentUser(session){
    const users=read(USERS_KEY)||[];
    return session?users.find(item=>item.id===session.userId&&item.active):null;
  }
  function legacyMidnight(loginAt){
    const source=new Date(loginAt||Date.now());
    if(Number.isNaN(source.getTime()))return Date.now();
    return new Date(source.getFullYear(),source.getMonth(),source.getDate()+1,0,0,0,0).getTime();
  }
  function sessionExpiry(session){return Number(session?.expiresAt)||legacyMidnight(session?.loginAt);}
  function sessionActivity(session){return Number(session?.lastActivityAt)||new Date(session?.loginAt||0).getTime()||0;}
  function reasonForInvalid(session,user,device){
    if(!session||!device||session?.deviceId!==device||!user)return '';
    const now=Date.now();
    if(now>=sessionExpiry(session))return 'Tu sesión se cerró automáticamente a medianoche. Ingresa nuevamente para continuar.';
    if(now-sessionActivity(session)>=MAX_IDLE)return 'Tu sesión se cerró por 1 hora de inactividad. Ingresa nuevamente para continuar.';
    return '';
  }
  function redirectToLogin(message=''){
    if(message)localStorage.setItem(NOTICE_KEY,message);
    localStorage.removeItem(SESSION_KEY);
    const returnTo=encodeURIComponent(location.pathname.split('/').pop()||'index.html');
    location.replace(`login.html?return=${returnTo}`);
  }

  let session=read(SESSION_KEY);
  const device=localStorage.getItem(DEVICE_KEY);
  let user=currentUser(session);
  const page=document.documentElement.dataset.authPage||'protected';
  const revoked=localStorage.getItem('rptDeviceRevokedV1')==='1';
  const timeoutReason=reasonForInvalid(session,user,device);
  const valid=Boolean(!revoked&&session&&device&&session.deviceId===device&&user&&!timeoutReason);

  if(!valid){
    redirectToLogin(timeoutReason);
    return;
  }

  const effectiveRole=user.role||session.role||'viewer';
  if(page==='admin'&&effectiveRole!=='admin'){
    location.replace('index.html');
    return;
  }

  session={...session,role:effectiveRole,displayName:user.displayName,username:user.username,expiresAt:sessionExpiry(session),lastActivityAt:sessionActivity(session)||Date.now()};
  write(SESSION_KEY,session);
  window.__RPT_AUTH_SESSION__={...session,role:effectiveRole,displayName:user.displayName,username:user.username};
  document.documentElement.dataset.userRole=effectiveRole;
  document.documentElement.classList.remove('auth-pending');
  document.documentElement.classList.add('auth-ready');

  function injectWarning(){
    if(document.getElementById('rptSessionWarning'))return;
    const style=document.createElement('style');
    style.textContent=`.rpt-session-warning{position:fixed;inset:0;z-index:99999;display:none;place-items:center;padding:20px;background:rgba(4,15,27,.72);backdrop-filter:blur(9px)}.rpt-session-warning.is-open{display:grid}.rpt-session-warning__card{width:min(430px,100%);padding:25px;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:linear-gradient(145deg,#071725,#0c2c42);color:#fff;box-shadow:0 30px 90px rgba(0,0,0,.36);font-family:Inter,"Segoe UI",Arial,sans-serif}.rpt-session-warning__icon{width:48px;height:48px;display:grid;place-items:center;margin-bottom:16px;border-radius:15px;background:rgba(52,211,153,.12);color:#6ee7b7;font-size:22px}.rpt-session-warning small{color:#79a3b9;font-size:10px;font-weight:900;letter-spacing:.13em}.rpt-session-warning h2{margin:8px 0 7px;font-size:25px}.rpt-session-warning p{margin:0;color:#afc2cf;font-size:13px;line-height:1.55}.rpt-session-warning strong{display:block;margin:16px 0 18px;font-size:18px;color:#72e2e8}.rpt-session-warning__actions{display:flex;gap:9px}.rpt-session-warning button{min-height:44px;flex:1;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.07);color:#fff;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.rpt-session-warning button[data-continue]{border:0;background:linear-gradient(135deg,#18a6ba,#1f7acb)}@media(max-width:430px){.rpt-session-warning__card{padding:21px;border-radius:20px}.rpt-session-warning__actions{display:grid}}`;
    document.head.appendChild(style);
    const overlay=document.createElement('div');
    overlay.id='rptSessionWarning';overlay.className='rpt-session-warning';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<section class="rpt-session-warning__card" role="dialog" aria-modal="true" aria-labelledby="rptSessionWarningTitle"><div class="rpt-session-warning__icon">⌛</div><small>SEGURIDAD DE SESIÓN</small><h2 id="rptSessionWarningTitle">Tu sesión está por cerrarse</h2><p id="rptSessionWarningText">Detectamos un periodo prolongado sin actividad.</p><strong id="rptSessionCountdown">05:00</strong><div class="rpt-session-warning__actions"><button type="button" data-logout>Cerrar sesión ahora</button><button type="button" data-continue>Continuar trabajando</button></div></section>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-logout]').addEventListener('click',()=>redirectToLogin('Cerraste tu sesión de forma segura.'));
    overlay.querySelector('[data-continue]').addEventListener('click',()=>{
      if(warningMode==='midnight')return;
      recordActivity(true);closeWarning();
    });
  }
  function openWarning(mode,remaining){
    injectWarning();warningMode=mode;warningOpen=true;
    const overlay=document.getElementById('rptSessionWarning');
    const text=document.getElementById('rptSessionWarningText');
    const continueButton=overlay?.querySelector('[data-continue]');
    if(text)text.textContent=mode==='midnight'?'Por seguridad, todas las sesiones se cierran automáticamente a medianoche.':'Llevas casi una hora sin utilizar el sistema. Continúa trabajando para conservar la sesión.';
    if(continueButton)continueButton.hidden=mode==='midnight';
    overlay?.classList.add('is-open');overlay?.setAttribute('aria-hidden','false');
    updateCountdown(remaining);
  }
  function closeWarning(){
    warningOpen=false;
    const overlay=document.getElementById('rptSessionWarning');overlay?.classList.remove('is-open');overlay?.setAttribute('aria-hidden','true');
  }
  function updateCountdown(remaining){
    const seconds=Math.max(0,Math.ceil(remaining/1000));
    const minutes=Math.floor(seconds/60);const rest=seconds%60;
    const target=document.getElementById('rptSessionCountdown');if(target)target.textContent=`${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`;
  }
  function recordActivity(force=false){
    if(warningMode==='midnight'&&warningOpen)return;
    const now=Date.now();
    if(!force&&now-lastWrite<ACTIVITY_WRITE_INTERVAL)return;
    const latest=read(SESSION_KEY);if(!latest)return;
    latest.lastActivityAt=now;write(SESSION_KEY,latest);session=latest;lastWrite=now;
    if(warningOpen)closeWarning();
  }
  function checkSession(){
    const latest=read(SESSION_KEY);const latestUser=currentUser(latest);const currentDevice=localStorage.getItem(DEVICE_KEY);
    if(!latest||!latestUser||latest.deviceId!==currentDevice){redirectToLogin('Tu acceso cambió o fue desactivado por un administrador.');return;}
    if((latestUser.role||latest.role)!==document.documentElement.dataset.userRole){location.reload();return;}
    const now=Date.now();const midnight=sessionExpiry(latest);const idleExpiry=sessionActivity(latest)+MAX_IDLE;
    const expiry=Math.min(midnight,idleExpiry);const remaining=expiry-now;
    if(remaining<=0){
      redirectToLogin(expiry===midnight?'Tu sesión se cerró automáticamente a medianoche. Ingresa nuevamente para continuar.':'Tu sesión se cerró por 1 hora de inactividad. Ingresa nuevamente para continuar.');
      return;
    }
    if(remaining<=WARN_BEFORE){
      openWarning(midnight<=idleExpiry?'midnight':'idle',remaining);
    }else if(warningOpen){closeWarning();}
    if(warningOpen)updateCountdown(remaining);
  }

  ['pointerdown','keydown','touchstart','scroll'].forEach(name=>window.addEventListener(name,()=>recordActivity(false),{passive:true,capture:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){recordActivity(false);checkSession();}});
  window.addEventListener('storage',event=>{
    if(event.key===SESSION_KEY||event.key===USERS_KEY||event.key===DEVICE_KEY)checkSession();
  });
  window.addEventListener('pageshow',checkSession);
  timer=setInterval(checkSession,15000);
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});

  if(effectiveRole!=='admin'){
    window.addEventListener('DOMContentLoaded',()=>{
      import('./viewer-sync.js').catch(error=>console.warn('Sincronización de usuario:',error));
    },{once:true});
  }
})();
