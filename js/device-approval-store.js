// Última decisión confirmada para consulta sin red. Nunca autoriza un equipo nuevo.
const NAME='rpt-device-approval-v1',STORE='decisions';
function db(){return new Promise((resolve,reject)=>{const request=indexedDB.open(NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function readDecision(uid){const database=await db();try{return await new Promise((resolve,reject)=>{const request=database.transaction(STORE).objectStore(STORE).get(uid);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}finally{database.close();}}
export async function saveDecision(uid,value){const database=await db();try{await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,uid);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{database.close();}}
