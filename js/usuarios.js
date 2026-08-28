import {getSession,logout} from './local-auth.js';
import {connectOwner,listCloudUsers,createCloudUser,updateCloudUser} from './cloud-auth.js';

const $=id=>document.getElementById(id);let users=[];let connected=false;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function formatDate(value){if(!value)return'Nunca';const d=new Date(value);return Number.isNaN(d.getTime())?'Nunca':d.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});}
function msg(value,type='success'){const el=$('usersMessage');el.hidden=!value;el.className=`users-message is-${type}`;el.textContent=value||'';}
function state(value,type=''){const el=$('cloudOwnerState');el.textContent=value;el.className=`cloud-owner-state ${type?`is-${type}`:''}`;}
function render(){
  const session=getSession();$('currentAdmin').textContent=session?.displayName||session?.username||'Administrador';
  $('userCount').textContent=users.length;$('activeCount').textContent=users.filter(u=>u.active).length;$('adminCount').textContent=users.filter(u=>u.role==='admin').length;
  $('createUserButton').disabled=!connected;
  $('usersTableBody').innerHTML=users.length?users.map(user=>`<tr><td><strong>${esc(user.displayName||user.username)}</strong><span>@${esc(user.username)}</span></td><td><span class="role-badge ${user.role==='admin'?'is-admin':''}">${user.role==='admin'?'Administrador':'Usuario'}</span></td><td><span class="state-badge ${user.active?'is-active':'is-inactive'}">${user.active?'Activo':'Inactivo'}</span></td><td>${esc(formatDate(user.lastLoginAt))}</td><td class="user-actions"><button type="button" data-action="role" data-id="${esc(user.id)}">${user.role==='admin'?'Hacer usuario':'Hacer admin'}</button><button type="button" data-action="toggle" data-id="${esc(user.id)}">${user.active?'Desactivar':'Activar'}</button></td></tr>`).join(''):`<tr><td colspan="5"><strong>No hay usuarios sincronizados.</strong><span>Conecta Firebase y crea el primer acceso operativo.</span></td></tr>`;
}
async function refresh(){
  try{users=await listCloudUsers();connected=true;state('Administración Firebase conectada. Los permisos se sincronizan entre equipos.','success');$('cloudOwnerForm').hidden=true;render();}
  catch(error){connected=false;users=[];state('Conecta la cuenta propietaria de Firebase para administrar usuarios.','warning');$('cloudOwnerForm').hidden=false;render();}
}
$('cloudOwnerForm').addEventListener('submit',async event=>{
  event.preventDefault();msg('');const button=event.currentTarget.querySelector('button');button.disabled=true;state('Conectando…');
  try{await connectOwner($('cloudOwnerEmail').value,$('cloudOwnerPassword').value);$('cloudOwnerPassword').value='';await refresh();}
  catch(error){state(error.message||'No fue posible conectar Firebase.','error');}
  finally{button.disabled=false;}
});
$('createUserForm').addEventListener('submit',async event=>{
  event.preventDefault();msg('');
  try{await createCloudUser({username:$('newUsername').value,displayName:$('newDisplayName').value,password:$('newPassword').value,role:$('newRole').value});event.currentTarget.reset();await refresh();msg('Usuario creado y sincronizado. Ya puede ingresar desde otro equipo.');}
  catch(error){msg(error.message||'No fue posible crear el usuario.','error');}
});
$('usersTableBody').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;const user=users.find(u=>u.id===button.dataset.id);if(!user)return;msg('');button.disabled=true;
  try{
    if(button.dataset.action==='toggle')await updateCloudUser(user.id,{active:!user.active});
    if(button.dataset.action==='role')await updateCloudUser(user.id,{role:user.role==='admin'?'viewer':'admin'});
    await refresh();msg('Permisos actualizados. El cambio se aplicará automáticamente en las sesiones abiertas.');
  }catch(error){msg(error.message||'No fue posible actualizar el usuario.','error');}
  finally{button.disabled=false;}
});
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html');});
refresh();
