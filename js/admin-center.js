if(window.RPTAdminAccess?.hasAccess()){
 const labels={checking:'Comprobando',current:'Sin actualizaciones pendientes',available:'Nueva versión verificada',downloading:'Descargando',verifying:'Verificando integridad',ready:'Preparada',preparing:'Preparando aplicación',activating:'Activando páginas',activated:'Activada',completed:'Completada',error:'No se completó la comprobación'};
 function render(){const updates=window.RPTUpdates,state=updates?.state||{};document.getElementById('adminAvailableVersion').textContent=['available','ready','preparing','activating','downloading','verifying'].includes(state.phase)?state.newVersion||'Comprobando…':'—';document.getElementById('adminUpdateState').textContent=labels[state.phase]||'Preparando gestor';}
 window.addEventListener('rptUpdateState',render);render();
}
