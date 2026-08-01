window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if(loader) setTimeout(() => loader.classList.add("loader-hide"), 220);
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

function fieldKeyMatchesAliases(key, aliases){
  const normalizedKey = normalizeFieldKey(key);
  return aliases.some((alias) => normalizeFieldKey(alias) === normalizedKey);
}

const FIELD_ALIASES = {
  empresa:["NOMBRE DE LA EMPRESA", "EMPRESA", "CLIENTE", "NOMBRE EMPRESA"],
  fecha:["FECHA", "FECHA EVENTO", "FECHA DEL EVENTO"],
  horario:["HORARIO DEL EVENTO", "HORARIO", "HORA DEL EVENTO", "HORA EVENTO"],
  escenario:["ESCENARIO ASIGNADO", "ESCENARIO", "SALON", "SALÓN", "UBICACION", "UBICACIÓN"],
  pax:["CANTIDAD DE PERSONAS", "PERSONAS", "PAX", "ASISTENTES"],
  estado:["ESTADO", "STATUS", "ESTADO DEL EVENTO"],
  horarioAyb:["HORARIO AYB", "HORARIO A&B", "HORARIO A Y B", "HORARIO A Y B.", "HORA AYB", "HORARIO ALIMENTACION", "HORARIO ALIMENTACIÓN"],
  alimentacionDescripcion:["DESCRIPCION ALIMENTACION", "DESCRIPCIÓN ALIMENTACIÓN", "DESCRIPCION DE ALIMENTACION", "DESCRIPCIÓN DE ALIMENTACIÓN", "ALIMENTACION", "ALIMENTACIÓN", "SERVICIO DE ALIMENTACION", "SERVICIO DE ALIMENTACIÓN"],
  acomodacion:["ACOMODACION", "ACOMODACIÓN"],
  modalidad:["MODALIDAD DE SERVICIO", "MODALIDAD", "TIPO DE SERVICIO"],
  pago:["MEDIO DE PAGO", "FORMA DE PAGO", "PAGO"],
  observacion:["OBSERVACION", "OBSERVACIÓN", "OBSERVACIONES"]
};

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

let monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let allEvents = [];
let eventsByDate = new Map();
let selectedDayEvents = [];
let selectedDayDate = null;

function actualizarReloj(){
  const ahora = new Date();
  const reloj = document.getElementById("reloj");
  const todayLabel = document.getElementById("todayLabel");

  if(reloj){
    reloj.textContent = ahora.toLocaleTimeString("es-CO", {
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit"
    });
  }

  if(todayLabel){
    todayLabel.textContent = ahora.toLocaleDateString("es-CO", {
      weekday:"short",
      day:"2-digit",
      month:"short"
    });
  }
}

setInterval(actualizarReloj, 1000);
actualizarReloj();

