import {adminDataset} from './admin-data.js';
import {analyze,today} from './admin-analytics.js';
import {el,heading,sourceNote,metrics,table,number} from './admin-ui.js';
export function mount(host){
 function refresh(){
  const snapshot=adminDataset(),date=today(),events=snapshot.events.filter(event=>event.date===date),next=snapshot.events.filter(event=>event.date>date).sort((a,b)=>a.date.localeCompare(b.date)||(a.eventWindow?.start??Infinity)-(b.eventWindow?.start??Infinity)),stats=analyze(events);
  host.replaceChildren(heading('Resumen','Operación registrada para hoy · '+date+' · America/Bogota'),sourceNote(snapshot),metrics([['Eventos de hoy',stats.count],['Próximos eventos',next.length,'Desde mañana, en las fechas disponibles'],['Personas programadas',stats.knownPaxEvents?stats.knownPax:null,stats.missingPax?`${stats.missingPax} evento(s) sin PAX válido`:'PAX del origen; no acredita asistencia'],['Servicios con hora',stats.serviceCount,'Horarios A&B con servicio registrado']]));
  const grid=el('div',undefined,'control-two-columns');
  for(const[title,values]of [['Eventos de hoy por piso',stats.byFloor],['Estado registrado de hoy',stats.byStatus]]){const block=el('section',undefined,'control-block');block.append(el('h3',title),table(['Clasificación','Eventos'],values.map(item=>[item.label,item.count])));grid.append(block);}host.append(grid);
  const upcoming=el('section',undefined,'control-block');upcoming.append(el('h3','Próximos registros'),table(['Fecha','Empresa','Escenario','Horario','PAX'],next.slice(0,5).map(event=>[event.date,event.company||'Sin dato',event.room||'Sin dato',event.schedule||'Sin dato',number(event.pax)]),'Hasta cinco próximos registros disponibles. Se incluyen los estados registrados en la fuente.'));host.append(upcoming);
  const missing=snapshot.events.filter(event=>!event.date).length;if(missing)host.append(el('p',`${missing} registro(s) sin fecha válida no pueden ubicarse en hoy o próximos. Revisa Calidad de datos.`,'control-note'));
 }
 refresh();return{refresh};
}
