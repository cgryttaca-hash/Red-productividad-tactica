/*
  Puente móvil para Eventos.
  Uso: incluir este archivo DESPUÉS de js/eventos.js en eventos.html:
  <script src="js/puente_movil_eventos.js"></script>

  No cambia la lógica de Eventos. Solo lee la tabla #dataTable y guarda/exporta una copia
  para agenda_movil.html.
*/
(() => {
  'use strict';

  const KEY = 'agendaMovilEventos';
  const UPDATED_KEY = 'agendaMovilLastUpdate';

  function text(el){ return (el?.textContent || '').trim().replace(/\s+/g, ' '); }

  function readEventosTable(){
    const table = document.getElementById('dataTable');
    if(!table) return [];
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => text(th));
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    return rows.map((tr, index) => {
      const cells = Array.from(tr.children);
      const obj = { id: tr.dataset.id || '' };
      headers.forEach((h, i) => obj[h || `col_${i+1}`] = text(cells[i]));
      if(!obj.id){
        obj.id = [obj.FECHA || obj.Fecha || obj.fecha, obj['NOMBRE DE LA EMPRESA'] || obj.empresa, obj['ESCENARIO ASIGNADO'] || obj.salon, index].join('|');
      }
      return obj;
    }).filter(row => Object.values(row).some(Boolean));
  }

  function saveMobileData(showMessage = false){
    const eventos = readEventosTable();
    const payload = {
      actualizado: new Date().toISOString(),
      fuente: 'eventos.html',
      eventos
    };
    try{
      localStorage.setItem(KEY, JSON.stringify(payload));
      localStorage.setItem(UPDATED_KEY, payload.actualizado);
      if(showMessage) toast(`Agenda móvil actualizada: ${eventos.length} eventos`);
    }catch(err){
      if(showMessage) toast('No se pudo guardar la agenda móvil');
    }
    return payload;
  }

  function downloadJson(){
    const payload = saveMobileData(false);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eventos_publicos.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`JSON generado: ${payload.eventos.length} eventos`);
  }

  function toast(message){
    let box = document.getElementById('mobileBridgeToast');
    if(!box){
      box = document.createElement('div');
      box.id = 'mobileBridgeToast';
      box.style.cssText = 'position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;padding:12px 16px;border-radius:999px;font:800 13px system-ui;box-shadow:0 14px 34px rgba(15,23,42,.25);max-width:calc(100% - 28px);text-align:center;';
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.opacity = '1';
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.style.opacity = '0', 2500);
  }

  function addPanel(){
    if(document.getElementById('mobileBridgePanel')) return;
    const panel = document.createElement('div');
    panel.id = 'mobileBridgePanel';
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99998;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:calc(100% - 32px);';
    panel.innerHTML = `
      <button type="button" id="btnSyncMobile" style="border:0;border-radius:999px;background:#0f172a;color:white;padding:11px 14px;font:900 12px system-ui;box-shadow:0 12px 28px rgba(15,23,42,.22);cursor:pointer">Actualizar móvil</button>
      <button type="button" id="btnExportMobileJson" style="border:0;border-radius:999px;background:#1d4ed8;color:white;padding:11px 14px;font:900 12px system-ui;box-shadow:0 12px 28px rgba(15,23,42,.22);cursor:pointer">Exportar JSON móvil</button>
    `;
    document.body.appendChild(panel);
    document.getElementById('btnSyncMobile').addEventListener('click', () => saveMobileData(true));
    document.getElementById('btnExportMobileJson').addEventListener('click', downloadJson);
  }

  function observeTable(){
    const tbody = document.getElementById('tbody') || document.querySelector('#dataTable tbody');
    if(!tbody) return;
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => saveMobileData(false), 500);
    });
    observer.observe(tbody, { childList:true, subtree:true, characterData:true });
  }

  window.EventosMobileBridge = { saveMobileData, downloadJson, readEventosTable };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { addPanel(); observeTable(); setTimeout(saveMobileData, 1000); });
  }else{
    addPanel(); observeTable(); setTimeout(saveMobileData, 1000);
  }
})();
