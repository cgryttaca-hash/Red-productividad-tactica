import {query,exportCsv} from './audit-store.js';
import {getSession,logout} from './local-auth.js';
const $=id=>document.getElementById(id);let rows=[];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function format(value){const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});}
async function refresh(){
  rows=await query({
    from:$('fromDate').value,to:$('toDate').value,
    user:$('userFilter').value,company:$('companyFilter').value,
    field:$('fieldFilter').value,sheet:$('sheetFilter').value,limit:3000
  });
  $('auditCount').textContent=rows.length;
  $('auditUsers').textContent=new Set(rows.map(row=>row.user||row.host).filter(Boolean)).size;
  $('auditCompanies').textContent=new Set(rows.map(row=>row.company).filter(Boolean)).size;
  $('lastAudit').textContent=rows[0]?format(rows[0].timestamp):'—';
  $('auditGenerated').textContent=`Actualizado ${new Date().toLocaleString('es-CO')}`;
  $('auditEmpty').hidden=rows.length>0;
  $('auditBody').innerHTML=rows.map(row=>`<tr>
    <td>${esc(format(row.timestamp))}</td>
    <td><strong>${esc(row.user||'Usuario')}</strong><br><span>${esc(row.host||'Equipo')}</span></td>
    <td>${esc(row.sheet||'—')}<br><code>${esc(row.cell||row.row||'—')}</code></td>
    <td>${esc(row.company||'—')}</td><td>${esc(row.field||row.type||'Registro')}</td>
    <td>${esc(row.before||'Vacío')}</td><td>${esc(row.after||'Vacío')}</td>
  </tr>`).join('');
}
let timer=null;
['fromDate','toDate','userFilter','companyFilter','fieldFilter','sheetFilter'].forEach(id=>{
  $(id).addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(),180);});
});
$('refreshAudit').addEventListener('click',refresh);
$('exportAudit').addEventListener('click',()=>{
  const csv=exportCsv(rows);const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`auditoria-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('printAudit').addEventListener('click',()=>window.print());
const session=getSession();$('sessionName').textContent=session?.displayName||session?.username||'Administrador';
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html')});
window.addEventListener('eventAuditUpdated',refresh);refresh();
