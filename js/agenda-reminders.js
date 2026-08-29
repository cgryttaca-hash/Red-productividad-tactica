import {showNotification} from './notifications.js';

const STORAGE='rptAgendaReminderHistoryV1';
const CHECK_MS=30000;
const FOOD_LEAD_MS=15*60*1000;
let events=[];
let timer=null;

function readHistory(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch(_){return{};}}
function saveHistory(value){try{localStorage.setItem(STORAGE,JSON.stringify(value));}catch(_){}}
function cleanupHistory(history){
  const cutoff=Date.now()-7*24*60*60*1000;
  for(const [key,value] of Object.entries(history))if(Number(value)<cutoff)delete history[key];
  return history;
}
function normalize(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function lines(value){return String(value??'').replace(/\r/g,'').split(/\n+/).map(v=>v.replace(/\s+/g,' ').trim()).filter(Boolean);}
function dateFromISO(iso){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;
  return new Date(+m[1],+m[2]-1,+m[3],0,0,0,0);
}
function timeMatches(value){
  const result=[];const re=/(\d{1,2}):(\d{2})\s*(A\.?\s*M\.?|P\.?\s*M\.?)?/gi;let m;
  while((m=re.exec(String(value||''))))result.push({h:+m[1],min:+m[2],ampm:normalize(m[3]||'').toUpperCase().replace(/\s|\./g,'')});
  return result;
}
function combine(iso,time){
  const date=dateFromISO(iso);if(!date||!time)return null;
  let hour=time.h;
  if(time.ampm==='PM'&&hour<12)hour+=12;
  if(time.ampm==='AM'&&hour===12)hour=0;
  date.setHours(hour,time.min,0,0);return date;
}
function foodItems(event){
  const schedules=lines(event.horarioAyB);const descriptions=lines(event.descripcionAlimentacion);
  const out=[];
  schedules.forEach((line,index)=>{
    const times=timeMatches(line);if(!times.length)return;
    const when=combine(event.fechaISO,times[0]);if(!when)return;
    out.push({when,label:descriptions[index]||line||'servicio de alimentación',source:line,index});
  });
  return out;
}
function eventEnd(event){
  const times=timeMatches(event.horarioEvento);if(!times.length)return null;
  return combine(event.fechaISO,times[times.length-1]);
}
function speak(message){
  if(document.hidden||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
  try{
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(message);
    utterance.lang='es-CO';utterance.rate=.96;utterance.pitch=1;utterance.volume=1;
    speechSynthesis.speak(utterance);
  }catch(_){ }
}
function once(history,key,callback){
  if(history[key])return false;
  history[key]=Date.now();saveHistory(history);callback();return true;
}
function company(event){return String(event.empresa||'La empresa').trim();}
function tomorrowEvents(fromDate){
  const next=new Date(fromDate);next.setDate(next.getDate()+1);
  const iso=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
  return events.filter(e=>e.fechaISO===iso).sort((a,b)=>String(a.horarioEvento||'').localeCompare(String(b.horarioEvento||''),'es',{numeric:true}));
}
async function check(){
  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(!standalone||Notification.permission!=='granted'||!events.length)return;
  const now=Date.now();const history=cleanupHistory(readHistory());saveHistory(history);
  for(const event of events){
    for(const item of foodItems(event)){
      const target=item.when.getTime()-FOOD_LEAD_MS;
      if(now>=target&&now<=item.when.getTime()+2*60*1000){
        const key=`food:${event.id}:${event.fechaISO}:${item.when.getTime()}`;
        once(history,key,()=>{
          const label=item.label&&item.label.length<120?item.label:'servicio de alimentación';
          const message=`Recordatorio: ${company(event)} tiene ${label} en aproximadamente 15 minutos.`;
          showNotification('Alimentación en 15 minutos',message,{tag:key,url:'./agenda_movil.html',renotify:true});
          speak(message);
          window.dispatchEvent(new CustomEvent('rptAgendaReminder',{detail:{type:'food',message,event}}));
        });
      }
    }
    const end=eventEnd(event);
    if(end&&now>=end.getTime()&&now<=end.getTime()+10*60*1000){
      const key=`end:${event.id}:${event.fechaISO}:${end.getTime()}`;
      once(history,key,()=>{
        const message=`${company(event)} finalizó su evento programado en ${event.escenario||'el escenario asignado'}.`;
        showNotification('Evento finalizado',message,{tag:key,url:'./agenda_movil.html',renotify:true});
        window.dispatchEvent(new CustomEvent('rptAgendaReminder',{detail:{type:'end',message,event}}));
      });
    }
  }
  // Al terminar el último evento con horario del día, enviar una sola agenda de mañana.
  const today=new Date();const iso=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const todayWithEnd=events.filter(e=>e.fechaISO===iso).map(e=>({event:e,end:eventEnd(e)})).filter(x=>x.end).sort((a,b)=>b.end-a.end);
  if(todayWithEnd.length&&now>=todayWithEnd[0].end.getTime()){
    const key=`tomorrow:${iso}`;
    once(history,key,()=>{
      const upcoming=tomorrowEvents(today);
      const body=upcoming.length
        ? `${upcoming.length} evento${upcoming.length===1?'':'s'} programado${upcoming.length===1?'':'s'} mañana: ${upcoming.slice(0,4).map(e=>`${company(e)} (${e.horarioEvento||'sin horario'})`).join(' · ')}${upcoming.length>4?' · y más':''}.`
        : 'No hay eventos publicados para mañana.';
      showNotification('Agenda del día siguiente',body,{tag:key,url:'./agenda_movil.html',renotify:true});
      window.dispatchEvent(new CustomEvent('rptAgendaReminder',{detail:{type:'tomorrow',message:body}}));
    });
  }
}
function setEvents(value){events=Array.isArray(value)?value:[];check();}
window.addEventListener('rptAgendaDataReady',event=>setEvents(event.detail?.events||[]));
window.addEventListener('rptAgendaRequirementsReady',check);
window.addEventListener('focus',check);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
timer=setInterval(check,CHECK_MS);
window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
