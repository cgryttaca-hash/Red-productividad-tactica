import './agenda-page.js';

// Reutiliza las fuentes existentes para que la consulta no dependa de otra ventana.
document.documentElement.dataset.syncUi='background';
let sourcesTask,checkAgain=false;
function resumeSources(){
 if(sourcesTask){checkAgain=true;return sourcesTask;}
 if(window.RPTNavigation?.mobile()||!window.RPTNavigation?.session())return;
 sourcesTask=(async()=>{
  const linked=localStorage.getItem('excelSync:fileName')&&window.isSecureContext&&typeof window.showOpenFilePicker==='function';
  if(linked&&!window.ExcelFileSync)await import('./excel-sync.js');
  const connected=localStorage.getItem('firebase:ownerEmail')||localStorage.getItem('firebase:lastPublishedAt');
  if(connected&&!window.FirebaseEventPublisher)await import('./firebase-sync.js');
 })().catch(error=>console.warn('Agenda: no se pudo recuperar una fuente ya configurada.',error)).finally(()=>{sourcesTask=null;if(checkAgain){checkAgain=false;queueMicrotask(resumeSources);}});
 return sourcesTask;
}
resumeSources();
window.addEventListener('storage',event=>{if(['excelSync:fileName','firebase:ownerEmail','firebase:lastPublishedAt'].includes(event.key))resumeSources();});
