import {
  getSession,
  listUsers,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
  logout
} from './local-auth.js';

const $=id=>document.getElementById(id);
let users=[];

function esc(value){
  return String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));
}

function formatDate(value){
  if(!value) return 'Nunca';
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? 'Nunca' : date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}

function showMessage(value,type='success'){
  const element=$('usersMessage');
  element.hidden=!value;
  element.className=`users-message is-${type}`;
  element.textContent=value||'';
}

function render(){
  const session=getSession();
  $('currentAdmin').textContent=session?.displayName || session?.username || 'Administrador';
  $('userCount').textContent=users.length;
  $('activeCount').textContent=users.filter(user=>user.active).length;
  $('adminCount').textContent=users.filter(user=>user.role==='admin').length;

  $('usersTableBody').innerHTML=users.map(user=>`
    <tr>
      <td>
        <strong>${esc(user.displayName || user.username)}</strong>
        <span>@${esc(user.username)}</span>
      </td>
      <td><span class="role-badge ${user.role==='admin'?'is-admin':''}">${user.role==='admin'?'Administrador':'Usuario'}</span></td>
      <td><span class="state-badge ${user.active?'is-active':'is-inactive'}">${user.active?'Activo':'Inactivo'}</span></td>
      <td>${esc(formatDate(user.lastLoginAt))}</td>
      <td class="user-actions">
        <button type="button" data-action="password" data-id="${esc(user.id)}">Contraseña</button>
        <button type="button" data-action="toggle" data-id="${esc(user.id)}">${user.active?'Desactivar':'Activar'}</button>
        <button type="button" data-action="delete" data-id="${esc(user.id)}" class="danger">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

async function refresh(){
  users=await listUsers();
  render();
}

$('createUserForm').addEventListener('submit',async event=>{
  event.preventDefault();
  showMessage('');
  try{
    await createUser({
      username:$('newUsername').value,
      displayName:$('newDisplayName').value,
      password:$('newPassword').value,
      role:$('newRole').value
    });
    event.target.reset();
    await refresh();
    showMessage('Usuario creado correctamente.');
  }catch(error){
    showMessage(error.message,'error');
  }
});

$('usersTableBody').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if(!button) return;
  const user=users.find(item=>item.id===button.dataset.id);
  if(!user) return;
  showMessage('');

  try{
    if(button.dataset.action==='password'){
      const password=prompt(`Nueva contraseña para ${user.username}:`);
      if(password===null) return;
      await changePassword(user.id,password);
      showMessage(`Contraseña actualizada para ${user.username}.`);
    }
    if(button.dataset.action==='toggle'){
      await updateUser(user.id,{active:!user.active});
      showMessage(`Usuario ${user.active?'desactivado':'activado'} correctamente.`);
    }
    if(button.dataset.action==='delete'){
      if(!confirm(`¿Eliminar al usuario ${user.username}?`)) return;
      await deleteUser(user.id);
      showMessage('Usuario eliminado.');
    }
    await refresh();
  }catch(error){
    showMessage(error.message,'error');
  }
});

$('changeOwnPasswordForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const session=getSession();
  if(!session) return;
  try{
    await changePassword(session.userId,$('ownNewPassword').value);
    event.target.reset();
    showMessage('Tu contraseña fue actualizada.');
  }catch(error){
    showMessage(error.message,'error');
  }
});

$('logoutButton').addEventListener('click',()=>{
  logout();
  location.replace('login.html');
});

refresh();