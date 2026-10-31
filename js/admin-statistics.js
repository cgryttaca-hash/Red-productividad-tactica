import {adminDataset} from './admin-data.js';
import {filterRecords,analyze,periodRange} from './admin-analytics.js';
import {requireControlAccess} from './admin-records.js';
import {el,heading,sourceNote,metrics,table,number,rangeForm,download} from './admin-ui.js';
const svgNS='http://www.w3.org/2000/svg';
function graph(title,rows,line=false){
 const block=el('section',undefined,'control-block control-graph');block.append(el('h3',title));
 if(!rows.length){block.append(el('p','No hay datos para este gráfico.','control-note'));return block;}
 const visible=line?rows.slice(-31):rows.slice(0,12),max=Math.max(...visible.map(row=>row.count),1);
 if(line&&visible.length===1){block.append(table(['Período','Valor'],[[visible[0].label,number(visible[0].count)]]),el('p','Solo hay un período con registros; no se puede evaluar una tendencia.','control-note'));return block;}
 if(line){
  const figure=el('figure'),svg=document.createElementNS(svgNS,'svg'),name=document.createElementNS(svgNS,'title');name.textContent=title+' · cifras calculadas del origen';svg.setAttribute('role','img');svg.setAttribute('aria-label',name.textContent);svg.setAttribute('viewBox','0 0 640 150');svg.append(name);
  const points=visible.map((row,index)=>`${visible.length===1?320:24+index/(visible.length-1)*592},${126-row.count/max*100}`).join(' '),path=document.createElementNS(svgNS,'polyline');path.setAttribute('points',points);path.setAttribute('fill','none');path.setAttribute('stroke','#245c81');path.setAttribute('stroke-width','2');svg.append(path);
  visible.forEach((row,index)=>{const circle=document.createElementNS(svgNS,'circle');circle.setAttribute('cx',String(visible.length===1?320:24+index/(visible.length-1)*592));circle.setAttribute('cy',String(126-row.count/max*100));circle.setAttribute('r','3');circle.setAttribute('fill','#b99653');svg.append(circle);});figure.append(svg,el('figcaption',`${visible[0].label} a ${visible[visible.length-1].label}. Se representan fechas con registros; consulta las cifras debajo.`));block.append(figure);
 }else{
  const list=el('ol',undefined,'control-bars');for(const row of visible){const item=el('li'),name=el('span',row.label),bar=el('span',undefined,'control-bar'),fill=el('i');fill.style.width=(row.count/max*100)+'%';bar.setAttribute('aria-hidden','true');bar.append(fill);item.append(name,bar,el('b',number(row.count)));list.append(item);}block.append(list);
 }
 const details=el('details'),summary=el('summary','Ver cifras del gráfico');details.append(summary,table(['Período o categoría','Valor'],visible.map(row=>[row.label,number(row.count)])));block.append(details);
 if(rows.length>visible.length)block.append(el('p',line?'Se muestran los últimos 31 períodos con registros. La descarga incluye todas las cifras.':'Se muestran las 12 categorías con mayor cantidad. La descarga incluye todas.','control-note'));
 return block;
}
export function mount(host){
 let category='events',stats,filters;
 const title=heading('Estadísticas','Cifras calculadas desde los registros existentes. No se crean datos de ejemplo.'),source=el('div'),form=rangeForm('stats'),message=el('p',undefined,'control-error'),nav=el('div',undefined,'control-subnav'),content=el('div');nav.setAttribute('role','group');nav.setAttribute('aria-label','Tipo de estadística');
 for(const[value,label]of [['events','Eventos'],['people','Personas'],['companies','Empresas'],['spaces','Espacios'],['food','Servicios']]){const button=el('button',label);button.type='button';button.dataset.statCategory=value;button.setAttribute('aria-pressed',String(value===category));button.addEventListener('click',()=>{requireControlAccess();category=value;renderGraphs();});nav.append(button);}
 const exportButton=el('button','Descargar cifras','control-secondary');exportButton.type='button';exportButton.addEventListener('click',()=>{requireControlAccess();const groups=[['Eventos por día',stats.perDay],['Eventos por mes',stats.perMonth],['Estado',stats.byStatus],['Empresa',stats.byCompany],['Escenario',stats.byRoom],['Piso',stats.byFloor],['Servicio del origen',stats.byService],['Hora A&B',stats.byServiceHour],['Personas por fecha',stats.paxPerDay]];const cell=value=>'"'+String(value??'').replaceAll('"','""').replace(/^[=+@-]/,"'$&")+'"';const lines=[['Sección','Categoría','Valor','Registros sin PAX'],...groups.flatMap(([name,rows])=>rows.map(row=>[name,row.label,row.count,row.missing??'']))];download('\uFEFF'+lines.map(row=>row.map(cell).join(';')).join('\r\n'),'Estadisticas-eventos.csv','text/csv;charset=utf-8');});
 host.replaceChildren(title,source,form,message,nav,content,exportButton,el('p','Se cuentan registros, incluidos los estados que coincidan con los filtros. PAX significa personas registradas/programadas; la fuente no acredita asistencia real. Los posibles duplicados se señalan en Calidad de datos y se conservan en las cifras.','control-note'));
 function setPeriod(){const range=periodRange(form.elements.period.value);form.elements.from.value=range.from;form.elements.to.value=range.to;}
 function renderGraphs(){
  nav.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.statCategory===category)));
  const nodes=[];if(category==='events')nodes.push(metrics([['Eventos',stats.count],['Sin fecha válida',stats.missingDate]]),graph('Eventos por día y tendencia',stats.perDay,true),graph('Eventos por mes',stats.perMonth,true),graph('Eventos por estado',stats.byStatus));
  if(category==='people')nodes.push(metrics([['Personas registradas',stats.knownPaxEvents?stats.knownPax:null],['Promedio por evento con PAX',stats.averagePax],['Registros sin PAX válido',stats.missingPax]]),graph('Personas registradas por fecha',stats.paxPerDay.filter(row=>row.known>0),true),table(['Fecha','PAX conocido','Eventos sin PAX'],stats.paxPerDay.slice(-31).map(row=>[row.label,row.known?number(row.count):'No disponible',row.missing])));
  if(category==='companies')nodes.push(graph('Empresas con mayor número de eventos',stats.byCompany),el('p','Distribución según el nombre registrado; las diferencias solo de mayúsculas o acentos se agrupan para el cálculo.','control-note'));
  if(category==='spaces')nodes.push(graph('Uso registrado por piso',stats.byFloor),graph('Salones y escenarios más utilizados',stats.byRoom),el('p','Uso expresa cantidad de registros por escenario. No se calcula una tasa de ocupación sin capacidad y disponibilidad verificadas.','control-note'));
  if(category==='food')nodes.push(metrics([['Servicios con horario registrado',stats.serviceCount]]),graph('Servicios registrados en el origen',stats.byService),graph('Horarios A&B con mayor actividad',stats.byServiceHour),el('p','Cada etiqueta conserva el servicio/descripción del origen. No se inventan tipos ni horarios. Los textos sin relación horaria confirmada se revisan en Calidad de datos.','control-note'));
  content.replaceChildren(...nodes);
 }
 function refresh(){try{const snapshot=adminDataset();filters={from:form.elements.from.value,to:form.elements.to.value,company:form.elements.company.value,room:form.elements.room.value,status:form.elements.status.value};stats=analyze(filterRecords(snapshot.events,filters));source.replaceChildren(sourceNote(snapshot));message.textContent='';renderGraphs();}catch(error){message.textContent=error.message;}}
 form.addEventListener('submit',event=>{event.preventDefault();refresh();});form.elements.period.addEventListener('change',()=>{if(form.elements.period.value!=='custom'){setPeriod();refresh();}});for(const name of ['from','to'])form.elements[name].addEventListener('change',()=>{form.elements.period.value='custom';});setPeriod();refresh();return{refresh};
}
