(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const FIELDS=["FECHA","ESCENARIO ASIGNADO","HORARIO DEL EVENTO","NOMBRE DE LA EMPRESA","CANTIDAD DE PERSONAS","HORARIO AYB","DESCRIPCION ALIMENTACION","ACOMODACION","MODALIDAD DE SERVICIO","MEDIO DE PAGO","OBSERVACION"];
  const LABELS={"FECHA":"Fecha","ESCENARIO ASIGNADO":"Escenario asignado","HORARIO DEL EVENTO":"Horario del evento","NOMBRE DE LA EMPRESA":"Empresa","CANTIDAD DE PERSONAS":"PAX","HORARIO AYB":"Horario A&B","DESCRIPCION ALIMENTACION":"Descripción alimentación","ACOMODACION":"Acomodación","MODALIDAD DE SERVICIO":"Modalidad","MEDIO DE PAGO":"Medio de pago","OBSERVACION":"Observación"};
  let rows=[],filtered=[],filter="Actuales";
  const text=v=>v===undefined||v===null?"":String(v);
  const normalize=v=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/\s+/g," ");
  const escape=v=>text(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function date(value){if(!value)return null;if(value instanceof Date&&!Number.isNaN(value.getTime()))return new Date(value.getFullYear(),value.getMonth(),value.getDate());const s=text(value);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);const d=new Date(s);return Number.isNaN(d.getTime())?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());}
  function iso(value){const d=date(value);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:"";}
  function formatDate(value){const d=date(value);return d?d.toLocaleDateString("es-CO",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"}):"Sin fecha";}
  function floor(row){return normalize(row?.["ESCENARIO ASIGNADO"]).includes("TERCER")?"Tercer piso":"Segundo piso";}
  function scenarioOrder(value){
    const s=normalize(value);if(s.includes("TERCER"))return 1000;
    if(/SALON\s*1\b/.test(s))return 1;
    if(/SALON\s*2\s*(\+|Y)\s*3/.test(s)||/SALON\s*2\+3/.test(s))return 4;
    if(/SALON\s*2\b/.test(s))return 2;
    if(/SALON\s*3\b/.test(s))return 3;
    if(s.includes("COMPLETO"))return 5;
    return 100;
  }
  function noFood(row){const s=normalize(`${row["HORARIO AYB"]||""} ${row["DESCRIPCION ALIMENTACION"]||""}`);return !s||s.includes("SIN ALIMENTACION")||s==="N/A"||s.includes("CANCELADO");}
  function multiline(value){const lines=text(value).replace(/_x000D_|_x000A_/gi,"\n").replace(/\r\n?|\u2028|\u2029/g,"\n").split("\n").map(x=>x.trim()).filter(Boolean);return lines.length?`<div class="multi-value">${lines.map(line=>`<span>${escape(line)}</span>`).join("")}</div>`:'<span class="empty-value">Sin registrar</span>';}
  function toast(message,type=""){const host=$("toastContainer");const item=document.createElement("div");item.className=`toast ${type?`is-${type}`:""}`;item.textContent=message;host.appendChild(item);setTimeout(()=>item.remove(),4000);}
  function classifyRow(row){
    const today=new Date();today.setHours(0,0,0,0);const d=date(row.FECHA);if(!d)return"";
    const diff=Math.round((d-today)/86400000);return diff<0?"past-row":diff===0?"today-row":diff<=5?"near-row":"future-row";
  }
  function render(){
    const tbody=$("tbody");tbody.innerHTML="";
    $("resultCount").textContent=String(filtered.length);$("emptyTable").hidden=filtered.length>0;$("dataTable").hidden=filtered.length===0;
    if(!filtered.length)return;
    filtered.forEach((row,index)=>{
      const tr=document.createElement("tr");tr.className=`${classifyRow(row)} ${floor(row)==="Tercer piso"?"third-event":""}`.trim();tr.tabIndex=0;
      const values={
        "FECHA":formatDate(row.FECHA),
        "ESCENARIO ASIGNADO":`<span class="floor-tag ${floor(row)==="Tercer piso"?"third":""}">${floor(row)}</span>${escape(row["ESCENARIO ASIGNADO"]||"Sin escenario")}`,
        "HORARIO DEL EVENTO":escape(row["HORARIO DEL EVENTO"]||"Sin horario"),
        "NOMBRE DE LA EMPRESA":escape(row["NOMBRE DE LA EMPRESA"]||"Sin empresa"),
        "CANTIDAD DE PERSONAS":escape(row["CANTIDAD DE PERSONAS"]||"—"),
        "HORARIO AYB":multiline(row["HORARIO AYB"]),
        "DESCRIPCION ALIMENTACION":multiline(row["DESCRIPCION ALIMENTACION"]),
        "ACOMODACION":escape(row["ACOMODACION"]||"—"),
        "MODALIDAD DE SERVICIO":escape(row["MODALIDAD DE SERVICIO"]||"—"),
        "MEDIO DE PAGO":escape(row["MEDIO DE PAGO"]||"—"),
        "OBSERVACION":multiline(row["OBSERVACION"])
      };
      const classes={"FECHA":"date-cell","ESCENARIO ASIGNADO":"scenario-cell","HORARIO DEL EVENTO":"event-time-cell","NOMBRE DE LA EMPRESA":"company-cell","CANTIDAD DE PERSONAS":"people-cell","HORARIO AYB":"food-time-cell","DESCRIPCION ALIMENTACION":"food-description-cell","ACOMODACION":"accommodation-cell","MODALIDAD DE SERVICIO":"mode-cell","MEDIO DE PAGO":"payment-cell","OBSERVACION":"observation-cell"};
      tr.innerHTML=FIELDS.map(field=>`<td class="${classes[field]}" data-label="${LABELS[field]}">${values[field]}</td>`).join("");
      const open=()=>openDetail(row);tr.onclick=open;tr.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();open();}};
      tbody.appendChild(tr);
    });
  }
  function applyFilters(){
    const search=normalize($("search").value),from=$("dateFrom").value,to=$("dateTo").value,payment=normalize($("paymentFilter").value),food=$("hideNoFood").checked;
    const today=iso(new Date()),custom=Boolean(from||to);
    filtered=rows.filter(row=>{
      const rowISO=iso(row.FECHA),rowFloor=floor(row);
      if(search&&!normalize(`${row["NOMBRE DE LA EMPRESA"]||""} ${row["ESCENARIO ASIGNADO"]||""} ${row["OBSERVACION"]||""}`).includes(search))return false;
      if(from&&rowISO<from)return false;if(to&&rowISO>to)return false;
      if(filter==="Actuales"&&!custom&&rowISO<today)return false;
      if(filter==="Segundo piso"&&rowFloor!=="Segundo piso")return false;
      if(filter==="Tercer piso"&&rowFloor!=="Tercer piso")return false;
      if(payment&&!normalize(row["MEDIO DE PAGO"]).includes(payment))return false;
      if(food&&noFood(row))return false;
      return true;
    }).sort((a,b)=>{
      const dateCompare=iso(a.FECHA).localeCompare(iso(b.FECHA));if(dateCompare)return dateCompare;
      const fa=floor(a),fb=floor(b);if(fa!==fb)return fa==="Segundo piso"?-1:1;
      if(fa==="Segundo piso"){const rank=scenarioOrder(a["ESCENARIO ASIGNADO"])-scenarioOrder(b["ESCENARIO ASIGNADO"]);if(rank)return rank;}
      return text(a["ESCENARIO ASIGNADO"]).localeCompare(text(b["ESCENARIO ASIGNADO"]),"es",{numeric:true,sensitivity:"base"})||text(a["NOMBRE DE LA EMPRESA"]).localeCompare(text(b["NOMBRE DE LA EMPRESA"]),"es",{sensitivity:"base"});
    });
    render();updateSummary();$("captionFiltro").textContent=filter;
  }
  function updateSummary(){
    const pax=filtered.reduce((sum,row)=>sum+(Number.parseInt(row["CANTIDAD DE PERSONAS"],10)||0),0);
    const second=filtered.filter(row=>floor(row)==="Segundo piso").length,third=filtered.length-second;
    $("resultSummary").textContent=`${pax.toLocaleString("es-CO")} personas · ${second} en segundo piso · ${third} en tercer piso`;
  }
  function updateOptions(){
    const current=$("paymentFilter").value;
    const options=[...new Set(rows.map(row=>text(row["MEDIO DE PAGO"]).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
    $("paymentFilter").innerHTML='<option value="">Todos</option>'+options.map(item=>`<option value="${escape(item)}">${escape(item)}</option>`).join("");
    if(options.includes(current))$("paymentFilter").value=current;
  }
  async function loadRows(message=false){
    try{
      const data=await EventDataStore.load();rows=(data.rows||[]).map(row=>({...row,FECHA:iso(row.FECHA)}));updateOptions();applyFilters();
      const status=$("eventDataStatus");status.className=`status-pill ${rows.length?"is-ready":"is-warning"}`;status.querySelector("span").textContent=rows.length?`${rows.length} eventos cargados`:"Sin datos";
      if(message)toast(`Datos actualizados: ${rows.length} eventos.`,"success");
    }catch(error){console.error(error);toast("No fue posible leer la base local.","error");}
  }
  function openDetail(row){
    const modal=$("eventDetailModal");$("eventDetailTitle").textContent=row["NOMBRE DE LA EMPRESA"]||"Evento";$("eventDetailSubtitle").textContent=`${formatDate(row.FECHA)} · ${floor(row)} · ${row["ESCENARIO ASIGNADO"]||"Sin escenario"}`;
    const excluded=new Set(["HORARIO AYB","DESCRIPCION ALIMENTACION"]);
    const details=Object.entries(row).filter(([key])=>!key.startsWith("__")&&!excluded.has(key)).map(([key,value])=>`<article class="detail-field"><small>${escape(LABELS[key]||key.replace(/_/g," "))}</small><div>${multiline(value)}</div></article>`).join("");
    $("eventDetailBody").innerHTML=`<section class="event-overview"><div class="overview-main"><small>Evento seleccionado</small><h3>${escape(row["NOMBRE DE LA EMPRESA"]||"Sin empresa")}</h3><div class="overview-tags"><span>${escape(row["HORARIO DEL EVENTO"]||"Sin horario")}</span><span>${escape(row["ESCENARIO ASIGNADO"]||"Sin escenario")}</span><span>${formatDate(row.FECHA)}</span></div></div><div class="overview-box"><small>PAX</small><strong>${escape(row["CANTIDAD DE PERSONAS"]||"—")}</strong></div><div class="overview-box"><small>Piso</small><strong style="font-size:11px">${floor(row)}</strong></div></section>
    <section class="food-pair"><article class="food-field"><small>Horario A&B</small><p>${escape(row["HORARIO AYB"]||"Sin registrar")}</p></article><article class="food-field"><small>Descripción alimentación</small><p>${escape(row["DESCRIPCION ALIMENTACION"]||"Sin registrar")}</p></article></section>
    <section class="detail-grid">${details}</section>`;
    modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
  }
  function closeDetail(){$("eventDetailModal").classList.remove("is-open");$("eventDetailModal").setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");}
  function exportCSV(){
    if(!filtered.length){toast("No hay eventos para exportar.","error");return;}
    const cells=value=>`"${text(value).replace(/"/g,'""')}"`;
    const csv=[FIELDS.map(cells).join(","),...filtered.map(row=>FIELDS.map(field=>cells(field==="FECHA"?iso(row.FECHA):row[field])).join(","))].join("\r\n");
    const blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`eventos_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  }
  function updateFileState(state){
    const ready=state.status==="ready",error=state.status==="error";$("eventFileStatus").className=`status-pill ${ready?"is-ready":error?"is-error":"is-warning"}`;$("eventFileStatus").querySelector("span").textContent=ready?"Archivo conectado":state.status==="permission"?"Reconectar archivo":error?"Revisar archivo":"Archivo pendiente";
  }
  document.addEventListener("DOMContentLoaded",()=>{
    loadRows();setTimeout(()=>$("agendaPreloader").classList.add("is-hidden"),250);
    document.querySelectorAll(".filter-chip").forEach(button=>button.onclick=()=>{filter=button.dataset.filter;document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x===button));applyFilters();});
    ["search","dateFrom","dateTo","paymentFilter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",()=>{if((id==="dateFrom"||id==="dateTo")&&($(id).value)&&filter==="Actuales"){filter="Todos";document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x.dataset.filter==="Todos"));}applyFilters();}));
    $("hideNoFood").onchange=()=>{$("foodFilterStatus").textContent=$("hideNoFood").checked?"Ocultando sin alimentación":"Todos visibles";applyFilters();};
    $("resetBtn").onclick=()=>{$("search").value=$("dateFrom").value=$("dateTo").value="";$("paymentFilter").value="";$("hideNoFood").checked=false;$("foodFilterStatus").textContent="Todos visibles";filter="Actuales";document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x.dataset.filter==="Actuales"));applyFilters();};
    $("btnLoad").onclick=()=>ExcelFileSync.chooseFile().catch(error=>toast(error.message,"error"));$("eventFileStatus").onclick=()=>ExcelFileSync.openPanel();$("btnPrint").onclick=()=>window.print();$("btnExport").onclick=exportCSV;
    $("eventDetailClose").onclick=closeDetail;$("eventDetailModal").onclick=e=>{if(e.target===$("eventDetailModal"))closeDetail();};document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDetail();});
  });
  window.addEventListener("eventDataUpdated",()=>loadRows(true));window.addEventListener("excelSyncState",event=>updateFileState(event.detail));
})();