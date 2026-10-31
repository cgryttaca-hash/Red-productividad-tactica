import {field} from './agenda-content.js';
import {floorInfo,eventWindow} from './agenda-operations.js';
import {foodFields,presentFoodServices,parseFoodTimes} from './food-alerts-core.js';
export const ZONE='America/Bogota';
export const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLocaleLowerCase('es');
export function calendarDate(value){
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);
  if(typeof value==='number'&&Number.isFinite(value)&&value>0&&value<100000)return new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
  const text=String(value??'').trim();let match=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/),year,month,day;
  if(match)[,year,month,day]=match;else{match=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(!match)return'';[,day,month,year]=match;}
  const result=new Date(Date.UTC(+year,+month-1,+day));return result.getUTCFullYear()===+year&&result.getUTCMonth()===+month-1&&result.getUTCDate()===+day?result.toISOString().slice(0,10):'';
}
export function today(now=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
const iso=date=>date.toISOString().slice(0,10);
export function periodRange(period,now=Date.now()){
  const day=today(now),start=new Date(day+'T12:00:00Z'),end=new Date(start);
  if(period==='all')return{from:'',to:''};
  if(period==='week'){start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));end.setTime(start.getTime());end.setUTCDate(end.getUTCDate()+6);}
  else if(period==='month'){start.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1,0);}
  else if(period==='year'){start.setUTCMonth(0,1);end.setUTCMonth(11,31);}
  else if(period!=='today')throw new Error('Selecciona un período válido.');
  return{from:iso(start),to:iso(end)};
}
function paxValue(value){const source=String(value??'').trim();if(!source||!/^[+]?\d+(?:\.\d+)?$/.test(source))return null;const number=Number(source);return Number.isSafeInteger(number)&&number>=0?number:null;}
function dateValue(row){for(const key of ['FECHA','fechaISO','fecha'])if(row[key]!==undefined&&row[key]!==null&&String(row[key]).trim())return row[key];return'';}
const noFood=value=>!fold(value)||/^(sin alimentacion|sin servicio|no requiere alimentacion|no aplica|cancelado|n\/?a|ninguno|ninguna|no|0)[.!\s]*$/.test(fold(value));
export function normalizeRecords(rows){
  return rows.map((row,index)=>{
    if(!row||typeof row!=='object'||Array.isArray(row))return{id:`fila-${index+1}`,sourceRow:index+1,date:'',company:'',room:'',schedule:'',pax:null,status:'',floor:4,services:[],foodGroups:[],foodUnassigned:[],invalidRecord:true};
    const company=field(row,['NOMBRE DE LA EMPRESA','EMPRESA','empresa','CLIENTE']),room=field(row,['ESCENARIO ASIGNADO','ESCENARIO','SALON','escenario']);
    const foodGroups=foodFields(row),projection=presentFoodServices(row);
    return{id:field(row,['__EVENT_ID','id'])||`fila-${index+1}`,sourceRow:index+1,sourceSheet:field(row,['HOJA_ORIGEN','hojaOrigen']),sourceLine:field(row,['__FILA_ORIGEN']),date:calendarDate(dateValue(row)),company,room,schedule:field(row,['HORARIO DEL EVENTO','HORARIO','horarioEvento']),pax:paxValue(field(row,['CANTIDAD DE PERSONAS','PAX','cantidadPersonas'])),status:field(row,['ESTADO','estado']),floor:floorInfo(room).floor,eventWindow:eventWindow(row),services:projection.services.filter(service=>!noFood(service.text)),foodGroups,foodUnassigned:projection.unassigned,notes:field(row,['OBSERVACION','OBSERVACIONES','observacion'])};
  });
}
export function validateFilters(value={}){
  const filters={from:String(value.from||''),to:String(value.to||''),company:String(value.company||'').trim(),room:String(value.room||'').trim(),status:String(value.status||'').trim()};
  for(const key of ['from','to'])if(filters[key]&&calendarDate(filters[key])!==filters[key])throw new Error('Indica fechas válidas.');
  if(filters.from&&filters.to&&filters.from>filters.to)throw new Error('La fecha final debe ser igual o posterior a la inicial.');
  if(['company','room','status'].some(key=>filters[key].length>160))throw new Error('El filtro es demasiado largo.');
  return filters;
}
export function filterRecords(events,value={}){
  const filters=validateFilters(value);
  return events.filter(event=>(!filters.from||event.date&&event.date>=filters.from)&&(!filters.to||event.date&&event.date<=filters.to)&&['company','room','status'].every(key=>!filters[key]||fold(event[key]).includes(fold(filters[key]))));
}
export function groupCounts(events,key){
  const groups=new Map();for(const event of events){const label=typeof key==='function'?key(event):event[key];if(!label)continue;const normalized=fold(label);const current=groups.get(normalized)||{label:String(label),count:0};current.count++;groups.set(normalized,current);}
  return[...groups.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'es',{numeric:true}));
}
export function analyze(events){
  const withPax=events.filter(event=>event.pax!==null),knownPax=withPax.reduce((sum,event)=>sum+event.pax,0),services=events.flatMap(event=>event.services.map(service=>({...service,eventId:event.id,date:event.date,company:event.company,room:event.room,status:event.status})));
  const perDay=groupCounts(events,event=>event.date).sort((a,b)=>a.label.localeCompare(b.label)),perMonth=groupCounts(events,event=>event.date.slice(0,7)).sort((a,b)=>a.label.localeCompare(b.label));
  const paxByDay=new Map();for(const event of events){if(!event.date)continue;const day=paxByDay.get(event.date)||{label:event.date,count:0,missing:0,known:0};if(event.pax===null)day.missing++;else{day.known++;day.count+=event.pax;}paxByDay.set(event.date,day);}const paxPerDay=perDay.map(day=>paxByDay.get(day.label));
  return{count:events.length,knownPax,knownPaxEvents:withPax.length,missingPax:events.length-withPax.length,averagePax:withPax.length?knownPax/withPax.length:null,services,serviceCount:services.length,perDay,perMonth,paxPerDay,byCompany:groupCounts(events,'company'),byRoom:groupCounts(events,'room'),byStatus:groupCounts(events,event=>event.status||'Sin estado registrado'),byFloor:groupCounts(events,event=>event.floor===2?'Segundo piso':event.floor===3?'Tercer piso':'Otros / sin clasificación'),byService:groupCounts(services,event=>event.serviceLabel||event.text),byServiceHour:groupCounts(services,event=>`${String(event.hour).padStart(2,'0')}:${String(event.minute).padStart(2,'0')}`).sort((a,b)=>a.label.localeCompare(b.label)),missingDate:events.filter(event=>!event.date).length};
}
export function qualityIssues(events){
  const issues=[],groups=new Map();
  for(const event of events){
    const missing=[...(!event.date?['Fecha válida']:[]),...(!event.company?['Empresa']:[]),...(!event.room?['Escenario']:[]),...(!event.schedule?['Horario del evento']:[]),...(event.pax===null?['PAX válido']:[])];
    if(event.invalidRecord)missing.push('Registro con estructura no válida');
    if(missing.length)issues.push({event,kind:'Campos por completar',detail:missing.join(', ')});
    for(const group of event.foodGroups){
      if(!noFood(group.description)&&(!group.schedule||!parseFoodTimes(group.schedule).length))issues.push({event,kind:'Alimentación por revisar',detail:'Hay descripción sin un horario A&B interpretable. No se asignó una hora.'});
      else if(!noFood(group.schedule)&&noFood(group.description))issues.push({event,kind:'Alimentación por revisar',detail:'El campo de descripción está vacío o indica que no hay alimentación; existe contenido en Horario A&B.'});
    }
    if(event.foodUnassigned.some(value=>!noFood(value)))issues.push({event,kind:'Correspondencia por revisar',detail:'Hay texto del origen sin correspondencia horaria inequívoca. Se conserva en la vista móvil sin asignarle un horario.'});
    if(event.date&&event.company&&event.room&&event.schedule){const key=[event.date,fold(event.company),fold(event.schedule),fold(event.room)].join('|');const group=groups.get(key)||[];group.push(event);groups.set(key,group);}
  }
  for(const duplicate of [...groups.values()].filter(group=>group.length>1)){const ids=duplicate.slice(0,8).map(row=>row.id).join(', ')+(duplicate.length>8?'…':'');for(const event of duplicate)issues.push({event,kind:'Posible duplicado',detail:`Coinciden fecha, empresa, horario y escenario en ${duplicate.length} registros: ${ids}. Revisar; no se ha eliminado ni fusionado ningún registro.`});}
  return issues;
}
