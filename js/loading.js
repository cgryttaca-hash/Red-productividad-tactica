import './technical-log.js';
import {icon,PAGE_ICONS} from './ui-icons.js';
const active=new Map(),failures=new Map(),operations=new Map();let status,preloader;
const page=window.RPTPageLoad?.state?.page||document.documentElement.dataset.page||'index';
const processName=id=>id.startsWith('excel')?['Preparando Archivo Maestro de Eventos','file']:id.startsWith('firebase')?['Estableciendo conexión','cloud']:id==='loginForm'?['Validando acceso','shield']:id==='adminAccessForm'?['Validando acceso administrativo','shield']:['Procesando información','clock'];
function initial(){
 const state=window.RPTPageLoad?.state||{ready:true};
 preloader=document.getElementById('rptPagePreloader');
 if(!preloader){preloader=document.createElement('div');preloader.id='rptPagePreloader';document.documentElement.append(preloader);}
 if(!preloader.dataset.enhanced){
  preloader.dataset.enhanced='true';preloader.setAttribute('role','status');preloader.setAttribute('aria-live','polite');
  const content=document.createElement('div');content.className='rpt-loading-content';
  const mark=document.createElement('span');mark.className='rpt-loading-symbol';mark.append(icon(PAGE_ICONS[page]));
  const brand=document.createElement('small');brand.textContent='GESTIÓN DE EVENTOS';
  const label=document.createElement('strong');label.className='rpt-loading-text';
  const spinner=document.createElement('span');spinner.className='rpt-loading-spinner';spinner.setAttribute('aria-hidden','true');
  const error=document.createElement('p');error.className='rpt-loading-error';
  const retry=document.createElement('button');retry.type='button';retry.id='rptPageRetry';retry.textContent='Reintentar carga';retry.addEventListener('click',()=>location.reload());
  content.append(mark,brand,label,spinner,error,retry);preloader.replaceChildren(content);
 }
 preloader.hidden=state.ready&&!state.error&&!document.documentElement.matches('.auth-pending,.maintenance-pending');
 preloader.querySelector('.rpt-loading-text').textContent=state.text||'Preparando página';
 preloader.querySelector('.rpt-loading-error').textContent=state.error||'';
 preloader.querySelector('.rpt-loading-spinner').hidden=Boolean(state.error);
 preloader.querySelector('#rptPageRetry').hidden=!state.error;
}
function render(){
 if(!status){status=document.createElement('div');status.id='operationStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');document.body.append(status);}
 const pending=[...active.values()].at(-1),failed=[...failures.entries()].at(-1);
 status.hidden=!pending&&!failed;status.replaceChildren();if(status.hidden)return;
 const item=pending||(failed&&failed[1]);status.append(icon(item.icon||'clock'));
 const text=document.createElement('span');text.textContent=item.text;status.append(text);
 status.classList.toggle('has-error',!pending&&Boolean(failed));
 if(pending){const spinner=document.createElement('i');spinner.className='rpt-loading-spinner';spinner.setAttribute('aria-hidden','true');status.append(spinner);}
 else if(failed&&failed[0]==='master-file'&&item.state==='permission'){const button=document.createElement('button');button.type='button';button.textContent='Recuperar permiso';button.addEventListener('click',()=>window.ExcelFileSync?.recoverReadPermission());const close=document.createElement('button');close.type='button';close.textContent='Cerrar aviso';close.addEventListener('click',()=>{failures.delete('master-file');render();});status.append(button,close);}
 else if(failed&&operations.has(failed[0])){const button=document.createElement('button');button.type='button';button.textContent='Reintentar';button.addEventListener('click',()=>{const entry=operations.get(failed[0]);window.RPTLoading.run(failed[0],entry.text,entry.operation).catch(()=>{});});status.append(button);}
 else {const button=document.createElement('button');button.type='button';button.textContent='Cerrar aviso';button.addEventListener('click',()=>{failures.clear();render();});status.append(button);}
}
window.addEventListener('rptPageLoadChanged',initial);
window.addEventListener('rptLoading',event=>{const{id,text,busy,error}=event.detail||{};if(!id)return;const[name,mark]=processName(id);if(busy){failures.delete(id);active.set(id,{text:name==='Procesando información'?(text||name):name,icon:mark});}else active.delete(id);if(error)failures.set(id,{text:String(error),icon:mark});render();});
window.addEventListener('rptTechnicalAccessRequired',event=>{failures.set('technical-access',{text:event.detail?.message||'Esta acción requiere Super Administrador (Ctrl + M).',icon:'shield'});render();});
function masterStatus(detail={}){
 const problem=['permission','missing','error'].includes(detail.state)&&detail.message;
 if(problem)failures.set('master-file',{text:detail.message,icon:'file',state:detail.state});else failures.delete('master-file');render();
}
window.addEventListener('rptMasterStatus',event=>masterStatus(event.detail));
if(window.__RPT_MASTER_STATUS__)masterStatus(window.__RPT_MASTER_STATUS__);
window.RPTLoading=Object.freeze({async run(id,text,operation){operations.set(id,{text,operation});window.dispatchEvent(new CustomEvent('rptLoading',{detail:{id,text,busy:true}}));try{const result=await operation();return result;}catch(error){failures.set(id,{text:'No fue posible completar el proceso. Puedes reintentar.',icon:processName(id)[1]});throw error;}finally{window.dispatchEvent(new CustomEvent('rptLoading',{detail:{id,busy:false}}));}}});
function observe(){observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['aria-busy']});}
function forms(){
 const busy=[...document.querySelectorAll('[aria-busy="true"]')];
 const present=new Set(busy.map(node=>'form:'+node.id));for(const key of active.keys())if(key.startsWith('form:')&&!present.has(key))active.delete(key);
 for(const node of busy){const[name,mark]=processName(node.id);active.set('form:'+node.id,{text:name==='Procesando información'?node.id==='eventObservationForm'?'Guardando observación':name:name,icon:mark});}render();
}
const observer=new MutationObserver(forms);observe();initial();forms();
const guards=new MutationObserver(initial);guards.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
window.addEventListener('pagehide',()=>{observer.disconnect();guards.disconnect();});
window.addEventListener('pageshow',event=>{if(event.persisted){observe();guards.observe(document.documentElement,{attributes:true,attributeFilter:['class']});initial();forms();}});
