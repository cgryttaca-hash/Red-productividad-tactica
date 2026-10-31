import {adminDataset} from './admin-data.js';
import {qualityIssues} from './admin-analytics.js';
import {requireControlAccess} from './admin-records.js';
import {el,heading,sourceNote,metrics,table} from './admin-ui.js';
export function mount(host){
 let page=0,issues=[],snapshot;
 const source=el('div'),counts=el('div'),body=el('div'),navigation=el('div',undefined,'control-pagination'),previous=el('button','Anterior'),next=el('button','Siguiente'),status=el('span');previous.type=next.type='button';navigation.append(previous,status,next);
 host.replaceChildren(heading('Calidad de datos','Revisión de todos los registros locales. Se detecta y se sugiere; nunca se modifica, fusiona ni elimina información.'),source,counts,body,navigation);
 function render(){requireControlAccess();const size=50;page=Math.min(page,Math.max(0,Math.ceil(issues.length/size)-1));const rows=issues.slice(page*size,(page+1)*size);body.replaceChildren(table(['Registro / origen','Empresa','Fecha','Revisión','Detalle'],rows.map(item=>[item.event.id+(item.event.sourceSheet?' · '+item.event.sourceSheet+' / '+(item.event.sourceLine||item.event.sourceRow):''),item.event.company||'Sin dato',item.event.date||'Sin fecha válida',item.kind,item.detail])));status.textContent=issues.length?`${page*size+1}–${Math.min((page+1)*size,issues.length)} de ${issues.length}`:'Sin incidencias entre los campos comprobados';previous.disabled=page===0;next.disabled=(page+1)*size>=issues.length;}
 previous.addEventListener('click',()=>{page--;render();});next.addEventListener('click',()=>{page++;render();});
 function refresh(){snapshot=adminDataset();issues=qualityIssues(snapshot.events);source.replaceChildren(sourceNote(snapshot));counts.replaceChildren(metrics([['Registros revisados',snapshot.events.length],['Registros con revisiones',new Set(issues.map(item=>item.event.sourceRow)).size],['Revisiones detectadas',issues.length],['Posibles duplicados',new Set(issues.filter(item=>item.kind==='Posible duplicado').map(item=>item.event.sourceRow)).size]]));render();}
 refresh();return{refresh};
}
