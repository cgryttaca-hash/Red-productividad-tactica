const $ = id => document.getElementById(id);
const text = value => value === undefined || value === null ? '' : String(value);

function normalize(value){
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function parseDate(value){
  if(!value) return null;
  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return new Date(value.getFullYear(),value.getMonth(),value.getDate());
  }
  const source = text(value).trim();
  let match = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(match) return new Date(+match[1],+match[2]-1,+match[3]);
  match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(match) return new Date(+match[3],+match[2]-1,+match[1]);
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(),date.getMonth(),date.getDate());
}

function isoDate(date){
  if(!(date instanceof Date)) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function escapeHtml(value){
  return text(value).replace(/[&<>"']/g,character=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[character]));
}

function getField(row,keys){
  for(const key of keys){
    if(row?.[key] !== undefined && row?.[key] !== null && text(row[key]).trim() !== '') return row[key];
  }
  return '';
}

function floorOf(scenario){
  return /TERCER|PISO\s*3|\b3\d{2}\b/.test(normalize(scenario)) ? 'third' : 'second';
}

function eventFromRow(row,index){
  const date = parseDate(getField(row,['FECHA','fecha']));
  return {
    id:text(row.__EVENT_ID || index),
    date,
    dateISO:isoDate(date),
    company:text(getField(row,['NOMBRE DE LA EMPRESA','EMPRESA','empresa'])) || 'Empresa sin registrar',
    scenario:text(getField(row,['ESCENARIO ASIGNADO','ESCENARIO','escenario'])) || 'Sin escenario',
    schedule:text(getField(row,['HORARIO DEL EVENTO','HORARIO','horario'])) || 'Sin horario',
    pax:Number(getField(row,['CANTIDAD DE PERSONAS','PAX','personas'])) || 0,
    floor:floorOf(getField(row,['ESCENARIO ASIGNADO','ESCENARIO','escenario']))
  };
}

function readEvents(){
  try{
    const rows = JSON.parse(localStorage.getItem('eventData') || '[]');
    if(!Array.isArray(rows)) return [];
    return rows.map(eventFromRow).filter(event=>event.date);
  }catch(_){
    return [];
  }
}

function formatDate(date,options){
  return date instanceof Date
    ? date.toLocaleDateString('es-CO',options)
    : 'Fecha sin registrar';
}

function updateClock(){
  const now = new Date();
  $('todayLabel').textContent = now.toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short'});
  $('reloj').textContent = now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
}

function formatUpdatedAt(value){
  if(!value) return 'Sin carga';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Sin carga'
    : date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}

function renderStatus(events){
  const updatedAt = localStorage.getItem('eventDataUpdatedAt');
  $('dashboardEventCount').textContent = events.length.toLocaleString('es-CO');
  $('dashboardUpdatedAt').textContent = formatUpdatedAt(updatedAt);

  const indicator = $('dataStatusIndicator');
  const hasData = events.length > 0 && Boolean(updatedAt);
  indicator.classList.toggle('is-current',hasData);
  indicator.classList.toggle('is-outdated',!hasData);
  indicator.innerHTML = `<span></span>${hasData ? 'Datos actualizados' : 'Datos sin verificar'}`;
}

function operationCard(event){
  return `
    <article class="operation-card">
      <div class="operation-time">${escapeHtml(event.schedule)}</div>
      <div class="operation-main">
        <strong>${escapeHtml(event.company)}</strong>
        <span>${escapeHtml(event.scenario)}</span>
      </div>
      <div class="operation-pax">
        <strong>${event.pax.toLocaleString('es-CO')}</strong>
        <small>personas</small>
      </div>
    </article>
  `;
}

function floorBlock(title,events,type){
  if(!events.length) return '';
  return `
    <section class="floor-block ${type === 'third' ? 'is-third' : ''}">
      <div class="floor-title">
        <div><span class="floor-badge">${type === 'third' ? '03' : '02'}</span><h3>${title}</h3></div>
        <span>${events.length} ${events.length === 1 ? 'evento' : 'eventos'}</span>
      </div>
      ${events.map(operationCard).join('')}
    </section>
  `;
}

function renderOperations(events){
  const today = isoDate(new Date());
  const todayEvents = events
    .filter(event=>event.dateISO === today)
    .sort((a,b)=>a.floor.localeCompare(b.floor) || a.scenario.localeCompare(b.scenario,'es',{numeric:true}) || a.schedule.localeCompare(b.schedule,'es',{numeric:true}));

  const list = $('operationsList');
  if(!todayEvents.length){
    $('operationsTitle').textContent = 'Eventos de hoy';
    $('operationsSubtitle').textContent = 'No hay programación registrada para la fecha actual.';
    list.innerHTML = `
      <div class="empty-panel">
        <strong>Sin eventos para hoy</strong>
        <span>La programación próxima se encuentra en la sección inferior.</span>
      </div>
    `;
    return;
  }

  const second = todayEvents.filter(event=>event.floor === 'second');
  const third = todayEvents.filter(event=>event.floor === 'third');
  $('operationsTitle').textContent = `Eventos de hoy · ${todayEvents.length}`;
  $('operationsSubtitle').textContent = formatDate(new Date(),{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  list.innerHTML = floorBlock('Segundo piso',second,'second') + floorBlock('Tercer piso',third,'third');
}

function renderUpcoming(events){
  const today = isoDate(new Date());
  const upcoming = events
    .filter(event=>event.dateISO > today)
    .sort((a,b)=>a.date-b.date || a.scenario.localeCompare(b.scenario,'es',{numeric:true}) || a.schedule.localeCompare(b.schedule,'es',{numeric:true}))
    .slice(0,8);

  const container = $('upcomingList');
  if(!upcoming.length){
    container.innerHTML = `
      <div class="empty-panel">
        <strong>No hay próximos eventos registrados</strong>
        <span>El listado se actualizará automáticamente cuando cambie el Excel.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = upcoming.map(event=>`
    <article class="upcoming-card">
      <span class="upcoming-date">${escapeHtml(formatDate(event.date,{weekday:'short',day:'2-digit',month:'short'}))}</span>
      <strong>${escapeHtml(event.company)}</strong>
      <span>${escapeHtml(event.scenario)}</span>
      <small>${escapeHtml(event.schedule)} · ${event.pax.toLocaleString('es-CO')} personas</small>
    </article>
  `).join('');
}

function auditItem(entry){
  const timestamp = new Date(entry.timestamp);
  const time = Number.isNaN(timestamp.getTime())
    ? '—'
    : timestamp.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});

  const title = entry.type === 'creado'
    ? `Evento creado · ${entry.company || 'Empresa sin registrar'}`
    : entry.type === 'eliminado'
      ? `Evento eliminado · ${entry.company || 'Empresa sin registrar'}`
      : `${entry.field || 'Campo'} actualizado · ${entry.company || 'Empresa sin registrar'}`;

  return `
    <article class="audit-item">
      <div class="audit-time">${escapeHtml(time)}</div>
      <div class="audit-content">
        <strong>${escapeHtml(title)}</strong>
        <div class="audit-meta">
          <span>${escapeHtml(entry.host || 'Equipo')}</span>
          <span>${escapeHtml(entry.user || 'Usuario')}</span>
          <span>${escapeHtml(entry.sheet || '')}</span>
        </div>
        ${entry.type === 'actualizado' ? `
          <div class="audit-change">
            <div class="audit-value">${escapeHtml(entry.before || 'Vacío')}</div>
            <b>→</b>
            <div class="audit-value">${escapeHtml(entry.after || 'Vacío')}</div>
          </div>
        ` : ''}
        <span class="audit-cell">${escapeHtml(entry.cell || entry.field || 'Registro')}</span>
      </div>
    </article>
  `;
}

async function renderAudit(){
  const list = $('auditList');
  list.innerHTML = '<div class="empty-panel"><strong>Cargando historial…</strong></div>';

  try{
    const module = await import('./audit-store.js');
    const entries = await module.getRecent(70);
    if(!entries.length){
      list.innerHTML = `
        <div class="empty-panel">
          <strong>Sin cambios registrados todavía</strong>
          <span>Las modificaciones futuras del Excel aparecerán aquí automáticamente.</span>
        </div>
      `;
      return;
    }
    list.innerHTML = entries.map(auditItem).join('');
  }catch(error){
    list.innerHTML = `
      <div class="empty-panel">
        <strong>Historial no disponible</strong>
        <span>${escapeHtml(error.message || 'No fue posible abrir la auditoría local.')}</span>
      </div>
    `;
  }
}

function refreshDashboard(){
  const events = readEvents();
  renderStatus(events);
  renderOperations(events);
  renderUpcoming(events);
}

window.addEventListener('load',()=>setTimeout(()=>$('loader')?.classList.add('is-hidden'),180));
window.addEventListener('eventDataUpdated',()=>{
  refreshDashboard();
  setTimeout(renderAudit,80);
});
window.addEventListener('eventAuditUpdated',renderAudit);
window.addEventListener('storage',event=>{
  if(['eventData','eventDataUpdatedAt'].includes(event.key)) refreshDashboard();
});

$('refreshAudit').addEventListener('click',renderAudit);

updateClock();
setInterval(updateClock,30000);
refreshDashboard();
renderAudit();
