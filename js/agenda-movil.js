import {
  FIREBASE_CONFIG,
  EVENTS_COLLECTION,
  META_COLLECTION
} from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
const $ = id => document.getElementById(id);
const state = {
  all:[],
  view:'today',
  updatedAt:'',
  eventsUnsubscribe:null,
  metaUnsubscribe:null,
  auth:null,
  db:null,
  user:null,
  sdk:null,
  initialized:false
};

const text = value => value === undefined || value === null ? '' : String(value);
const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const esc = value => text(value).replace(/[&<>"']/g,character=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[character]));

function friendlyError(error){
  const code = text(error?.code);
  const messages = {
    'auth/invalid-credential':'El correo o la contraseña no coinciden.',
    'auth/invalid-email':'El correo no tiene un formato válido.',
    'auth/operation-not-allowed':'El acceso con correo y contraseña no está habilitado.',
    'auth/too-many-requests':'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed':'No hay conexión con Firebase.',
    'permission-denied':'Tu cuenta no tiene permiso para consultar la agenda.'
  };
  return messages[code] || error?.message || 'No fue posible completar el acceso.';
}

function dateISO(value){
  if(!value) return '';
  const source = text(value);
  let match = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match) return `${match[1]}-${match[2]}-${match[3]}`;
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

function eventFromRow(row,index){
  const scenario = text(row.escenario || row['ESCENARIO ASIGNADO']);
  return {
    id:text(row.id || row.__EVENT_ID || index),
    fechaISO:dateISO(row.fechaISO || row.FECHA),
    escenario:scenario || 'Sin escenario asignado',
    horarioEvento:text(row.horarioEvento || row['HORARIO DEL EVENTO']),
    empresa:text(row.empresa || row['NOMBRE DE LA EMPRESA']) || 'Empresa sin registrar',
    cantidadPersonas:Number(row.cantidadPersonas ?? row['CANTIDAD DE PERSONAS']) || 0,
    horarioAyB:text(row.horarioAyB || row['HORARIO AYB']),
    descripcionAlimentacion:text(row.descripcionAlimentacion || row['DESCRIPCION ALIMENTACION']),
    acomodacion:text(row.acomodacion || row.ACOMODACION),
    medioPago:text(row.medioPago || row['MEDIO DE PAGO']),
    modalidadServicio:text(row.modalidadServicio || row['MODALIDAD DE SERVICIO']),
    observacion:text(row.observacion || row.OBSERVACION),
    estado:text(row.estado || row.ESTADO),
    desarrolloActividad:text(row.desarrolloActividad || row['DESARROLLO ACTIVIDAD']),
    hojaOrigen:text(row.hojaOrigen || row.HOJA_ORIGEN),
    piso:text(row.piso) || (/TERCER|PISO\s*3|\b3\d{2}\b/i.test(scenario) ? 'Tercer piso' : 'Segundo piso')
  };
}

function roomRank(room){
  const source = normalize(room).toUpperCase();
  if(/TERCER|\b3\d{2}\b/.test(source)) return [2,extractNumber(source)||9999,source];
  if(/SALON\s*1\b/.test(source)) return [1,1,source];
  if(/SALON\s*2\s*(\+|Y)\s*3/.test(source)) return [1,4,source];
  if(/SALON\s*2\b/.test(source)) return [1,2,source];
  if(/SALON\s*3\b/.test(source)) return [1,3,source];
  if(/COMPLETO/.test(source)) return [1,5,source];
  return [1,20,source];
}

function extractNumber(value){
  const match = value.match(/\b(\d{3})\b/);
  return match ? Number(match[1]) : 0;
}

function compareEvents(a,b){
  const first = roomRank(a.escenario);
  const second = roomRank(b.escenario);
  return first[0]-second[0]
    || first[1]-second[1]
    || first[2].localeCompare(second[2],'es',{numeric:true})
    || a.horarioEvento.localeCompare(b.horarioEvento,'es',{numeric:true})
    || a.empresa.localeCompare(b.empresa,'es');
}

function formatDate(iso,options){
  const date = localDate(iso);
  return Number.isNaN(date.getTime())
    ? 'Fecha sin registrar'
    : date.toLocaleDateString('es-CO',options);
}

function formatDateTime(value){
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}

function setAuthMessage(message,type='error'){
  const box = $('mobileAuthMessage');
  box.hidden = !message;
  box.className = `auth-message is-${type}`;
  box.textContent = message || '';
}

function showLogin(){
  $('mobileAuthGate').hidden = false;
  $('mobileApp').hidden = true;
  $('authLoading').hidden = true;
  $('mobileLoginForm').hidden = false;
  $('mobileLoginButton').disabled = false;
}

function showApp(){
  $('mobileAuthGate').hidden = true;
  $('mobileApp').hidden = false;
}

function updateHeader(){
  const now = new Date();
  $('mobileTodayDay').textContent = String(now.getDate()).padStart(2,'0');
  $('mobileTodayMonth').textContent = now.toLocaleDateString('es-CO',{month:'short'}).replace('.','');
  $('mobileEventCount').textContent = `${state.all.length} ${state.all.length === 1 ? 'evento' : 'eventos'}`;
  $('mobileUpdatedAt').textContent = state.updatedAt
    ? `Actualizado ${formatDateTime(state.updatedAt)}`
    : 'Esperando actualización';
}

function filterEvents(){
  const query = normalize($('mobileSearch').value).toLowerCase();
  const exactDate = $('mobileDateFilter').value;
  const today = todayISO();

  return state.all.filter(event=>{
    if(exactDate && event.fechaISO !== exactDate) return false;
    if(!exactDate && state.view === 'today' && event.fechaISO !== today) return false;
    if(!exactDate && state.view === 'upcoming' && event.fechaISO <= today) return false;

    if(query){
      const searchable = [
        event.empresa,
        event.escenario,
        event.horarioEvento,
        event.horarioAyB,
        event.descripcionAlimentacion,
        event.observacion,
        event.estado
      ].join(' ').toLowerCase();
      if(!searchable.includes(query)) return false;
    }
    return true;
  });
}

function serviceValue(value,fallback){
  return text(value).trim() || fallback;
}

function eventCard(event){
  return `
    <article class="event-card" data-id="${esc(event.id)}">
      <div class="event-card-top">
        <div class="event-company">
          <small>Empresa</small>
          <h4>${esc(event.empresa)}</h4>
        </div>
        <span class="event-room">${esc(event.escenario)}</span>
      </div>

      <div class="event-primary">
        <div>
          <small>Horario del evento</small>
          <strong>${esc(serviceValue(event.horarioEvento,'Sin horario registrado'))}</strong>
        </div>
        <div class="event-pax">
          <small>Personas</small>
          <strong>${event.cantidadPersonas.toLocaleString('es-CO')}</strong>
        </div>
      </div>

      <div class="service-sequence">
        <div class="service-line">
          <small>Horario AYB</small>
          <strong>${esc(serviceValue(event.horarioAyB,'Sin horario AYB'))}</strong>
        </div>
        <div class="service-line">
          <small>Descripción Alimentación</small>
          <strong>${esc(serviceValue(event.descripcionAlimentacion,'Sin descripción de alimentación'))}</strong>
        </div>
      </div>

      <div class="event-footer">
        <span class="event-status">${esc(event.estado || 'Sin estado')}</span>
        <button class="event-open" type="button">Ver detalle →</button>
      </div>
    </article>
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
      <div class="event-list">${events.map(eventCard).join('')}</div>
    </section>
  `;
}

function render(){
  updateHeader();
  const data = filterEvents().sort((a,b)=>a.fechaISO.localeCompare(b.fechaISO) || compareEvents(a,b));
  const agenda = $('mobileAgenda');

  if(!data.length){
    const message = state.all.length
      ? 'No hay eventos para los filtros seleccionados.'
      : 'Aún no hay información publicada.';
    agenda.innerHTML = `
      <div class="mobile-empty">
        <strong>${esc(message)}</strong>
        <p>${state.all.length ? 'Selecciona otra vista, fecha o término de búsqueda.' : 'La agenda se actualizará automáticamente cuando el propietario publique el Excel.'}</p>
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
    const second = events.filter(event=>event.piso !== 'Tercer piso').sort(compareEvents);
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
              <p>Agenda organizada por piso y salón</p>
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

function openDetail(event){
  $('mobileDetailTitle').textContent = event.empresa;
  $('mobileDetailSubtitle').textContent = `${formatDate(event.fechaISO,{weekday:'long',day:'numeric',month:'long'})} · ${event.escenario}`;

  const fields = [
    ['Fecha',formatDate(event.fechaISO,{day:'2-digit',month:'2-digit',year:'numeric'})],
    ['Escenario asignado',event.escenario],
    ['Horario del evento',event.horarioEvento],
    ['Nombre de la empresa',event.empresa],
    ['Cantidad de personas',event.cantidadPersonas.toLocaleString('es-CO')],
    ['Horario AYB',event.horarioAyB],
    ['Descripción Alimentación',event.descripcionAlimentacion],
    ['Acomodación',event.acomodacion],
    ['Medio de pago',event.medioPago],
    ['Modalidad de servicio',event.modalidadServicio],
    ['Observación',event.observacion],
    ['Estado',event.estado],
    ['Desarrollo actividad',event.desarrolloActividad]
  ];

  $('mobileDetailBody').innerHTML = fields.map(([label,value])=>`
    <div class="detail-field ${['Horario AYB','Descripción Alimentación','Observación','Desarrollo actividad'].includes(label) ? 'is-wide' : ''}">
      <small>${esc(label)}</small>
      <strong>${esc(serviceValue(value,'Sin registrar'))}</strong>
    </div>
  `).join('');

  $('mobileDetailModal').classList.add('is-open');
  $('mobileDetailModal').setAttribute('aria-hidden','false');
}

function closeDetail(){
  $('mobileDetailModal').classList.remove('is-open');
  $('mobileDetailModal').setAttribute('aria-hidden','true');
}

function setNotice(message,type=''){
  const notice = $('mobileNotice');
  notice.hidden = !message;
  notice.className = `mobile-notice ${type ? `is-${type}` : ''}`;
  notice.textContent = message || '';
}

function disconnectFirestore(){
  state.eventsUnsubscribe?.();
  state.metaUnsubscribe?.();
  state.eventsUnsubscribe = null;
  state.metaUnsubscribe = null;
}

function connectFirestore(){
  if(!state.user || !state.db || !state.sdk) return;
  disconnectFirestore();

  const {fireMod} = state.sdk;
  $('mobileConnectionText').textContent = 'Conectando con la agenda…';
  $('mobileConnectionDot').classList.remove('is-connected');

  state.eventsUnsubscribe = fireMod.onSnapshot(
    fireMod.collection(state.db,EVENTS_COLLECTION),
    snapshot=>{
      const previousHash = state.all.map(event=>`${event.id}:${event.fechaISO}:${event.empresa}`).join('|');
      state.all = snapshot.docs
        .map((item,index)=>eventFromRow({id:item.id,...item.data()},index))
        .filter(event=>event.fechaISO);

      $('mobileConnectionText').textContent = 'Sincronización en tiempo real activa';
      $('mobileConnectionDot').classList.add('is-connected');
      setNotice('');
      render();

      const nextHash = state.all.map(event=>`${event.id}:${event.fechaISO}:${event.empresa}`).join('|');
      if(previousHash && previousHash !== nextHash){
        setNotice('La agenda recibió una actualización en tiempo real.');
      }
    },
    error=>{
      $('mobileConnectionText').textContent = 'No fue posible consultar la agenda';
      $('mobileConnectionDot').classList.remove('is-connected');
      setNotice(friendlyError(error),'error');
    }
  );

  state.metaUnsubscribe = fireMod.onSnapshot(
    fireMod.doc(state.db,META_COLLECTION,'publicacion'),
    snapshot=>{
      const data = snapshot.data();
      if(data){
        state.updatedAt = data.publishedAt || data.clientPublishedAt || '';
        render();
      }
    },
    error=>console.warn('Metadata listener:',error)
  );
}

async function initializeFirebase(){
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

    if(!state.auth) throw new Error('Firebase Authentication no pudo inicializarse.');
    if(typeof authMod.setPersistence !== 'function'){
      throw new Error('El módulo de persistencia de Firebase no está disponible.');
    }
    await authMod.setPersistence(state.auth,authMod.browserLocalPersistence);

    authMod.onAuthStateChanged(
      state.auth,
      user=>{
        state.user = user;
        if(user){
          setAuthMessage('');
          showApp();
          connectFirestore();
        }else{
          disconnectFirestore();
          state.all = [];
          showLogin();
        }
      },
      error=>{
        $('authLoading').hidden = true;
        showLogin();
        setAuthMessage(friendlyError(error));
      }
    );
  }catch(error){
    $('authLoading').hidden = true;
    showLogin();
    $('mobileLoginButton').disabled = true;
    setAuthMessage(`Firebase no pudo iniciar: ${friendlyError(error)}`);
  }
}

async function login(event){
  event.preventDefault();
  if(!state.auth || !state.sdk?.authMod){
    setAuthMessage('Firebase todavía está inicializando. Espera un momento.');
    return;
  }

  setAuthMessage('');
  $('mobileLoginButton').disabled = true;

  try{
    await state.sdk.authMod.signInWithEmailAndPassword(
      state.auth,
      $('mobileLoginEmail').value.trim(),
      $('mobileLoginPassword').value
    );
    $('mobileLoginPassword').value = '';
  }catch(error){
    setAuthMessage(friendlyError(error));
  }finally{
    $('mobileLoginButton').disabled = false;
  }
}

async function logout(){
  if(!state.auth || !state.sdk?.authMod) return;
  await state.sdk.authMod.signOut(state.auth);
}

document.querySelectorAll('.mobile-tab').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.mobile-tab').forEach(item=>item.classList.remove('is-active'));
  button.classList.add('is-active');
  state.view = button.dataset.view;
  $('mobileDateFilter').value = '';
  render();
}));

$('mobileSearch').addEventListener('input',render);
$('mobileDateFilter').addEventListener('change',render);
$('mobileRefresh').addEventListener('click',()=>connectFirestore());
$('mobileLoginForm').addEventListener('submit',login);
$('mobileLogout').addEventListener('click',logout);

$('mobileAgenda').addEventListener('click',event=>{
  const card = event.target.closest('.event-card');
  if(!card) return;
  const item = state.all.find(row=>row.id === card.dataset.id);
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
