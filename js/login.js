import {
  ensureDefaultAdmin,
  getSession,
  login
} from './local-auth.js';

const $ = id => document.getElementById(id);
const requestedReturn = new URLSearchParams(location.search).get('return') || 'index.html';

function safeReturnPage(value){
  const allowed=new Set(['index.html','eventos.html','minuta.html','usuarios.html','configuracion.html','auditoria.html','diagnostico.html','respaldos.html','equipos.html','validacion.html','laboratorio.html','mantenimiento.html']);
  return allowed.has(value)?value:'index.html';
}
const returnPage=safeReturnPage(requestedReturn);

function message(value,type='error'){
  const element=$('loginMessage');
  element.hidden=!value;
  element.className=`login-message is-${type}`;
  element.textContent=value||'';
}

function destinationFor(session){
  if(session?.role!=='admin') return 'index.html';
  if(session?.user?.mustChangePassword) return 'usuarios.html';
  return returnPage;
}

function showWelcome(session){
  const overlay=$('welcomeOverlay');
  $('welcomeTitle').textContent=`Bienvenido, ${session.displayName || session.username}`;
  $('welcomeSubtitle').textContent=session.role==='admin'?'Preparando el centro administrativo…':'Preparando tu espacio de trabajo…';
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden','false');
  setTimeout(()=>location.replace(destinationFor(session)),900);
}

async function initialize(){
  await ensureDefaultAdmin();
  const revoked=localStorage.getItem('rptRevokedMessageV1');
  const sessionNotice=localStorage.getItem('rptSessionNoticeV1');
  if(revoked){message(revoked,'error');localStorage.removeItem('rptRevokedMessageV1');}
  else if(sessionNotice){message(sessionNotice,'info');localStorage.removeItem('rptSessionNoticeV1');}
  const session=getSession();
  if(session){
    location.replace(destinationFor(session));
    return;
  }
  $('username').focus();
}

$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  message('');
  const button=$('loginButton');
  button.disabled=true;
  button.textContent='Verificando…';
  try{
    const session=await login($('username').value,$('password').value);
    showWelcome(session);
  }catch(error){
    message(error.message || 'No fue posible iniciar sesión.');
    button.disabled=false;
    button.textContent='Ingresar al sistema';
  }
});

initialize();
