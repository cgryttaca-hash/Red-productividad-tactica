(function(){
  "use strict";

  const DB_NAME = "rpt-file-access";
  const STORE_NAME = "handles";
  const HANDLE_KEY = "master-events-file";
  const META_KEY = "rpt:excelMeta";
  const FILE_NAME_KEY = "excelSync:fileName";
  const CHECK_INTERVAL = 30000;

  let handle = null;
  let syncing = false;
  let timer = null;
  let ui = {};

  const text = value => value === undefined || value === null ? "" : String(value);
  const normalize = value => text(value)
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .trim().toUpperCase().replace(/\s+/g," ");


  function safeSet(key,value){
    if(window.EventDataStore?.safeSetSmall) return window.EventDataStore.safeSetSmall(key,String(value));
    try{ localStorage.setItem(key,String(value)); return true; }
    catch(error){ console.warn(`No fue posible guardar ${key}:`,error); return false; }
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const request = indexedDB.open(DB_NAME,1);
      request.onupgradeneeded = ()=> {
        const db = request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = ()=>resolve(request.result);
      request.onerror = ()=>reject(request.error);
    });
  }

  async function dbGet(){
    const db = await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const request = db.transaction(STORE_NAME,"readonly").objectStore(STORE_NAME).get(HANDLE_KEY);
        request.onsuccess = ()=>resolve(request.result || null);
        request.onerror = ()=>reject(request.error);
      });
    }finally{ db.close(); }
  }

  async function dbPut(value){
    const db = await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx = db.transaction(STORE_NAME,"readwrite");
        tx.objectStore(STORE_NAME).put(value,HANDLE_KEY);
        tx.oncomplete = resolve;
        tx.onerror = ()=>reject(tx.error);
      });
    }finally{ db.close(); }
  }

  async function dbDelete(){
    const db = await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx = db.transaction(STORE_NAME,"readwrite");
        tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
        tx.oncomplete = resolve;
        tx.onerror = ()=>reject(tx.error);
      });
    }finally{ db.close(); }
  }

  function supportsPersistentAccess(){
    return window.isSecureContext && typeof window.showOpenFilePicker === "function" && "indexedDB" in window;
  }

  function canonicalHeader(value){
    const h = normalize(value);
    if(h === "FECHA" || h.includes("FECHA DEL EVENTO")) return "FECHA";
    if(h.includes("ESCENARIO")) return "ESCENARIO ASIGNADO";
    if(h.includes("HORARIO") && h.includes("EVENTO")) return "HORARIO DEL EVENTO";
    if(h === "EMPRESA" || (h.includes("NOMBRE") && h.includes("EMPRESA"))) return "NOMBRE DE LA EMPRESA";
    if(h.includes("CANTIDAD") && h.includes("PERSONAS") || h === "PAX") return "CANTIDAD DE PERSONAS";
    if(h.includes("HORARIO") && (h.includes("AYB") || h.includes("A&B") || h.includes("A Y B"))) return "HORARIO AYB";
    if(h.includes("DESCRIPCION") && h.includes("ALIMENTACION")) return "DESCRIPCION ALIMENTACION";
    if(h === "ALIMENTACION") return "DESCRIPCION ALIMENTACION";
    if(h.includes("ACOMODACION")) return "ACOMODACION";
    if(h.includes("MODALIDAD")) return "MODALIDAD DE SERVICIO";
    if(h.includes("MEDIO") && h.includes("PAGO")) return "MEDIO DE PAGO";
    if(h.includes("OBSERVACION")) return "OBSERVACION";
    if(h.includes("ESTADO") || h === "STATUS") return "ESTADO";
    return h;
  }

  function parseDate(value){
    if(value === undefined || value === null || value === "") return "";
    if(typeof value === "number" && window.XLSX){
      const d = XLSX.SSF.parse_date_code(value);
      if(d) return new Date(d.y,d.m-1,d.d).toISOString();
    }
    if(value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    const source = text(value).trim();
    let match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(match) return new Date(+match[3],+match[2]-1,+match[1]).toISOString();
    match = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(match) return new Date(+match[1],+match[2]-1,+match[3]).toISOString();
    const parsed = new Date(source);
    return Number.isNaN(parsed.getTime()) ? source : parsed.toISOString();
  }

  function findHeaderIndex(matrix){
    return matrix.findIndex(row=>{
      const headers = row.map(canonicalHeader);
      return headers.includes("FECHA") &&
        headers.includes("ESCENARIO ASIGNADO") &&
        headers.includes("NOMBRE DE LA EMPRESA");
    });
  }

  function parseWorkbook(buffer){
    if(!window.XLSX) throw new Error("No se cargó el lector de Excel.");
    const workbook = XLSX.read(new Uint8Array(buffer),{type:"array",cellDates:false,cellText:false});
    const rows = [];
    const sheets = [];

    workbook.SheetNames.forEach(sheetName=>{
      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{
        header:1,defval:"",raw:true,blankrows:false
      });
      const headerIndex = findHeaderIndex(matrix);
      if(headerIndex < 0) return;
      const headers = matrix[headerIndex].map(canonicalHeader);
      matrix.slice(headerIndex+1).forEach((sourceRow,sourceIndex)=>{
        if(!sourceRow.some(cell=>text(cell).trim())) return;
        const row = {};
        headers.forEach((header,index)=>{
          if(header) row[header] = sourceRow[index] ?? "";
        });
        row.FECHA = parseDate(row.FECHA);
        row.HOJA_ORIGEN = sheetName;
        row.__FILA_ORIGEN = headerIndex + sourceIndex + 2;
        if(row.FECHA || text(row["NOMBRE DE LA EMPRESA"]).trim() || text(row["ESCENARIO ASIGNADO"]).trim()){
          rows.push(row);
        }
      });
      sheets.push(sheetName);
    });

    if(!rows.length) throw new Error("No se encontraron eventos válidos en el archivo.");
    return {rows,sheets};
  }

  function getMeta(){
    try{return JSON.parse(localStorage.getItem(META_KEY) || "null");}catch(_){return null;}
  }

  function isSameFile(file){
    const meta = getMeta();
    return Boolean(meta && meta.name === file.name && meta.size === file.size && meta.lastModified === file.lastModified);
  }

  async function saveData(parsed,file){
    if(!window.EventDataStore){
      throw new Error("El almacenamiento seguro de eventos no está disponible.");
    }

    const updatedAt = new Date().toISOString();
    await window.EventDataStore.save(parsed.rows,parsed.sheets,{
      updatedAt,
      fileName:file.name,
      fileSize:file.size,
      fileLastModified:file.lastModified
    });

    safeSet(FILE_NAME_KEY,file.name);
    safeSet(META_KEY,JSON.stringify({
      name:file.name,size:file.size,lastModified:file.lastModified,updatedAt
    }));

    window.EventDataStore.dispatchUpdated({
      rows:parsed.rows.length,
      sheets:parsed.sheets,
      fileName:file.name,
      updatedAt
    });
  }

  function ensureUi(){
    if(document.getElementById("excelSyncPanel")) return;
    const control = document.createElement("button");
    control.id = "excelSyncControl";
    control.className = "sync-control excel-control is-warning";
    control.type = "button";
    control.innerHTML = `
      <span class="sync-icon" aria-hidden="true">XLS</span>
      <span class="sync-copy"><small>Archivo maestro</small><strong id="excelSyncControlText">Vincular Excel</strong></span>
      <i class="sync-dot"></i>`;
    const slot = document.querySelector("[data-sync-slot]") || document.querySelector(".header-tools") ||
      document.querySelector(".command-left") || document.querySelector(".minute-actions");
    if(slot) slot.insertBefore(control,slot.firstChild);
    else { control.classList.add("is-floating"); document.body.appendChild(control); }

    const panel = document.createElement("div");
    panel.id = "excelSyncPanel";
    panel.className = "sync-modal";
    panel.setAttribute("aria-hidden","true");
    panel.innerHTML = `
      <div class="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="excelPanelTitle">
        <button class="sync-close" id="excelSyncClose" type="button" aria-label="Cerrar">×</button>
        <div class="sync-heading">
          <span class="sync-heading-icon">XLS</span>
          <div><small>Sincronización local</small><h2 id="excelPanelTitle">Archivo maestro de eventos</h2>
          <p>El archivo se selecciona una sola vez. Después se revisa al abrir, al volver a la pestaña y cada 30 segundos.</p></div>
        </div>
        <div id="excelSyncState" class="sync-state is-warning">
          <i class="sync-dot"></i><div><small>Estado</small><strong id="excelSyncStateText">Sin archivo vinculado</strong>
          <span id="excelSyncFileName">Ningún archivo seleccionado</span></div>
        </div>
        <div id="excelSyncMessage" class="sync-message" hidden></div>
        <div class="sync-actions">
          <button id="excelSyncPick" class="sync-primary" type="button">Seleccionar Excel</button>
          <button id="excelSyncRefresh" class="sync-secondary" type="button" hidden>Actualizar ahora</button>
          <button id="excelSyncChange" class="sync-secondary" type="button" hidden>Cambiar archivo</button>
          <button id="excelSyncUnlink" class="sync-danger" type="button" hidden>Desvincular</button>
        </div>
        <p class="sync-note">El navegador puede solicitar una reconexión si se borran los permisos, se usa modo incógnito o el archivo cambia de carpeta. La aplicación no abrirá esta ventana automáticamente en cada visita.</p>
        <input id="excelFallbackInput" type="file" accept=".xlsx,.xls,.csv" hidden>
      </div>`;
    document.body.appendChild(panel);

    ui = {
      control,controlText:document.getElementById("excelSyncControlText"),
      panel,close:document.getElementById("excelSyncClose"),
      state:document.getElementById("excelSyncState"),stateText:document.getElementById("excelSyncStateText"),
      fileName:document.getElementById("excelSyncFileName"),message:document.getElementById("excelSyncMessage"),
      pick:document.getElementById("excelSyncPick"),refresh:document.getElementById("excelSyncRefresh"),
      change:document.getElementById("excelSyncChange"),unlink:document.getElementById("excelSyncUnlink"),
      fallback:document.getElementById("excelFallbackInput")
    };
    control.addEventListener("click",openPanel);
    const legacyLoadButton=document.getElementById("btnLoad");
    if(legacyLoadButton){
      legacyLoadButton.addEventListener("click",event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        openPanel();
      },true);
    }
    ui.close.addEventListener("click",closePanel);
    panel.addEventListener("click",event=>{if(event.target===panel) closePanel();});
    ui.pick.addEventListener("click",chooseFile);
    ui.change.addEventListener("click",chooseFile);
    ui.refresh.addEventListener("click",()=>sync({force:true,requestPermission:true,showMessage:true}));
    ui.unlink.addEventListener("click",unlink);
    ui.fallback.addEventListener("change",async event=>{
      const file=event.target.files?.[0];
      if(!file) return;
      await importFallback(file);
      event.target.value="";
    });
  }

  function openPanel(){ ui.panel.classList.add("is-open"); ui.panel.setAttribute("aria-hidden","false"); }
  function closePanel(){ ui.panel.classList.remove("is-open"); ui.panel.setAttribute("aria-hidden","true"); }

  function setMessage(message,type="info"){
    ui.message.hidden=!message;
    ui.message.className=`sync-message is-${type}`;
    ui.message.textContent=message || "";
  }

  function setState(state,detail=""){
    const map={
      ready:["is-ready","Conectado","Archivo vinculado"],
      syncing:["is-syncing","Actualizando…","Leyendo cambios"],
      warning:["is-warning","Reconectar archivo","Permiso pendiente"],
      error:["is-error","Revisar archivo","No disponible"],
      empty:["is-warning","Vincular Excel","Sin archivo vinculado"]
    };
    const [className,controlText,stateText]=map[state]||map.empty;
    [ui.control,ui.state].forEach(el=>{
      el.classList.remove("is-ready","is-syncing","is-warning","is-error");
      el.classList.add(className);
    });
    ui.controlText.textContent=controlText;
    ui.stateText.textContent=stateText;
    ui.fileName.textContent=handle?.name || localStorage.getItem(FILE_NAME_KEY) || "Ningún archivo seleccionado";
    const hasHandle=Boolean(handle);
    ui.pick.hidden=hasHandle;
    ui.refresh.hidden=!hasHandle;
    ui.change.hidden=!hasHandle;
    ui.unlink.hidden=!hasHandle;
    if(detail) setMessage(detail,state==="error"?"error":state==="ready"?"success":"info");
    else setMessage("");
  }

  async function chooseFile(){
    try{
      if(!supportsPersistentAccess()){
        ui.fallback.click();
        return false;
      }
      const selected=await showOpenFilePicker({
        multiple:false,
        types:[{description:"Archivo Excel",accept:{
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"],
          "application/vnd.ms-excel":[".xls"],
          "text/csv":[".csv"]
        }}]
      });
      if(!selected?.[0]) return false;
      handle=selected[0];
      await dbPut(handle);
      safeSet(FILE_NAME_KEY,handle.name);
      await sync({force:true,requestPermission:true,showMessage:true});
      return true;
    }catch(error){
      if(error?.name==="AbortError") return false;
      setState("error",error?.message || "No fue posible seleccionar el archivo.");
      openPanel();
      return false;
    }
  }

  async function importFallback(file){
    try{
      setState("syncing");
      const parsed=parseWorkbook(await file.arrayBuffer());
      await saveData(parsed,file);
      setState("warning","Los datos se cargaron, pero este navegador no puede recordar el archivo automáticamente.");
      return true;
    }catch(error){
      setState("error",error?.message || "No fue posible leer el archivo.");
      return false;
    }
  }

  async function permission(requestPermission){
    if(!handle) return "denied";
    let value=await handle.queryPermission({mode:"read"});
    if(value==="prompt" && requestPermission) value=await handle.requestPermission({mode:"read"});
    return value;
  }

  async function sync({force=false,requestPermission=false,showMessage=false}={}){
    if(syncing || !handle) return false;
    syncing=true;
    try{
      const access=await permission(requestPermission);
      if(access!=="granted"){
        setState("warning","El archivo sigue recordado. Pulsa “Actualizar ahora” para autorizar su lectura cuando sea necesario.");
        return false;
      }
      setState("syncing");
      const file=await handle.getFile();
      if(!force && isSameFile(file)){
        setState("ready",showMessage?"El archivo no tiene cambios nuevos.":"");
        return true;
      }
      const parsed=parseWorkbook(await file.arrayBuffer());
      await saveData(parsed,file);
      setState("ready",showMessage?`${parsed.rows.length} eventos actualizados correctamente.`:"");
      return true;
    }catch(error){
      const msg=error?.name==="NotFoundError"
        ?"El archivo fue movido, eliminado o renombrado. Usa “Cambiar archivo”."
        :(error?.message || "No fue posible actualizar el Excel.");
      setState("error",msg);
      return false;
    }finally{syncing=false;}
  }

  async function unlink(){
    await dbDelete().catch(()=>{});
    handle=null;
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(FILE_NAME_KEY);
    setState("empty","La vinculación fue eliminada. Los datos ya cargados se conservan.");
  }

  async function initialize(){
    ensureUi();
    if(!supportsPersistentAccess()){
      setState("empty","Usa Chrome o Edge sobre HTTPS para recordar el archivo. También puedes cargarlo manualmente.");
      return;
    }
    try{
      handle=await dbGet();
      if(!handle){setState("empty");return;}
      setState("ready");
      await sync({force:false,requestPermission:false});
    }catch(error){
      setState("error","No fue posible recuperar la vinculación guardada.");
    }

    timer=setInterval(()=>{if(!document.hidden) sync({force:false,requestPermission:false});},CHECK_INTERVAL);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden) sync({force:false,requestPermission:false});});
    window.addEventListener("focus",()=>sync({force:false,requestPermission:false}));
  }

  window.ExcelFileSync={
    chooseFile,
    refresh:()=>sync({force:true,requestPermission:true,showMessage:true}),
    openPanel,
    hasHandle:()=>Boolean(handle),
    getFileName:()=>handle?.name || localStorage.getItem(FILE_NAME_KEY) || ""
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();