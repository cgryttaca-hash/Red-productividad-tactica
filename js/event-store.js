(function(){
  "use strict";
  const DB_NAME="gestion-eventos-datos";
  const DB_VERSION=1;
  const STORE="datasets";
  const KEY="eventos-principal";
  const LEGACY_KEY="eventData";
  const LEGACY_SHEETS="eventDataSheets";
  const LEGACY_LARGE_KEYS=[
    "agendaEventos:fuentePrincipalEventos",
    "agendaEventos:fuentePrincipalEventosMeta",
    "agendaEventos:auditoriaSistema",
    "agendaEventos:lastBroadcast"
  ];
  const UPDATED_KEY="eventDataUpdatedAt";
  const SIGNAL_KEY="eventDataSignal";
  let dbPromise=null;
  let queue=Promise.resolve();

  function openDB(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!("indexedDB"in window)){reject(new Error("Este navegador no admite IndexedDB."));return;}
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error("No fue posible abrir la base local."));
      request.onblocked=()=>reject(new Error("La base local está bloqueada por otra pestaña."));
    });
    return dbPromise;
  }
  async function transaction(mode,callback){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      const store=tx.objectStore(STORE);
      let request;
      try{request=callback(store);}catch(error){reject(error);return;}
      tx.oncomplete=()=>resolve(request?.result);
      tx.onerror=()=>reject(tx.error||request?.error||new Error("No fue posible completar la operación local."));
      tx.onabort=()=>reject(tx.error||new Error("La operación local fue cancelada."));
    });
  }
  function safeSmallSet(key,value){
    try{localStorage.setItem(key,String(value));return true;}
    catch(error){
      try{localStorage.removeItem(LEGACY_KEY);localStorage.removeItem(LEGACY_SHEETS);localStorage.setItem(key,String(value));return true;}
      catch(_){return false;}
    }
  }
  function clearLegacy(){
    try{localStorage.removeItem(LEGACY_KEY);}catch(_){}
    try{localStorage.removeItem(LEGACY_SHEETS);}catch(_){}
    LEGACY_LARGE_KEYS.forEach(key=>{try{localStorage.removeItem(key);}catch(_){}});
  }
  async function save(rows,sheets=[],meta={}){
    if(!Array.isArray(rows))throw new TypeError("Los eventos deben ser una lista.");
    queue=queue.catch(()=>{}).then(async()=>{
      const updatedAt=meta.updatedAt||new Date().toISOString();
      const payload={
        id:KEY,rows,sheets:Array.isArray(sheets)?sheets:[],updatedAt,
        fileName:meta.fileName||"",fileSize:Number(meta.fileSize||0),
        fileLastModified:Number(meta.fileLastModified||0),count:rows.length,
        savedAt:new Date().toISOString()
      };
      await transaction("readwrite",store=>store.put(payload));
      clearLegacy();
      safeSmallSet(UPDATED_KEY,updatedAt);
      safeSmallSet(SIGNAL_KEY,`${updatedAt}:${rows.length}:${Math.random().toString(36).slice(2,7)}`);
      return payload;
    });
    return queue;
  }
  async function read(){return transaction("readonly",store=>store.get(KEY));}
  async function migrate(){
    let raw=null;
    try{raw=localStorage.getItem(LEGACY_KEY);}catch(_){}
    if(!raw)return null;
    try{
      const rows=JSON.parse(raw);
      const sheets=JSON.parse(localStorage.getItem(LEGACY_SHEETS)||"[]");
      if(!Array.isArray(rows))throw new Error("Respaldo anterior inválido.");
      return await save(rows,Array.isArray(sheets)?sheets:[],{updatedAt:localStorage.getItem(UPDATED_KEY)||new Date().toISOString()});
    }catch(error){
      console.warn("No se pudo recuperar el almacenamiento anterior:",error);
      clearLegacy();
      return null;
    }
  }
  async function load(){
    let payload=await read();
    if(!payload)payload=await migrate();
    return payload||{id:KEY,rows:[],sheets:[],updatedAt:localStorage.getItem(UPDATED_KEY)||"",count:0};
  }
  async function getRows(){const data=await load();return Array.isArray(data.rows)?data.rows:[];}
  async function clear(){await transaction("readwrite",store=>store.delete(KEY));clearLegacy();safeSmallSet(SIGNAL_KEY,`clear:${Date.now()}`);}
  function dispatchUpdated(detail={}){
    const payload={...detail,updatedAt:detail.updatedAt||new Date().toISOString()};
    window.dispatchEvent(new CustomEvent("eventDataUpdated",{detail:payload}));
    if("BroadcastChannel"in window){const channel=new BroadcastChannel("rpt-event-data");channel.postMessage({type:"eventDataUpdated",...payload});channel.close();}
  }
  async function estimate(){
    if(!navigator.storage?.estimate)return null;
    try{return await navigator.storage.estimate();}catch(_){return null;}
  }
  window.EventDataStore={save,load,getRows,clear,migrate,dispatchUpdated,estimate,safeSmallSet,keys:{updatedAt:UPDATED_KEY,signal:SIGNAL_KEY}};
  migrate().catch(()=>{});
  if("BroadcastChannel"in window){
    const channel=new BroadcastChannel("rpt-event-data");
    channel.addEventListener("message",event=>{if(event.data?.type==="eventDataUpdated")window.dispatchEvent(new CustomEvent("eventDataUpdated",{detail:event.data}));});
  }
})();