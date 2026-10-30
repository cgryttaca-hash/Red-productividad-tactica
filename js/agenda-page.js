import {compareOperational,eventWindow,floorInfo,operationalStatus} from './agenda-operations.js';
import {eventFoodServices} from './food-alerts-core.js';
import './event-query.js';
import {displayDate,eventIdentity,field} from './agenda-content.js';
import {openAgendaDialog} from './agenda-dialog.js';
const byId=id=>document.getElementById(id),generation=document.documentElement.dataset.agendaMode==='generator',pageSize=25;
let category='Actuales',page=1,lastRaw,cached=[],lastSignature='',renderTimer,revision=0;
const rules=window.RPTEventQuery;
function records(){const raw=localStorage.getItem('eventData')||'[]';if(raw===lastRaw)return cached;let value;try{value=JSON.parse(raw);}catch(_){throw new Error('No se pudieron leer los eventos guardados.');}if(!Array.isArray(value))throw new Error('La fuente de eventos no tiene un formato válido.');lastRaw=raw;revision++;cached=value.map((record,index)=>({record,index,identity:eventIdentity(record),date:rules.parseExcelDate(record.FECHA),search:[field(record,['NOMBRE DE LA EMPRESA']),field(record,['ESCENARIO ASIGNADO'])].join(' ').toLocaleLowerCase('es')}));return cached;}
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}

function render(force=false){
  const target=byId('agendasEventList');if(!target)return;
  try{
    const source=records(),search=byId('agendasSearch').value.trim().toLocaleLowerCase('es'),date=byId('agendasDate').value,today=rules.startOfDay(new Date()),parsed=date?rules.parseExcelDate(date):null;
    const signature=JSON.stringify([revision,category,page,search,date,today.getTime(),Math.floor(Date.now()/60000)]);if(!force&&signature===lastSignature)return;lastSignature=signature;
    const base=source.filter(item=>(!search||item.search.includes(search))&&(!parsed||item.date?.getTime()===parsed.getTime()));
    const matches=(item,filter)=>rules.matchesCategory({...item.record,FECHA:item.date},filter,{hasCustomDateRange:Boolean(date),now:today});
    for(const button of document.querySelectorAll('[data-agendas-filter]')){const filter=button.dataset.agendasFilter;button.classList.toggle('active',filter===category);button.setAttribute('aria-pressed',String(filter===category));button.querySelector('b').textContent=base.filter(item=>matches(item,filter)).length;}
    const available=base.filter(item=>matches(item,category)).sort((a,b)=>compareOperational(a.record,b.record)||a.index-b.index);page=Math.min(Math.max(1,page),Math.max(1,Math.ceil(available.length/pageSize)));const offset=(page-1)*pageSize,visible=available.slice(offset,offset+pageSize);
    const fragment=document.createDocumentFragment();let lastFloor;
    for(const item of visible){const record=item.record,floor=floorInfo(field(record,['ESCENARIO ASIGNADO','ESCENARIO','SALON'])).floor;if(floor!==lastFloor){const group=element('tr',undefined,'agenda-floor-row'),heading=element('th',floor===2?'SEGUNDO PISO':floor===3?'TERCER PISO':'OTROS ESCENARIOS');heading.colSpan=7;group.append(heading);fragment.append(group);lastFloor=floor;}
      const row=element('tr'),times=eventWindow(record),food=eventFoodServices(record);for(const value of [displayDate(field(record,['FECHA']))||'No registrado',field(record,['NOMBRE DE LA EMPRESA'])||'No registrado',field(record,['ESCENARIO ASIGNADO'])||'No registrado',times.startLabel||'Por confirmar',times.endLabel||'Por confirmar'])row.append(element('td',value));
      row.append(element('td',[food.schedule,food.description].filter(Boolean).join('\n')||'Sin alimentación registrada','agenda-service-summary'));const status=element('td',field(record,['ESTADO']));status.append(element('small',operationalStatus(record),'agenda-progress-state'));row.append(status);row.dataset.agendaIdentity=item.identity;row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-label','Abrir plantilla de '+field(record,['NOMBRE DE LA EMPRESA']));fragment.append(row);
    }
    target.replaceChildren(fragment);byId('agendasEmpty').hidden=available.length>0;byId('agendasCount').textContent=available.length?`${offset+1}–${offset+visible.length} de ${available.length} eventos`:'0 eventos';byId('agendasPrevious').disabled=page===1;byId('agendasNext').disabled=offset+pageSize>=available.length;byId('agendasListMessage').textContent='';
  }catch(error){byId('agendasListMessage').textContent=error.message;}
}
function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render(),100);}

document.addEventListener('click',event=>{const action=event.target.closest('[data-agenda-identity]');if(action&&!action.closest('#previewModal'))openAgendaDialog(action.dataset.agendaIdentity,{generation:true});const chip=event.target.closest('[data-agendas-filter]');if(chip){category=chip.dataset.agendasFilter;page=1;render();}});
document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('tr[data-agenda-identity]')){event.preventDefault();openAgendaDialog(event.target.dataset.agendaIdentity,{generation:true});}});
byId('agendasSearch')?.addEventListener('input',()=>{page=1;schedule();});byId('agendasDate')?.addEventListener('input',()=>{if(byId('agendasDate').value&&category==='Actuales')category='Todos';page=1;render();});byId('agendasRefresh')?.addEventListener('click',()=>{lastRaw=undefined;render(true);});byId('agendasPrevious')?.addEventListener('click',()=>{page--;render();});byId('agendasNext')?.addEventListener('click',()=>{page++;render();});window.addEventListener('eventDataUpdated',schedule);window.addEventListener('storage',event=>{if(event.key==='eventData')schedule();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});const clock=setInterval(()=>{if(!document.hidden)render();},30000);window.addEventListener('pagehide',()=>{clearTimeout(renderTimer);clearInterval(clock);},{once:true});render();
