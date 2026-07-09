const STORAGE_EVENTOS = 'eventData';
const STORAGE_COWORK = 'minutaCoworkingRows';

let allEvents = [];
let tomorrowEvents = [];

const $ = (id) => document.getElementById(id);

function text(value){
  return value === undefined || value === null ? '' : String(value);
}

function normalize(value){
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function showToast(message, type='ok'){
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.style.display = 'block';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>{ toast.style.display = 'none'; }, 3200);
}

function hideLoader(){
  setTimeout(()=> $('loader')?.classList.add('hidden'), 450);
}

function startOfDay(date){
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, days){
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseEventDate(value){
  if(!value) return null;
  if(value instanceof Date && !Number.isNaN(value.getTime())) return startOfDay(value);

  const s = text(value).trim();
  if(!s) return null;

  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(match) return startOfDay(new Date(+match[1], +match[2]-1, +match[3]));

  match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(match){
    const year = +match[3] < 100 ? 2000 + +match[3] : +match[3];
    return startOfDay(new Date(year, +match[2]-1, +match[1]));
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

function formatDate(date){
  if(!(date instanceof Date)) return '';
  return date.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function formatLongDate(date){
  if(!(date instanceof Date)) return '';
  return date.toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
}

function cleanMultiline(value){
  return text(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/_x000D_/gi, '\n')
    .replace(/_x000A_/gi, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u2028|\u2029/g, '\n')
    .split('\n')
    .map(line => line.replace(/\t+/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function getAny(row, keys){
  for(const key of keys){
    if(row[key] !== undefined && row[key] !== null && text(row[key]).trim() !== '') return row[key];
  }

  const normalizedRow = {};
  Object.keys(row || {}).forEach(k => normalizedRow[normalize(k)] = row[k]);

  for(const key of keys){
    const nk = normalize(key);
    if(normalizedRow[nk] !== undefined && text(normalizedRow[nk]).trim() !== '') return normalizedRow[nk];
  }

  return '';
}

function detectPiso(salon){
  const s = normalize(salon);

  if(/ZONA SOCIAL|SOCIAL/.test(s)) return 'zona';

  // Tercer piso debe evaluarse antes de SALON, porque escenarios como
  // "TERCER PISO SALÓN 307" contienen la palabra SALON.
  if(/TERCER|PISO 3|PISO TRES|\b3\d{2}\b/.test(s)) return 'tercero';

  // Los salones y salas sin texto de tercer piso corresponden al segundo piso.
  if(/SALON|SALA|SALÓN|SEGUNDO|PISO 2|PISO DOS/.test(s)) return 'segundo';

  if(/CUARTO|PISO 4|PISO CUATRO|\b4\d{2}\b/.test(s)) return 'zona';

  return 'zona';
}

function isCancelled(row){
  return /CANCEL/.test(normalize(Object.values(row || {}).join(' ')));
}

function isSinAlimentacion(evento){
  const combined = normalize(`${evento.horarioAyB || ''} ${evento.alimentacion || ''}`);
  if(!combined) return true;
  return /SIN ALIMENTACION|NO TIENE|NO APLICA|N\/A|NINGUNA/.test(combined);
}

function normalizeEvent(row){
  const fecha = parseEventDate(getAny(row, ['FECHA','FECHA DEL EVENTO','FECHA EVENTO','DIA','DÍA']));
  const empresa = getAny(row, ['NOMBRE DE LA EMPRESA','EMPRESA','CLIENTE','NOMBRE CLIENTE']);
  const salon = getAny(row, ['ESCENARIO ASIGNADO','SALON','SALÓN','ESCENARIO','SALA']);
  const pax = getAny(row, ['CANTIDAD DE PERSONAS','PAX','ASISTENTES','PERSONAS']);
  const horario = getAny(row, ['HORARIO DEL EVENTO','HORARIO','HORA','HOR INICIO / FIN','HORA INICIO']);
  const tipo = getAny(row, ['TIPO DE EVENTO','TIPO DE SERVICIO','ACOMODACION','ACOMODACIÓN']);
  const alimentacion = cleanMultiline(getAny(row, ['DESCRIPCION ALIMENTACION','DESCRIPCIÓN ALIMENTACIÓN','ALIMENTACION','ALIMENTACIÓN','DESCRIPCION','DESCRIPCIÓN']));
  const horarioAyB = cleanMultiline(getAny(row, ['HORARIO AYB','HORARIO A Y B','HORARIO ALIMENTACION','HORARIO ALIMENTACIÓN']));
  const observaciones = cleanMultiline(getAny(row, ['OBSERVACION','OBSERVACIÓN','OBSERVACIONES','DETALLES IMPORTANTES','DETALLE']));
  const medioPago = getAny(row, ['MEDIO DE PAGO','MEDIO PAGO','FORMA DE PAGO']);
  const modalidadServicio = getAny(row, [
    'MODALIDAD DE SERVICIO',
    'MODALIDAD SERVICIO',
    'MODALIDAD',
    'TIPO MODALIDAD',
    'TIPO DE MODALIDAD'
  ]);

  return {
    fecha,
    empresa:text(empresa).trim(),
    salon:text(salon).trim(),
    piso:detectPiso(salon),
    pax:parseInt(pax, 10) || 0,
    horario:text(horario).trim(),
    tipo:text(tipo).trim(),
    alimentacion,
    horarioAyB,
    observaciones,
    medioPago:text(medioPago).trim(),
    modalidadServicio:text(modalidadServicio).trim(),
    raw:row
  };
}

function setStatus(message, ok=true){
  const status = $('dataStatus');
  const pill = $('statusPill');
  if(status) status.textContent = message;
  if(pill){
    pill.classList.toggle('ok', ok);
    pill.classList.toggle('warn', !ok);
  }
}

function createEmpty(message){
  const div = document.createElement('div');
  div.className = 'empty-card';
  div.textContent = message;
  return div;
}


function makeCell(textValue, className=''){
  const td = document.createElement('td');
  if(className) td.className = className;
  td.textContent = text(textValue || '').toUpperCase();
  return td;
}

function makeFoodScheduleCell(evento){
  const hasFood = !isSinAlimentacion(evento);
  const td = document.createElement('td');
  td.className = `food-time-cell ${hasFood ? 'has-food' : 'no-food'}`;
  td.textContent = hasFood
    ? (evento.horarioAyB || 'HORARIO SIN REGISTRAR').toUpperCase()
    : 'SIN ALIMENTACIÓN';
  return td;
}

function makeFoodDetailCell(evento){
  const hasFood = !isSinAlimentacion(evento);
  const td = document.createElement('td');
  td.className = `food-detail-cell ${hasFood ? 'has-food' : 'no-food'}`;
  td.textContent = hasFood
    ? (evento.alimentacion || 'ALIMENTACIÓN SIN DETALLE').toUpperCase()
    : 'NO APLICA';
  return td;
}

function splitEventTime(value){
  const original = text(value).replace(/\s+/g, ' ').trim();
  if(!original) return { inicio:'', final:'' };

  const normalized = original
    .replace(/\s+HASTA\s+/ig, ' - ')
    .replace(/\s+A\s+LAS\s+/ig, ' - ')
    .replace(/[–—]/g, '-');

  const match = normalized.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|A\.M\.|P\.M\.)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM|A\.M\.|P\.M\.)?)/i);
  if(match){
    return {
      inicio: match[1].replace(/\./g,'').toUpperCase(),
      final: match[2].replace(/\./g,'').toUpperCase()
    };
  }

  const parts = normalized.split('-').map(x => x.trim()).filter(Boolean);
  if(parts.length >= 2){
    return { inicio: parts[0].toUpperCase(), final: parts.slice(1).join(' - ').toUpperCase() };
  }

  return { inicio: original.toUpperCase(), final:'' };
}

function renderEventsTable(rows){
  const table = document.createElement('table');
  table.className = 'minute-events-table';
  table.innerHTML = `
    <colgroup>
      <col><col><col><col><col><col><col><col><col>
    </colgroup>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Cliente</th>
        <th>Horario</th>
        <th>Escenario</th>
        <th>Modalidad servicio</th>
        <th>PAX</th>
        <th>Pago</th>
        <th>Horario A&amp;B</th>
        <th>Alimentación</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  rows.forEach(evento => {
    const tr = document.createElement('tr');
    const horas = splitEventTime(evento.horario || '');
    const rangoHorario = [horas.inicio, horas.final].filter(Boolean).join(' – ') || 'No registra';
    tr.append(
      makeCell(formatDate(evento.fecha) || 'No registra', 'date-cell'),
      makeCell(evento.empresa || 'Evento sin empresa', 'company-cell'),
      makeCell(rangoHorario, 'time-cell range-cell'),
      makeCell(evento.salon || 'No registra', 'room-cell'),
      makeCell(evento.modalidadServicio || 'No registra', 'service-mode-cell'),
      makeCell(`${evento.pax || 0}`, 'pax-cell'),
      makeCell(evento.medioPago || 'No registra', 'payment-cell'),
      makeFoodScheduleCell(evento),
      makeFoodDetailCell(evento)
    );
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function renderFloor(rows, containerId){
  const container = $(containerId);
  container.innerHTML = '';

  if(!rows.length){
    container.appendChild(createEmpty('Sin eventos programados para esta sección.'));
    return;
  }

  container.appendChild(renderEventsTable(rows));
}

function extractFirstNumber(value){
  const match = normalize(value).match(/\d+/);
  return match ? parseInt(match[0], 10) : 9999;
}

function scenarioSortKey(salon){
  const s = normalize(salon);

  if(/ZONA SOCIAL|SOCIAL/.test(s)){
    return { group:3, order:9999, label:s };
  }

  // Tercer piso antes de SALON para no clasificar mal "TERCER PISO SALÓN 307".
  if(/TERCER|PISO 3|PISO TRES|\b3\d{2}\b/.test(s)){
    const room = (s.match(/\b3\d{2}\b/) || [null])[0];
    return { group:2, order:room ? parseInt(room, 10) : extractFirstNumber(s), label:s };
  }

  if(/SALON|SALÓN|SALA|SEGUNDO|PISO 2|PISO DOS/.test(s)){
    return { group:1, order:extractFirstNumber(s), label:s };
  }

  return { group:4, order:extractFirstNumber(s), label:s };
}

function sortForMinute(a,b){
  const ka = scenarioSortKey(a.salon);
  const kb = scenarioSortKey(b.salon);

  if(ka.group !== kb.group) return ka.group - kb.group;

  // Tercer piso: orden ascendente por número de salón 307, 308, 309...
  if(ka.group === 2 && ka.order !== kb.order) return ka.order - kb.order;

  // Segundo piso y zona social: orden alfabético/natural por Escenario Asignado.
  const salonCompare = ka.label.localeCompare(kb.label, 'es', {sensitivity:'base', numeric:true});
  if(salonCompare !== 0) return salonCompare;
  return text(a.horario).localeCompare(text(b.horario), 'es', {sensitivity:'base', numeric:true});
}

function renderMinute(){
  const tomorrow = addDays(new Date(), 1);

  tomorrowEvents = allEvents
    .filter(evt => evt.fecha instanceof Date && evt.fecha.getTime() === tomorrow.getTime())
    .filter(evt => !isCancelled(evt.raw || evt))
    .sort(sortForMinute);

  const segundo = tomorrowEvents.filter(e => e.piso === 'segundo').sort(sortForMinute);
  const zona = tomorrowEvents.filter(e => e.piso === 'zona').sort(sortForMinute);
  const tercero = tomorrowEvents.filter(e => e.piso === 'tercero' || e.piso === 'zona').sort(sortForMinute);

  renderFloor(segundo, 'listaSegundo');
  renderFloor(tercero, 'listaTercero');

  const pax = tomorrowEvents.reduce((sum, e)=> sum + (parseInt(e.pax,10)||0), 0);
  const conAlim = tomorrowEvents.filter(e => !isSinAlimentacion(e)).length;
  const sinAlim = tomorrowEvents.filter(e => isSinAlimentacion(e)).length;

  $('summaryTotal').textContent = tomorrowEvents.length.toLocaleString('es-CO');
  $('summaryPax').textContent = pax.toLocaleString('es-CO');
  $('summarySegundo').textContent = segundo.length.toLocaleString('es-CO');
  $('summaryTercero').textContent = tercero.length.toLocaleString('es-CO');
  if($('summaryZona')) $('summaryZona').textContent = zona.length.toLocaleString('es-CO');
  $('summaryConAlim').textContent = conAlim.toLocaleString('es-CO');
  $('summarySinAlim').textContent = sinAlim.toLocaleString('es-CO');
  $('badgeSegundo').textContent = `${segundo.length} eventos`;
  $('badgeTercero').textContent = `${tercero.length} eventos`;
  if($('badgeZona')) $('badgeZona').textContent = `${zona.length} eventos`;
  $('targetDateLabel').textContent = formatLongDate(tomorrow).toUpperCase();
  $('currentDateLabel').textContent = new Date().toLocaleString('es-CO');
  $('generatedAt').textContent = `Generado: ${new Date().toLocaleString('es-CO')}`;

  if(allEvents.length){
    setStatus(`${tomorrowEvents.length} eventos para mañana`, true);
  } else {
    setStatus('Sin datos sincronizados desde Eventos', false);
  }
}

function loadFromEventStorage(showMessage=false){
  const stored = localStorage.getItem(STORAGE_EVENTOS);

  if(!stored){
    allEvents = [];
    renderMinute();
    setStatus('Primero carga el Excel en Eventos', false);
    if(showMessage) showToast('No hay eventos sincronizados. Vuelve a Eventos y carga el Excel principal.', 'error');
    return false;
  }

  try{
    const raw = JSON.parse(stored);
    allEvents = raw.map(normalizeEvent).filter(e => e.fecha);
    renderMinute();
    if(showMessage) showToast('Minuta actualizada con los eventos sincronizados.');
    return true;
  }catch(error){
    console.error(error);
    allEvents = [];
    renderMinute();
    setStatus('Datos guardados no legibles', false);
    if(showMessage) showToast('No fue posible leer los eventos sincronizados. Carga nuevamente el Excel en Eventos.', 'error');
    return false;
  }
}

function saveCoworking(){
  const rows = [...document.querySelectorAll('#tbodyCoworking tr')].map(tr => {
    return [...tr.querySelectorAll('td[contenteditable="true"]')].map(td => td.innerText.trim());
  });
  localStorage.setItem(STORAGE_COWORK, JSON.stringify(rows));
}

function loadCoworking(){
  const tbody = $('tbodyCoworking');
  const stored = localStorage.getItem(STORAGE_COWORK);
  if(!stored) return;
  try{
    const rows = JSON.parse(stored);
    if(!Array.isArray(rows) || !rows.length) return;
    tbody.innerHTML = '';
    rows.forEach(values => addCoworkRow(values));
  }catch(error){ console.error(error); }
}

function addCoworkRow(values=[]){
  const tbody = $('tbodyCoworking');
  const tr = document.createElement('tr');
  const labels = ['Fecha','Cliente','Hora inicio','Hora final','Escenario','PAX','Pago'];

  labels.forEach((label, index) => {
    const cell = document.createElement('td');
    cell.contentEditable = 'true';
    cell.dataset.label = label;
    cell.textContent = values[index] || '';
    tr.appendChild(cell);
  });

  const action = document.createElement('td');
  action.className = 'no-print';
  action.innerHTML = '<button class="row-delete" type="button">Eliminar</button>';
  tr.appendChild(action);
  tbody.appendChild(tr);
}


function preparePrintFit(){
  const root = $('printRoot');
  if(!root) return;

  document.body.classList.add('printing-events');
  document.body.classList.remove('print-compact', 'print-dense', 'print-ultra');

  const eventRows = document.querySelectorAll('.minute-events-table tbody tr').length;
  const coworkRows = document.querySelectorAll('#tbodyCoworking tr').length;
  const totalRows = Math.max(1, eventRows + coworkRows);

  // Ajuste por densidad: mantiene el reporte dentro de carta horizontal
  // sin convertir la minuta en texto ilegible. Solo afecta impresión.
  if(totalRows > 18) document.body.classList.add('print-ultra');
  else if(totalRows > 13) document.body.classList.add('print-dense');
  else if(totalRows > 8) document.body.classList.add('print-compact');
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-events', 'print-compact', 'print-dense', 'print-ultra');
});


function renderNextEventsModal(){
  const list = $('nextEventsList');
  if(!list) return;

  const today = startOfDay(new Date());
  const upcoming = allEvents
    .filter(evt => evt.fecha instanceof Date && evt.fecha.getTime() >= today.getTime())
    .filter(evt => !isCancelled(evt.raw || evt))
    .sort((a,b) => {
      const fa = a.fecha instanceof Date ? a.fecha.getTime() : Infinity;
      const fb = b.fecha instanceof Date ? b.fecha.getTime() : Infinity;
      if(fa !== fb) return fa - fb;
      return sortForMinute(a,b);
    })
    .slice(0, 40);

  list.innerHTML = '';
  if(!upcoming.length){
    const empty = document.createElement('div');
    empty.className = 'next-event-empty';
    empty.textContent = 'No hay próximos eventos disponibles con los datos sincronizados.';
    list.appendChild(empty);
    return;
  }

  upcoming.forEach(evento => {
    const item = document.createElement('div');
    item.className = 'next-event-card';
    const horas = splitEventTime(evento.horario || '');
    const horario = [horas.inicio, horas.final].filter(Boolean).join(' – ') || 'SIN HORARIO';
    item.innerHTML = `
      <div><span>Fecha</span><strong class="next-date">${formatDate(evento.fecha)}</strong></div>
      <div><span>Cliente</span><strong>${text(evento.empresa || 'Evento sin empresa')}</strong></div>
      <div><span>Escenario</span><strong>${text(evento.salon || 'Sin escenario')}</strong></div>
      <div><span>Horario</span><strong>${horario}</strong></div>
    `;
    list.appendChild(item);
  });
}

function openNextEventsModal(){
  const modal = $('nextEventsModal');
  if(!modal) return;
  renderNextEventsModal();
  modal.classList.add('active');
  modal.setAttribute('aria-hidden','false');
}

function closeNextEventsModal(){
  const modal = $('nextEventsModal');
  if(!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden','true');
}

function bindEvents(){
  $('btnNextEvents').addEventListener('click', () => { loadFromEventStorage(false); openNextEventsModal(); });
  $('btnBack').addEventListener('click', () => { window.location.href = 'index.html'; });
  $('btnPrint').addEventListener('click', () => { saveCoworking(); preparePrintFit(); window.print(); });
  $('closeNextEventsModal')?.addEventListener('click', closeNextEventsModal);
  $('nextEventsModal')?.addEventListener('click', event => {
    if(event.target === event.currentTarget) closeNextEventsModal();
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') closeNextEventsModal();
  });

  $('addCoworkRow').addEventListener('click', () => { addCoworkRow(); saveCoworking(); });
  $('tbodyCoworking').addEventListener('input', saveCoworking);
  $('tbodyCoworking').addEventListener('click', event => {
    if(event.target.classList.contains('row-delete')){
      const rows = document.querySelectorAll('#tbodyCoworking tr');
      if(rows.length <= 1){
        event.target.closest('tr').querySelectorAll('[contenteditable="true"]').forEach(td => td.textContent = '');
      } else {
        event.target.closest('tr').remove();
      }
      saveCoworking();
    }
  });

  window.addEventListener('storage', event => {
    if(event.key === STORAGE_EVENTOS) loadFromEventStorage(false);
  });

  document.addEventListener('visibilitychange', () => {
    if(!document.hidden) loadFromEventStorage(false);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadCoworking();
  loadFromEventStorage(false);
  hideLoader();
});
