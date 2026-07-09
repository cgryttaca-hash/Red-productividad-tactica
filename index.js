window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if(loader){
    setTimeout(() => loader.classList.add("loader-hide"), 250);
  }
});

function text(value){
  return value === undefined || value === null ? "" : String(value);
}

function escapeHtml(value){
  return text(value).replace(/[&<>"']/g, (char) => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

function normalizeFieldKey(value){
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function getField(evento, aliases){
  const keys = Object.keys(evento || {});
  for(const alias of aliases){
    const normalizedAlias = normalizeFieldKey(alias);
    const exactKey = keys.find((key) => normalizeFieldKey(key) === normalizedAlias);
    if(exactKey !== undefined) return evento[exactKey];
  }
  return "";
}

const FIELD_ALIASES = {
  empresa:["NOMBRE DE LA EMPRESA", "EMPRESA", "CLIENTE", "NOMBRE EMPRESA"],
  fecha:["FECHA", "FECHA EVENTO", "FECHA DEL EVENTO"],
  horario:["HORARIO DEL EVENTO", "HORARIO", "HORA DEL EVENTO", "HORA EVENTO"],
  escenario:["ESCENARIO ASIGNADO", "ESCENARIO", "SALON", "SALÓN", "UBICACION", "UBICACIÓN"],
  pax:["CANTIDAD DE PERSONAS", "PERSONAS", "PAX", "ASISTENTES"],
  estado:["ESTADO", "STATUS", "ESTADO DEL EVENTO"],
  alimentacionDescripcion:["DESCRIPCION ALIMENTACION", "DESCRIPCIÓN ALIMENTACIÓN", "DESCRIPCION DE ALIMENTACION", "DESCRIPCIÓN DE ALIMENTACIÓN", "ALIMENTACION", "ALIMENTACIÓN", "SERVICIO DE ALIMENTACION", "SERVICIO DE ALIMENTACIÓN"],
  acomodacion:["ACOMODACION", "ACOMODACIÓN"],
  pago:["MEDIO DE PAGO", "FORMA DE PAGO", "PAGO"],
  observacion:["OBSERVACION", "OBSERVACIÓN", "OBSERVACIONES"]
};

function actualizarReloj(){
  const reloj = document.getElementById("reloj");
  if(reloj){
    reloj.textContent = new Date().toLocaleString("es-CO");
  }
}

setInterval(actualizarReloj, 1000);
actualizarReloj();

function toDate(value){
  if(!value) return null;

  if(typeof value === "number"){
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    if(!Number.isNaN(excelDate.getTime())){
      excelDate.setHours(0,0,0,0);
      return excelDate;
    }
  }

  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return null;

  date.setHours(0,0,0,0);
  return date;
}

function isToday(date){
  const today = new Date();
  return date instanceof Date &&
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

function updateDataStatusIndicator(){
  const indicator = document.getElementById("dataStatusIndicator");
  if(!indicator) return;

  const updatedAt = localStorage.getItem("eventDataUpdatedAt");
  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const updatedToday = isToday(updatedDate);

  indicator.classList.toggle("is-updated", updatedToday);
  indicator.classList.toggle("is-outdated", !updatedToday);
  indicator.innerHTML = `<span></span>${updatedToday ? "Datos actualizados" : "Datos desactualizados"}`;
  indicator.title = updatedDate && !Number.isNaN(updatedDate.getTime())
    ? `Última actualización: ${updatedDate.toLocaleString("es-CO")}`
    : "No se encontró una fecha de actualización registrada.";
}

function isTercerPiso(evento){
  const escenario = text(getField(evento, FIELD_ALIASES.escenario)).toUpperCase();
  return escenario.includes("TERCER") || escenario.includes("PISO 3") || escenario.includes(" 3");
}

function parseSingleTimeToMinutes(value){
  const normalized = text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/ /g, " ");

  const match = normalized.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(A\.?\s*M\.?|P\.?\s*M\.?|AM|PM)?/);
  if(!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridian = (match[3] || "").replace(/[^APM]/g, "");

  if(meridian.startsWith("P") && hour < 12) hour += 12;
  if(meridian.startsWith("A") && hour === 12) hour = 0;
  if(hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

function parseHorarioRange(value){
  const normalized = text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/ /g, " ");
  const matches = [...normalized.matchAll(/(\d{1,2})(?:[:.](\d{2}))?\s*(A\.?\s*M\.?|P\.?\s*M\.?|AM|PM)?/g)];
  if(matches.length < 2) return null;

  const start = parseSingleTimeToMinutes(`${matches[0][1]}:${matches[0][2] || "00"} ${matches[0][3] || ""}`);
  let end = parseSingleTimeToMinutes(`${matches[1][1]}:${matches[1][2] || "00"} ${matches[1][3] || ""}`);
  if(start === null || end === null) return null;
  if(end < start) end += 24 * 60;

  return {start, end};
}

function getOperationalStatus(evento){
  const estado = text(getField(evento, FIELD_ALIASES.estado))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if(estado.includes("FINAL")) return "finalizado";
  if(estado.includes("PROGRES") || estado.includes("CURSO") || estado.includes("ACTIVO")) return "progreso";

  const range = parseHorarioRange(getField(evento, FIELD_ALIASES.horario));
  if(!range) return "";

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if(currentMinutes >= range.start && currentMinutes <= range.end) return "progreso";
  if(currentMinutes > range.end) return "finalizado";
  return "";
}

function renderOperationalBadge(evento){
  const status = getOperationalStatus(evento);
  if(status === "progreso") return '<span class="operational-badge is-progress">EVENTO EN PROGRESO</span>';
  if(status === "finalizado") return '<span class="operational-badge is-finished">EVENTO FINALIZADO</span>';
  return "";
}

function renderEvento(evento, indice){
  const empresa = escapeHtml(getField(evento, FIELD_ALIASES.empresa) || "Evento sin empresa");
  const horario = escapeHtml(getField(evento, FIELD_ALIASES.horario) || "Horario sin registrar");
  const escenario = escapeHtml(getField(evento, FIELD_ALIASES.escenario) || "Escenario sin registrar");
  const pax = escapeHtml(getField(evento, FIELD_ALIASES.pax) || 0);
  const operationalBadge = renderOperationalBadge(evento);
  const operationalStatus = getOperationalStatus(evento);
  const statusClass = operationalStatus ? ` is-${operationalStatus}` : "";

  return `
    <div class="evento${statusClass}" onclick="abrirEvento(${indice})">
      <div class="evento-main">
        <div class="evento-topline">${operationalBadge}</div>
        <div class="evento-empresa">${empresa}</div>
        <div class="evento-info">${horario}</div>
        <div class="evento-info">${escenario}</div>
      </div>
      <div class="evento-pax">${pax} pax</div>
    </div>
  `;
}

let eventosHoy = [];

function cargarPanel(){
  try{
    const data = JSON.parse(localStorage.getItem("eventData") || "[]");
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    eventosHoy = data
      .map((evento) => ({...evento, fecha:toDate(getField(evento, FIELD_ALIASES.fecha) || evento.FECHA)}))
      .filter((evento) => evento.fecha && evento.fecha.getTime() === hoy.getTime())
      .sort((a,b) => text(getField(a, FIELD_ALIASES.horario)).localeCompare(text(getField(b, FIELD_ALIASES.horario))));

    const segundo = eventosHoy.filter((evento) => !isTercerPiso(evento));
    const tercero = eventosHoy.filter((evento) => isTercerPiso(evento));
    const personasHoy = eventosHoy.reduce((total, evento) => total + (parseInt(getField(evento, FIELD_ALIASES.pax), 10) || 0), 0);

    document.getElementById("kpiEventosHoy").textContent = eventosHoy.length;
    document.getElementById("kpiPersonasHoy").textContent = personasHoy;
    document.getElementById("kpiSegundo").textContent = segundo.length;
    document.getElementById("kpiTercero").textContent = tercero.length;
    document.getElementById("badgeSegundo").textContent = `${segundo.length} eventos`;
    document.getElementById("badgeTercero").textContent = `${tercero.length} eventos`;

    document.getElementById("listaSegundo").innerHTML = segundo.length
      ? segundo.map((evento) => renderEvento(evento, eventosHoy.indexOf(evento))).join("")
      : `<div class="empty-state">No hay eventos programados para segundo piso.</div>`;

    document.getElementById("listaTercero").innerHTML = tercero.length
      ? tercero.map((evento) => renderEvento(evento, eventosHoy.indexOf(evento))).join("")
      : `<div class="empty-state">No hay eventos programados para tercer piso.</div>`;
  }catch(error){
    console.error(error);
  }
}

function abrirEvento(indice){
  const evento = eventosHoy[indice];

  if(!evento){
    alert("No se encontró el evento.");
    return;
  }

  const estadoTexto = text(getField(evento, FIELD_ALIASES.estado));
  const estado = estadoTexto.toUpperCase().includes("CONFIRM")
    ? '<span class="estado confirmado">Confirmado</span>'
    : '<span class="estado pendiente">Pendiente</span>';

  const fechaBonita = evento.fecha
    ? evento.fecha.toLocaleDateString("es-CO", {weekday:"long", year:"numeric", month:"long", day:"numeric"})
    : "Fecha sin registrar";

  const operationalStatus = renderOperationalBadge(evento);

  document.getElementById("tituloModal").textContent = getField(evento, FIELD_ALIASES.empresa) || "Evento";
  document.getElementById("detalleEvento").innerHTML = `
    <div class="detail-row"><strong>Empresa</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.empresa))}</span></div>
    <div class="detail-row"><strong>Fecha</strong><span>${fechaBonita}</span></div>
    <div class="detail-row"><strong>Horario</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.horario))}</span></div>
    <div class="detail-row"><strong>Escenario</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.escenario))}</span></div>
    <div class="detail-row"><strong>Personas</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.pax))}</span></div>
    <div class="detail-row"><strong>Alimentación</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.alimentacionDescripcion))}</span></div>
    <div class="detail-row"><strong>Acomodación</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.acomodacion))}</span></div>
    <div class="detail-row"><strong>Medio de pago</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.pago))}</span></div>
    <div class="detail-row"><strong>Observación</strong><span>${escapeHtml(getField(evento, FIELD_ALIASES.observacion))}</span></div>
    <div class="detail-row"><strong>Estado operativo</strong><span>${operationalStatus || estado}</span></div>
    <div class="detail-row"><strong>Estado</strong><span>${estado}</span></div>
  `;

  const modal = document.getElementById("modalEvento");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function cerrarModal(){
  const modal = document.getElementById("modalEvento");
  if(!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

const modalEvento = document.getElementById("modalEvento");
if(modalEvento){
  modalEvento.addEventListener("click", (event) => {
    if(event.target === event.currentTarget) cerrarModal();
  });
}

document.addEventListener("keydown", (event) => {
  if(event.key === "Escape") cerrarModal();
});

updateDataStatusIndicator();
cargarPanel();
setInterval(cargarPanel, 60000);
