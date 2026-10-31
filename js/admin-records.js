let previousRaw,previousRows;
export function requireControlAccess(){
  if(!window.RPTAdminAccess?.hasAccess())throw new Error('Se requiere la validación administrativa mediante Ctrl + M.');
}
export function readAdminRecords(){
  requireControlAccess();
  const raw=localStorage.getItem('eventData');
  if(raw===null)return{rows:[],available:false,fileName:localStorage.getItem('excelSync:fileName')||'',updatedAt:localStorage.getItem('eventDataUpdatedAt')||''};
  if(raw!==previousRaw){
    let rows;try{rows=JSON.parse(raw);}catch(_){throw new Error('Los registros locales no son legibles. No se ha modificado su contenido.');}
    if(!Array.isArray(rows))throw new Error('La fuente local no contiene una lista de eventos.');
    previousRows=rows;previousRaw=raw;
  }
  return{rows:previousRows,available:true,fileName:localStorage.getItem('excelSync:fileName')||'',updatedAt:localStorage.getItem('eventDataUpdatedAt')||''};
}
