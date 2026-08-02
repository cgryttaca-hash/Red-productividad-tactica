(function(){
  'use strict';

  const DB_NAME = 'gestion-eventos-archivos';
  const DB_VERSION = 2;
  const HANDLE_STORE = 'handles';
  const HANDLE_KEY = 'archivo-maestro-eventos';
  const META_KEY = 'excelSync:fileMeta';
  const FILE_NAME_KEY = 'excelSync:fileName';
  const LAST_CHECK_KEY = 'excelSync:lastCheck';
  const DATA_HASH_KEY = 'excelSync:dataHash';
  const DIFF_KEY = 'eventDataLastDiff';
  const AUTO_INTERVAL_MS = 15000;
  const EXPECTED_NAME = /MIN[_\s-]*PRODUCTIVIDAD[_\s-]*TACTICA/i;

  let fileHandle = null;
  let syncInProgress = false;
  let autoTimer = null;
  let focusTimer = null;
  let ui = {};
  let initialized = false;
  let lastState = 'idle';

  const text = value => value === undefined || value === null ? '' : String(value);
  const normalizeText = value => text(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toUpperCase().replace(/\s+/g, ' ');

  function hashString(value){
    let hash = 2166136261;
    const source = String(value);
    for(let i=0;i<source.length;i++){ hash ^= source.charCodeAt(i); hash = Math.imul(hash,16777619); }
    return (hash >>> 0).toString(36);
  }

  let auditModulePromise = null;

  function loadAuditStore(){
    if(!auditModulePromise) auditModulePromise = import('./audit-store.js');
    return auditModulePromise;
  }

  async function systemLog(entry){
    try{
      const module=await import('./system-log.js');
      module.addSystemLog(entry);
    }catch(_){}
  }

  function excelColumn(index){
    let value = Number(index) + 1;
    let result = '';
    while(value > 0){
      const remainder = (value - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      value = Math.floor((value - 1) / 26);
    }
    return result;
  }

  function auditContext(){
    let session=null;
    try{session=JSON.parse(localStorage.getItem('rptAuthSessionV1')||'null');}catch(_){}
    return {
      host: localStorage.getItem('rpt:deviceName') || navigator.userAgentData?.platform || navigator.platform || 'Equipo',
      user: session?.displayName || session?.username || localStorage.getItem('firebase:ownerEmail') || 'Usuario local'
    };
  }

  function cleanupLegacyStorage(){
    [
      'firebase:publishedSnapshot',
      'firebase:publishedIds',
      'eventDataAudit',
      'eventDataHistory'
    ].forEach(key=>localStorage.removeItem(key));
  }

  function openDatabase(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)) return reject(new Error('Este navegador no permite conservar la referencia del archivo.'));
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('No fue posible abrir el almacenamiento local.'));
    });
  }

  async function readStoredHandle(){
    const db=await openDatabase();
    try{
      return await new Promise((resolve,reject)=>{
        const request=db.transaction(HANDLE_STORE,'readonly').objectStore(HANDLE_STORE).get(HANDLE_KEY);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=()=>reject(request.error);
      });
    } finally { db.close(); }
  }

  async function storeHandle(handle){
    const db=await openDatabase();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(HANDLE_STORE,'readwrite');
        tx.objectStore(HANDLE_STORE).put(handle,HANDLE_KEY);
        tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
      });
    } finally { db.close(); }
  }

  async function removeStoredHandle(){
    const db=await openDatabase();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(HANDLE_STORE,'readwrite');
        tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY);
        tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
      });
    } finally { db.close(); }
  }

  function supportsPersistentFileAccess(){
    return window.isSecureContext && typeof window.showOpenFilePicker==='function' && 'indexedDB' in window;
  }

  function parseExcelDate(value){
    if(value===undefined||value===null||value==='') return null;
    if(typeof value==='number'){
      const parsed=window.XLSX?.SSF?.parse_date_code(value);
      if(!parsed) return null;
      return new Date(parsed.y,parsed.m-1,parsed.d);
    }
    if(value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(),value.getMonth(),value.getDate());
    const source=text(value).trim();
    let match=source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(match) return new Date(+match[3],+match[2]-1,+match[1]);
    match=source.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if(match) return new Date(+match[1],+match[2]-1,+match[3]);
    const parsed=new Date(source);
    return Number.isNaN(parsed.getTime())?null:new Date(parsed.getFullYear(),parsed.getMonth(),parsed.getDate());
  }

  function normalizeEstado(value){
    if(!value) return '';
    const source=text(value).toLowerCase();
    if(source.includes('confirmado')) return 'Confirmado';
    if(source.includes('tentativo')||source.includes('pendiente')) return 'Tentativo o pendiente';
    if(source.includes('program')) return 'Programado';
    if(source.includes('curso')) return 'En curso';
    if(source.includes('ejecut')) return 'Ejecutado';
    if(source.includes('final')) return 'Finalizado';
    if(source.includes('cancel')) return 'Cancelado';
    return source.charAt(0).toUpperCase()+source.slice(1);
  }

  function canonicalHeader(header){
    const normalized=normalizeText(header);
    if(normalized==='FECHA'||normalized.includes('FECHA DEL EVENTO')||normalized==='DIA') return 'FECHA';
    if(normalized.includes('ESCENARIO')) return 'ESCENARIO ASIGNADO';
    if(normalized.includes('HORARIO')&&normalized.includes('EVENTO')) return 'HORARIO DEL EVENTO';
    if((normalized.includes('NOMBRE')&&normalized.includes('EMPRESA'))||normalized==='EMPRESA') return 'NOMBRE DE LA EMPRESA';
    if((normalized.includes('CANTIDAD')&&normalized.includes('PERSONAS'))||normalized.includes('PAX')) return 'CANTIDAD DE PERSONAS';
    if(normalized.includes('HORARIO')&&(normalized.includes('AYB')||normalized.includes('A&B')||normalized.includes('A Y B'))) return 'HORARIO AYB';
    if(normalized.includes('DESCRIPCION')&&normalized.includes('ALIMENTACION')) return 'DESCRIPCION ALIMENTACION';
    if(normalized==='ALIMENTACION') return 'DESCRIPCION ALIMENTACION';
    if(normalized.includes('ACOMODACION')) return 'ACOMODACION';
    if(normalized.includes('MODALIDAD')) return 'MODALIDAD DE SERVICIO';
    if(normalized.includes('MEDIO')&&normalized.includes('PAGO')) return 'MEDIO DE PAGO';
    if(normalized.includes('OBSERVACION')) return 'OBSERVACION';
    if(normalized.includes('ESTADO')||normalized.includes('STATUS')) return 'ESTADO';
    if(normalized.includes('DESARROLLO')&&normalized.includes('ACTIVIDAD')) return 'DESARROLLO ACTIVIDAD';
    return normalized;
  }

  function isKnownMonthSheet(sheetName){
    const normalized=normalizeText(sheetName);
    return ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
      .some(month=>normalized.includes(month));
  }

  function findHeaderRowIndex(rows){
    return rows.findIndex(row=>{
      const headers=row.map(canonicalHeader);
      return headers.includes('FECHA')&&headers.includes('ESCENARIO ASIGNADO')&&headers.includes('NOMBRE DE LA EMPRESA');
    });
  }

  function compactRow(row){
    const result={};
    Object.entries(row).forEach(([key,value])=>{
      if(value===undefined||value===null||value==='') return;
      result[key]=value;
    });
    return result;
  }

  function normalizeWorkbookRow(row,headers,sheetName,sourceRow){
    const result={};
    headers.forEach((header,index)=>{ if(header) result[header]=row[index]??''; });
    return compactRow({
      ...result,
      HOJA_ORIGEN:sheetName,
      __FILA_ORIGEN:sourceRow,
      FECHA:parseExcelDate(result.FECHA),
      ESTADO:normalizeEstado(result.ESTADO)
    });
  }

  function rowHasUsefulData(row){
    return Boolean(row.FECHA||text(row['NOMBRE DE LA EMPRESA']).trim()||text(row['ESCENARIO ASIGNADO']).trim());
  }

  function eventIdentity(row,index){
    const sheet=text(row.HOJA_ORIGEN);
    const sourceRow=text(row.__FILA_ORIGEN);
    if(sheet&&sourceRow) return `${sheet}|${sourceRow}`;
    return [
      row.FECHA instanceof Date?row.FECHA.toISOString().slice(0,10):text(row.FECHA),
      text(row['NOMBRE DE LA EMPRESA']),text(row['ESCENARIO ASIGNADO']),
      text(row['HORARIO DEL EVENTO']),index
    ].join('|');
  }

  function serializableRows(rows){
    return rows.map((row,index)=>({
      ...row,
      FECHA:row.FECHA instanceof Date?row.FECHA.toISOString():row.FECHA,
      __EVENT_ID:hashString(eventIdentity(row,index))
    }));
  }

  function parseWorkbookBuffer(buffer){
    if(!window.XLSX) throw new Error('No fue posible cargar el lector de Excel.');
    const workbook=window.XLSX.read(new Uint8Array(buffer),{type:'array',cellDates:false,cellText:false,dense:true});
    const rows=[]; const loadedSheets=[]; const columnMaps={};

    workbook.SheetNames.forEach(sheetName=>{
      if(!isKnownMonthSheet(sheetName)) return;
      const matrix=window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,defval:'',raw:true,blankrows:false});
      if(!matrix.length) return;
      const headerIndex=findHeaderRowIndex(matrix);
      if(headerIndex===-1) return;

      const headers=matrix[headerIndex].map(canonicalHeader);
      const fieldColumns={};
      headers.forEach((header,index)=>{ if(header&&!fieldColumns[header]) fieldColumns[header]=excelColumn(index); });
      columnMaps[sheetName]=fieldColumns;

      const sheetRows=[];
      for(let i=headerIndex+1;i<matrix.length;i++){
        const row=matrix[i];
        if(!row.some(cell=>text(cell).trim()!=='')) continue;
        const normalized=normalizeWorkbookRow(row,headers,sheetName,i+1);
        if(rowHasUsefulData(normalized)) sheetRows.push(normalized);
      }
      if(sheetRows.length){ rows.push(...sheetRows); loadedSheets.push(sheetName); }
    });

    if(!rows.length) throw new Error('No se encontraron eventos válidos en las hojas mensuales.');
    rows.sort((a,b)=>{
      const ta=a.FECHA instanceof Date?a.FECHA.getTime():0, tb=b.FECHA instanceof Date?b.FECHA.getTime():0;
      if(ta!==tb) return ta-tb;
      return text(a['HORARIO DEL EVENTO']).localeCompare(text(b['HORARIO DEL EVENTO']),'es',{numeric:true});
    });
    return {rows:serializableRows(rows),sheets:[...new Set(loadedSheets)],columnMaps};
  }

  function safeParse(key,fallback){
    try{ return JSON.parse(localStorage.getItem(key)||'')||fallback; }catch(_){ return fallback; }
  }

  function rowHash(row){
    const clone={...row}; delete clone.__HASH;
    return hashString(JSON.stringify(clone));
  }

  function diffRows(previous,next,columnMaps={}){
    const before=new Map(previous.map((row,index)=>[row.__EVENT_ID||hashString(eventIdentity(row,index)),row]));
    const after=new Map(next.map((row,index)=>[row.__EVENT_ID||hashString(eventIdentity(row,index)),row]));
    const created=[],updated=[],deleted=[],auditEntries=[];
    const {host,user}=auditContext();
    const timestamp=new Date().toISOString();
    const batchId=`excel_${Date.now().toString(36)}`;
    const ignored=new Set(['__EVENT_ID','__HASH']);

    function cellFor(row,field){
      const sheet=text(row?.HOJA_ORIGEN)||'HOJA';
      const sourceRow=Number(row?.__FILA_ORIGEN)||0;
      const column=columnMaps?.[sheet]?.[field]||'?';
      return sourceRow?`${sheet}!${column}${sourceRow}`:`${sheet}!${column}`;
    }

    after.forEach((row,id)=>{
      const old=before.get(id);
      if(!old){
        created.push(row);
        auditEntries.push({
          batchId,timestamp,host,user,type:'creado',
          eventId:id,company:text(row['NOMBRE DE LA EMPRESA']),
          sheet:text(row.HOJA_ORIGEN),row:Number(row.__FILA_ORIGEN)||0,
          cell:cellFor(row,'FECHA'),field:'Registro',
          before:'',after:'Evento creado'
        });
        return;
      }

      if(rowHash(old)===rowHash(row)) return;
      const changes=[];
      const fields=[...new Set([...Object.keys(old),...Object.keys(row)])]
        .filter(field=>!ignored.has(field)&&!field.startsWith('__'));

      fields.forEach(field=>{
        const beforeValue=text(old[field]);
        const afterValue=text(row[field]);
        if(beforeValue===afterValue) return;
        const change={
          field,
          cell:cellFor(row,field),
          before:beforeValue,
          after:afterValue
        };
        changes.push(change);
        auditEntries.push({
          batchId,timestamp,host,user,type:'actualizado',
          eventId:id,company:text(row['NOMBRE DE LA EMPRESA']||old['NOMBRE DE LA EMPRESA']),
          sheet:text(row.HOJA_ORIGEN||old.HOJA_ORIGEN),
          row:Number(row.__FILA_ORIGEN||old.__FILA_ORIGEN)||0,
          ...change
        });
      });
      updated.push({before:old,after:row,changes});
    });

    before.forEach((row,id)=>{
      if(after.has(id)) return;
      deleted.push(row);
      auditEntries.push({
        batchId,timestamp,host,user,type:'eliminado',
        eventId:id,company:text(row['NOMBRE DE LA EMPRESA']),
        sheet:text(row.HOJA_ORIGEN),row:Number(row.__FILA_ORIGEN)||0,
        cell:cellFor(row,'FECHA'),field:'Registro',
        before:'Evento existente',after:'Evento eliminado'
      });
    });

    return {created,updated,deleted,total:next.length,auditEntries,batchId,timestamp};
  }

  async function saveParsedData(parsed,file){
    cleanupLegacyStorage();
    const previous=safeParse('eventData',[]);
    const next=parsed.rows;
    const operationStarted=performance.now();
    const validationModule=await import('./validation.js');
    const validationReport=validationModule.validateRows(next,{sheets:parsed.sheets,fileName:file.name,columnMaps:parsed.columnMaps});
    validationModule.saveValidationReport(validationReport);
    if(validationReport.totalRows>0 && validationReport.validRows===0){
      throw new Error('El archivo no contiene registros válidos. Se conservó la última información correcta.');
    }
    const serialized=JSON.stringify(next);
    const dataHash=hashString(serialized);
    const previousHash=localStorage.getItem(DATA_HASH_KEY);
    const updatedAt=new Date().toISOString();
    const metadata={name:file.name,size:file.size,lastModified:file.lastModified,checkedAt:updatedAt};

    localStorage.setItem(META_KEY,JSON.stringify(metadata));
    localStorage.setItem(FILE_NAME_KEY,file.name);
    localStorage.setItem(LAST_CHECK_KEY,updatedAt);

    if(previousHash===dataHash){
      try{
        const performanceModule=await import('./performance-monitor.js');
        performanceModule.markOperation('Comprobación del Excel sin cambios',performance.now()-operationStarted,{rows:next.length});
      }catch(_){}
      return {changed:false,diff:{created:[],updated:[],deleted:[],auditEntries:[],total:next.length},updatedAt,validationReport};
    }

    const diff=diffRows(previous,next,parsed.columnMaps||{});

    const previousSerialized=localStorage.getItem('eventData');
    try{
      localStorage.setItem('eventData',serialized);
    }catch(error){
      if(error?.name==='QuotaExceededError'||String(error?.message||'').toLowerCase().includes('quota')){
        cleanupLegacyStorage();
        localStorage.removeItem('eventData');
        try{
          localStorage.setItem('eventData',serialized);
        }catch(secondError){
          if(previousSerialized!==null){
            try{ localStorage.setItem('eventData',previousSerialized); }catch(_){}
          }
          throw new Error('El archivo excede el espacio local disponible. Se conservó la última información válida; libera los datos antiguos del sitio y vuelve a intentar.');
        }
      }else{
        throw error;
      }
    }

    localStorage.setItem('eventDataSheets',JSON.stringify(parsed.sheets));
    localStorage.setItem('eventDataUpdatedAt',updatedAt);
    localStorage.setItem(DATA_HASH_KEY,dataHash);
    localStorage.setItem(DIFF_KEY,JSON.stringify({
      at:updatedAt,fileName:file.name,
      created:diff.created.length,updated:diff.updated.length,deleted:diff.deleted.length,total:diff.total,
      cells:diff.auditEntries.length
    }));

    if(diff.auditEntries.length){
      loadAuditStore()
        .then(module=>module.appendMany(diff.auditEntries))
        .then(()=>window.dispatchEvent(new CustomEvent('eventAuditUpdated',{detail:{count:diff.auditEntries.length}})))
        .catch(error=>console.warn('Audit store unavailable:',error));
    }

    const detail={
      rows:next.length,sheets:parsed.sheets,fileName:file.name,updatedAt,
      diff,hash:dataHash,auditEntries:diff.auditEntries
    };
    window.dispatchEvent(new CustomEvent('eventDataUpdated',{detail}));

    if('BroadcastChannel' in window){
      const channel=new BroadcastChannel('gestion-eventos-sync');
      channel.postMessage({
        type:'eventDataUpdated',updatedAt,fileName:file.name,hash:dataHash,
        diffSummary:{
          created:diff.created.length,updated:diff.updated.length,deleted:diff.deleted.length,
          total:diff.total,cells:diff.auditEntries.length
        }
      });
      channel.close();
    }

    import('./firebase-sync.js')
      .then(module=>module.publishIfReady?.(next,diff,{fileName:file.name,updatedAt,hash:dataHash,auditEntries:diff.auditEntries,forceRemote:false}))
      .catch(error=>console.warn('Firebase deferred publish:',error));

    systemLog({
      source:'Excel',
      level:'success',
      title:'Archivo maestro actualizado',
      detail:`${next.length} registros · ${diff.created.length} creados · ${diff.updated.length} modificados · ${diff.deleted.length} eliminados.`
    });

    const idle=window.requestIdleCallback||((callback)=>setTimeout(callback,20));
    idle(async()=>{
      try{
        const backupModule=await import('./backup-store.js');
        await backupModule.createSnapshot({
          kind:'automatic',
          reason:`Importación válida de ${file.name}`,
          includeUsers:false
        });
      }catch(error){console.warn('Automatic backup unavailable:',error);}
      try{
        const performanceModule=await import('./performance-monitor.js');
        performanceModule.markOperation('Lectura y actualización del Excel',performance.now()-operationStarted,{
          rows:next.length,created:diff.created.length,updated:diff.updated.length,deleted:diff.deleted.length
        });
      }catch(_){}
    });

    return {changed:true,diff,updatedAt,validationReport};
  }

  function getStoredMeta(){ return safeParse(META_KEY,null); }
  function sameFileVersion(file,meta){
    return Boolean(meta&&meta.name===file.name&&meta.size===file.size&&meta.lastModified===file.lastModified);
  }

  function ensureUi(){
    if(document.getElementById('excelSyncModal')) return;
    const control=document.createElement('button');
    control.id='excelSyncControl'; control.className='excel-sync-control is-unlinked'; control.type='button';
    control.innerHTML=`<span class="excel-sync-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6"/></svg></span><span class="excel-sync-control-copy"><small>Archivo maestro</small><strong id="excelSyncControlText">Sin vincular</strong></span><span class="excel-sync-control-dot" aria-hidden="true"></span>`;
    const target=document.querySelector('[data-excel-sync-slot]')||document.querySelector('.header-tools')||document.querySelector('.command-left')||document.querySelector('.minute-actions');
    if(target){target.insertBefore(control,target.firstChild);control.classList.add('is-inline');}
    else{document.body.appendChild(control);control.classList.add('is-floating');}

    const modal=document.createElement('div');
    modal.id='excelSyncModal';modal.className='excel-sync-modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="excel-sync-dialog" role="dialog" aria-modal="true" aria-labelledby="excelSyncTitle">
      <button id="excelSyncClose" class="excel-sync-close" type="button" aria-label="Cerrar">×</button>
      <div class="excel-sync-heading"><span class="excel-sync-heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6"/></svg></span><div><span>Sincronización local</span><h2 id="excelSyncTitle">Archivo maestro de eventos</h2><p>El archivo se selecciona una vez. Después solo se comprueban cambios reales.</p></div></div>
      <div id="excelSyncStatusCard" class="excel-sync-status-card is-unlinked"><span class="excel-sync-status-dot"></span><div><small id="excelSyncStatusLabel">Estado</small><strong id="excelSyncStatusText">Sin archivo vinculado</strong><span id="excelSyncFileName">Ningún archivo seleccionado</span></div></div>
      <dl class="excel-sync-details"><div><dt>Última actualización</dt><dd id="excelSyncUpdatedAt">—</dd></div><div><dt>Comprobación</dt><dd>Cada 15 segundos</dd></div><div><dt>Reconocimiento</dt><dd>Hojas mensuales automáticas</dd></div></dl>
      <div id="excelSyncMessage" class="excel-sync-message" hidden></div>
      <div class="excel-sync-actions"><button id="excelSyncPick" class="excel-sync-btn primary" type="button">Seleccionar Excel</button><button id="excelSyncAuthorize" class="excel-sync-btn primary" type="button" hidden>Reconectar</button><button id="excelSyncRefresh" class="excel-sync-btn secondary" type="button" hidden>Actualizar ahora</button><button id="excelSyncChange" class="excel-sync-btn secondary" type="button" hidden>Cambiar archivo</button><button id="excelSyncUnlink" class="excel-sync-btn danger" type="button" hidden>Desvincular</button></div>
      <p class="excel-sync-footnote">Chrome o Edge pueden solicitar nuevamente permiso si se borran los datos del sitio o se usa modo incógnito.</p>
      <input id="excelSyncFallbackInput" type="file" accept=".xlsx,.xls,.csv" hidden>
    </div>`;
    document.body.appendChild(modal);
    ui={
      control,controlText:document.getElementById('excelSyncControlText'),modal,close:document.getElementById('excelSyncClose'),
      statusCard:document.getElementById('excelSyncStatusCard'),statusLabel:document.getElementById('excelSyncStatusLabel'),
      statusText:document.getElementById('excelSyncStatusText'),fileName:document.getElementById('excelSyncFileName'),
      updatedAt:document.getElementById('excelSyncUpdatedAt'),message:document.getElementById('excelSyncMessage'),
      pick:document.getElementById('excelSyncPick'),authorize:document.getElementById('excelSyncAuthorize'),
      refresh:document.getElementById('excelSyncRefresh'),change:document.getElementById('excelSyncChange'),
      unlink:document.getElementById('excelSyncUnlink'),fallbackInput:document.getElementById('excelSyncFallbackInput')
    };
    control.addEventListener('click',openPanel);ui.close.addEventListener('click',closePanel);
    modal.addEventListener('click',event=>{if(event.target===modal)closePanel();});
    ui.pick.addEventListener('click',chooseFile);ui.change.addEventListener('click',chooseFile);
    ui.authorize.addEventListener('click',authorizeAccess);
    ui.refresh.addEventListener('click',()=>synchronize({force:true,requestPermission:true,showSuccess:true}));
    ui.unlink.addEventListener('click',unlinkFile);
    ui.fallbackInput.addEventListener('change',async event=>{
      const file=event.target.files?.[0]; if(!file) return;
      try{
        setState('syncing',{fileName:file.name});
        const parsed=parseWorkbookBuffer(await file.arrayBuffer());
        const result=await saveParsedData(parsed,file);
        setState('fallback',{fileName:file.name,message:result.changed?`${parsed.rows.length} eventos actualizados.`:'El archivo no contiene cambios.'});
      }catch(error){setState('error',{message:error.message});}
      finally{event.target.value='';}
    });
  }

  function showMessage(message,type='info'){
    if(!ui.message) return;
    ui.message.hidden=!message;ui.message.className=`excel-sync-message is-${type}`;ui.message.textContent=message||'';
  }
  function formatDateTime(value){
    if(!value) return '—'; const date=new Date(value);
    return Number.isNaN(date.getTime())?'—':date.toLocaleString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }
  function setState(state,options={}){
    lastState=state;
    const storedName=options.fileName||localStorage.getItem(FILE_NAME_KEY)||fileHandle?.name||'';
    const states={
      unlinked:['Sin conexión','Sin archivo vinculado','Sin vincular','is-unlinked'],
      ready:['Conectado','Archivo listo','Conectado','is-ready'],
      syncing:['Actualizando','Comprobando cambios','Actualizando…','is-syncing'],
      permission:['Permiso requerido','Pulsa Reconectar','Reconectar','is-permission'],
      error:['No disponible','No fue posible leer el archivo','Revisar archivo','is-error'],
      unsupported:['Carga manual','Actualización automática no disponible','Carga manual','is-error'],
      fallback:['Carga manual','Archivo leído correctamente','Carga manual','is-permission']
    };
    const [label,statusText,controlText,className]=states[state]||states.unlinked;
    [ui.control,ui.statusCard].forEach(el=>{if(el){el.classList.remove('is-unlinked','is-ready','is-syncing','is-permission','is-error');el.classList.add(className);}});
    ui.statusLabel.textContent=label;ui.statusText.textContent=options.statusText||statusText;ui.controlText.textContent=options.controlText||controlText;
    ui.fileName.textContent=storedName||'Ningún archivo seleccionado';ui.updatedAt.textContent=formatDateTime(localStorage.getItem('eventDataUpdatedAt'));
    const hasHandle=Boolean(fileHandle);
    ui.pick.hidden=hasHandle&&state!=='unsupported';ui.authorize.hidden=state!=='permission';ui.refresh.hidden=!hasHandle||state==='permission'||state==='syncing';
    ui.change.hidden=!hasHandle;ui.unlink.hidden=!hasHandle;
    if(options.message) showMessage(options.message,state==='error'||state==='unsupported'?'error':state==='ready'?'success':'info'); else showMessage('');
  }
  function openPanel(){ensureUi();ui.modal.classList.add('is-open');ui.modal.setAttribute('aria-hidden','false');document.body.classList.add('excel-sync-modal-open');}
  function closePanel(){ui.modal.classList.remove('is-open');ui.modal.setAttribute('aria-hidden','true');document.body.classList.remove('excel-sync-modal-open');}

  async function chooseFile(){
    if(!supportsPersistentFileAccess()){ui.fallbackInput.click();return;}
    try{
      const handles=await window.showOpenFilePicker({
        id:'productividad-tactica-master',multiple:false,startIn:'documents',excludeAcceptAllOption:false,
        types:[{description:'Archivo maestro de eventos',accept:{
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
          'application/vnd.ms-excel':['.xls'],'text/csv':['.csv']
        }}]
      });
      if(!handles?.[0]) return;
      fileHandle=handles[0];await storeHandle(fileHandle);localStorage.setItem(FILE_NAME_KEY,fileHandle.name);
      if(!EXPECTED_NAME.test(fileHandle.name)) showMessage('El nombre es diferente al habitual; se validará por sus columnas.','info');
      const ok=await synchronize({force:true,requestPermission:true,showSuccess:true});
      if(ok) setTimeout(closePanel,650);
    }catch(error){if(error?.name!=='AbortError'){setState('error',{message:error.message});openPanel();}}
  }

  async function getPermission(requestPermission){
    if(!fileHandle) return 'denied';
    let permission=await fileHandle.queryPermission({mode:'read'});
    if(permission==='prompt'&&requestPermission) permission=await fileHandle.requestPermission({mode:'read'});
    return permission;
  }
  async function authorizeAccess(){
    const ok=await synchronize({force:true,requestPermission:true,showSuccess:true});
    if(ok) setTimeout(closePanel,650);
  }

  async function synchronize({force=false,requestPermission=false,showSuccess=false}={}){
    if(syncInProgress||!fileHandle) return false;
    syncInProgress=true;
    try{
      const permission=await getPermission(requestPermission);
      if(permission!=='granted'){
        setState('permission',{fileName:fileHandle.name,message:'El archivo sigue vinculado. Pulsa Reconectar una sola vez para renovar el permiso.'});
        return false;
      }
      setState('syncing',{fileName:fileHandle.name});
      const file=await fileHandle.getFile();const storedMeta=getStoredMeta();
      localStorage.setItem(LAST_CHECK_KEY,new Date().toISOString());
      if(!force&&sameFileVersion(file,storedMeta)){setState('ready',{fileName:file.name});return true;}
      const parsed=parseWorkbookBuffer(await file.arrayBuffer());
      const result=await saveParsedData(parsed,file);
      setState('ready',{fileName:file.name,statusText:`${parsed.rows.length} eventos · ${result.changed?'cambios aplicados':'sin cambios'}`,message:showSuccess?(result.changed?'Información actualizada correctamente.':'No se encontraron cambios.') : ''});
      return true;
    }catch(error){
      console.error('Excel sync:',error);
      const message=error?.name==='NotFoundError'?'El archivo fue movido o renombrado. Usa Cambiar archivo.':error.message;
      setState('error',{fileName:fileHandle?.name,message});
      systemLog({source:'Excel',level:'error',title:'Error al comprobar el archivo',detail:message||'No fue posible leer el Excel.'});
      return false;
    }finally{syncInProgress=false;}
  }

  async function unlinkFile(){
    try{await removeStoredHandle();}catch(_){}
    fileHandle=null;[META_KEY,FILE_NAME_KEY,LAST_CHECK_KEY].forEach(key=>localStorage.removeItem(key));
    setState('unlinked',{message:'Vinculación eliminada. Los datos ya cargados permanecen disponibles.'});
  }

  function scheduleCheck(){
    clearTimeout(focusTimer);
    focusTimer=setTimeout(()=>{if(fileHandle&&!document.hidden)synchronize({force:false,requestPermission:false});},120);
  }
  function bindAutomaticChecks(){
    clearInterval(autoTimer);
    autoTimer=setInterval(()=>{if(fileHandle&&!document.hidden)synchronize({force:false,requestPermission:false});},AUTO_INTERVAL_MS);
    window.addEventListener('focus',scheduleCheck,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleCheck();});
    if('BroadcastChannel'in window){
      const channel=new BroadcastChannel('gestion-eventos-sync');
      channel.addEventListener('message',event=>{
        if(event.data?.type==='eventDataUpdated'){
          window.dispatchEvent(new CustomEvent('eventDataUpdated',{detail:event.data}));
          if(lastState!=='syncing') setState('ready',{fileName:event.data.fileName});
        }
      });
    }
  }

  async function initialize(){
    if(initialized) return;
    initialized=true;
    cleanupLegacyStorage();
    if(navigator.storage?.persist) navigator.storage.persist().catch(()=>{});
    ensureUi();
    bindAutomaticChecks();
    if(!supportsPersistentFileAccess()){
      setState('unsupported',{message:window.isSecureContext?'Usa Chrome o Edge para conservar el archivo vinculado.':'La página debe abrirse mediante HTTPS.'});
      if(!localStorage.getItem('eventData')) setTimeout(openPanel,500);
      return;
    }
    try{
      fileHandle=await readStoredHandle();
      if(!fileHandle){setState('unlinked');if(!localStorage.getItem('eventData')) setTimeout(openPanel,500);return;}
      setState('ready',{fileName:fileHandle.name,statusText:'Archivo vinculado'});
      scheduleCheck();
    }catch(error){setState('error',{message:error.message});}
  }

  window.ExcelFileSync={
    init:initialize,openPanel,chooseFile,refresh:()=>synchronize({force:true,requestPermission:true,showSuccess:true}),
    unlink:unlinkFile,parseWorkbookBuffer,importFile:async file=>{const parsed=parseWorkbookBuffer(await file.arrayBuffer());await saveParsedData(parsed,file);return parsed;},
    getHandle:()=>fileHandle
  };

  if(document.documentElement.dataset.excelSyncDisabled!=='true'){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialize,{once:true}); else initialize();
  }
})();
