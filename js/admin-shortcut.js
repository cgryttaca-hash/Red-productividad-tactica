(function(){
 if(window.__RPT_ADMIN_SHORTCUT__||window.RPTNavigation?.mobile())return;
 window.__RPT_ADMIN_SHORTCUT__=true;let loading=false;
 document.addEventListener('keydown',async event=>{
  if(event.defaultPrevented||event.isComposing||!event.ctrlKey||event.altKey||event.shiftKey||event.metaKey||event.key.toLowerCase()!=='m')return;
  if(event.composedPath().some(node=>node instanceof Element&&(node.matches('input,textarea,select,[role="textbox"],[role="combobox"]')||node.isContentEditable)))return;
  event.preventDefault();if(event.repeat||loading)return;loading=true;
  try{const module=await import('./admin-modal.js');module.openAdministrationAccess();}finally{loading=false;}
 });
})();

// Acceso a la pagina existente de consulta y copia; no modifica sus datos.
(function(){
 if(window.__RPT_COPY_AGENDA_SHORTCUT__||window.RPTNavigation?.mobile())return;
 window.__RPT_COPY_AGENDA_SHORTCUT__=true;
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.isComposing||!event.ctrlKey||event.altKey||event.shiftKey||event.metaKey||event.key.toLowerCase()!=='w')return;
  if(!window.RPTNavigation?.session()||window.RPTNavigation.safePage('agendas.html')!=='agendas.html')return;
  event.preventDefault();if(event.repeat)return;
  if(location.pathname.endsWith('/agendas.html')){window.focus();return;}
  const agenda=window.open('agendas.html','rptAgendasProgramadas');
  if(agenda)agenda.focus();
  else window.alert('El navegador bloqueó la ventana de Agendas. Permite las ventanas emergentes de este sitio y vuelve a pulsar Ctrl + W.');
 });
})();
