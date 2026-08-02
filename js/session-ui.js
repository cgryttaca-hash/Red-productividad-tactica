import {getSession, logout} from './local-auth.js';

const session=getSession();
const name=document.getElementById('sessionUserName');
const role=document.getElementById('sessionUserRole');
const usersLink=document.getElementById('usersLink');
const configLink=document.getElementById('configLink');
const adminLinks=[...document.querySelectorAll('[data-admin-link]')];
const adminPanels=[...document.querySelectorAll('[data-admin-only]')];
const logoutButton=document.getElementById('logoutButton');

if(session){
  if(name) name.textContent=session.displayName || session.username;
  if(role) role.textContent=session.role==='admin' ? 'Administrador' : 'Usuario';
  if(usersLink) usersLink.hidden=session.role!=='admin';
  if(configLink) configLink.hidden=session.role!=='admin';
  adminLinks.forEach(link=>{link.hidden=session.role!=='admin';});
  adminPanels.forEach(panel=>{panel.hidden=session.role!=='admin';});
}

logoutButton?.addEventListener('click',()=>{
  logout();
  location.replace('login.html');
});
