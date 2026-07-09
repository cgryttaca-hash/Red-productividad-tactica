let dataRows = [];
let currentFilter = 'Actuales';
let selectedCompany = null;
let chartMes = null, chartAnio = null, chartEstado = null;

function showPreloader(){
  document.getElementById('agendaPreloader')?.classList.remove('preloader-hide');
}

function hidePreloader(){
  document.getElementById('agendaPreloader')?.classList.add('preloader-hide');
}

function showToast(message, type='success'){
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'error' ? 'error' : type === 'info' ? 'info' : 'success');
  t.textContent = message;
  container.appendChild(t);
  setTimeout(()=>{ if(t.parentNode) t.remove(); }, 3000);
}

function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d){ const x = new Date(d); x.setHours(23,59,59,999); return x; }

function parseExcelDate(v){
  if(v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(v);
    return new Date(excelDate.y, excelDate.m - 1, excelDate.d);
  }
  if(v instanceof Date && !isNaN(v)) return startOfDay(v);
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m) return startOfDay(new Date(+m[3], +m[2]-1, +m[1]));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return startOfDay(new Date(+m[1], +m[2]-1, +m[3]));
  const d = new Date(s);
  return !isNaN(d) ? startOfDay(d) : null;
}

function parseInputDate(value){
  if(!value) return null;
  const [y,m,d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function normalizeEstado(v){
  if(!v) return '';
  const s = String(v).toLowerCase();
  if(s.includes('confirmado')) return 'Confirmado';
  if(s.includes('tentativo') || s.includes('pendiente')) return 'Tentativo o pendiente';
  if(s.includes('program')) return 'Programado';
  if(s.includes('curso')) return 'En curso';
  if(s.includes('ejecut')) return 'Ejecutado';
  if(s.includes('final')) return 'Finalizado';
  if(s.includes('cancel')) return 'Cancelado';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(d){
  if(!(d instanceof Date)) return '';
  return d.toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
}

function escapeHtml(s){
  if(!s && s!==0) return '';
  return String(s).replace(/[&<>"'`=\/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'}[c]));
}

function text(value){
  return value === undefined || value === null ? '' : String(value);
}

function highlightText(text){
  if(!text) return '';
  return text
    .replace(/(tercer piso)/gi, '<span class="hl-tercer">Tercer piso</span>')
    .replace(/(salon\s*\d*|\bsalon\b)/gi, '<span class="hl-salon">$1</span>');
}

function formatMultilineCell(value){
  const normalized = text(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/_x000D_/gi, '\n')
    .replace(/_x000A_/gi, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u2028|\u2029/g, '\n');

  if(!normalized.trim()) return '';

  return normalized.split('\n').map(line => {
    const cleanLine = line.replace(/\t+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return `<div class="multi-line-item">${cleanLine ? escapeHtml(cleanLine) : '&nbsp;'}</div>`;
  }).join('');
}

function normalizeMultilineText(value){
  return text(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/_x000D_/gi, '\n')
    .replace(/_x000A_/gi, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u2028|\u2029/g, '\n');
}

function formatCenteredCell(value, useHighlight = false){
  const normalized = normalizeMultilineText(value);
  if(!normalized.trim()) return '';

  return normalized.split('\n').map(line => {
    const cleanLine = line.replace(/	+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const safeLine = cleanLine ? escapeHtml(cleanLine) : '&nbsp;';
    return `<div class="center-line">${useHighlight ? highlightText(safeLine) : safeLine}</div>`;
  }).join('');
}


function renderTable(rows){
  const tbody = document.getElementById('tbody'); tbody.innerHTML = '';
  if(dataRows.length === 0){ showToast('Carga un archivo para continuar', 'error'); syncPreviewTable(); return; }
  if(rows.length === 0){ showToast('No hay eventos que coincidan con los filtros', 'info'); syncPreviewTable(); return; }

  rows.forEach(r => {
    const tr = document.createElement('tr');
    if(r.FECHA instanceof Date){
      const d = startOfDay(r.FECHA);
      const today = startOfDay(new Date());
      const diff = Math.round((d - today) / 86400000);
      if(diff < 0) tr.style.backgroundColor = '#e5e7eb', tr.style.color = '#6b7280';
      else if(diff === 0) tr.style.backgroundColor = '#fff3cd', tr.style.fontWeight = '700';
      else if(diff <= 5) tr.style.backgroundColor = '#dbeafe';
      else tr.style.backgroundColor = '#dcfce7';
    }

    tr.innerHTML = `
<td class="date-cell center-wrap">${formatCenteredCell(formatDate(r.FECHA))}</td>
<td class="scenario-cell center-wrap">${formatCenteredCell(r['ESCENARIO ASIGNADO'], true)}</td>
<td class="event-time-cell center-wrap">${formatCenteredCell(r['HORARIO DEL EVENTO'])}</td>
<td class="company-cell center-wrap">${formatCenteredCell(r['NOMBRE DE LA EMPRESA'])}</td>
<td class="people-cell center-wrap">${formatCenteredCell(r['CANTIDAD DE PERSONAS'])}</td>
<td class="horario-ayb multiline-cell">${formatMultilineCell(r['HORARIO AYB'] || '')}</td>
<td class="desc-food multiline-cell">${formatMultilineCell(r['DESCRIPCION ALIMENTACION'] || '')}</td>
<td class="accommodation-cell center-wrap">${formatCenteredCell(r['ACOMODACION'])}</td>
<td class="service-mode-cell center-wrap">${formatCenteredCell(r['MODALIDAD DE SERVICIO'])}</td>
<td class="payment-cell center-wrap">${formatCenteredCell(r['MEDIO DE PAGO'])}</td>
<td class="obs-cell">${escapeHtml(r['OBSERVACION'])}</td>
`;
    tbody.appendChild(tr);
  });
  syncPreviewTable();
}

function updateDashboard(rows){
  const dash = document.getElementById('dashboard');
  if(!dash) return;
  dash.innerHTML = '';

  if(!rows.length){
    dash.textContent = 'Sin eventos para los filtros seleccionados';
    return;
  }

  const total = rows.length;
  const pax = rows.reduce((sum, row) => sum + (parseInt(row['CANTIDAD DE PERSONAS'], 10) || 0), 0);
  const medios = {};

  rows.forEach(row => {
    const medio = text(row['MEDIO DE PAGO']).trim() || 'N/A';
    medios[medio] = (medios[medio] || 0) + 1;
  });

  const items = [
    ['Total eventos', total.toLocaleString('es-CO')],
    ['Personas', pax.toLocaleString('es-CO')]
  ];

  Object.entries(medios)
    .sort((a,b) => a[0].localeCompare(b[0], 'es', {sensitivity:'base'}))
    .forEach(([medio, cantidad]) => {
      items.push([medio, cantidad.toLocaleString('es-CO')]);
    });

  const totalFacturado = rows.reduce((sum, row) => sum + getInvoiceAmount(row), 0);
  if(totalFacturado > 0){
    items.push(['Facturado', totalFacturado.toLocaleString('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0})]);
  }

  dash.innerHTML = items.map(([label, value], index) => {
    const separator = index === 0 ? '' : '<span class="summary-separator">|</span>';
    return `${separator}<span class="summary-item"><strong>${escapeHtml(label)}:</strong>&nbsp;${escapeHtml(value)}</span>`;
  }).join('');
}
function destroyCharts(){ [chartMes,chartAnio,chartEstado].forEach(c=>c?.destroy()); chartMes=chartAnio=chartEstado=null; }

function updateCharts(rows){
  const cont = document.getElementById('chartContainer');
  cont.style.display = currentFilter === 'Grafica' ? 'grid' : 'none';
  destroyCharts(); if(cont.style.display === 'none') return;
  try{ if(Chart && ChartDataLabels) Chart.register(ChartDataLabels); }catch(e){}

  const xMes={}, xAnio={}, xEstado={}, xEmp={};
  rows.forEach(r=>{
    if(!(r.FECHA instanceof Date)) return;
    const esc = (r['ESCENARIO ASIGNADO']||'').toLowerCase();
    if(esc.includes('tercer piso')) return;
    const m = r.FECHA.toLocaleString('es-ES',{month:'short'});
    const y = r.FECHA.getFullYear();
    xMes[m]=(xMes[m]||0)+1; xAnio[y]=(xAnio[y]||0)+1;
    const e = r.ESTADO||'Sin estado'; xEstado[e]=(xEstado[e]||0)+1;
    const n = (r['NOMBRE DE LA EMPRESA']||'Desconocida').trim();
    if(n) xEmp[n]=(xEmp[n]||0)+1;
  });

  const ordMes = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const datosMes = Object.entries(xMes).sort((a,b)=>ordMes.indexOf(a[0].slice(0,3)) - ordMes.indexOf(b[0].slice(0,3)));
  chartMes = new Chart(document.getElementById('chartMes'),{
    type:'bar', data:{labels:datosMes.map(e=>e[0]),datasets:[{label:'Eventos',data:datosMes.map(e=>e[1]),backgroundColor:'#2563eb'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:true,text:'📅 Por mes'},legend:{display:false},datalabels:{display:true}}}
  });

  const datosAnio = Object.entries(xAnio).sort((a,b)=>a[0]-b[0]);
  chartAnio = new Chart(document.getElementById('chartAnio'),{
    type:'line', data:{labels:datosAnio.map(e=>e[0]),datasets:[{label:'Eventos',data:datosAnio.map(e=>e[1]),borderColor:'#f59e0b',backgroundColor:'#f59e0b33',tension:0.3,fill:true}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:true,text:'📊 Por año'},legend:{display:false},datalabels:{display:true}}}
  });

  chartEstado = new Chart(document.getElementById('chartEstado'),{
    type:'pie', data:{labels:Object.keys(xEstado),datasets:[{data:Object.values(xEstado),backgroundColor:['#fef3c7','#ffedd5','#fde68a','#dcfce7','#fee2e2','#e2e8f0']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:true,text:'🎯 Por estado'},datalabels:{display:true}}}
  });

  const list = document.getElementById('empresasList'); list.innerHTML='';
  const top = Object.entries(xEmp).sort((a,b)=>b[1]-a[1]).slice(0,5);
  top.forEach(([n,v])=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${escapeHtml(n)}</span> ${v}`;
    li.onclick=()=>{selectedCompany=selectedCompany===n?null:n;applyFilters();};
    if(selectedCompany===n) li.classList.add('active');
    list.appendChild(li);
  });
}


function getScenarioSortRank(row){
  const esc = normalizeText(row?.['ESCENARIO ASIGNADO'] || '');
  if(esc.includes('SALON') && !esc.includes('TERCER PISO')) return 1;
  if(esc.includes('TERCER PISO')) return 2;
  if(esc.includes('ZONA SOCIAL')) return 4;
  return 3;
}

function getScenarioSortName(row){
  return normalizeText(row?.['ESCENARIO ASIGNADO'] || '');
}

function getDateSortKey(row, index){
  return row?.FECHA instanceof Date ? String(startOfDay(row.FECHA).getTime()) : `sin-fecha-${index}`;
}

function sortScenarioGroup(group){
  return group
    .map((row, index) => ({row, index}))
    .sort((a,b) => {
      const rankA = getScenarioSortRank(a.row);
      const rankB = getScenarioSortRank(b.row);
      if(rankA !== rankB) return rankA - rankB;
      if(rankA === 3) return a.index - b.index;

      const nameA = getScenarioSortName(a.row);
      const nameB = getScenarioSortName(b.row);
      const nameCompare = nameA.localeCompare(nameB, 'es', {sensitivity:'base', numeric:true});
      if(nameCompare !== 0) return nameCompare;

      return a.index - b.index;
    })
    .map(item => item.row);
}

function sortRowsByScenarioWithinDate(rows){
  if(!Array.isArray(rows) || rows.length < 2) return rows;

  const sortedRows = [];
  let group = [];
  let currentKey = null;

  const flushGroup = () => {
    if(group.length) sortedRows.push(...sortScenarioGroup(group));
    group = [];
  };

  rows.forEach((row, index) => {
    const key = getDateSortKey(row, index);
    if(group.length && key !== currentKey) flushGroup();
    group.push(row);
    currentKey = key;
  });

  flushGroup();
  return sortedRows;
}

function applyFilters(){
  const s = document.getElementById('search').value.trim().toLowerCase();
  const df = document.getElementById('dateFrom').value ? startOfDay(parseInputDate(document.getElementById('dateFrom').value)) : null;
  const dt = document.getElementById('dateTo').value ? endOfDay(parseInputDate(document.getElementById('dateTo').value)) : null;
  const hoy = startOfDay(new Date());
  const hideNoFood = document.getElementById('hideNoFood')?.checked;
  const paymentFilter = normalizeText(document.getElementById('paymentFilter')?.value || '');
  const floorFilter = document.getElementById('floorFilter')?.value || '';

  let rows = dataRows.filter(r=>{
    let ok = true;
    const fechaOk = r.FECHA instanceof Date;

    if(s){
      const emp = (r['NOMBRE DE LA EMPRESA']||'').toLowerCase();
      const esc = (r['ESCENARIO ASIGNADO']||'').toLowerCase();
      ok = ok && (emp.includes(s) || esc.includes(s));
    }
    if(df) ok = ok && fechaOk && r.FECHA >= df;
    if(dt) ok = ok && fechaOk && r.FECHA <= dt;

    if(currentFilter === 'Actuales') ok = ok && fechaOk && startOfDay(r.FECHA).getTime() >= hoy.getTime();
    if(currentFilter === 'Segundo piso'){
      const esc = (r['ESCENARIO ASIGNADO'] || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      ok = ok && esc.includes('salon') && !esc.includes('tercer piso');
    }
    if(currentFilter === 'Tercer piso'){
      const esc = (r['ESCENARIO ASIGNADO'] || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      ok = ok && esc.includes('tercer piso');
    }
    if(paymentFilter) ok = ok && normalizeText(r['MEDIO DE PAGO']).includes(paymentFilter);
    if(floorFilter) ok = ok && getFloorLabel(r) === floorFilter;
    if(selectedCompany) ok = ok && r['NOMBRE DE LA EMPRESA'] === selectedCompany;
    if(hideNoFood){
      const alimentacionText = normalizeText(`${r['HORARIO AYB'] || ''} ${r['DESCRIPCION ALIMENTACION'] || ''}`);
      if(alimentacionText.includes('SIN ALIMENTACION')) ok = false;
    }
    return ok;
  });

  const visualRows = sortRowsByScenarioWithinDate(rows);

  renderTable(visualRows);
  const graficaAviso = document.getElementById('graficaAviso');
  if(graficaAviso) graficaAviso.hidden = currentFilter !== 'Grafica';
  updateDashboard(rows);
  updateCharts(rows);
  document.getElementById('captionFiltro').textContent = buildFilterSummary(rows);
}

function setActiveFilter(filterName){
  currentFilter = filterName;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector(`.chip[data-filter="${filterName}"]`)?.classList.add('active');
}

function normalizeText(value){
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function updatePaymentOptions(){
  const select = document.getElementById('paymentFilter');
  if(!select) return;

  const currentValue = select.value;
  const medios = [...new Set(dataRows
    .map(row => text(row['MEDIO DE PAGO']).trim())
    .filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, 'es', {sensitivity:'base'}));

  select.innerHTML = '<option value="">Todos los medios de pago</option>' +
    medios.map(medio => `<option value="${escapeHtml(medio)}">${escapeHtml(medio)}</option>`).join('');

  if(medios.some(medio => medio === currentValue)){
    select.value = currentValue;
  }
}

function getFloorLabel(row){
  const esc = normalizeText(row?.['ESCENARIO ASIGNADO'] || row || '');
  if(!esc) return '';

  const pisoMap = [
    {label:'Primer piso', words:['PRIMER PISO','PISO 1','PISO UNO']},
    {label:'Segundo piso', words:['SEGUNDO PISO','PISO 2','PISO DOS']},
    {label:'Tercer piso', words:['TERCER PISO','TERCERO PISO','PISO 3','PISO TRES']},
    {label:'Cuarto piso', words:['CUARTO PISO','PISO 4','PISO CUATRO']},
    {label:'Quinto piso', words:['QUINTO PISO','PISO 5','PISO CINCO']},
    {label:'Sexto piso', words:['SEXTO PISO','PISO 6','PISO SEIS']},
    {label:'Séptimo piso', words:['SEPTIMO PISO','PISO 7','PISO SIETE']},
    {label:'Octavo piso', words:['OCTAVO PISO','PISO 8','PISO OCHO']},
    {label:'Noveno piso', words:['NOVENO PISO','PISO 9','PISO NUEVE']},
    {label:'Décimo piso', words:['DECIMO PISO','PISO 10','PISO DIEZ']}
  ];

  const detected = pisoMap.find(piso => piso.words.some(word => esc.includes(word)));
  if(detected) return detected.label;

  // Mantiene el criterio que ya usaba la aplicación: salones sin marca de tercer piso se tratan como segundo piso.
  if(esc.includes('SALON')) return 'Segundo piso';

  return 'Sin piso definido';
}

function updateFloorOptions(){
  const select = document.getElementById('floorFilter');
  if(!select) return;

  const currentValue = select.value;
  const pisos = [...new Set(dataRows
    .map(row => getFloorLabel(row))
    .filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, 'es', {sensitivity:'base'}));

  select.innerHTML = '<option value="">Todos los pisos</option>' +
    pisos.map(piso => `<option value="${escapeHtml(piso)}">${escapeHtml(piso)}</option>`).join('');

  if(pisos.some(piso => piso === currentValue)){
    select.value = currentValue;
  }
}

function parseMoneyValue(value){
  if(value === undefined || value === null || value === '') return 0;
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  if(!raw) return 0;
  const cleaned = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getInvoiceAmount(row){
  const keys = Object.keys(row || {});
  const candidates = keys.filter(key => {
    const k = normalizeText(key);
    return k === 'VALOR' ||
      k === 'TOTAL' ||
      k.includes('VALOR FACTURADO') ||
      k.includes('TOTAL FACTURADO') ||
      (k.includes('VALOR') && (k.includes('TOTAL') || k.includes('FACT')));
  });

  return candidates.reduce((sum, key) => sum + parseMoneyValue(row[key]), 0);
}

function buildFilterSummary(rows){
  const total = rows.length;
  const pax = rows.reduce((sum, row) => sum + (parseInt(row['CANTIDAD DE PERSONAS'], 10) || 0), 0);
  const medios = {};

  rows.forEach(row => {
    const medio = text(row['MEDIO DE PAGO']).trim() || 'Sin medio de pago';
    medios[medio] = (medios[medio] || 0) + 1;
  });

  const parts = [
    `Total eventos: ${total.toLocaleString('es-CO')}`,
    `Personas: ${pax.toLocaleString('es-CO')}`
  ];

  Object.entries(medios)
    .sort((a,b) => a[0].localeCompare(b[0], 'es', {sensitivity:'base'}))
    .forEach(([medio, cantidad]) => {
      parts.push(`${medio}: ${cantidad.toLocaleString('es-CO')}`);
    });

  const totalFacturado = rows.reduce((sum, row) => sum + getInvoiceAmount(row), 0);
  if(totalFacturado > 0){
    parts.push(`Facturado: ${totalFacturado.toLocaleString('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0})}`);
  }

  return parts.join(' | ');
}

function canonicalHeader(header){
  const h = normalizeText(header);

  if(h === 'FECHA' || h.includes('FECHA DEL EVENTO') || h === 'DIA') return 'FECHA';
  if(h.includes('ESCENARIO')) return 'ESCENARIO ASIGNADO';
  if(h.includes('HORARIO') && h.includes('EVENTO')) return 'HORARIO DEL EVENTO';
  if(h.includes('NOMBRE') && h.includes('EMPRESA')) return 'NOMBRE DE LA EMPRESA';
  if(h === 'EMPRESA') return 'NOMBRE DE LA EMPRESA';
  if(h.includes('CANTIDAD') && h.includes('PERSONAS')) return 'CANTIDAD DE PERSONAS';
  if(h.includes('PAX')) return 'CANTIDAD DE PERSONAS';
  if(h.includes('HORARIO') && (h.includes('AYB') || h.includes('A&B') || h.includes('A Y B'))) return 'HORARIO AYB';
  if(h.includes('DESCRIPCION') && h.includes('ALIMENTACION')) return 'DESCRIPCION ALIMENTACION';
  if(h.includes('ALIMENTACION')) return 'DESCRIPCION ALIMENTACION';
  if(h.includes('ACOMODACION')) return 'ACOMODACION';
  if(h.includes('MODALIDAD') && h.includes('SERVICIO')) return 'MODALIDAD DE SERVICIO';
  if(h.includes('MODALIDAD')) return 'MODALIDAD DE SERVICIO';
  if(h.includes('MEDIO') && h.includes('PAGO')) return 'MEDIO DE PAGO';
  if(h.includes('OBSERVACION')) return 'OBSERVACION';
  if(h.includes('ESTADO') || h.includes('STATUS')) return 'ESTADO';

  return h;
}

function isKnownMonthSheet(sheetName){
  const nombre = normalizeText(sheetName);
  const meses = [
    'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
    'JULIO','AGOSTO','SEPTIEMBRE','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
  ];
  return meses.some(mes => nombre.includes(mes));
}

function findHeaderRowIndex(rows){
  return rows.findIndex(row => {
    const headers = row.map(canonicalHeader);
    return headers.includes('FECHA') &&
      headers.includes('ESCENARIO ASIGNADO') &&
      headers.includes('NOMBRE DE LA EMPRESA');
  });
}

function normalizeWorkbookRow(row, headers, sheetName){
  const obj = {};
  headers.forEach((header, index) => {
    if(!header) return;
    obj[header] = row[index] ?? '';
  });

  const fecha = parseExcelDate(obj['FECHA']);

  return {
    ...obj,
    HOJA_ORIGEN: sheetName,
    FECHA: fecha,
    ESTADO: normalizeEstado(obj['ESTADO'])
  };
}

function rowHasUsefulData(rowObj){
  return Boolean(
    rowObj.FECHA ||
    text(rowObj['NOMBRE DE LA EMPRESA']).trim() ||
    text(rowObj['ESCENARIO ASIGNADO']).trim()
  );
}

let loadedSheetNames = [];

function processWorkbook(workbook){
  const rowsFromWorkbook = [];
  const loaded = [];
  const ignored = [];

  workbook.SheetNames.forEach(nombreHoja => {
    const sheet = workbook.Sheets[nombreHoja];
    const datos = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
      blankrows: false
    });

    if(!datos.length){
      ignored.push(nombreHoja);
      return;
    }

    const headerIndex = findHeaderRowIndex(datos);
    const isMonth = isKnownMonthSheet(nombreHoja);

    // Se cargan todas las hojas que tengan encabezados de agenda.
    // Si una hoja mensual tiene filas vacías arriba, también se detecta por encabezados.
    if(headerIndex === -1){
      ignored.push(nombreHoja);
      return;
    }

    const headers = datos[headerIndex].map(canonicalHeader);
    const sheetRows = datos
      .slice(headerIndex + 1)
      .filter(row => row.some(cell => text(cell).trim() !== ''))
      .map(row => normalizeWorkbookRow(row, headers, nombreHoja))
      .filter(rowHasUsefulData);

    if(sheetRows.length){
      rowsFromWorkbook.push(...sheetRows);
      loaded.push(nombreHoja);
    }else if(isMonth){
      // La hoja mensual existe, pero no tiene eventos útiles todavía.
      loaded.push(nombreHoja);
    }else{
      ignored.push(nombreHoja);
    }
  });

  if(rowsFromWorkbook.length === 0){
    throw new Error('No se encontraron eventos válidos en las hojas del archivo. Verifica que las hojas tengan FECHA, ESCENARIO ASIGNADO y NOMBRE DE LA EMPRESA.');
  }

  dataRows = rowsFromWorkbook.sort((a,b) => {
    const fechaA = a.FECHA instanceof Date ? a.FECHA.getTime() : 0;
    const fechaB = b.FECHA instanceof Date ? b.FECHA.getTime() : 0;
    if(fechaA !== fechaB) return fechaA - fechaB;
    return text(a['HORARIO DEL EVENTO']).localeCompare(text(b['HORARIO DEL EVENTO']));
  });

  loadedSheetNames = [...new Set(loaded)];
  updatePaymentOptions();
  updateFloorOptions();

  localStorage.setItem('eventData', JSON.stringify(dataRows));
  localStorage.setItem('eventDataSheets', JSON.stringify(loadedSheetNames));
  localStorage.setItem('eventDataUpdatedAt', new Date().toISOString());

  selectedCompany = null;
  setActiveFilter('Actuales');
  applyFilters();

  const mensajeHojas = loadedSheetNames.length ? ` Hojas cargadas: ${loadedSheetNames.join(', ')}.` : '';
  showToast(`Archivo actualizado: ${dataRows.length} eventos.${mensajeHojas}`, 'success');
}

function loadWorkbookFromArrayBuffer(buffer){
  const data = new Uint8Array(buffer);
  const wb = XLSX.read(data, { type: 'array', cellDates: false, cellText: false });
  processWorkbook(wb);
}

// Carga y procesamiento de archivos Excel
document.getElementById('fileInput').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  showPreloader();
  reader.onload = ev => {
    try {
      loadWorkbookFromArrayBuffer(ev.target.result);
      showToast('Archivo cargado correctamente');
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Error al leer el archivo', 'error');
    } finally {
      setTimeout(hidePreloader, 350);
    }
  };
  reader.readAsArrayBuffer(f);
  e.target.value = '';
});

// Eventos de interfaz
function syncPreviewTable(){
  const sourceTable = document.getElementById('dataTable');
  const previewHost = document.getElementById('previewTableHost');
  if(!sourceTable || !previewHost) return;

  const clonedTable = sourceTable.cloneNode(true);
  clonedTable.id = 'previewDataTable';
  previewHost.innerHTML = '';
  previewHost.appendChild(clonedTable);
}

function openPreviewModal(){
  const modal = document.getElementById('previewModal');
  if(!modal) return;
  syncPreviewTable();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('preview-open');
}

function closePreviewModal(){
  const modal = document.getElementById('previewModal');
  if(!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('preview-open');
}

function syncFilterPanelButton(){
  const panel = document.getElementById('filterPanel');
  const btn = document.getElementById('toggleFiltersBtn');
  if(!panel || !btn) return;
  const isCollapsed = panel.classList.contains('filters-collapsed');
  btn.textContent = isCollapsed ? 'Mostrar filtros' : 'Ocultar filtros';
  btn.setAttribute('aria-expanded', String(!isCollapsed));
}

function toggleFilterPanel(){
  const panel = document.getElementById('filterPanel');
  if(!panel) return;
  panel.classList.toggle('filters-collapsed');
  syncFilterPanelButton();
}

function syncFoodFilterStatus(){
  const chk = document.getElementById('hideNoFood');
  const status = document.getElementById('foodFilterStatus');
  if(!chk || !status) return;
  status.textContent = chk.checked ? 'Ocultando sin alimentación' : 'Todos visibles';
}


document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('toggleFiltersBtn')?.addEventListener('click', toggleFilterPanel);
document.getElementById('btnPreview')?.addEventListener('click', openPreviewModal);
document.getElementById('closePreview')?.addEventListener('click', closePreviewModal);
document.getElementById('previewModal')?.addEventListener('click', event => {
  if(event.target?.id === 'previewModal') closePreviewModal();
});
document.addEventListener('keydown', event => {
  if(event.key === 'Escape') closePreviewModal();
});
document.getElementById('hideNoFood')?.addEventListener('change', () => {
  syncFoodFilterStatus();
  applyFilters();
});
document.getElementById('dateFrom').addEventListener('change', applyFilters);
document.getElementById('dateTo').addEventListener('change', applyFilters);
document.getElementById('paymentFilter')?.addEventListener('change', applyFilters);
document.getElementById('floorFilter')?.addEventListener('change', applyFilters);
document.getElementById('resetBtn').addEventListener('click',()=>{
  document.getElementById('search').value='';
  document.getElementById('dateFrom').value='';
  document.getElementById('dateTo').value='';
  const paymentSelect = document.getElementById('paymentFilter');
  if(paymentSelect) paymentSelect.value='';
  const floorSelect = document.getElementById('floorFilter');
  if(floorSelect) floorSelect.value='';
  const chk=document.getElementById('hideNoFood');
  if(chk) chk.checked=false;
  syncFoodFilterStatus();
  selectedCompany=null;
  setActiveFilter('Actuales');
  applyFilters();
  showToast('Filtros restablecidos correctamente.', 'success');
});

document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{
  document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  c.classList.add('active'); currentFilter=c.dataset.filter; applyFilters();
}));

window.addEventListener('DOMContentLoaded',()=>{
  syncFoodFilterStatus();
  syncFilterPanelButton();
  const guardado = localStorage.getItem('eventData');
  if(guardado){
    try{
      dataRows = JSON.parse(guardado).map(r=>({...r, FECHA:r.FECHA?parseExcelDate(r.FECHA):null}));
      loadedSheetNames = JSON.parse(localStorage.getItem('eventDataSheets') || '[]');
      updatePaymentOptions();
      updateFloorOptions();
      applyFilters(); showToast('Datos cargados del historial');
    }catch(e){ localStorage.removeItem('eventData'); }
  } else renderTable([]);
  setTimeout(hidePreloader, 650);
});

document.getElementById('btnLoad').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('btnLoadSample')?.addEventListener('click', async () => {
  try {
    showToast('Cargando base incluida...');
    const response = await fetch('data/MIN_PRODUCTIVIDAD_TACTICA_34.xlsx');
    if(!response.ok) throw new Error('No se pudo abrir el archivo incluido');
    const buffer = await response.arrayBuffer();
    loadWorkbookFromArrayBuffer(buffer);
    showToast('Base incluida cargada correctamente');
  } catch (err) {
    console.error(err);
    showToast(err?.message || 'Abre el proyecto con Live Server para cargar la base incluida', 'error');
  }
});


/* Botones adicionales y regreso automático al inicio */
const HOME_URL = 'index.html';
const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutos de inactividad

let inactivityTimer = null;

function volverAlInicio(){
  window.location.href = HOME_URL;
}

function resetInactivityTimer(){
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(volverAlInicio, INACTIVITY_LIMIT_MS);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnInicio')?.addEventListener('click', volverAlInicio);
  document.getElementById('btnPrint')?.addEventListener('click', () => window.print());

  ['click','mousemove','keydown','scroll','touchstart','input','change'].forEach(eventName => {
    document.addEventListener(eventName, resetInactivityTimer, { passive: true });
  });

  resetInactivityTimer();
});
