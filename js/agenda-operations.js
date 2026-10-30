import {field} from './agenda-content.js';
import {parseFoodTimes,localTimeToEpoch} from './food-alerts-core.js';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
export function floorInfo(room){
 const source=norm(room),numbers=[...source.matchAll(/\b(3\d{2,})\b/g)].map(m=>+m[1]);
 if(/TERCER|TERCERO|PISO\s*3\b|3\s*(?:ER|RO)?\s*PISO/.test(source)||numbers.length)return{floor:3,room:numbers.length?Math.min(...numbers):Infinity};
 if(/SEGUNDO|PISO\s*2\b|2\s*(?:DO)?\s*PISO|SALON\s*(?:[123]\b|COMPLETO)|SALONES\s*[123]\b/.test(source))return{floor:2,room:0};
 return{floor:4,room:Infinity};
}
export function eventWindow(record){
 const schedule=field(record,['HORARIO DEL EVENTO','HORARIO','horarioEvento']);
 const parts=schedule.split(/(?:\s*[-–—]\s*|\s+(?:A|HASTA)\s+)/i).filter(Boolean);
 let start=parseFoodTimes(parts[0]||'')[0],end=parseFoodTimes(parts[1]||'')[0];
 const startField=field(record,['HORA DE INICIO','HORA INICIO']),endField=field(record,['HORA DE FINALIZACION','HORA FINAL','HORA FIN']);
 if(startField)start=parseFoodTimes(startField)[0];if(endField)end=parseFoodTimes(endField)[0];
 return{start:start?start.hour*60+start.minute:Infinity,end:end?end.hour*60+end.minute:Infinity,startLabel:start?.originalTime||startField||parts[0]||'',endLabel:end?.originalTime||endField||parts[1]||''};
}
export function eventISO(record){const value=field(record,['FECHA','fechaISO']);let m=value.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0].slice(0,10);m=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';}
export function compareOperational(a,b){
 const x=floorInfo(field(a,['ESCENARIO ASIGNADO','ESCENARIO','SALON','escenario'])),y=floorInfo(field(b,['ESCENARIO ASIGNADO','ESCENARIO','SALON','escenario']));
 const date=eventISO(a).localeCompare(eventISO(b)),time=eventWindow(a).start-eventWindow(b).start;
 return x.floor-y.floor||date||(x.floor===3?x.room-y.room:0)||time||0;
}
export function operationalStatus(record,now=Date.now()){
 if(/CANCEL/.test(norm(field(record,['ESTADO','estado']))))return'Cancelado';
 const date=eventISO(record),{start,end}=eventWindow(record);if(!date||!Number.isFinite(start))return'Horario por confirmar';
 const begin=localTimeToEpoch(date,Math.floor(start/60),start%60);if(begin===null)return'Horario por confirmar';
 let finish=Number.isFinite(end)?localTimeToEpoch(date,Math.floor(end/60),end%60):null;
 if(finish!==null&&end<start)finish+=86400000;
 return now<begin?'Próximo a iniciar':finish!==null&&now>=finish?'Finalizado':'En desarrollo';
}
