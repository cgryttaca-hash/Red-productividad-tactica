import {
  ensureDefaultAdmin,
  getSession,
  login,
  resetDefaultAdmin
} from './local-auth.js';

const $ = id => document.getElementById(id);
const returnPage = new URLSearchParams(location.search).get('return') || 'index.html';
let recoveryTimer = null;

function message(value,type='error'){
  const element=$('loginMessage');
  element.hidden=!value;
  element.className=`login-message is-${type}`;
  element.textContent=value||'';
}

function showWelcome(session){
  const overlay=$('welcomeOverlay');
  $('welcomeTitle').textContent=`Bienvenido, ${session.displayName || session.username}`;
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden','false');
  setTimeout(()=>location.replace(returnPage),1250);
}

async function initialize(){
  await ensureDefaultAdmin();
  const revoked=localStorage.getItem('rptRevokedMessageV1');
  if(revoked){message(revoked,'error');localStorage.removeItem('rptRevokedMessageV1');}
  const session=getSession();
  if(session){
    location.replace(returnPage);
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

document.addEventListener('keydown',event=>{
  if(!event.ctrlKey || event.key.toLowerCase()!=='g') return;
  event.preventDefault();
  const button=$('openRecovery');
  button.hidden=false;
  button.focus();
  clearTimeout(recoveryTimer);
});

$('openRecovery').addEventListener('click',async()=>{
  const button=$('openRecovery');
  const confirmation=prompt('Para restablecer únicamente la cuenta local Admin, escribe RESTABLECER.');
  if(confirmation===null) return;
  if(confirmation.trim().toUpperCase()!=='RESTABLECER'){
    message('No se realizó ningún cambio. Escribe RESTABLECER para confirmar.');
    return;
  }
  button.disabled=true;
  try{
    await resetDefaultAdmin();
    $('username').value='Admin';
    $('password').value='';
    message('Acceso restablecido. Usuario: Admin · contraseña inicial: Admin2026','success');
    $('password').focus();
  }catch(error){
    message(error.message || 'No fue posible restablecer la contraseña.');
  }finally{
    button.disabled=false;
  }
});

initialize();
