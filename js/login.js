import {
  ensureDefaultAdmin,
  getSession,
  login,
  resetDefaultAdmin,
  getDefaultCredentials
} from './local-auth.js';

const $ = id => document.getElementById(id);
const returnPage = new URLSearchParams(location.search).get('return') || 'index.html';

function message(value,type='error'){
  const element=$('loginMessage');
  element.hidden=!value;
  element.className=`login-message is-${type}`;
  element.textContent=value||'';
}

async function initialize(){
  await ensureDefaultAdmin();
  const session=getSession();
  if(session){
    location.replace(returnPage);
    return;
  }
  const credentials=getDefaultCredentials();
  $('defaultCredentials').textContent=`${credentials.username} / ${credentials.password}`;
  $('username').focus();
}

$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  message('');
  const button=$('loginButton');
  button.disabled=true;
  button.textContent='Verificando…';
  try{
    await login($('username').value,$('password').value);
    location.replace(returnPage);
  }catch(error){
    message(error.message || 'No fue posible iniciar sesión.');
  }finally{
    button.disabled=false;
    button.textContent='Ingresar al sistema';
  }
});

$('openRecovery').addEventListener('click',()=>{
  $('recoveryModal').classList.add('is-open');
  $('recoveryModal').setAttribute('aria-hidden','false');
});

$('closeRecovery').addEventListener('click',()=>{
  $('recoveryModal').classList.remove('is-open');
  $('recoveryModal').setAttribute('aria-hidden','true');
});

$('recoveryForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const confirmation=$('recoveryConfirmation').value.trim().toUpperCase();
  if(confirmation!=='RESTABLECER'){
    $('recoveryMessage').textContent='Escribe RESTABLECER para confirmar.';
    return;
  }
  try{
    await resetDefaultAdmin();
    $('recoveryMessage').textContent='La cuenta Admin volvió a usar la contraseña Admin2026.';
    $('recoveryMessage').className='recovery-message is-success';
    $('recoveryConfirmation').value='';
  }catch(error){
    $('recoveryMessage').textContent=error.message;
    $('recoveryMessage').className='recovery-message is-error';
  }
});

$('recoveryModal').addEventListener('click',event=>{
  if(event.target.id==='recoveryModal') $('closeRecovery').click();
});

initialize();