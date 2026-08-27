import {createSnapshot,listSnapshots,deleteSnapshot,restoreSnapshot,downloadSnapshot,importSnapshotFile} from './backup-store.js';
import {getSession,logout} from './local-auth.js';
const $=id=>document.getElementById(id);let snapshots=[];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function msg(value,type='info'){const el=$('backupMessage');el.hidden=!value;el.className=`message ${type}`;el.textContent=value||'';}
function format(value){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});}
function currentRows(){try{const rows=JSON.parse(localStorage.getItem('eventData')||'[]');return Array.isArray(rows)?rows:[];}catch(_){return[];}}
async function refresh(){
  snapshots=await listSnapshots(50);
  const rows=currentRows();$('backupCount').textContent=snapshots.length;$('currentEvents').textContent=rows.length;
  $('currentFile').textContent=localStorage.getItem('excelSync:fileName')||'Sin archivo';
  $('lastBackupDate').textContent=snapshots[0]?format(snapshots[0].createdAt):'—';
  $('lastBackupReason').textContent=snapshots[0]?.reason||'Sin respaldo';
  $('backupList').innerHTML=snapshots.length?snapshots.map(item=>`
    <article class="list-item">
      <div><strong>${esc(item.reason)}</strong><span>${format(item.createdAt)} · ${item.payload?.eventCount||0} eventos · ${item.kind==='automatic'?'Automático':'Manual'} · ${esc(item.payload?.fileName||'Sin archivo')}</span></div>
      <div class="tool-actions">
        <button class="btn" type="button" data-action="download" data-id="${item.id}">Descargar</button>
        <button class="btn primary" type="button" data-action="restore" data-id="${item.id}">Restaurar</button>
        <button class="btn danger" type="button" data-action="delete" data-id="${item.id}">Eliminar</button>
      </div>
    </article>`).join(''):`<div class="empty"><strong>No existen respaldos</strong><span>Crea el primero o actualiza el archivo Excel.</span></div>`;
}
$('createBackup').addEventListener('click',async()=>{
  const button=$('createBackup');button.disabled=true;msg('');
  try{await createSnapshot({kind:'manual',reason:'Respaldo manual del administrador',includeUsers:true});await refresh();msg('Respaldo creado correctamente.','success');}
  catch(error){msg(error.message,'error');}finally{button.disabled=false;}
});
$('importBackup').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{await importSnapshotFile(file);await refresh();msg('Archivo importado como respaldo disponible.','success');}
  catch(error){msg(error.message,'error');}finally{event.target.value='';}
});
$('backupList').addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const item=snapshots.find(row=>row.id===button.dataset.id);if(!item)return;
  try{
    if(button.dataset.action==='download')downloadSnapshot(item);
    if(button.dataset.action==='delete'){
      if(!confirm('¿Eliminar este respaldo?'))return;
      await deleteSnapshot(item.id);await refresh();msg('Respaldo eliminado.','success');
    }
    if(button.dataset.action==='restore'){
      if(!confirm(`¿Restaurar el respaldo del ${format(item.createdAt)}? Los eventos actuales serán reemplazados.`))return;
      const restoreUsers=confirm('¿También deseas restaurar los usuarios locales incluidos? Selecciona Cancelar para conservar los usuarios actuales.');
      await createSnapshot({kind:'manual',reason:'Respaldo automático antes de restaurar',includeUsers:true});
      await restoreSnapshot(item,{restoreUsers});
      msg('Respaldo restaurado. La página se recargará.','success');
      setTimeout(()=>location.reload(),900);
    }
  }catch(error){msg(error.message,'error');}
});
const session=getSession();$('sessionName').textContent=session?.displayName||session?.username||'Administrador';
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html')});
window.addEventListener('rptBackupUpdated',refresh);refresh().catch(error=>msg(error.message,'error'));
