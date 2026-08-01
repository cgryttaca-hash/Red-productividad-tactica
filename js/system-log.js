const KEY = 'rptSystemLogV2';
const LIMIT = 120;

function read(){
  try{
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  }catch(_){
    return [];
  }
}

function write(entries){
  try{
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0,LIMIT)));
  }catch(_){
    // El historial es auxiliar. Nunca debe bloquear el sistema.
  }
}

export function addSystemLog({source='Sistema',level='info',title='',detail='',meta={}}={}){
  const entry = {
    id:`log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,
    timestamp:new Date().toISOString(),
    source:String(source),
    level:['success','warning','error'].includes(level) ? level : 'info',
    title:String(title || 'Actividad registrada'),
    detail:String(detail || ''),
    meta:meta && typeof meta === 'object' ? meta : {}
  };
  write([entry,...read()]);
  window.dispatchEvent(new CustomEvent('rptSystemLogUpdated',{detail:entry}));
  return entry;
}

export function getSystemLogs({source='',level='',limit=60}={}){
  return read()
    .filter(entry => !source || entry.source === source)
    .filter(entry => !level || entry.level === level)
    .slice(0,Math.max(1,Number(limit)||60));
}

export function clearSystemLogs(){
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('rptSystemLogUpdated',{detail:{cleared:true}}));
}
