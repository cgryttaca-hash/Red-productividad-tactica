// Calendario de mantenimiento; no procesa registros operativos.
export const ZONE='America/Bogota';
export const CACHE_KEY='rptMaintenanceCacheV1';
export const PAGE_LABELS=Object.freeze({index:'Centro Operativo',eventos:'Agenda de Eventos',minuta:'Minuta',agenda_movil:'Agenda Móvil',agendas:'Agendas',usuarios:'Usuarios',configuracion:'Configuración',validacion:'Validación Excel',laboratorio:'Laboratorio',asistente:'Asistente'});
export const MESSAGES=Object.freeze({mejoras:'Estamos realizando mejoras en esta sección para ofrecerte una mejor experiencia. Agradecemos tu comprensión.',tecnica:'Esta sección se encuentra temporalmente en actualización. Estaremos disponibles nuevamente lo antes posible.',mantenimiento:'Estamos realizando labores de mantenimiento para mejorar el funcionamiento del servicio. Gracias por tu paciencia.'});
export function bogotaInput(value=Date.now()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
 const get=type=>parts.find(part=>part.type===type)?.value;
 return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function parseBogota(value){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||''))return NaN;
 const stamp=Date.parse(value+'-05:00');return Number.isFinite(stamp)&&bogotaInput(stamp)===value?stamp:NaN;
}
export function stateOf(item,now=Date.now()){
 if(!item?.active)return'disabled';
 const start=item.startsAt?Date.parse(item.startsAt):0,end=item.until?Date.parse(item.until):null;
 if(!Number.isFinite(start)||end!==null&&!Number.isFinite(end))return'invalid';
 // Las programaciones anteriores conservan su vencimiento original.
 if(item.requiresConfirmation!==true&&(end===null||end<=now))return'disabled';
 return start>now?'scheduled':'active';
}
export const isBlocked=(item,now=Date.now())=>stateOf(item,now)==='active';
export function remaining(item,now=Date.now()){const end=Date.parse(item?.until);return Number.isFinite(end)?Math.max(0,end-now):null;}
export function duration(ms){const n=Math.max(0,Math.ceil((Number(ms)||0)/1000));return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(v=>String(v).padStart(2,'0')).join(':');}
export function formatBogota(value){const date=new Date(value);return value&&Number.isFinite(date.getTime())?date.toLocaleString('es-CO',{timeZone:ZONE,dateStyle:'medium',timeStyle:'short'}):'Sin estimación';}
export function makeSchedule({start,end,message,template='mejoras'},now=Date.now()){
 const from=parseBogota(start),to=end?parseBogota(end):null;
 if(!Number.isFinite(from))throw new Error('Indica una fecha y hora de inicio válidas en America/Bogota.');
 if(to!==null&&(!Number.isFinite(to)||to<=from||to<=now))throw new Error('La finalización estimada debe ser posterior al inicio y a la hora actual.');
 return {active:true,requiresConfirmation:true,startsAt:new Date(from).toISOString(),startedAt:new Date(now).toISOString(),until:to===null?null:new Date(to).toISOString(),durationMs:to===null?null:to-from,message:String(message||MESSAGES.mejoras).trim().slice(0,240),template};
}
