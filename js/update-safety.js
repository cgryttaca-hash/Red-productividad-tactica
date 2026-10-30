const baselines=new WeakMap(),pending=new Set(),busy=new Map(),fields=new Map();let locked=false,overlay,unlockTimer;
const transient=form=>form?.matches('[data-update-transient]');
function fingerprint(form){return JSON.stringify([...form.querySelectorAll('input,textarea,select')].filter(input=>!input.disabled&&!['submit','button','file'].includes(input.type)).map(input=>[input.id,input.type==='checkbox'||input.type==='radio'?input.checked:input.value]));}
function remember(form){if(!form||transient(form))return;baselines.set(form,fingerprint(form));pending.delete(form);}
function initialize(){document.querySelectorAll('form').forEach(remember);document.querySelectorAll('textarea:not([readonly]),#notifyExcel,#notifyMobile,#notifyMaintenance').forEach(field=>{if(!field.closest('form'))fields.set(field,field.type==='checkbox'?field.checked:field.value);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
document.addEventListener('input',event=>{const form=event.target.closest('form');if(form&&!transient(form)){if(!baselines.has(form))baselines.set(form,'');pending.add(form);}});
document.addEventListener('change',event=>{const form=event.target.closest('form');if(form&&!transient(form))pending.add(form);});
document.addEventListener('reset',event=>setTimeout(()=>remember(event.target),0));
window.addEventListener('rpt:work-saved',event=>{if(event.detail?.formId)remember(document.getElementById(event.detail.formId));for(const id of event.detail?.fields||[]){const field=document.getElementById(id);if(field)fields.set(field,field.type==='checkbox'?field.checked:field.value);}});
function reasons(){
  const result=[];for(const form of [...pending]){if(!form.isConnected||fingerprint(form)===baselines.get(form))pending.delete(form);else result.push('Hay un formulario con cambios pendientes. Guarda o descarta sus cambios.');}
  for(const[field,value]of fields)if(field.isConnected&&(field.type==='checkbox'?field.checked:field.value)!==value)result.push('Hay texto o preferencias con cambios pendientes. Guarda o descarta sus cambios.');
  const focused=document.activeElement;if(focused?.matches('input,textarea,select,[contenteditable="true"]')&&!focused.readOnly)result.push('Termina de editar el campo activo.');
  const tbody=document.getElementById('tbodyCoworking');if(tbody){try{const live=[...tbody.rows].map(row=>[...row.querySelectorAll('td[contenteditable]')].map(cell=>cell.innerText.trim()));const saved=JSON.parse(localStorage.getItem('minutaCoworkingRows')||'null');const significant=live.some(row=>row.slice(1).some(Boolean));if(significant&&JSON.stringify(live)!==JSON.stringify(saved))result.push('Hay cambios de Coworking que aún no están guardados.');}catch(_){result.push('No se pudo comprobar el guardado de Coworking.');}}
  if(busy.size||window.__RPT_FIREBASE_PUBLISHING__||window.__RPT_EXCEL_BUSY__||document.querySelector('[aria-busy="true"],#nativeShare:disabled')||[...document.querySelectorAll('input[type="file"]')].some(input=>input.files?.length))result.push('Hay una lectura, generación o guardado en curso.');
  return[...new Set(result)];
}
function unlock(){clearTimeout(unlockTimer);if(locked){document.body.inert=false;overlay?.remove();overlay=null;locked=false;}}
function lock(){if(reasons().length)return false;locked=true;document.body.inert=true;overlay=document.createElement('div');overlay.id='rptUpdateLock';overlay.setAttribute('role','status');overlay.textContent='Preparando la actualización. Tus datos permanecen guardados…';document.documentElement.append(overlay);unlockTimer=setTimeout(unlock,12000);return true;}
window.RPTUpdateGuard=Object.freeze({reasons,lock,unlock,get locked(){return locked;},setBusy(name,value){const count=(busy.get(name)||0)+(value?1:-1);if(count>0)busy.set(name,count);else busy.delete(name);},saved:formId=>remember(document.getElementById(formId))});
export{reasons,lock,unlock};
