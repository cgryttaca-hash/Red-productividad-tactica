(function(){
 if(window.RPTPageLoad)return;
 const page=document.documentElement.dataset.page||location.pathname.split('/').pop().replace('.html','')||'index';
 const labels={login:'Validando acceso',index:'Preparando centro operativo',eventos:'Cargando Agenda de Eventos',minuta:'Cargando Minuta',agenda_movil:'Cargando Agenda Móvil',administracion:'Validando acceso administrativo',recuperacion:'Comprobando versiones',configuracion:'Preparando configuración',usuarios:'Preparando usuarios',agendas:'Preparando agendas',asistente:'Preparando asistente',validacion:'Preparando validación',laboratorio:'Preparando laboratorio',minuta_compartir:'Preparando minuta para compartir',offline:'Consultando disponibilidad',mantenimiento:'Consultando mantenimiento'};
 let value={page,text:labels[page]||'Preparando página',ready:false,error:''};
 const notify=()=>{paint();window.dispatchEvent(new CustomEvent('rptPageLoadChanged',{detail:value}));};
 window.RPTPageLoad=Object.freeze({get state(){return value;},ready(){if(value.error)return;value={...value,ready:true};notify();},fail(text='No fue posible preparar esta página. Comprueba la conexión y vuelve a intentarlo.'){value={...value,ready:false,error:text};notify();}});
 window.addEventListener('error',event=>{
  if(value.ready)return;
  const resource=event.target?.tagName;
  if(resource==='SCRIPT'||resource==='LINK'||event.target===window)window.RPTPageLoad.fail();
 },true);
 window.addEventListener('unhandledrejection',()=>{if(!value.ready)window.RPTPageLoad.fail();});
 const explicit=new Set(['login','index','eventos','minuta','agenda_movil','administracion']);
 const ready=()=>{if(!explicit.has(page))window.RPTPageLoad.ready();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 // La representación se puede iniciar antes que el módulo de la página.
 function paint(){
  if(!document.body)return;let host=document.getElementById('rptPagePreloader');
  if(!host){host=document.createElement('div');host.id='rptPagePreloader';host.setAttribute('role','status');host.setAttribute('aria-live','polite');document.documentElement.append(host);}
  if(host.dataset.enhanced)return;host.hidden=value.ready&&!value.error&&!document.documentElement.matches('.auth-pending,.maintenance-pending');host.replaceChildren();
  const content=document.createElement('div');content.className='rpt-loading-content';const label=document.createElement('strong');label.className='rpt-loading-text';label.textContent=value.text;content.append(label);
  if(value.error){const error=document.createElement('p');error.className='rpt-loading-error';error.textContent=value.error;const button=document.createElement('button');button.id='rptPageRetry';button.type='button';button.textContent='Reintentar carga';button.addEventListener('click',()=>location.reload());content.append(error,button);}
  host.append(content);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
})();
