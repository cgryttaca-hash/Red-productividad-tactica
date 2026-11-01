(function(){
 function hideLoaders(){document.querySelectorAll('#pageLoader,#agendaPreloader,#loader,.page-loader,.agenda-preloader,body>.loader').forEach(node=>{node.classList.add('is-hidden','hidden','loaded');node.setAttribute('aria-hidden','true');node.style.display='none';});}
 window.EventosHideLoaders=hideLoaders;
 window.addEventListener('rptPageLoadChanged',event=>{if(event.detail?.ready)hideLoaders();});
 window.addEventListener('error',()=>window.RPTPageLoad?.fail(),true);
 window.addEventListener('unhandledrejection',()=>{if(!window.RPTPageLoad?.state.ready)window.RPTPageLoad?.fail();});
 if(window.RPTPageLoad?.state.ready)hideLoaders();
})();
