const DB_NAME = 'gestion-eventos-auditoria';
const DB_VERSION = 1;
const STORE = 'changes';

let dbPromise = null;

function openDb(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){
      reject(new Error('IndexedDB no está disponible.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store = db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
        store.createIndex('timestamp','timestamp');
        store.createIndex('batchId','batchId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No fue posible abrir la auditoría local.'));
  });
  return dbPromise;
}

export async function appendMany(entries=[]){
  if(!Array.isArray(entries) || !entries.length) return 0;
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE,'readwrite');
    const store = tx.objectStore(STORE);
    entries.forEach(entry=>store.add(entry));
    tx.oncomplete = () => resolve(entries.length);
    tx.onerror = () => reject(tx.error || new Error('No fue posible guardar la auditoría.'));
  });
}

export async function getRecent(limit=80){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE,'readonly');
    const index = tx.objectStore(STORE).index('timestamp');
    const request = index.openCursor(null,'prev');
    const rows = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if(!cursor || rows.length >= limit){
        resolve(rows);
        return;
      }
      rows.push({id:cursor.primaryKey,...cursor.value});
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error('No fue posible leer la auditoría.'));
  });
}

export async function count(){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const request = db.transaction(STORE,'readonly').objectStore(STORE).count();
    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(limit=2000){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const rows=[];
    const request=db.transaction(STORE,'readonly').objectStore(STORE).index('timestamp').openCursor(null,'prev');
    request.onsuccess=()=>{
      const cursor=request.result;
      if(!cursor||rows.length>=Math.max(1,Number(limit)||2000))return resolve(rows);
      rows.push({id:cursor.primaryKey,...cursor.value});
      cursor.continue();
    };
    request.onerror=()=>reject(request.error||new Error('No fue posible leer la auditoría.'));
  });
}

export async function query({from='',to='',user='',company='',field='',sheet='',limit=1000}={}){
  const rows=await getAll(limit);
  const fromTime=from?new Date(`${from}T00:00:00`).getTime():0;
  const toTime=to?new Date(`${to}T23:59:59.999`).getTime():Number.MAX_SAFE_INTEGER;
  const contains=(value,term)=>!term||String(value||'').toLocaleLowerCase('es').includes(String(term).toLocaleLowerCase('es'));
  return rows.filter(row=>{
    const time=new Date(row.timestamp).getTime();
    return time>=fromTime&&time<=toTime
      &&contains(row.user,user)
      &&contains(row.company,company)
      &&contains(row.field,field)
      &&contains(row.sheet,sheet);
  });
}

export function exportCsv(rows=[]){
  const columns=['timestamp','user','host','sheet','row','cell','company','type','field','before','after'];
  const escape=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  return [columns.join(','),...rows.map(row=>columns.map(key=>escape(row[key])).join(','))].join('\n');
}

export async function replaceAll(entries=[]){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE);
    store.clear();
    (Array.isArray(entries)?entries:[]).forEach(entry=>{
      const copy={...entry};
      delete copy.id;
      store.add(copy);
    });
    tx.oncomplete=()=>resolve(entries.length);
    tx.onerror=()=>reject(tx.error||new Error('No fue posible restaurar la auditoría.'));
  });
}
