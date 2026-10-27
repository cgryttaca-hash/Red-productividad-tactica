import {validateRows} from './validation.js';
import {getSession,logout} from './local-auth.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function show(value,type='info'){const el=$('labMessage');el.hidden=!value;el.className=`message ${type}`;el.textContent=value||'';}
function date(value){const d=new Date(value);return Number.isNaN(d.getTime())?String(value||'—'):d.toLocaleDateString('es-CO');}
$('labFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;show('Analizando el archivo…','info');
  try{
    if(!window.ExcelFileSync?.parseWorkbookBuffer)throw new Error('El lector del Excel no está disponible.');
    const started=performance.now();
    const parsed=window.ExcelFileSync.parseWorkbookBuffer(await file.arrayBuffer());
    const report=validateRows(parsed.rows,{sheets:parsed.sheets,fileName:file.name,columnMaps:parsed.columnMaps});
    $('labRows').textContent=parsed.rows.length;$('labSheets').textContent=parsed.sheets.length;
    $('labSheetNames').textContent=parsed.sheets.join(', ')||'Sin hojas';$('labErrors').textContent=report.errorCount;$('labWarnings').textContent=report.warningCount;
    $('labReport').innerHTML=`<div class="list">
      <article class="list-item"><div><strong>Archivo analizado</strong><span>${esc(file.name)} · ${(file.size/1024).toFixed(1)} KB</span></div><span class="status ${report.errorCount?'error':report.warningCount?'warn':'ok'}">${report.errorCount?'Revisar':report.warningCount?'Advertencias':'Correcto'}</span></article>
      <article class="list-item"><div><strong>Tiempo de análisis</strong><span>Lectura, normalización y validación.</span></div><code>${Math.round(performance.now()-started)} ms</code></article>
      <article class="list-item"><div><strong>Incidencias</strong><span>${report.issues.slice(0,6).map(item=>`${item.sheet} fila ${item.row}: ${item.message}`).join(' · ')||'No se detectaron incidencias.'}</span></div><code>${report.issues.length}</code></article>
    </div>`;
    $('labPreview').innerHTML=parsed.rows.slice(0,20).map(row=>`<tr><td>${esc(date(row.FECHA))}</td><td>${esc(row['NOMBRE DE LA EMPRESA'])}</td><td>${esc(row['ESCENARIO ASIGNADO'])}</td><td>${esc(row['CANTIDAD DE PERSONAS'])}</td><td>${esc(row.ESTADO)}</td></tr>`).join('');
    show('Prueba completada. El sistema productivo no fue modificado.','success');
  }catch(error){show(error.message||'No fue posible analizar el archivo.','error');}
  finally{event.target.value='';}
});
const session=getSession();$('sessionName').textContent=session?.displayName||session?.username||'Administrador';
$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html')});
