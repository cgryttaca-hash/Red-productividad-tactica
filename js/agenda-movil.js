import {
  FIREBASE_CONFIG,
  EVENTS_COLLECTION,
  META_COLLECTION
} from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
const FALLBACK_INTERVAL_MS = 15000;
const $ = id => document.getElementById(id);

const state = {
  all:[],
  view:'today',
  updatedAt:'',
  auth:null,
  db:null,
  sdk:null,
  eventsUnsubscribe:null,
  metaUnsubscribe:null,
  fallbackTimer:null,
  lastHash:'',
  initialized:false,
  refreshing:false,
  expectedCount:0,
  repairTimer:null
};

const text = value => value === undefined || value === null ? '' : String(value);
const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const esc = value => text(value).replace(/[&<>"']/g,character=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[character]));

function dateISO(value){
  if(!value) return '';
  const source = text(value);
  let match = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(match) return `${match[3]}-${String(match[2]).padStart(2,'0')}-${String(match[1]).padStart(2,'0')}`;
  const date = new Date(source);
  if(Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function localDate(iso){
  const match = text(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? new Date(+match[1],+match[2]-1,+match[3]) : new Date(iso);
}

function todayISO(){
  return dateISO(new Date());
}

function valueFrom(row,keys){
  for(const key of keys){
    if(row?.[key] !== undefined && row?.[key] !== null) return row[key];
  }
  return '';
}

function eventFromRow(row,index){
  const scenario = text(valueFrom(row,['escenario','ESCENARIO ASIGNADO','ESCENARIO']));
  const isThird = /TERCER|PISO\s*3|\b3\d{2}\b/i.test(scenario);
  return {
    id:text(row.id || row.__EVENT_ID || index),
    fechaISO:dateISO(valueFrom(row,['fechaISO','FECHA'])),
    escenario:scenario || 'Sin escenario asignado',
    horarioEvento:text(valueFrom(row,['horarioEvento','HORARIO DEL EVENTO','HORARIO'])),
    empresa:text(valueFrom(row,['empresa','NOMBRE DE LA EMPRESA','EMPRESA'])) || 'Empresa sin registrar',
    cantidadPersonas:Number(valueFrom(row,['cantidadPersonas','CANTIDAD DE PERSONAS','PAX'])) || 0,
    horarioAyB:text(valueFrom(row,['horarioAyB','HORARIO AYB','HORARIO A&B'])),
    descripcionAlimentacion:text(valueFrom(row,['descripcionAlimentacion','DESCRIPCION ALIMENTACION','DESCRIPCIÓN ALIMENTACIÓN'])),
    acomodacion:text(valueFrom(row,['acomodacion','ACOMODACION','ACOMODACIÓN'])),
    modalidadServicio:text(valueFrom(row,['modalidadServicio','MODALIDAD DE SERVICIO','MODALIDAD'])),
    medioPago:text(valueFrom(row,['medioPago','MEDIO DE PAGO','PAGO'])),
    observacion:text(valueFrom(row,['observacion','OBSERVACION','OBSERVACIÓN'])),
    estado:text(valueFrom(row,['estado','ESTADO'])),
    desarrolloActividad:text(valueFrom(row,['desarrolloActividad','DESARROLLO ACTIVIDAD'])),
    hojaOrigen:text(valueFrom(row,['hojaOrigen','HOJA_ORIGEN'])),
    piso:isThird ? 'Tercer piso' : 'Segundo piso'
  };
}

function roomRank(room){
  const source = normalize(room).toUpperCase();
  if(/TERCER|\b3\d{2}\b/.test(source)){
    const match = source.match(/\b(\d{3})\b/);
    return [2,match ? Number(match[1]) : 9999,source];
  }
  if(/SALON\s*1\b/.test(source)) return [1,1,source];
  if(/SALON\s*2\s*(\+|Y)\s*3/.test(source)) return [1,4,source];
  if(/SALON\s*2\b/.test(source)) return [1,2,source];
  if(/SALON\s*3\b/.test(source)) return [1,3,source];
  if(/COMPLETO/.test(source)) return [1,5,source];
  return [1,20,source];
}

function compareEvents(a,b){
  const first = roomRank(a.escenario);
  const second = roomRank(b.escenario);
  return first[0]-second[0]
    || first[1]-second[1]
    || first[2].localeCompare(second[2],'es',{numeric:true})
    || a.empresa.localeCompare(b.empresa,'es')
    || a.horarioEvento.localeCompare(b.horarioEvento,'es',{numeric:true});
}

function formatDate(iso,options){
  const date = localDate(iso);
  return Number.isNaN(date.getTime()) ? 'Fecha sin registrar' : date.toLocaleDateString('es-CO',options);
}

function formatDateTime(value){
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}

function serviceValue(value,fallback='Sin registrar'){
  return text(value).trim() || fallback;
}

function meaningfulFood(value){
  const source = normalize(value).toUpperCase();
  if(!source) return false;
  return !/^(N\/?A|NA|NO|SIN ALIMENTACION|SIN SERVICIO|NO APLICA|CANCELADO)$/.test(source);
}

function hasFood(event){
  return meaningfulFood(event.horarioAyB) || meaningfulFood(event.descripcionAlimentacion);
}

function foodStatus(event){
  return hasFood(event) ? 'Con alimentación' : 'Sin alimentación';
}


function dataHash(events){
  return events.map(event=>[
    event.id,event.fechaISO,event.empresa,event.cantidadPersonas,event.escenario,
    event.horarioEvento,event.horarioAyB,event.descripcionAlimentacion,
    event.acomodacion,event.modalidadServicio,event.medioPago,event.observacion,event.estado
  ].join('|')).join('||');
}

function setConnection(message,connected=false){
  $('mobileConnectionText').textContent = message;
  $('mobileConnectionDot').classList.toggle('is-connected',connected);
}

function setNotice(message,type=''){
  const notice = $('mobileNotice');
  notice.hidden = !message;
  notice.className = `agenda-notice ${type ? `is-${type}` : ''}`;
  notice.textContent = message || '';
}

function updateHeader(){
  const now = new Date();
  const today = todayISO();
  const todayEvents = state.all.filter(event=>event.fechaISO === today);
  $('mobileTodayDay').textContent = String(now.getDate()).padStart(2,'0');
  $('mobileTodayMonth').textContent = now.toLocaleDateString('es-CO',{month:'short'}).replace('.','');
  $('mobileEventCount').textContent = `${state.all.length.toLocaleString('es-CO')} ${state.all.length === 1 ? 'evento' : 'eventos'}`;
  $('mobileSecondCount').textContent = todayEvents.filter(event=>event.piso === 'Segundo piso').length.toLocaleString('es-CO');
  $('mobileThirdCount').textContent = todayEvents.filter(event=>event.piso === 'Tercer piso').length.toLocaleString('es-CO');
  $('mobileUpdatedAt').textContent = state.updatedAt
    ? `Actualizado ${formatDateTime(state.updatedAt)}`
    : 'Esperando actualización';
}

function filteredEvents(){
  const query = normalize($('mobileSearch').value).toLowerCase();
  const exactDate = $('mobileDateFilter').value;
  const today = todayISO();

  return state.all.filter(event=>{
    if(exactDate && event.fechaISO !== exactDate) return false;
    if(!exactDate && state.view === 'today' && event.fechaISO !== today) return false;
    if(!exactDate && state.view === 'upcoming' && event.fechaISO <= today) return false;

    if(query){
      const searchable = [event.empresa,event.escenario,event.estado].join(' ').toLowerCase();
      if(!searchable.includes(query)) return false;
    }
    return true;
  });
}

function eventRows(events){
  return `
    <div class="event-table">
      <div class="event-table-header" aria-hidden="true">
        <span>Fecha</span><span>Empresa</span><span>Ubicación</span><span>Alimentación</span><span>Personas</span>
      </div>
      ${events.map(event=>`
        <button class="event-summary-row" type="button" data-id="${esc(event.id)}" aria-label="Abrir detalles de ${esc(event.empresa)}">
          <span class="event-summary-date">${esc(formatDate(event.fechaISO,{weekday:'short',day:'2-digit',month:'short',year:'numeric'}))}</span>
          <span class="event-summary-company">${esc(event.empresa)}</span>
          <span class="event-summary-location">
            <strong>${esc(event.escenario)}</strong>
            <small>${esc(event.piso)}</small>
          </span>
          <span class="event-summary-food">
            <span class="food-status ${hasFood(event) ? 'has-food' : ''}">${foodStatus(event)}</span>
            <small>${hasFood(event) ? 'Servicio registrado' : 'Sin servicio registrado'}</small>
          </span>
          <span class="event-summary-pax"><strong>${event.cantidadPersonas.toLocaleString('es-CO')}</strong><small>personas</small></span>
        </button>
      `).join('')}
    </div>
  `;
}

function floorSection(title,events,type){
  if(!events.length) return '';
  return `
    <section class="floor-section ${type === 'third' ? 'is-third' : ''}">
      <div class="floor-heading">
        <div>
          <span class="floor-marker">${type === 'third' ? '03' : '02'}</span>
          <div><small>Programación de la fecha</small><h3>${title}</h3></div>
        </div>
        <b>${events.length}</b>
      </div>
      ${eventRows(events)}
    </section>
  `;
}

function render(){
  updateHeader();
  const data = filteredEvents().sort((a,b)=>a.fechaISO.localeCompare(b.fechaISO) || compareEvents(a,b));
  const agenda = $('mobileAgenda');

  if(!data.length){
    agenda.innerHTML = `
      <div class="agenda-empty">
        <strong>${state.all.length ? 'No hay eventos para los filtros seleccionados.' : 'Aún no hay información publicada.'}</strong>
        <p>${state.all.length ? 'Selecciona otra vista, fecha o término de búsqueda.' : 'La agenda se actualizará automáticamente cuando Firebase reciba los datos del Excel.'}</p>
      </div>
    `;
    return;
  }

  const groups = new Map();
  data.forEach(event=>{
    if(!groups.has(event.fechaISO)) groups.set(event.fechaISO,[]);
    groups.get(event.fechaISO).push(event);
  });

  agenda.innerHTML = [...groups.entries()].map(([date,events])=>{
    const second = events.filter(event=>event.piso === 'Segundo piso').sort(compareEvents);
    const third = events.filter(event=>event.piso === 'Tercer piso').sort(compareEvents);
    const currentDate = localDate(date);

    return `
      <article class="date-group">
        <header class="date-group-header">
          <div>
            <span class="date-block">
              <strong>${String(currentDate.getDate()).padStart(2,'0')}</strong>
              <span>${currentDate.toLocaleDateString('es-CO',{month:'short'}).replace('.','')}</span>
            </span>
            <div>
              <h2>${esc(formatDate(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</h2>
              <p>Selecciona una empresa para consultar toda la información.</p>
            </div>
          </div>
          <span class="date-group-count">${events.length} eventos</span>
        </header>
        ${floorSection('Segundo piso',second,'second')}
        ${floorSection('Tercer piso',third,'third')}
      </article>
    `;
  }).join('');
}

function normalField(label,value,wide=false){
  return `
    <div class="detail-field ${wide ? 'is-wide' : ''}">
      <small>${esc(label)}</small>
      <strong>${esc(serviceValue(value))}</strong>
    </div>
  `;
}

function openDetail(event){
  $('mobileDetailTitle').textContent = event.empresa;
  $('mobileDetailSubtitle').textContent = `${formatDate(event.fechaISO,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${event.escenario}`;

  $('mobileDetailBody').innerHTML = `
    ${normalField('Fecha',formatDate(event.fechaISO,{day:'2-digit',month:'2-digit',year:'numeric'}))}
    ${normalField('Escenario asignado',event.escenario)}
    ${normalField('Horario del evento',event.horarioEvento)}
    ${normalField('Nombre de la empresa',event.empresa)}
    ${normalField('Cantidad de personas',event.cantidadPersonas.toLocaleString('es-CO'))}
    <div class="detail-service-row">
      ${normalField('Horario AYB',event.horarioAyB)}
      ${normalField('Descripción Alimentación',event.descripcionAlimentacion)}
    </div>
    ${normalField('Acomodación',event.acomodacion)}
    ${normalField('Modalidad de servicio',event.modalidadServicio)}
    ${normalField('Medio de pago',event.medioPago)}
    ${normalField('Observación',event.observacion,true)}
    ${normalField('Estado',event.estado)}
    ${normalField('Desarrollo actividad',event.desarrolloActividad,true)}
  `;

  $('mobileDetailModal').classList.add('is-open');
  $('mobileDetailModal').setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}

function closeDetail(){
  $('mobileDetailModal').classList.remove('is-open');
  $('mobileDetailModal').setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

function applySnapshot(snapshot,notify=true){
  const events = snapshot.docs
    .map((item,index)=>eventFromRow({id:item.id,...item.data()},index))
    .filter(event=>event.fechaISO);

  const nextHash = dataHash(events);
  const changed = Boolean(state.lastHash && nextHash !== state.lastHash);
  state.all = events;
  state.lastHash = nextHash;
  setConnection('Sincronización en tiempo real activa',true);

  if(state.expectedCount > events.length){
    setNotice(`Firebase informa ${state.expectedCount} eventos, pero la colección contiene ${events.length}. El equipo principal está reparando la publicación automáticamente.`,'warning');
    clearTimeout(state.repairTimer);
    state.repairTimer = setTimeout(()=>refreshSnapshot(),3000);
  }else{
    setNotice(changed && notify ? 'La agenda recibió una actualización automática.' : '');
  }
  render();
}

function disconnectListeners(){
  state.eventsUnsubscribe?.();
  state.metaUnsubscribe?.();
  state.eventsUnsubscribe = null;
  state.metaUnsubscribe = null;
}

function connectRealtime(){
  if(!state.db || !state.sdk) return;
  disconnectListeners();
  const {fireMod} = state.sdk;
  setConnection('Conectando con la agenda…',false);

  state.eventsUnsubscribe = fireMod.onSnapshot(
    fireMod.collection(state.db,EVENTS_COLLECTION),
    snapshot=>applySnapshot(snapshot,true),
    error=>{
      console.error('Agenda listener:',error);
      setConnection('Conexión temporalmente no disponible',false);
      setNotice('No fue posible leer Firebase. Se volverá a intentar automáticamente.','error');
    }
  );

  state.metaUnsubscribe = fireMod.onSnapshot(
    fireMod.doc(state.db,META_COLLECTION,'publicacion'),
    snapshot=>{
      const data = snapshot.data();
      if(data){
        state.updatedAt = data.publishedAt || data.clientPublishedAt || '';
        state.expectedCount = Number(data.count) || 0;
        updateHeader();
        if(state.expectedCount > state.all.length){
          clearTimeout(state.repairTimer);
          state.repairTimer = setTimeout(()=>refreshSnapshot(),1800);
        }
      }
    },
    error=>console.warn('Metadata listener:',error)
  );
}

async function refreshSnapshot({notify=false}={}){
  if(state.refreshing || !state.db || !state.sdk) return;
  state.refreshing = true;
  try{
    const snapshot = await state.sdk.fireMod.getDocs(
      state.sdk.fireMod.collection(state.db,EVENTS_COLLECTION)
    );
    applySnapshot(snapshot,notify);
    const meta = await state.sdk.fireMod.getDoc(
      state.sdk.fireMod.doc(state.db,META_COLLECTION,'publicacion')
    );
    if(meta.exists()){
      const data = meta.data();
      state.updatedAt = data.publishedAt || data.clientPublishedAt || '';
      state.expectedCount = Number(data.count) || 0;
      updateHeader();
      if(state.expectedCount > state.all.length){
        setNotice(`La publicación registra ${state.expectedCount} eventos y se están recuperando los documentos faltantes.`,'warning');
      }
    }
  }catch(error){
    console.warn('Agenda refresh:',error);
    setConnection('Reintentando conexión…',false);
  }finally{
    state.refreshing = false;
  }
}

function startFallbackRefresh(){
  clearInterval(state.fallbackTimer);
  state.fallbackTimer = setInterval(()=>{
    if(!document.hidden) refreshSnapshot();
  },FALLBACK_INTERVAL_MS);

  window.addEventListener('focus',()=>refreshSnapshot(),{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) refreshSnapshot();
  });
}

async function initializeFirebase(){
  if(state.initialized) return;
  state.initialized = true;

  try{
    const [appMod,authMod,fireMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);

    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(FIREBASE_CONFIG);
    state.auth = authMod.getAuth(app);
    state.db = fireMod.getFirestore(app);
    state.sdk = {appMod,authMod,fireMod};

    try{
      await authMod.setPersistence(state.auth,authMod.browserLocalPersistence);
    }catch(error){
      console.warn('Persistencia de Agenda Móvil:',error);
    }

    if(!state.auth.currentUser){
      try{
        await authMod.signInAnonymously(state.auth);
      }catch(error){
        console.warn('Acceso anónimo no disponible; se intentará lectura pública:',error);
      }
    }

    connectRealtime();
    startFallbackRefresh();
    await refreshSnapshot();
  }catch(error){
    console.error('Firebase móvil:',error);
    setConnection('Firebase no pudo iniciar',false);
    setNotice('No fue posible iniciar la agenda. Verifica la conexión y vuelve a intentarlo.','error');
  }
}

document.querySelectorAll('.agenda-tab').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.agenda-tab').forEach(item=>item.classList.remove('is-active'));
  button.classList.add('is-active');
  state.view = button.dataset.view;
  $('mobileDateFilter').value = '';
  render();
}));

$('mobileSearch').addEventListener('input',render);
$('mobileDateFilter').addEventListener('change',render);
$('mobileRefresh').addEventListener('click',()=>refreshSnapshot({notify:true}));

$('mobileAgenda').addEventListener('click',event=>{
  const row = event.target.closest('.event-summary-row');
  if(!row) return;
  const item = state.all.find(record=>record.id === row.dataset.id);
  if(item) openDetail(item);
});

$('mobileCloseDetail').addEventListener('click',closeDetail);
$('mobileDetailModal').addEventListener('click',event=>{
  if(event.target.id === 'mobileDetailModal') closeDetail();
});
document.addEventListener('keydown',event=>{
  if(event.key === 'Escape') closeDetail();
});

updateHeader();
initializeFirebase();
