(function(){
  'use strict';

  const DB_NAME = 'gestion-eventos-archivos';
  const DB_VERSION = 1;
  const STORE_NAME = 'handles';
  const HANDLE_KEY = 'archivo-maestro-eventos';
  const META_KEY = 'excelSync:fileMeta';
  const FILE_NAME_KEY = 'excelSync:fileName';
  const LAST_CHECK_KEY = 'excelSync:lastCheck';
  const AUTO_INTERVAL_MS = 30000;

  let fileHandle = null;
  let syncInProgress = false;
  let autoTimer = null;
  let ui = {};
  let initialized = false;
  let lastState = 'idle';

  const text = value => value === undefined || value === null ? '' : String(value);
  const normalizeText = value => text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

  function openDatabase(){
    return new Promise((resolve, reject) => {
      if(!('indexedDB' in window)){
        reject(new Error('Este navegador no permite guardar la referencia del archivo.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No fue posible abrir el almacenamiento local.'));
    });
  }

  async function readStoredHandle(){
    const db = await openDatabase();
    try{
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(HANDLE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error('No fue posible recuperar el archivo vinculado.'));
      });
    } finally {
      db.close();
    }
  }

  async function storeHandle(handle){
    const db = await openDatabase();
    try{
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('No fue posible guardar la referencia del archivo.'));
      });
    } finally {
      db.close();
    }
  }

  async function removeStoredHandle(){
    const db = await openDatabase();
    try{
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('No fue posible eliminar la vinculación.'));
      });
    } finally {
      db.close();
    }
  }

  function supportsPersistentFileAccess(){
    return window.isSecureContext && typeof window.showOpenFilePicker === 'function' && 'indexedDB' in window;
  }

  function parseExcelDate(value){
    if(value === undefined || value === null || value === '') return null;
    if(typeof value === 'number'){
      const parsed = window.XLSX.SSF.parse_date_code(value);
      if(!parsed) return null;
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    if(value instanceof Date && !Number.isNaN(value.getTime())){
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const source = text(value).trim();
    let match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(match) return new Date(+match[3], +match[2] - 1, +match[1]);
    match = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(match) return new Date(+match[1], +match[2] - 1, +match[3]);

    const parsed = new Date(source);
    if(Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function normalizeEstado(value){
    if(!value) return '';
    const source = text(value).toLowerCase();
    if(source.includes('confirmado')) return 'Confirmado';
    if(source.includes('tentativo') || source.includes('pendiente')) return 'Tentativo o pendiente';
    if(source.includes('program')) return 'Programado';
    if(source.includes('curso')) return 'En curso';
    if(source.includes('ejecut')) return 'Ejecutado';
    if(source.includes('final')) return 'Finalizado';
    if(source.includes('cancel')) return 'Cancelado';
    return source.charAt(0).toUpperCase() + source.slice(1);
  }

  function canonicalHeader(header){
    const normalized = normalizeText(header);
    if(normalized === 'FECHA' || normalized.includes('FECHA DEL EVENTO') || normalized === 'DIA') return 'FECHA';
    if(normalized.includes('ESCENARIO')) return 'ESCENARIO ASIGNADO';
    if(normalized.includes('HORARIO') && normalized.includes('EVENTO')) return 'HORARIO DEL EVENTO';
    if(normalized.includes('NOMBRE') && normalized.includes('EMPRESA')) return 'NOMBRE DE LA EMPRESA';
    if(normalized === 'EMPRESA') return 'NOMBRE DE LA EMPRESA';
    if(normalized.includes('CANTIDAD') && normalized.includes('PERSONAS')) return 'CANTIDAD DE PERSONAS';
    if(normalized.includes('PAX')) return 'CANTIDAD DE PERSONAS';
    if(normalized.includes('HORARIO') && (normalized.includes('AYB') || normalized.includes('A&B') || normalized.includes('A Y B'))) return 'HORARIO AYB';
    if(normalized.includes('DESCRIPCION') && normalized.includes('ALIMENTACION')) return 'DESCRIPCION ALIMENTACION';
    if(normalized.includes('ALIMENTACION')) return 'DESCRIPCION ALIMENTACION';
    if(normalized.includes('ACOMODACION')) return 'ACOMODACION';
    if(normalized.includes('MODALIDAD') && normalized.includes('SERVICIO')) return 'MODALIDAD DE SERVICIO';
    if(normalized.includes('MODALIDAD')) return 'MODALIDAD DE SERVICIO';
    if(normalized.includes('MEDIO') && normalized.includes('PAGO')) return 'MEDIO DE PAGO';
    if(normalized.includes('OBSERVACION')) return 'OBSERVACION';
    if(normalized.includes('ESTADO') || normalized.includes('STATUS')) return 'ESTADO';
    return normalized;
  }

  function isKnownMonthSheet(sheetName){
    const normalized = normalizeText(sheetName);
    return [
      'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
      'JULIO','AGOSTO','SEPTIEMBRE','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
    ].some(month => normalized.includes(month));
  }

  function findHeaderRowIndex(rows){
    return rows.findIndex(row => {
      const headers = row.map(canonicalHeader);
      return headers.includes('FECHA') &&
        headers.includes('ESCENARIO ASIGNADO') &&
        headers.includes('NOMBRE DE LA EMPRESA');
    });
  }

  function normalizeWorkbookRow(row, headers, sheetName){
    const result = {};
    headers.forEach((header, index) => {
      if(!header) return;
      result[header] = row[index] ?? '';
    });

    return {
      ...result,
      HOJA_ORIGEN: sheetName,
      FECHA: parseExcelDate(result.FECHA),
      ESTADO: normalizeEstado(result.ESTADO)
    };
  }

  function rowHasUsefulData(row){
    return Boolean(
      row.FECHA ||
      text(row['NOMBRE DE LA EMPRESA']).trim() ||
      text(row['ESCENARIO ASIGNADO']).trim()
    );
  }

  function parseWorkbookBuffer(buffer){
    if(!window.XLSX) throw new Error('No fue posible cargar el lector de Excel. Revisa tu conexión a internet.');

    const workbook = window.XLSX.read(new Uint8Array(buffer), {
      type: 'array',
      cellDates: false,
      cellText: false
    });

    const rows = [];
    const loadedSheets = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const matrix = window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: true,
        blankrows: false
      });

      if(!matrix.length) return;
      const headerIndex = findHeaderRowIndex(matrix);
      if(headerIndex === -1) return;

      const headers = matrix[headerIndex].map(canonicalHeader);
      const sheetRows = matrix
        .slice(headerIndex + 1)
        .filter(row => row.some(cell => text(cell).trim() !== ''))
        .map(row => normalizeWorkbookRow(row, headers, sheetName))
        .filter(rowHasUsefulData);

      if(sheetRows.length){
        rows.push(...sheetRows);
        loadedSheets.push(sheetName);
      }else if(isKnownMonthSheet(sheetName)){
        loadedSheets.push(sheetName);
      }
    });

    if(!rows.length){
      throw new Error('No se encontraron eventos válidos. El Excel debe contener FECHA, ESCENARIO ASIGNADO y NOMBRE DE LA EMPRESA.');
    }

    rows.sort((a, b) => {
      const timeA = a.FECHA instanceof Date ? a.FECHA.getTime() : 0;
      const timeB = b.FECHA instanceof Date ? b.FECHA.getTime() : 0;
      if(timeA !== timeB) return timeA - timeB;
      return text(a['HORARIO DEL EVENTO']).localeCompare(text(b['HORARIO DEL EVENTO']), 'es', {numeric:true});
    });

    return {
      rows,
      sheets:[...new Set(loadedSheets)]
    };
  }

  function saveParsedData(parsed, file){
    const updatedAt = new Date().toISOString();
    const metadata = {
      name:file.name,
      size:file.size,
      lastModified:file.lastModified,
      checkedAt:updatedAt
    };

    localStorage.setItem('eventData', JSON.stringify(parsed.rows));
    localStorage.setItem('eventDataSheets', JSON.stringify(parsed.sheets));
    localStorage.setItem('eventDataUpdatedAt', updatedAt);
    localStorage.setItem(META_KEY, JSON.stringify(metadata));
    localStorage.setItem(FILE_NAME_KEY, file.name);
    localStorage.setItem(LAST_CHECK_KEY, updatedAt);

    window.dispatchEvent(new CustomEvent('eventDataUpdated', {
      detail:{
        rows:parsed.rows.length,
        sheets:parsed.sheets,
        fileName:file.name,
        updatedAt
      }
    }));

    if('BroadcastChannel' in window){
      const channel = new BroadcastChannel('gestion-eventos-sync');
      channel.postMessage({type:'eventDataUpdated', updatedAt, fileName:file.name});
      channel.close();
    }

    return metadata;
  }

  function getStoredMeta(){
    try{
      return JSON.parse(localStorage.getItem(META_KEY) || 'null');
    }catch(_){
      return null;
    }
  }

  function sameFileVersion(file, storedMeta){
    return Boolean(
      storedMeta &&
      storedMeta.name === file.name &&
      storedMeta.size === file.size &&
      storedMeta.lastModified === file.lastModified
    );
  }

  function ensureUi(){
    if(document.getElementById('excelSyncModal')) return;

    const control = document.createElement('button');
    control.id = 'excelSyncControl';
    control.className = 'excel-sync-control is-unlinked';
    control.type = 'button';
    control.innerHTML = `
      <span class="excel-sync-control-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6"/></svg>
      </span>
      <span class="excel-sync-control-copy">
        <small>Archivo maestro</small>
        <strong id="excelSyncControlText">Sin vincular</strong>
      </span>
      <span class="excel-sync-control-dot" aria-hidden="true"></span>
    `;

    const target = document.querySelector('.header-tools') ||
      document.querySelector('.command-left') ||
      document.querySelector('.minute-actions');

    if(target){
      target.insertBefore(control, target.firstChild);
      control.classList.add('is-inline');
    }else{
      document.body.appendChild(control);
      control.classList.add('is-floating');
    }

    const modal = document.createElement('div');
    modal.id = 'excelSyncModal';
    modal.className = 'excel-sync-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="excel-sync-dialog" role="dialog" aria-modal="true" aria-labelledby="excelSyncTitle">
        <button id="excelSyncClose" class="excel-sync-close" type="button" aria-label="Cerrar">×</button>
        <div class="excel-sync-heading">
          <span class="excel-sync-heading-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6"/></svg>
          </span>
          <div>
            <span>Sincronización local</span>
            <h2 id="excelSyncTitle">Archivo maestro de eventos</h2>
            <p id="excelSyncDescription">Selecciona una vez el Excel que alimentará Inicio, Eventos y Minuta.</p>
          </div>
        </div>

        <div id="excelSyncStatusCard" class="excel-sync-status-card is-unlinked">
          <span class="excel-sync-status-dot" aria-hidden="true"></span>
          <div>
            <small id="excelSyncStatusLabel">Estado</small>
            <strong id="excelSyncStatusText">Sin archivo vinculado</strong>
            <span id="excelSyncFileName">Ningún archivo seleccionado</span>
          </div>
        </div>

        <dl class="excel-sync-details">
          <div><dt>Última actualización</dt><dd id="excelSyncUpdatedAt">—</dd></div>
          <div><dt>Comprobación automática</dt><dd>Cada 30 segundos</dd></div>
          <div><dt>Ámbito</dt><dd>Solo este navegador y este equipo</dd></div>
        </dl>

        <div id="excelSyncMessage" class="excel-sync-message" hidden></div>

        <div class="excel-sync-actions">
          <button id="excelSyncPick" class="excel-sync-btn primary" type="button">Seleccionar Excel</button>
          <button id="excelSyncAuthorize" class="excel-sync-btn primary" type="button" hidden>Autorizar acceso</button>
          <button id="excelSyncRefresh" class="excel-sync-btn secondary" type="button" hidden>Actualizar ahora</button>
          <button id="excelSyncChange" class="excel-sync-btn secondary" type="button" hidden>Cambiar archivo</button>
          <button id="excelSyncUnlink" class="excel-sync-btn danger" type="button" hidden>Desvincular</button>
        </div>

        <p class="excel-sync-footnote">No se sube el Excel a GitHub ni a internet. El navegador solo guarda la autorización local para leer el archivo seleccionado.</p>
        <input id="excelSyncFallbackInput" type="file" accept=".xlsx,.xls,.csv" hidden>
      </div>
    `;
    document.body.appendChild(modal);

    ui = {
      control,
      controlText:document.getElementById('excelSyncControlText'),
      modal,
      close:document.getElementById('excelSyncClose'),
      statusCard:document.getElementById('excelSyncStatusCard'),
      statusLabel:document.getElementById('excelSyncStatusLabel'),
      statusText:document.getElementById('excelSyncStatusText'),
      fileName:document.getElementById('excelSyncFileName'),
      updatedAt:document.getElementById('excelSyncUpdatedAt'),
      message:document.getElementById('excelSyncMessage'),
      pick:document.getElementById('excelSyncPick'),
      authorize:document.getElementById('excelSyncAuthorize'),
      refresh:document.getElementById('excelSyncRefresh'),
      change:document.getElementById('excelSyncChange'),
      unlink:document.getElementById('excelSyncUnlink'),
      fallbackInput:document.getElementById('excelSyncFallbackInput')
    };

    control.addEventListener('click', openPanel);
    ui.close.addEventListener('click', closePanel);
    modal.addEventListener('click', event => {
      if(event.target === modal) closePanel();
    });
    document.addEventListener('keydown', event => {
      if(event.key === 'Escape' && modal.classList.contains('is-open')) closePanel();
    });

    ui.pick.addEventListener('click', chooseFile);
    ui.change.addEventListener('click', chooseFile);
    ui.authorize.addEventListener('click', authorizeAccess);
    ui.refresh.addEventListener('click', () => synchronize({force:true, requestPermission:true, showSuccess:true}));
    ui.unlink.addEventListener('click', unlinkFile);
    ui.fallbackInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if(!file) return;
      try{
        setState('syncing', {fileName:file.name, message:'Leyendo el archivo seleccionado…'});
        const parsed = parseWorkbookBuffer(await file.arrayBuffer());
        saveParsedData(parsed, file);
        setState('fallback', {
          fileName:file.name,
          message:`${parsed.rows.length} eventos cargados. Este navegador no puede recordar el archivo automáticamente.`
        });
      }catch(error){
        setState('error', {message:error.message || 'No fue posible leer el archivo.'});
      }finally{
        event.target.value = '';
      }
    });
  }

  function showMessage(message, type='info'){
    if(!ui.message) return;
    ui.message.hidden = !message;
    ui.message.className = `excel-sync-message is-${type}`;
    ui.message.textContent = message || '';
  }

  function formatDateTime(value){
    if(!value) return '—';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-CO', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
  }

  function setState(state, options={}){
    lastState = state;
    const storedName = options.fileName || localStorage.getItem(FILE_NAME_KEY) || fileHandle?.name || '';
    const updatedAt = localStorage.getItem('eventDataUpdatedAt');

    const states = {
      unlinked:{label:'Sin conexión', text:'Sin archivo vinculado', control:'Sin vincular', className:'is-unlinked'},
      ready:{label:'Conectado', text:'Archivo listo', control:'Conectado', className:'is-ready'},
      syncing:{label:'Actualizando', text:'Leyendo cambios del Excel', control:'Actualizando…', className:'is-syncing'},
      permission:{label:'Permiso requerido', text:'Autoriza nuevamente el acceso', control:'Requiere permiso', className:'is-permission'},
      error:{label:'No disponible', text:'No fue posible leer el archivo', control:'Revisar archivo', className:'is-error'},
      unsupported:{label:'Navegador no compatible', text:'La actualización automática no está disponible', control:'Carga manual', className:'is-error'},
      fallback:{label:'Carga manual', text:'Datos cargados solo para esta sesión', control:'Carga manual', className:'is-permission'}
    };

    const config = states[state] || states.unlinked;
    [ui.control, ui.statusCard].forEach(element => {
      if(!element) return;
      element.classList.remove('is-unlinked','is-ready','is-syncing','is-permission','is-error');
      element.classList.add(config.className);
    });

    if(ui.statusLabel) ui.statusLabel.textContent = config.label;
    if(ui.statusText) ui.statusText.textContent = options.statusText || config.text;
    if(ui.controlText) ui.controlText.textContent = options.controlText || config.control;
    if(ui.fileName) ui.fileName.textContent = storedName || 'Ningún archivo seleccionado';
    if(ui.updatedAt) ui.updatedAt.textContent = formatDateTime(updatedAt);

    const hasHandle = Boolean(fileHandle);
    ui.pick.hidden = hasHandle && state !== 'unsupported';
    ui.authorize.hidden = state !== 'permission';
    ui.refresh.hidden = !hasHandle || state === 'permission' || state === 'syncing';
    ui.change.hidden = !hasHandle;
    ui.unlink.hidden = !hasHandle;

    if(options.message) showMessage(options.message, state === 'error' || state === 'unsupported' ? 'error' : state === 'ready' ? 'success' : 'info');
    else showMessage('', 'info');
  }

  function openPanel(){
    ensureUi();
    ui.modal.classList.add('is-open');
    ui.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('excel-sync-modal-open');
    setTimeout(() => {
      const focusTarget = !ui.authorize.hidden ? ui.authorize : !ui.pick.hidden ? ui.pick : ui.refresh;
      focusTarget?.focus();
    }, 30);
  }

  function closePanel(){
    if(!ui.modal) return;
    ui.modal.classList.remove('is-open');
    ui.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('excel-sync-modal-open');
  }

  async function chooseFile(){
    if(!supportsPersistentFileAccess()){
      ui.fallbackInput.click();
      return;
    }

    try{
      const handles = await window.showOpenFilePicker({
        multiple:false,
        excludeAcceptAllOption:false,
        types:[{
          description:'Archivo Excel de eventos',
          accept:{
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
            'application/vnd.ms-excel':['.xls'],
            'text/csv':['.csv']
          }
        }]
      });

      if(!handles?.[0]) return;
      fileHandle = handles[0];
      await storeHandle(fileHandle);
      localStorage.setItem(FILE_NAME_KEY, fileHandle.name || 'Archivo maestro');
      const synchronized = await synchronize({force:true, requestPermission:true, showSuccess:true});
      if(synchronized) setTimeout(closePanel, 1100);
    }catch(error){
      if(error?.name === 'AbortError') return;
      console.error(error);
      setState('error', {message:error.message || 'No fue posible seleccionar el archivo.'});
      openPanel();
    }
  }

  async function authorizeAccess(){
    if(!fileHandle){
      await chooseFile();
      return;
    }
    const synchronized = await synchronize({force:true, requestPermission:true, showSuccess:true});
    if(synchronized) setTimeout(closePanel, 1100);
  }

  async function getPermission(requestPermission){
    if(!fileHandle) return 'denied';
    let permission = await fileHandle.queryPermission({mode:'read'});
    if(permission === 'prompt' && requestPermission){
      permission = await fileHandle.requestPermission({mode:'read'});
    }
    return permission;
  }

  async function synchronize({force=false, requestPermission=false, showSuccess=false}={}){
    if(syncInProgress || !fileHandle) return false;
    syncInProgress = true;

    try{
      const permission = await getPermission(requestPermission);
      if(permission !== 'granted'){
        setState('permission', {
          fileName:fileHandle.name,
          message:'El archivo sigue vinculado, pero el navegador necesita que autorices su lectura.'
        });
        if(requestPermission) openPanel();
        return false;
      }

      setState('syncing', {fileName:fileHandle.name});
      const file = await fileHandle.getFile();
      const storedMeta = getStoredMeta();
      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

      if(!force && sameFileVersion(file, storedMeta)){
        setState('ready', {
          fileName:file.name,
          message:showSuccess ? 'El archivo ya está actualizado. No se encontraron cambios.' : ''
        });
        return true;
      }

      const parsed = parseWorkbookBuffer(await file.arrayBuffer());
      saveParsedData(parsed, file);
      setState('ready', {
        fileName:file.name,
        statusText:`${parsed.rows.length} eventos sincronizados`,
        message:showSuccess
          ? `Actualización completada: ${parsed.rows.length} eventos en ${parsed.sheets.length} hojas.`
          : ''
      });
      return true;
    }catch(error){
      console.error('Error de sincronización:', error);
      const missingFile = error?.name === 'NotFoundError';
      setState('error', {
        fileName:fileHandle?.name,
        message:missingFile
          ? 'El archivo fue movido, renombrado o eliminado. Usa “Cambiar archivo” para volver a vincularlo.'
          : (error.message || 'No fue posible actualizar los datos del Excel.')
      });
      openPanel();
      return false;
    }finally{
      syncInProgress = false;
    }
  }

  async function unlinkFile(){
    try{
      await removeStoredHandle();
    }catch(error){
      console.warn(error);
    }
    fileHandle = null;
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(FILE_NAME_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    setState('unlinked', {message:'La vinculación fue eliminada. Los eventos ya cargados permanecen disponibles hasta que conectes otro archivo.'});
  }

  function bindAutomaticChecks(){
    if(autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if(!document.hidden && fileHandle) synchronize({force:false, requestPermission:false});
    }, AUTO_INTERVAL_MS);

    window.addEventListener('focus', () => {
      if(fileHandle) synchronize({force:false, requestPermission:false});
    });

    document.addEventListener('visibilitychange', () => {
      if(!document.hidden && fileHandle) synchronize({force:false, requestPermission:false});
    });

    if('BroadcastChannel' in window){
      const channel = new BroadcastChannel('gestion-eventos-sync');
      channel.addEventListener('message', event => {
        if(event.data?.type === 'eventDataUpdated'){
          window.dispatchEvent(new CustomEvent('eventDataUpdated', {detail:event.data}));
          if(lastState !== 'syncing') setState('ready', {fileName:event.data.fileName});
        }
      });
    }
  }

  async function initialize(){
    if(initialized) return;
    initialized = true;
    ensureUi();
    bindAutomaticChecks();

    if(!supportsPersistentFileAccess()){
      setState('unsupported', {
        message:window.isSecureContext
          ? 'Usa Google Chrome o Microsoft Edge para vincular el Excel y actualizarlo automáticamente. En este navegador puedes cargarlo manualmente.'
          : 'La página debe abrirse mediante HTTPS. Activa GitHub Pages con HTTPS para usar la actualización automática.'
      });
      if(!localStorage.getItem('eventData')) setTimeout(openPanel, 650);
      return;
    }

    try{
      fileHandle = await readStoredHandle();
      if(!fileHandle){
        setState('unlinked');
        setTimeout(openPanel, 650);
        return;
      }

      setState('ready', {fileName:fileHandle.name, statusText:'Comprobando archivo…'});
      await synchronize({force:false, requestPermission:false});
    }catch(error){
      console.error(error);
      setState('error', {message:error.message || 'No fue posible recuperar la vinculación guardada.'});
      setTimeout(openPanel, 650);
    }
  }

  window.ExcelFileSync = {
    init:initialize,
    openPanel,
    chooseFile,
    refresh:() => synchronize({force:true, requestPermission:true, showSuccess:true}),
    unlink:unlinkFile,
    parseWorkbookBuffer,
    importFile:async file => {
      const parsed = parseWorkbookBuffer(await file.arrayBuffer());
      saveParsedData(parsed, file);
      return parsed;
    },
    getHandle:() => fileHandle
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
})();
