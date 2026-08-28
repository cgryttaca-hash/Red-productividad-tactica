import { getSession, login, hasLocalUsers, setupInitialAdmin } from './local-auth.js';
import { loginCloud } from './cloud-auth.js';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const returnPage=params.get('return') || 'index.html';

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
  setTimeout(()=>location.replace(returnPage),650);
}
async function authenticate(username,password){
  const normalized=String(username||'').trim().toLocaleLowerCase('es');
  let localError=null;
  if(hasLocalUsers()){
    try{return await login(username,password);}catch(error){localError=error;}
  }
  if(normalized!=='admin'){
    try{return await loginCloud(username,password);}catch(error){throw error;}
  }
  throw localError || new Error('Usuario o contraseña incorrectos.');
}
async function initialize(){
  const reason=sessionStorage.getItem('rptSessionEndReason');
  if(reason){message(reason,'error');sessionStorage.removeItem('rptSessionEndReason');}
  const session=getSession();
  if(session){location.replace(returnPage);return;}
  $('initialSetup').hidden=hasLocalUsers();
  $('username').focus();
}
$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();message('');
  const button=$('loginButton');button.disabled=true;button.textContent='Verificando…';
  try{showWelcome(await authenticate($('username').value,$('password').value));}
  catch(error){message(error.message||'No fue posible iniciar sesión.');button.disabled=false;button.textContent='Ingresar al sistema';}
});
$('initialSetupForm')?.addEventListener('submit',async event=>{
  event.preventDefault();message('');
  const button=event.currentTarget.querySelector('button');button.disabled=true;
  try{
    await setupInitialAdmin({username:$('setupUsername').value,password:$('setupPassword').value});
    $('initialSetup').hidden=true;
    $('username').value=$('setupUsername').value;
    $('password').focus();
    message('Administrador local creado. Ingresa con la contraseña que acabas de definir.','success');
  }catch(error){message(error.message||'No fue posible crear el administrador.');}
  finally{button.disabled=false;}
});
initialize();
