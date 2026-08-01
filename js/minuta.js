(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const SELECTED_KEY="minuta:selectedDate";
  let rows=[],selectedDate=null;
  const text=v=>v===undefined||v===null?"":String(v);
  const normalize=v=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/\s+/g," ");
  const escape=v=>text(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function iso(value){if(!value)return"";if(value instanceof Date&&!Number.isNaN(value.getTime()))return`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;const s=text(value);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;const d=new Date(s);return Number.isNaN(d.getTime())?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function dateFromISO(value){const m=text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
  function formatLong(value){const d=dateFromISO(iso(value));return d?d.toLocaleDateString("es-CO",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):"Sin fecha";}
  function addDays(value,days){const d=dateFromISO(iso(value))||new Date();d.setDate(d.getDate()+days);return iso(d);}
  function floor(row){return normalize(row["ESCENARIO ASIGNADO"]).includes("TERCER")?"third":"second";}
  function scenarioOrder(value){const s=normalize(value);if(/SALON\s*1\b/.test(s))return 1;if(/SALON\s*2\s*(\+|Y)\s*3/.test(s)||/SALON\s*2\+3/.test(s))return 4;if(/SALON\s*2\b/.test(s))return 2;if(/SALON\s*3\b/.test(s))return 3;if(s.includes("COMPLETO"))return 5;return 100;}
  function hasFood(row){const s=normalize(`${row["HORARIO AYB"]||""} ${row["DESCRIPCION ALIMENTACION"]||""}`);return Boolean(s)&&!s.includes("SIN ALIMENTACION")&&s!=="N/A"&&!s.includes("CANCELADO");}
  function sortEvents(list,type){return [...list].sort((a,b)=>{if(type==="second"){const rank=scenarioOrder(a["ESCENARIO ASIGNADO"])-scenarioOrder(b["ESCENARIO ASIGNADO"]);if(rank)return rank;}return text(a["ESCENARIO ASIGNADO"]).localeCompare(text(b["ESCENARIO ASIGNADO"]),"es",{numeric:true,sensitivity:"base"})||text(a["NOMBRE DE LA EMPRESA"]).localeCompare(text(b["NOMBRE DE LA EMPRESA"]),"es",{sensitivity:"base"});});}
  function eventCard(row,type){
    const time=escape(row["HORARIO DEL EVENTO"]||"Sin horario"),company=escape(row["NOMBRE DE LA EMPRESA"]||"Sin empresa"),scenario=escape(row["ESCENARIO ASIGNADO"]||"Sin escenario"),pax=escape(row["CANTIDAD DE PERSONAS"]||"—"),ayb=escape(row["HORARIO AYB"]||"Sin horario A&B"),food=escape(row["DESCRIPCION ALIMENTACION"]||"Sin alimentación registrada");
    return`<article class="minute-event"><div class="minute-event-main"><div class="minute-event-top"><small>${time}</small><span>${type==="third"?"Tercer piso":"Segundo piso"}</span></div><h3>${company}</h3><p class="minute-event-location">${scenario}</p><p class="minute-food"><strong>A&B y alimentación:</strong> ${ayb} · ${food}</p></div><div class="minute-pax"><b>${pax}</b><small>personas</small></div></article>`;
  }
  function renderFloor(host,list,type){
    host.innerHTML=list.length?list.map(row=>eventCard(row,type)).join(""):'<div class="empty-state"><strong>Sin eventos</strong><span>No hay programación para este piso en la fecha seleccionada.</span></div>';
  }
  function render(){
    const dateRows=rows.filter(row=>iso(row.FECHA)===selectedDate),second=sortEvents(dateRows.filter(row=>floor(row)==="second"),"second"),third=sortEvents(dateRows.filter(row=>floor(row)==="third"),"third");
    renderFloor($("listaSegundo"),second,"second");renderFloor($("listaTercero"),third,"third");
    $("badgeSegundo").textContent=`${second.length} eventos`;$("badgeTercero").textContent=`${third.length} eventos`;
    $("targetDateLabel").textContent=formatLong(selectedDate);$("minuteDescription").textContent=dateRows.length?`${dateRows.length} eventos organizados por piso.`:"No hay eventos registrados para esta fecha.";
    $("summaryTotal").textContent=String(dateRows.length);$("summaryPax").textContent=dateRows.reduce((sum,row)=>sum+(Number.parseInt(row["CANTIDAD DE PERSONAS"],10)||0),0).toLocaleString("es-CO");$("summaryFood").textContent=String(dateRows.filter(hasFood).length);
    $("generatedAt").textContent=`Generado: ${new Date().toLocaleString("es-CO")}`;$("minuteDatePicker").value=selectedDate;
    const status=$("minuteDataStatus");status.className=`status-pill ${rows.length?"is-ready":"is-warning"}`;status.querySelector("span").textContent=rows.length?`${rows.length} eventos disponibles`:"Sin datos";
    loadCoworking();
  }
  async function loadRows(){const data=await EventDataStore.load();rows=data.rows||[];render();}
  function selectDate(value){selectedDate=iso(value)||iso(new Date());localStorage.setItem(SELECTED_KEY,selectedDate);render();}
  function coworkKey(){return`minutaCoworking:${selectedDate}`;}
  function getCowork(){try{const data=JSON.parse(localStorage.getItem(coworkKey())||"[]");return Array.isArray(data)?data:[];}catch(_){return[];}}
  function saveCowork(){
    const data=[...$("tbodyCoworking").querySelectorAll("tr")].map(row=>[...row.querySelectorAll("td[data-field]")].reduce((acc,cell)=>{acc[cell.dataset.field]=cell.textContent.trim();return acc;},{}));
    try{localStorage.setItem(coworkKey(),JSON.stringify(data));}catch(_){}
  }
  function coworkRow(data={}){
    const tr=document.createElement("tr"),fields=["cliente","inicio","final","escenario","pax","pago"];
    fields.forEach(field=>{const td=document.createElement("td");td.contentEditable="true";td.dataset.field=field;td.textContent=data[field]||"";td.addEventListener("input",saveCowork);tr.appendChild(td);});
    const action=document.createElement("td");action.className="no-print";action.innerHTML='<button class="row-delete" type="button">Eliminar</button>';action.querySelector("button").onclick=()=>{tr.remove();saveCowork();};tr.appendChild(action);return tr;
  }
  function loadCoworking(){
    const host=$("tbodyCoworking"),data=getCowork();host.innerHTML="";(data.length?data:[{}]).forEach(item=>host.appendChild(coworkRow(item)));
  }
  function openNext(){
    const groups=new Map();rows.filter(row=>iso(row.FECHA)>=iso(new Date())).forEach(row=>{const key=iso(row.FECHA);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);});
    const dates=[...groups.keys()].sort().slice(0,18),host=$("nextEventsList");
    host.innerHTML=dates.length?dates.map(key=>{const list=groups.get(key);return`<button class="next-day-card" data-date="${key}" type="button"><time>${new Date(`${key}T12:00:00`).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}</time><strong>${escape(list[0]["NOMBRE DE LA EMPRESA"]||"Evento")}${list.length>1?` y ${list.length-1} más`:""}</strong><span>${list.length} eventos</span></button>`;}).join(""):'<div class="empty-state"><strong>Sin próximos eventos</strong></div>';
    host.querySelectorAll("[data-date]").forEach(button=>button.onclick=()=>{selectDate(button.dataset.date);closeNext();});
    $("nextEventsModal").classList.add("is-open");$("nextEventsModal").setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
  }
  function closeNext(){$("nextEventsModal").classList.remove("is-open");$("nextEventsModal").setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");}
  document.addEventListener("DOMContentLoaded",()=>{
    selectedDate=localStorage.getItem(SELECTED_KEY)||iso(new Date());loadRows().finally(()=>setTimeout(()=>$("loader").classList.add("is-hidden"),220));
    $("minuteDatePicker").onchange=e=>selectDate(e.target.value);$("btnPrevDate").onclick=()=>selectDate(addDays(selectedDate,-1));$("btnNextDate").onclick=()=>selectDate(addDays(selectedDate,1));$("btnToday").onclick=()=>selectDate(new Date());$("btnNextEvents").onclick=openNext;$("btnPrint").onclick=()=>window.print();$("addCoworkRow").onclick=()=>{$("tbodyCoworking").appendChild(coworkRow());saveCowork();};
    $("closeNextEventsModal").onclick=closeNext;$("nextEventsModal").onclick=e=>{if(e.target===$("nextEventsModal"))closeNext();};document.addEventListener("keydown",e=>{if(e.key==="Escape")closeNext();});
  });
  window.addEventListener("eventDataUpdated",loadRows);
})();