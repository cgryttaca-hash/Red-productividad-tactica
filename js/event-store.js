(function(){
  "use strict";

  const DB_NAME = "gestion-eventos-datos";
  const DB_VERSION = 1;
  const STORE_NAME = "datasets";
  const DATA_KEY = "eventos-principal";
  const LEGACY_DATA_KEY = "eventData";
  const LEGACY_SHEETS_KEY = "eventDataSheets";
  const UPDATED_AT_KEY = "eventDataUpdatedAt";
  const SIGNAL_KEY = "eventDataSignal";

  let databasePromise = null;
  let migrationPromise = null;
  let writeQueue = Promise.resolve();

  function openDatabase(){
    if(databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if(!("indexedDB" in window)){
        reject(new Error("Este navegador no admite IndexedDB."));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)){
          db.createObjectStore(STORE_NAME, {keyPath:"id"});
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("No fue posible abrir la base local de eventos."));
      request.onblocked = () => reject(new Error("La base local está bloqueada por otra pestaña. Cierra las demás pestañas y vuelve a intentar."));
    });
    return databasePromise;
  }

  async function transact(mode, action){
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      let result;
      try{
        result = action(store);
      }catch(error){
        reject(error);
        return;
      }

      transaction.oncomplete = () => resolve(result?.result);
      transaction.onerror = () => reject(transaction.error || result?.error || new Error("No fue posible completar la operación local."));
      transaction.onabort = () => reject(transaction.error || new Error("La operación local fue cancelada."));
    });
  }

  function safeRemoveLegacy(){
    try{ localStorage.removeItem(LEGACY_DATA_KEY); }catch(_){}
    try{ localStorage.removeItem(LEGACY_SHEETS_KEY); }catch(_){}
  }

  function safeSetSmall(key, value){
    try{
      localStorage.setItem(key, value);
      return true;
    }catch(error){
      if(error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014){
        safeRemoveLegacy();
        try{
          localStorage.setItem(key, value);
          return true;
        }catch(_){
          return false;
        }
      }
      return false;
    }
  }

  async function save(rows, sheets=[], options={}){
    if(!Array.isArray(rows)) throw new TypeError("Los eventos deben ser una lista.");

    writeQueue = writeQueue.catch(()=>{}).then(async () => {
      const updatedAt = options.updatedAt || new Date().toISOString();
      const payload = {
        id:DATA_KEY,
        rows,
        sheets:Array.isArray(sheets) ? sheets : [],
        updatedAt,
        fileName:options.fileName || "",
        fileSize:Number(options.fileSize || 0),
        fileLastModified:Number(options.fileLastModified || 0),
        savedAt:new Date().toISOString(),
        count:rows.length
      };

      await transact("readwrite", store => store.put(payload));

      // Libera inmediatamente el contenido grande que causaba QuotaExceededError.
      safeRemoveLegacy();
      safeSetSmall(UPDATED_AT_KEY, updatedAt);
      safeSetSmall(SIGNAL_KEY, `${updatedAt}:${rows.length}:${Math.random().toString(36).slice(2,8)}`);

      return payload;
    });

    return writeQueue;
  }

  async function readDirect(){
    return transact("readonly", store => store.get(DATA_KEY));
  }

  async function migrateLegacy(){
    if(migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
      let raw = null;
      try{ raw = localStorage.getItem(LEGACY_DATA_KEY); }catch(_){}
      if(!raw) return null;

      try{
        const rows = JSON.parse(raw);
        const sheetsRaw = localStorage.getItem(LEGACY_SHEETS_KEY) || "[]";
        const sheets = JSON.parse(sheetsRaw);
        if(!Array.isArray(rows)) throw new Error("El respaldo anterior no contiene una lista de eventos.");
        const updatedAt = localStorage.getItem(UPDATED_AT_KEY) || new Date().toISOString();
        const payload = await save(rows, Array.isArray(sheets) ? sheets : [], {updatedAt});
        return payload;
      }catch(error){
        console.error("No fue posible migrar el almacenamiento anterior:", error);
        // Un valor incompleto o corrupto no debe bloquear la aplicación.
        safeRemoveLegacy();
        return null;
      }
    })();
    return migrationPromise;
  }

  async function load(){
    let payload = await readDirect();
    if(payload) return payload;
    payload = await migrateLegacy();
    return payload || {
      id:DATA_KEY,
      rows:[],
      sheets:[],
      updatedAt:localStorage.getItem(UPDATED_AT_KEY) || "",
      count:0
    };
  }

  async function getRows(){
    const payload = await load();
    return Array.isArray(payload.rows) ? payload.rows : [];
  }

  async function getSheets(){
    const payload = await load();
    return Array.isArray(payload.sheets) ? payload.sheets : [];
  }

  async function clear(){
    await transact("readwrite", store => store.delete(DATA_KEY));
    safeRemoveLegacy();
    safeSetSmall(SIGNAL_KEY, `cleared:${Date.now()}`);
  }

  function dispatchUpdated(detail={}){
    const updatedAt = detail.updatedAt || new Date().toISOString();
    const payload = {...detail, updatedAt};

    window.dispatchEvent(new CustomEvent("eventDataUpdated", {detail:payload}));

    if("BroadcastChannel" in window){
      const channel = new BroadcastChannel("gestion-eventos-sync");
      channel.postMessage({type:"eventDataUpdated", ...payload});
      channel.close();
    }
  }

  window.EventDataStore = {
    save,
    load,
    getRows,
    getSheets,
    clear,
    migrateLegacy,
    safeSetSmall,
    dispatchUpdated,
    keys:{
      updatedAt:UPDATED_AT_KEY,
      signal:SIGNAL_KEY
    }
  };

  // Inicia la recuperación cuanto antes, sin bloquear el resto de scripts.
  migrateLegacy().catch(error => console.error("Migración inicial fallida:", error));
})();