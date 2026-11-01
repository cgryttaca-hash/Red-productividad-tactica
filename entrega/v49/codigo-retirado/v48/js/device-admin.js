import {listDevices,setDeviceRevoked} from './device-registry.js';
const date=value=>{const d=value?.toDate?.()||new Date(value);return Number.isFinite(d?.getTime())?d.toLocaleString('es-CO',{timeZone:'America/Bogota'}):'Sin dato';};
export async function mount(host){
 if(!window.RPTAdminAccess?.hasAccess()||!window.RPTDeviceAccess?.allowed)throw Error('Se requiere acceso administrativo validado.');
 host.innerHTML='<header class="technical-heading"><span>AUTORIZACIÓN EN FIREBASE</span><h2>Control de dispositivos</h2><p>Autorizar un equipo permite usar la aplicación; no modifica su cuenta ni su rol.</p></header><div class="technical-actions"><button id="refreshDevices" type="button">Actualizar registro</button></div><p id="deviceAdminMessage" role="status"></p><div class="technical-table"><table><thead><tr><th>Dispositivo</th><th>Identificador</th><th>Estado</th><th>Registro</th><th>Último acceso</th><th>Acción</th></tr></thead><tbody id="deviceAdminRows"></tbody></table></div>';
 const $=id=>host.querySelector('#'+id);let busy=false;
 async function refresh(){if(busy)return;busy=true;$('deviceAdminMessage').textContent='Consultando dispositivos…';try{
  const records=await listDevices();$('deviceAdminRows').replaceChildren();
  for(const item of records.filter(item=>item.schema===2)){
   const row=document.createElement('tr');for(const value of [item.deviceName||'Dispositivo',item.id,{pending:'Pendiente',approved:'Autorizado',revoked:'Revocado'}[item.status],date(item.createdAt||item.clientCreatedAt),date(item.lastSeenAt||item.clientLastSeenAt)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
   const actions=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent=item.status==='approved'?'Revocar':'Autorizar';button.className='control-secondary';button.addEventListener('click',async()=>{button.disabled=true;try{await setDeviceRevoked(item.id,item.status==='approved');await refresh();}catch(_){$('deviceAdminMessage').textContent='No se confirmó el cambio. Comprueba la conexión y la cuenta propietaria de Firebase.';}finally{button.disabled=false;}});actions.append(button);row.append(actions);$('deviceAdminRows').append(row);
  }
  $('deviceAdminMessage').textContent=records.some(item=>item.schema===2)?'Estados consultados en Firebase.':'No hay solicitudes de esta versión. Los registros anteriores se conservan sin aprobarlos automáticamente.';
 }catch(error){$('deviceAdminMessage').textContent=error.message||'No fue posible consultar el registro.';}finally{busy=false;}}
 $('refreshDevices').addEventListener('click',refresh);await refresh();return{refresh};
}
