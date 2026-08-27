const DB_NAME='rpt-backups';
const DB_VERSION=1;
const STORE='snapshots';
const AUTO_LIMIT=5;

let dbPromise=null;
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store=db.createObjectStore(STORE,{keyPath:'id'});
        store.createIndex('createdAt','createdAt');
        store.createIndex('kind','kind');
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('No fue posible abrir los respaldos.'));
  });
  return dbPromise;
}
function readJson(key,fallback=null){
  try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(_){return fallback;}
}
function snapshotPayload({includeUsers=true}={}){
  const keys=[
    'eventData','eventDataSheets','eventDataUpdatedAt','excelSync:fileMeta',
    'excelSync:fileName','excelSync:lastCheck','excelSync:dataHash','excelSync:lastDiff',
    'rptValidationReportV1','rptMaintenanceCacheV1','rptSystemLogV2'
  ];
  const storage={};
  keys.forEach(key=>{
    const value=localStorage.getItem(key);
    if(value!==null)storage[key]=value;
  });
  if(includeUsers){
    ['rptAuthUsersV1','rptAuthDeviceV1'].forEach(key=>{
      const value=localStorage.getItem(key);
      if(value!==null)storage[key]=value;
    });
  }
  return {
    schemaVersion:1,
    appVersion:'3.0.0',
    origin:location.origin,
    pathname:location.pathname,
    storage,
    eventCount:Array.isArray(readJson('eventData',[]))?readJson('eventData',[]).length:0,
    fileName:localStorage.getItem('excelSync:fileName')||'',
    dataUpdatedAt:localStorage.getItem('eventDataUpdatedAt')||''
  };
}
async function put(snapshot){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(snapshot);
    tx.oncomplete=()=>resolve(snapshot);
    tx.onerror=()=>reject(tx.error||new Error('No fue posible guardar el respaldo.'));
  });
}
export async function createSnapshot({kind='manual',reason='',includeUsers=true}={}){
  const createdAt=new Date().toISOString();
  const payload=snapshotPayload({includeUsers});
  try{
    const auditModule=await import('./audit-store.js');
    payload.audit=await auditModule.getAll(3000);
  }catch(_){payload.audit=[];}
  try{
    payload.performance=JSON.parse(localStorage.getItem('rptPerformanceV1')||'[]');
  }catch(_){payload.performance=[];}
  const snapshot={
    id:`backup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,
    kind:kind==='automatic'?'automatic':'manual',
    reason:String(reason||'Respaldo del sistema'),
    createdAt,
    payload
  };
  await put(snapshot);
  if(snapshot.kind==='automatic')await enforceAutomaticLimit(AUTO_LIMIT);
  window.dispatchEvent(new CustomEvent('rptBackupUpdated',{detail:snapshot}));
  return snapshot;
}
export async function listSnapshots(limit=30){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const rows=[];
    const request=db.transaction(STORE,'readonly').objectStore(STORE).index('createdAt').openCursor(null,'prev');
    request.onsuccess=()=>{
      const cursor=request.result;
      if(!cursor||rows.length>=limit)return resolve(rows);
      rows.push(cursor.value);cursor.continue();
    };
    request.onerror=()=>reject(request.error||new Error('No fue posible leer los respaldos.'));
  });
}
export async function getSnapshot(id){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error);
  });
}
export async function deleteSnapshot(id){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error);
  });
}
export async function enforceAutomaticLimit(limit=AUTO_LIMIT){
  const rows=(await listSnapshots(100)).filter(row=>row.kind==='automatic');
  for(const row of rows.slice(limit))await deleteSnapshot(row.id);
}
export async function restoreSnapshot(snapshot,{restoreUsers=false}={}){
  const value=typeof snapshot==='string'?await getSnapshot(snapshot):snapshot;
  if(!value?.payload?.storage)throw new Error('El respaldo no tiene una estructura válida.');
  const protectedKeys=new Set(['rptAuthUsersV1','rptAuthDeviceV1']);
  Object.entries(value.payload.storage).forEach(([key,item])=>{
    if(protectedKeys.has(key)&&!restoreUsers)return;
    localStorage.setItem(key,item);
  });
  if(Array.isArray(value.payload.audit)){
    try{
      const auditModule=await import('./audit-store.js');
      await auditModule.replaceAll(value.payload.audit);
    }catch(_){}
  }
  if(Array.isArray(value.payload.performance)){
    try{localStorage.setItem('rptPerformanceV1',JSON.stringify(value.payload.performance));}catch(_){}
  }
  localStorage.setItem('rptLastRestoreV1',JSON.stringify({
    backupId:value.id,
    restoredAt:new Date().toISOString(),
    sourceCreatedAt:value.createdAt
  }));
  window.dispatchEvent(new CustomEvent('eventDataUpdated',{detail:{restored:true,backupId:value.id}}));
  window.dispatchEvent(new CustomEvent('eventAuditUpdated',{detail:{restored:true}}));
  return value;
}
export function downloadSnapshot(snapshot){
  const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=`respaldo-eventos-${new Date(snapshot.createdAt).toISOString().replace(/[:.]/g,'-')}.json`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function importSnapshotFile(file){
  const data=JSON.parse(await file.text());
  if(!data?.payload?.storage)throw new Error('El archivo no corresponde a un respaldo válido.');
  data.id=data.id||`backup_import_${Date.now().toString(36)}`;
  data.kind='manual';
  data.reason=`Importado desde ${file.name}`;
  data.createdAt=data.createdAt||new Date().toISOString();
  await put(data);
  return data;
}
