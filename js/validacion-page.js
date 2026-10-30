import {getValidationReport} from './validation.js';
import {getSession,logout} from './local-auth.js';
const $=id=>document.getElementById(id);let report=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function filtered(){
  const level=$('severityFilter').value;const search=$('issueSearch').value.trim().toLocaleLowerCase('es');
  return (report?.issues||[]).filter(item=>(!level||item.severity===level)&&(!search||[item.company,item.field,item.message,item.sheet].some(v=>String(v||'').toLocaleLowerCase('es').includes(search))));
}
function render(){
  report=getValidationReport();
  $('totalRows').textContent=report?.totalRows||0;$('validRows').textContent=report?.validRows||0;
  $('errorCount').textContent=report?.errorCount||0;$('warningCount').textContent=report?.warningCount||0;
  $('fileName').textContent=report?.fileName||'Sin informe';
  $('generatedAt').textContent=report?.generatedAt?new Date(report.generatedAt).toLocaleString('es-CO'):'—';
  const rows=filtered();$('emptyIssues').hidden=rows.length>0;
  $('issuesBody').innerHTML=rows.map(item=>`<tr><td><span class="status ${item.severity==='error'?'error':item.severity==='warning'?'warn':'info'}">${esc(item.severity)}</span></td><td>${esc(item.sheet)}</td><td>${esc(item.row)}</td><td>${esc(item.company)}</td><td>${esc(item.field)}</td><td>${esc(item.message)}</td></tr>`).join('');
}
function exportCsv(){
  const rows=filtered();const cols=['severity','sheet','row','company','field','message'];const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const csv=[cols.join(','),...rows.map(row=>cols.map(k=>q(row[k])).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download='validacion-excel.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const session=getSession();$('sessionName').textContent=session?.displayName||session?.username||'Administrador';
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html')});
$('severityFilter').addEventListener('change',render);$('issueSearch').addEventListener('input',render);
$('refreshValidation').addEventListener('click',render);$('exportValidation').addEventListener('click',exportCsv);
window.addEventListener('rptValidationUpdated',render);render();
