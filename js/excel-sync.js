(function(){
  "use strict";
  const HANDLE_DB="rpt-file-access";
  const HANDLE_STORE="handles";
  const HANDLE_KEY="master-events-file";
  const META_KEY="rpt:excelMeta";
  const FILE_KEY="excelSync:fileName";
  const INTERVAL=30000;
  const SYNC_LOCK_KEY="rpt:excelSyncLock";
  const TAB_ID=`tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  let handle=null,state={status:"loading",fileName:"",message:"Comprobando archivo…",lastRead:""};
  let syncing=false,timer=null,dbPromise=null;

  const text=value=>value===undefined||value===null?"":String(value);
  const normalize=value=>text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/\s+/g," ");

  function acquireSyncLock(){
    const now=Date.now();
    try{
      const current=JSON.parse(localStorage.getItem(SYNC_LOCK_KEY)||"null");
      if(current&&current.tabId!==TAB_ID&&now-Number(current.at||0)<30000)return false;
      localStorage.setItem(SYNC_LOCK_KEY,JSON.stringify({tabId:TAB_ID,at:now}));
      return JSON.parse(localStorage.getItem(SYNC_LOCK_KEY)||"null")?.tabId===TAB_ID;
    }catch(_){return true;}
  }
  function releaseSyncLock(){
    try{
      const current=JSON.parse(localStorage.getItem(SYNC_LOCK_KEY)||"null");
      if(current?.tabId===TAB_ID)localStorage.removeItem(SYNC_LOCK_KEY);
    }catch(_){}
  }
  function emit(next){
    state={...state,...next};
    window.dispatchEvent(new CustomEvent("excelSyncState",{detail:{...state}}));
  }
  function openHandleDB(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(HANDLE_DB,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(HANDLE_STORE))request.result.createObjectStore(HANDLE_STORE);};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return dbPromise;
  }
  async function handleAction(mode,action){
    const db=await openHandleDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(HANDLE_STORE,mode),store=tx.objectStore(HANDLE_STORE),request=action(store);
      request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);
    });
  }
  async function loadHandle(){try{return await handleAction("readonly",store=>store.get(HANDLE_KEY));}catch(_){return null;}}
  async function saveHandle(value){return handleAction("readwrite",store=>store.put(value,HANDLE_KEY));}
  async function deleteHandle(){try{await handleAction("readwrite",store=>store.delete(HANDLE_KEY));}catch(_){}}

  function canonicalHeader(value){
    const h=normalize(value);
    if(h==="FECHA"||h.includes("FECHA DEL EVENTO")||h==="DIA")return"FECHA";
    if(h.includes("ESCENARIO"))return"ESCENARIO ASIGNADO";
    if(h.includes("HORARIO")&&h.includes("EVENTO"))return"HORARIO DEL EVENTO";
    if((h.includes("NOMBRE")&&h.includes("EMPRESA"))||h==="EMPRESA")return"NOMBRE DE LA EMPRESA";
    if((h.includes("CANTIDAD")&&h.includes("PERSONAS"))||h.includes("PAX"))return"CANTIDAD DE PERSONAS";
    if(h.includes("HORARIO")&&(h.includes("AYB")||h.includes("A&B")||h.includes("A Y B")))return"HORARIO AYB";
    if(h.includes("DESCRIPCION")&&h.includes("ALIMENTACION"))return"DESCRIPCION ALIMENTACION";
    if(h==="ALIMENTACION")return"DESCRIPCION ALIMENTACION";
    if(h.includes("ACOMODACION"))return"ACOMODACION";
    if(h.includes("MODALIDAD"))return"MODALIDAD DE SERVICIO";
    if(h.includes("MEDIO")&&h.includes("PAGO"))return"MEDIO DE PAGO";
    if(h.includes("OBSERVACION"))return"OBSERVACION";
    if(h.includes("ESTADO")||h.includes("STATUS"))return"ESTADO";
    return h;
  }
  function dateISO(value){
    if(value===undefined||value===null||value==="")return"";
    if(typeof value==="number"&&window.XLSX){
      const parsed=XLSX.SSF.parse_date_code(value);
      if(parsed)return`${parsed.y}-${String(parsed.m).padStart(2,"0")}-${String(parsed.d).padStart(2,"0")}`;
    }
    if(value instanceof Date&&!Number.isNaN(value.getTime()))return`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
    const s=text(value).trim();let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(m)return`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
    m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if(m)return`${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
    const d=new Date(s);return Number.isNaN(d.getTime())?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function findHeader(matrix){return matrix.findIndex(row=>{const headers=row.map(canonicalHeader);return headers.includes("FECHA")&&headers.includes("ESCENARIO ASIGNADO")&&headers.includes("NOMBRE DE LA EMPRESA");});}
  function parseBuffer(buffer){
    if(!window.XLSX)throw new Error("No se cargó el lector de Excel. Revisa la conexión.");
    const workbook=XLSX.read(new Uint8Array(buffer),{type:"array",cellDates:false,cellText:false,dense:true});
    const events=[],sheets=[];
    workbook.SheetNames.forEach(sheetName=>{
      const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,defval:"",raw:true,blankrows:false});
      const headerIndex=findHeader(matrix);if(headerIndex<0)return;
      const headers=matrix[headerIndex].map(canonicalHeader);
      matrix.slice(headerIndex+1).forEach((row,rowIndex)=>{
        if(!row.some(cell=>text(cell).trim()!==""))return;
        const item={HOJA_ORIGEN:sheetName,__FILA_ORIGEN:headerIndex+rowIndex+2};
        headers.forEach((header,index)=>{if(header)item[header]=row[index]??"";});
        item.FECHA=dateISO(item.FECHA);
        if(!item.FECHA&&!text(item["NOMBRE DE LA EMPRESA"]).trim()&&!text(item["ESCENARIO ASIGNADO"]).trim())return;
        events.push(item);
      });
      sheets.push(sheetName);
    });
    if(!events.length)throw new Error("No se encontraron eventos válidos. Verifica los encabezados FECHA, ESCENARIO ASIGNADO y NOMBRE DE LA EMPRESA.");
    events.sort((a,b)=>text(a.FECHA).localeCompare(text(b.FECHA))||text(a["HORARIO DEL EVENTO"]).localeCompare(text(b["HORARIO DEL EVENTO"]),"es",{numeric:true}));
    return{events,sheets};
  }
  function metadata(){try{return JSON.parse(localStorage.getItem(META_KEY)||"null");}catch(_){return null;}}
  function sameVersion(file,meta){return Boolean(meta&&meta.name===file.name&&meta.size===file.size&&meta.lastModified===file.lastModified);}
  async function importFile(file,{force=true}={}){
    if(syncing)return false;
    if(!acquireSyncLock()){emit({status:"waiting",fileName:file?.name||state.fileName,message:"Otra pestaña está actualizando el archivo."});return false;}
    syncing=true;
    try{
      emit({status:"syncing",fileName:file.name,message:"Leyendo cambios del Excel…"});
      const oldMeta=metadata();
      if(!force&&sameVersion(file,oldMeta)){emit({status:"ready",fileName:file.name,message:"Archivo actualizado",lastRead:oldMeta.checkedAt||""});return true;}
      const parsed=parseBuffer(await file.arrayBuffer());
      const updatedAt=new Date().toISOString();
      await EventDataStore.save(parsed.events,parsed.sheets,{updatedAt,fileName:file.name,fileSize:file.size,fileLastModified:file.lastModified});
      const meta={name:file.name,size:file.size,lastModified:file.lastModified,checkedAt:updatedAt,count:parsed.events.length};
      localStorage.setItem(META_KEY,JSON.stringify(meta));localStorage.setItem(FILE_KEY,file.name);
      EventDataStore.dispatchUpdated({rows:parsed.events.length,sheets:parsed.sheets,fileName:file.name,updatedAt,source:"excel"});
      emit({status:"ready",fileName:file.name,message:`${parsed.events.length} eventos sincronizados`,lastRead:updatedAt,count:parsed.events.length});
      return true;
    }catch(error){
      console.error(error);emit({status:"error",fileName:file?.name||state.fileName,message:error.message||"No fue posible leer el archivo."});throw error;
    }finally{syncing=false;releaseSyncLock();}
  }
  async function permission(request=false){
    if(!handle)return"denied";
    try{
      let value=await handle.queryPermission({mode:"read"});
      if(value==="prompt"&&request)value=await handle.requestPermission({mode:"read"});
      return value;
    }catch(_){return"denied";}
  }
  async function sync({force=false,requestPermission=false}={}){
    if(!handle)return false;
    const access=await permission(requestPermission);
    if(access!=="granted"){emit({status:"permission",fileName:handle.name||state.fileName,message:"El archivo está recordado. Pulsa Reconectar para autorizar su lectura."});return false;}
    try{return await importFile(await handle.getFile(),{force});}
    catch(error){if(error?.name==="NotFoundError")emit({status:"error",message:"El archivo fue movido o eliminado. Selecciona otro archivo."});return false;}
  }
  async function chooseFile(){
    if(typeof showOpenFilePicker==="function"&&window.isSecureContext){
      try{
        const selected=await showOpenFilePicker({multiple:false,types:[{description:"Excel de eventos",accept:{"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"],"application/vnd.ms-excel":[".xls"],"text/csv":[".csv"]}}]});
        if(!selected?.[0])return false;
        handle=selected[0];
        await saveHandle(handle);
        localStorage.setItem(FILE_KEY,handle.name);
        return await sync({force:true,requestPermission:true});
      }catch(error){
        if(error?.name==="AbortError")return false;
        emit({status:"error",fileName:handle?.name||localStorage.getItem(FILE_KEY)||"",message:error?.message||"No fue posible seleccionar el archivo."});
        throw error;
      }
    }
    const input=document.getElementById("fileInput");
    if(!input)throw new Error("Este navegador no permite recordar el archivo. Usa Chrome o Edge.");
    return new Promise(resolve=>{
      input.onchange=async()=>{
        const file=input.files?.[0];
        input.value="";
        if(!file){resolve(false);return;}
        try{
          await importFile(file,{force:true});
          emit({status:"manual",fileName:file.name,message:"Carga manual: el navegador no puede recordar este archivo."});
          resolve(true);
        }catch(error){
          emit({status:"error",fileName:file.name,message:error?.message||"No fue posible leer el archivo."});
          resolve(false);
        }
      };
      input.click();
    });
  }
  async function unlink(){handle=null;await deleteHandle();localStorage.removeItem(META_KEY);localStorage.removeItem(FILE_KEY);emit({status:"unlinked",fileName:"",message:"Sin archivo vinculado"});}
  function buildPanel(){
    const host=document.getElementById("fileModal");if(!host||host.dataset.ready)return;
    host.dataset.ready="1";host.innerHTML=`<div class="sync-panel-shell" role="dialog" aria-modal="true" aria-labelledby="filePanelTitle">
      <div class="sync-panel-head"><div class="sync-panel-title"><span class="sync-panel-icon">XLS</span><div><small>Sincronización local</small><h2 id="filePanelTitle">Archivo maestro de eventos</h2><p>La referencia se guarda en este navegador; los eventos se almacenan en IndexedDB.</p></div></div><button class="sync-close" type="button">×</button></div>
      <div id="filePanelState" class="sync-state is-warning"><i></i><div><small>Estado</small><strong>Esperando archivo</strong><span>—</span></div></div>
      <div class="sync-details"><div><small>Archivo</small><strong id="filePanelName">—</strong></div><div><small>Última lectura</small><strong id="filePanelRead">—</strong></div><div><small>Eventos</small><strong id="filePanelCount">0</strong></div></div>
      <div class="sync-actions"><button id="filePanelChoose" class="btn primary" type="button">Seleccionar o cambiar</button><button id="filePanelRefresh" class="btn secondary" type="button">Actualizar ahora</button><button id="filePanelUnlink" class="btn danger" type="button">Desvincular</button></div>
      <div id="filePanelMessage" class="sync-message" hidden></div><p class="sync-note">Chrome o Edge pueden solicitar nuevamente el permiso si el navegador lo revoca por seguridad; no será necesario buscar otra vez el archivo.</p>
    </div>`;
    const close=()=>{host.classList.remove("is-open");host.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");};
    host.querySelector(".sync-close").onclick=close;host.onclick=e=>{if(e.target===host)close();};
    host.querySelector("#filePanelChoose").onclick=()=>chooseFile().catch(error=>panelMessage(error.message,"error"));
    host.querySelector("#filePanelRefresh").onclick=()=>sync({force:true,requestPermission:true}).catch(error=>panelMessage(error.message,"error"));
    host.querySelector("#filePanelUnlink").onclick=unlink;
  }
  function panelMessage(message,type=""){const el=document.getElementById("filePanelMessage");if(!el)return;el.hidden=!message;el.className=`sync-message ${type?`is-${type}`:""}`;el.textContent=message||"";}
  function updatePanel(){
    const box=document.getElementById("filePanelState");if(!box)return;
    box.className=`sync-state ${state.status==="ready"?"is-ready":state.status==="error"?"is-error":"is-warning"}`;
    box.querySelector("strong").textContent=state.status==="ready"?"Archivo conectado":state.status==="permission"?"Permiso requerido":state.status==="syncing"?"Actualizando":"Sin archivo conectado";
    box.querySelector("span").textContent=state.message||"—";
    document.getElementById("filePanelName").textContent=state.fileName||"—";
    document.getElementById("filePanelRead").textContent=state.lastRead?new Date(state.lastRead).toLocaleString("es-CO"):"—";
    document.getElementById("filePanelCount").textContent=String(state.count||metadata()?.count||0);
  }
  function openPanel(){buildPanel();updatePanel();const host=document.getElementById("fileModal");if(host){host.classList.add("is-open");host.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");}}
  async function initialize(){
    buildPanel();handle=await loadHandle();
    if(!handle){emit({status:"unlinked",fileName:localStorage.getItem(FILE_KEY)||"",message:"Sin archivo vinculado"});return;}
    emit({status:"loading",fileName:handle.name||localStorage.getItem(FILE_KEY)||"",message:"Comprobando permiso…"});
    await sync({force:false,requestPermission:false});
    timer=setInterval(()=>{if(!document.hidden)sync({force:false,requestPermission:false});},INTERVAL);
  }
  window.ExcelFileSync={initialize,chooseFile,refresh:()=>sync({force:true,requestPermission:true}),sync,unlink,openPanel,getState:()=>({...state}),hasHandle:()=>Boolean(handle),parseBuffer};
  window.addEventListener("excelSyncState",updatePanel);
  window.addEventListener("focus",()=>{if(handle)sync({force:false,requestPermission:false});});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&handle)sync({force:false,requestPermission:false});});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();