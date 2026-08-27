import {listDevices,setDeviceRevoked,deleteDevice,ownerLogin,ownerUser,getLocalDeviceId} from './device-registry.js';
import {getSession,logout} from './local-auth.js';
const $=id=>document.getElementById(id);let devices=[];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function format(value){
  if(!value)return'Nunca';
  const date=value?.toDate?value.toDate():new Date(value);
  return Number.isNaN(date.getTime())?'Nunca':date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}
function message(value,type='info',target='devicesMessage'){const el=$(target);el.hidden=!value;el.className=`message ${type}`;el.textContent=value||'';}
async function refresh(){
  message('');const owner=await ownerUser();$('firebaseOwnerLogin').hidden=Boolean(owner);
  if(!owner){$('devicesEmpty').hidden=false;$('devicesBody').innerHTML='';return;}
  devices=await listDevices();
  $('deviceCount').textContent=devices.length;$('activeDevices').textContent=devices.filter(d=>!d.revoked).length;
  $('revokedDevices').textContent=devices.filter(d=>d.revoked).length;$('currentDevice').textContent=getLocalDeviceId().slice(-8);
  $('devicesEmpty').hidden=devices.length>0;
  $('devicesBody').innerHTML=devices.map(device=>`<tr>
    <td><strong>${esc(device.deviceName||device.platform||'Equipo')}</strong><br><code>${esc(device.id)}</code></td>
    <td>${esc(device.localDisplayName||device.localUsername||'Sin usuario')}<br><span>${esc(device.platform||'')}</span></td>
    <td>${esc(device.browser||'Navegador')}<br><span>${esc((device.userAgent||'').slice(0,70))}</span></td>
    <td>${esc(format(device.lastSeenAt||device.clientLastSeenAt))}</td>
    <td><span class="status ${device.revoked?'error':'ok'}">${device.revoked?'Revocado':'Activo'}</span></td>
    <td><div class="tool-actions">
      <button class="btn" type="button" data-action="toggle" data-id="${device.id}">${device.revoked?'Reactivar':'Revocar'}</button>
      <button class="btn danger" type="button" data-action="delete" data-id="${device.id}">Eliminar</button>
    </div></td>
  </tr>`).join('');
}
$('ownerLoginForm').addEventListener('submit',async event=>{
  event.preventDefault();message('','info','ownerMessage');
  try{await ownerLogin($('ownerEmail').value.trim(),$('ownerPassword').value);$('ownerPassword').value='';message('Cuenta conectada.','success','ownerMessage');await refresh();}
  catch(error){message(error.message,'error','ownerMessage');}
});
$('refreshDevices').addEventListener('click',()=>refresh().catch(error=>message(error.message,'error')));
$('devicesBody').addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const device=devices.find(item=>item.id===button.dataset.id);if(!device)return;
  try{
    if(button.dataset.action==='toggle')await setDeviceRevoked(device.id,!device.revoked);
    if(button.dataset.action==='delete'){if(!confirm('¿Eliminar este equipo del registro?'))return;await deleteDevice(device.id);}
    await refresh();
  }catch(error){message(error.message,'error');}
});
const session=getSession();$('sessionName').textContent=session?.displayName||session?.username||'Administrador';
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html')});
refresh().catch(error=>{message(error.message,'error');$('firebaseOwnerLogin').hidden=false;});
