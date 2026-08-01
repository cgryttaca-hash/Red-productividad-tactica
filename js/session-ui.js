import {getSession, logout} from './local-auth.js';

const session=getSession();
const name=document.getElementById('sessionUserName');
const role=document.getElementById('sessionUserRole');
const usersLink=document.getElementById('usersLink');
const configLink=document.getElementById('configLink');
const logoutButton=document.getElementById('logoutButton');

if(session){
  if(name) name.textContent=session.displayName || session.username;
  if(role) role.textContent=session.role==='admin' ? 'Administrador' : 'Usuario';
  if(usersLink) usersLink.hidden=session.role!=='admin';
  if(configLink) configLink.hidden=session.role!=='admin';
}

logoutButton?.addEventListener('click',()=>{
  logout();
  location.replace('login.html');
});