function toDate(value){
  if(value === undefined || value === null || value === "") return null;

  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if(typeof value === "number"){
    const excelEpoch = new Date(1899, 11, 30);
    const parsed = new Date(excelEpoch.getTime() + Math.round(value * 86400000));
    return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const raw = text(value).trim();
  let match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(match){
    const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return isValidDateParts(parsed, Number(match[3]), Number(match[2]) - 1, Number(match[1])) ? parsed : null;
  }

  match = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[T\s].*)?$/);
  if(match){
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isValidDateParts(parsed, Number(match[1]), Number(match[2]) - 1, Number(match[3])) ? parsed : null;
  }

  const parsed = new Date(raw);
  if(Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function isValidDateParts(date, year, month, day){
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

function dateKey(date){
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sameDate(a, b){
  return a instanceof Date && b instanceof Date && dateKey(a) === dateKey(b);
}

function formatLongDate(date){
  return date.toLocaleDateString("es-CO", {
    weekday:"long",
    year:"numeric",
    month:"long",
    day:"numeric"
  });
}

function updateDataStatusIndicator(){
  const indicator = document.getElementById("dataStatusIndicator");
  if(!indicator) return;

  const updatedAt = localStorage.getItem("eventDataUpdatedAt");
  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const today = new Date();
  const updatedToday = updatedDate && !Number.isNaN(updatedDate.getTime()) && sameDate(updatedDate, today);

  indicator.classList.toggle("is-updated", Boolean(updatedToday));
  indicator.classList.toggle("is-outdated", !updatedToday);
  indicator.innerHTML = `<span></span>${updatedToday ? "Datos actualizados" : "Datos desactualizados"}`;
  indicator.title = updatedDate && !Number.isNaN(updatedDate.getTime())
    ? `Última actualización: ${updatedDate.toLocaleString("es-CO")}`
    : "No se encontró una fecha de actualización registrada.";
}

function getFloor(evento){
  const escenario = normalizeFieldKey(getField(evento, FIELD_ALIASES.escenario));
  const isThird = escenario.includes("TERCERPISO") ||
    escenario.includes("PISO3") ||
    escenario.includes("3ERPISO") ||
    escenario.includes("TERCERNIVEL") ||
    escenario.includes("NIVEL3");
  return isThird ? "third" : "second";
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

function getEventStartMinutes(record){
  const parsed = parseSingleTimeToMinutes(getField(record.raw, FIELD_ALIASES.horario));
  return parsed === null ? Number.MAX_SAFE_INTEGER : parsed;
}

function getOperationalStatus(record){
  const evento = record.raw;
  const estado = text(getField(evento, FIELD_ALIASES.estado))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if(estado.includes("CANCEL")) return {key:"cancelled", label:"Cancelado"};
  if(estado.includes("FINAL") || estado.includes("EJECUT")) return {key:"finished", label:"Finalizado"};
  if(estado.includes("PROGRES") || estado.includes("CURSO") || estado.includes("ACTIVO")) return {key:"progress", label:"En progreso"};
  if(estado.includes("CONFIRM")) return {key:"confirmed", label:"Confirmado"};
  if(estado.includes("PEND") || estado.includes("TENTAT")) return {key:"pending", label:"Pendiente"};
  if(estado.includes("PROGRAM")) return {key:"scheduled", label:"Programado"};

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if(record.date < todayStart) return {key:"finished", label:"Fecha cumplida"};
  if(record.date > todayStart) return {key:"scheduled", label:"Programado"};

  const range = parseHorarioRange(getField(evento, FIELD_ALIASES.horario));
  if(!range) return {key:"scheduled", label:"Programado"};

  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  if(currentMinutes >= range.start && currentMinutes <= range.end) return {key:"progress", label:"En progreso"};
  if(currentMinutes > range.end) return {key:"finished", label:"Finalizado"};
  return {key:"scheduled", label:"Programado"};
}

function loadEvents(){
  let data = [];
  try{
    const parsed = JSON.parse(localStorage.getItem("eventData") || "[]");
    data = Array.isArray(parsed) ? parsed : [];
  }catch(error){
    console.error("No fue posible leer los eventos guardados.", error);
  }

  allEvents = data
    .map((raw, index) => ({
      raw,
      index,
      date:toDate(getField(raw, FIELD_ALIASES.fecha) || raw.FECHA)
    }))
    .filter((record) => record.date)
    .sort((a, b) => {
      const dateDifference = a.date - b.date;
      if(dateDifference !== 0) return dateDifference;
      const timeDifference = getEventStartMinutes(a) - getEventStartMinutes(b);
      if(timeDifference !== 0) return timeDifference;
      return text(getField(a.raw, FIELD_ALIASES.empresa)).localeCompare(text(getField(b.raw, FIELD_ALIASES.empresa)), "es");
    });

  eventsByDate = new Map();
  allEvents.forEach((record) => {
    const key = dateKey(record.date);
    if(!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key).push(record);
  });

  const notice = document.getElementById("noDataNotice");
  if(notice) notice.hidden = allEvents.length > 0;

  updateDataStatusIndicator();
  renderCalendar();
}

function renderCalendar(){
  const grid = document.getElementById("calendarGrid");
  const monthLabel = document.getElementById("monthLabel");
  const status = document.getElementById("calendarStatus");
  if(!grid || !monthLabel) return;

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);
  const today = new Date();

  const monthEvents = allEvents.filter((record) => record.date.getFullYear() === year && record.date.getMonth() === month);
  if(status){
    status.textContent = monthEvents.length
      ? `${monthEvents.length} ${monthEvents.length === 1 ? "evento registrado" : "eventos registrados"} en ${MONTH_NAMES[month]}.`
      : `No hay eventos registrados en ${MONTH_NAMES[month]}.`;
  }

  grid.innerHTML = "";

  for(let index = 0; index < 42; index += 1){
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = dateKey(cellDate);
    const dayEvents = eventsByDate.get(key) || [];
    const isCurrentMonth = cellDate.getFullYear() === year && cellDate.getMonth() === month;
    const isToday = sameDate(cellDate, today);

    // Solo los días del mes visible pueden marcarse como días con eventos.
    // Esto evita que las fechas de los meses anterior/siguiente parezcan activas.
    const visibleDayEvents = isCurrentMonth ? dayEvents : [];
    const hasEvents = visibleDayEvents.length > 0;
    const hasSecondFloor = hasEvents && visibleDayEvents.some((record) => getFloor(record.raw) === "second");
    const hasThirdFloor = hasEvents && visibleDayEvents.some((record) => getFloor(record.raw) === "third");
    const floorClass = hasSecondFloor && hasThirdFloor
      ? "has-both-floors"
      : hasThirdFloor
        ? "has-third-floor"
        : hasSecondFloor
          ? "has-second-floor"
          : "";

    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "calendar-day",
      isCurrentMonth ? "" : "is-outside",
      isToday ? "is-today" : "",
      selectedDayDate && sameDate(cellDate, selectedDayDate) ? "is-selected-date" : "",
      hasEvents ? "has-events" : "",
      floorClass
    ].filter(Boolean).join(" ");
    button.disabled = !hasEvents;
    button.dataset.date = key;
    button.setAttribute("aria-label", hasEvents
      ? `${formatLongDate(cellDate)}: ${visibleDayEvents.length} ${visibleDayEvents.length === 1 ? "evento" : "eventos"}`
      : `${formatLongDate(cellDate)}: sin eventos`);

    button.innerHTML = `
      <span class="day-number">${cellDate.getDate()}</span>
      ${hasEvents ? `
        <span class="event-day-content">
          <b>${visibleDayEvents.length}</b>
          <small>${visibleDayEvents.length === 1 ? "evento" : "eventos"}</small>
        </span>
        <span class="floor-labels" aria-hidden="true">
          ${hasSecondFloor ? '<i class="floor-label second-floor-label">Piso 2</i>' : ""}
          ${hasThirdFloor ? '<i class="floor-label third-floor-label">Piso 3</i>' : ""}
        </span>
      ` : ""}
    `;

    if(hasEvents){
      button.addEventListener("click", () => abrirAgendaDia(cellDate, visibleDayEvents));
    }

    grid.appendChild(button);
  }
}

function changeMonth(offset){
  monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1);
  renderCalendar();
}

function goToToday(){
  const today = new Date();
  monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
}

function abrirAgendaDia(date, records){
  selectedDayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  selectedDayEvents = [...records].sort((a, b) => {
    const timeDifference = getEventStartMinutes(a) - getEventStartMinutes(b);
    if(timeDifference !== 0) return timeDifference;
    return text(getField(a.raw, FIELD_ALIASES.empresa)).localeCompare(text(getField(b.raw, FIELD_ALIASES.empresa)), "es");
  });

  document.querySelectorAll(".calendar-day.is-selected-date").forEach((day) => day.classList.remove("is-selected-date"));
  document.querySelector(`.calendar-day[data-date="${dateKey(selectedDayDate)}"]`)?.classList.add("is-selected-date");

  const second = selectedDayEvents.filter((record) => getFloor(record.raw) === "second");
  const third = selectedDayEvents.filter((record) => getFloor(record.raw) === "third");

  document.getElementById("agendaModalTitle").textContent = capitalize(formatLongDate(selectedDayDate));
  document.getElementById("agendaModalSubtitle").textContent = `${selectedDayEvents.length} ${selectedDayEvents.length === 1 ? "evento programado" : "eventos programados"}`;
  document.getElementById("secondFloorCount").textContent = second.length;
  document.getElementById("thirdFloorCount").textContent = third.length;
  document.getElementById("secondFloorEvents").innerHTML = renderFloorEvents(second, "segundo piso", "second");
  document.getElementById("thirdFloorEvents").innerHTML = renderFloorEvents(third, "tercer piso", "third");

  const modal = document.getElementById("modalAgendaDia");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  syncBodyModalState();
  setTimeout(() => modal.querySelector(".modal-close")?.focus(), 30);
}

function renderFloorEvents(records, floorLabel, floorKey){
  if(!records.length){
    return `
      <div class="floor-empty">
        <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-2 5h18M8 3v4m8-4v4"/></svg></span>
        <strong>Sin eventos</strong>
        <small>No hay empresas programadas en ${floorLabel}.</small>
      </div>
    `;
  }

  return records.map((record) => {
    const eventPosition = selectedDayEvents.indexOf(record);
    const empresa = getField(record.raw, FIELD_ALIASES.empresa) || "Empresa sin registrar";
    const horario = getField(record.raw, FIELD_ALIASES.horario) || "Horario pendiente";
    const escenario = getField(record.raw, FIELD_ALIASES.escenario) || "Escenario sin registrar";
    const pax = getField(record.raw, FIELD_ALIASES.pax);
    const status = getOperationalStatus(record);

    return `
      <button class="company-event-card floor-${floorKey}" type="button" onclick="abrirDetalleEvento(${eventPosition})">
        <span class="event-card-accent"></span>
        <span class="event-card-main">
          <span class="event-card-topline">
            <small>${escapeHtml(horario)}</small>
            <i class="status-pill is-${status.key}">${escapeHtml(status.label)}</i>
          </span>
          <strong>${escapeHtml(empresa)}</strong>
          <span class="event-location">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>
            ${escapeHtml(escenario)}
          </span>
        </span>
        <span class="event-card-side">
          ${text(pax).trim() ? `<b>${escapeHtml(pax)}</b><small>personas</small>` : '<b>—</b><small>personas</small>'}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </span>
      </button>
    `;
  }).join("");
}

function abrirDetalleEvento(position){
  const record = selectedDayEvents[position];
  if(!record) return;

  const evento = record.raw;
  const empresa = getField(evento, FIELD_ALIASES.empresa) || "Empresa sin registrar";
  const horario = getField(evento, FIELD_ALIASES.horario) || "Horario sin registrar";
  const escenario = getField(evento, FIELD_ALIASES.escenario) || "Escenario sin registrar";
  const pax = getField(evento, FIELD_ALIASES.pax) || "—";
  const status = getOperationalStatus(record);
  const floorName = getFloor(evento) === "third" ? "Tercer piso" : "Segundo piso";

  document.getElementById("detailModalTitle").textContent = empresa;
  document.getElementById("detailModalSubtitle").textContent = `${capitalize(formatLongDate(record.date))} · ${floorName}`;
  const eventDateLabel = capitalize(formatLongDate(record.date));
  const horarioAyb = getField(evento, FIELD_ALIASES.horarioAyb);
  const alimentacionDescripcion = getField(evento, FIELD_ALIASES.alimentacionDescripcion);

  document.getElementById("detailModalBody").innerHTML = `
    <section class="event-overview floor-${getFloor(evento)}-overview">
      <div class="overview-primary">
        <span class="overview-label">Evento seleccionado</span>
        <h3>${escapeHtml(empresa)}</h3>
        <div class="overview-tags">
          <span><svg viewBox="0 0 24 24"><path d="M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>${escapeHtml(horario)}</span>
          <span><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>${escapeHtml(escenario)}</span>
          <span class="selected-date-tag"><svg viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-2 5h18M8 3v4m8-4v4"/></svg>${escapeHtml(eventDateLabel)}</span>
        </div>
      </div>
      <div class="overview-metric">
        <small>Asistentes</small>
        <strong>${escapeHtml(pax)}</strong>
        <span>personas</span>
      </div>
      <div class="overview-status">
        <small>Estado</small>
        <span class="status-pill is-${status.key}">${escapeHtml(status.label)}</span>
      </div>
    </section>

    <section class="food-service-section">
      <div class="detail-section-heading">
        <div>
          <span>Servicio de alimentación</span>
          <h3>Horario y descripción organizados</h3>
        </div>
        <small>Fecha: ${escapeHtml(record.date.toLocaleDateString("es-CO"))}</small>
      </div>
      <div class="food-service-grid">
        <article class="food-service-field food-schedule-field">
          <div class="service-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg></div>
          <div>
            <small>Horario A&amp;B</small>
            <p>${formatFieldValue(horarioAyb, "HORARIO AYB")}</p>
          </div>
        </article>
        <article class="food-service-field food-description-field">
          <div class="service-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 3h16v18H4zM8 7h8M8 11h8M8 15h5"/></svg></div>
          <div>
            <small>Descripción alimentación</small>
            <p>${formatFieldValue(alimentacionDescripcion, "DESCRIPCION ALIMENTACION")}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="registered-data">
      <div class="detail-section-heading">
        <div>
          <span>Información completa</span>
          <h3>Datos registrados del evento</h3>
        </div>
        <small>${Object.keys(evento || {}).length} campos importados</small>
      </div>
      <div class="detail-data-grid">
        ${renderAllEventFields(evento, [FIELD_ALIASES.horarioAyb, FIELD_ALIASES.alimentacionDescripcion])}
      </div>
    </section>
  `;

  const modal = document.getElementById("modalDetalleEvento");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  syncBodyModalState();
  setTimeout(() => modal.querySelector(".modal-back")?.focus(), 30);
}

function renderAllEventFields(evento, excludedAliasGroups = []){
  const entries = Object.entries(evento || {}).filter(([key]) => {
    if(key.startsWith("__")) return false;
    return !excludedAliasGroups.some((aliases) => fieldKeyMatchesAliases(key, aliases));
  });
  if(!entries.length){
    return '<div class="detail-empty">No se encontraron campos adicionales para este evento.</div>';
  }

  return entries.map(([key, value]) => {
    const displayValue = formatFieldValue(value, key);
    const isDateField = normalizeFieldKey(key).includes("FECHA");
    const parsedDate = isDateField ? toDate(value) : null;
    const isSelectedDate = parsedDate && selectedDayDate && sameDate(parsedDate, selectedDayDate);
    return `
      <article class="data-field${isSelectedDate ? " is-specific-date" : ""}">
        <small>${escapeHtml(prettifyFieldName(key))}</small>
        <div>${displayValue}</div>
      </article>
    `;
  }).join("");
}

function formatFieldValue(value, key){
  if(value === undefined || value === null || text(value).trim() === ""){
    return '<span class="empty-value">Sin registrar</span>';
  }

  const normalizedKey = normalizeFieldKey(key);
  if(normalizedKey.includes("FECHA")){
    const parsedDate = toDate(value);
    if(parsedDate) return escapeHtml(capitalize(formatLongDate(parsedDate)));
  }

  if(typeof value === "object"){
    try{
      return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }catch(_){
      return escapeHtml(text(value));
    }
  }

  return escapeHtml(text(value)).replace(/\r?\n/g, "<br>");
}

function prettifyFieldName(key){
  return text(key)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function capitalize(value){
  const source = text(value);
  return source ? source.charAt(0).toUpperCase() + source.slice(1) : source;
}

function cerrarDetalleEvento(){
  const modal = document.getElementById("modalDetalleEvento");
  if(!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  syncBodyModalState();
}

function cerrarAgendaDia(){
  cerrarDetalleEvento();
  const modal = document.getElementById("modalAgendaDia");
  if(!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  syncBodyModalState();
}

function cerrarTodosLosModales(){
  cerrarAgendaDia();
}

function syncBodyModalState(){
  const anyOpen = Boolean(document.querySelector(".modal.active"));
  document.body.classList.toggle("modal-open", anyOpen);
}

document.getElementById("prevMonth")?.addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonth")?.addEventListener("click", () => changeMonth(1));
document.getElementById("todayButton")?.addEventListener("click", goToToday);

document.getElementById("modalAgendaDia")?.addEventListener("click", (event) => {
  if(event.target === event.currentTarget) cerrarAgendaDia();
});

document.getElementById("modalDetalleEvento")?.addEventListener("click", (event) => {
  if(event.target === event.currentTarget) cerrarDetalleEvento();
});

document.addEventListener("keydown", (event) => {
  if(event.key !== "Escape") return;
  const detailOpen = document.getElementById("modalDetalleEvento")?.classList.contains("active");
  if(detailOpen) cerrarDetalleEvento();
  else cerrarAgendaDia();
});

window.addEventListener("eventDataUpdated", loadEvents);

window.addEventListener("storage", (event) => {
  if(["eventData", "eventDataUpdatedAt"].includes(event.key)) loadEvents();
});

loadEvents();
setInterval(loadEvents, 60000);
