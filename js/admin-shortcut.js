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
