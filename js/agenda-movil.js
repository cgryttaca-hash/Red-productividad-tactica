import {
  FIREBASE_CONFIG,
  EVENTS_COLLECTION,
  META_COLLECTION,
  CHANGES_COLLECTION
} from './firebase-config.js';
import {applyAppearance,readAppearanceCache,writeAppearanceCache,THEME_DOC_ID} from './theme-settings.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const FALLBACK_INTERVAL_MS=15000;
const CHUNK_PREFIX='agenda_chunk_';
const CACHE_DB='agenda-movil-cache-v3';
const CACHE_STORE='state';
const CACHE_KEY='events';
const $=id=>document.getElementById(id);
applyAppearance('agenda_movil',readAppearanceCache());

const state={
  all:[],
  view:'today',
  updatedAt:'',
  cloudHash:'',
  auth:null,
  db:null,
  sdk:null,
  metaUnsubscribe:null,
  changesUnsubscribe:null,
  themeUnsubscribe:null,
  fallbackTimer:null,
  lastHash:'',
  initialized:false,
  refreshing:false,
  meta:null,
  selected:null,
  recentChanges:[],
  changesInitialized:false
};

const text=value=>value===undefined||value===null?'':String(value);
const normalize=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const esc=value=>text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const chunkId=index=>`${CHUNK_PREFIX}${String(index).padStart(4,'0')}`;
const FILTER_KEY='rptAgendaFiltersV1';
function readFilters(){try{return JSON.parse(localStorage.getItem(FILTER_KEY)||'null')||{};}catch(_){return{};}}
function saveFilters(){
  const value={
    floor:$('mobileFloorFilter')?.value||'',food:$('mobileFoodFilter')?.value||'',
    status:$('mobileStatusFilter')?.value||'',view:state.view
  };
  try{localStorage.setItem(FILTER_KEY,JSON.stringify(value));}catch(_){}
}
function hideBoot(){const boot=$('mobileBoot');if(boot)boot.classList.add('is-hidden');}
function formatAuditDate(value){
  const date=value?.toDate?value.toDate():new Date(value);
  return Number.isNaN(date.getTime())?'Sin fecha':date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}
function auditTitle(entry){
  if(entry.type==='creado')return `Evento creado · ${entry.company||'Empresa'}`;
  if(entry.type==='eliminado')return `Evento eliminado · ${entry.company||'Empresa'}`;
  return `${entry.field||'Campo'} actualizado · ${entry.company||'Empresa'}`;
}
function renderRecentChanges(){
  const list=$('mobileChangesList');if(!list)return;
  $('mobileChangesCount').textContent=String(state.recentChanges.length);
  list.innerHTML=state.recentChanges.length?state.recentChanges.map(entry=>`<article class="change-mobile-item">
    <small>${esc(formatAuditDate(entry.timestamp||entry.publishedAt))}</small>
    <strong>${esc(auditTitle(entry))}</strong>
    <p>${esc([entry.user,entry.host,entry.sheet,entry.cell].filter(Boolean).join(' · ')||'Cambio publicado desde el archivo maestro')}</p>
    ${entry.type==='actualizado'?`<div class="change-mobile-values"><span>${esc(entry.before||'Vacío')}</span><b>→</b><span>${esc(entry.after||'Vacío')}</span></div>`:''}
  </article>`).join(''):'<div class="changes-empty">Sin cambios recientes.</div>';
}
function openChanges(){
  $('mobileChangesPanel')?.classList.add('is-open');$('mobileChangesPanel')?.setAttribute('aria-hidden','false');
  if($('mobileChangesBackdrop'))$('mobileChangesBackdrop').hidden=false;
  $('mobileChangesToggle')?.setAttribute('aria-expanded','true');
}
function closeChanges(){
  $('mobileChangesPanel')?.classList.remove('is-open');$('mobileChangesPanel')?.setAttribute('aria-hidden','true');
  if($('mobileChangesBackdrop'))$('mobileChangesBackdrop').hidden=true;
  $('mobileChangesToggle')?.setAttribute('aria-expanded','false');
}
function bindRealtimeChanges(fireMod){
  try{
    const query=fireMod.query(fireMod.collection(state.db,CHANGES_COLLECTION),fireMod.orderBy('timestamp','desc'),fireMod.limit(18));
    state.changesUnsubscribe?.();
    state.changesUnsubscribe=fireMod.onSnapshot(query,snapshot=>{
      const added=state.changesInitialized?snapshot.docChanges().filter(change=>change.type==='added').map(change=>({id:change.doc.id,...change.doc.data()})):[];
      state.recentChanges=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
      renderRecentChanges();
      if(added.length){
        const latest=added[0];
        setNotice(`${auditTitle(latest)}.`, 'success');
        import('./notifications.js').then(module=>module.showNotification('Cambio en la agenda',auditTitle(latest),{tag:'agenda-change',url:'./agenda_movil.html',renotify:true})).catch(()=>{});
      }
      state.changesInitialized=true;
    },error=>console.warn('Agenda changes:',error));
  }catch(error){console.warn('Agenda changes query:',error);}
}
function bindRemoteAppearance(fireMod){
  try{
    const ref=fireMod.doc(state.db,META_COLLECTION,THEME_DOC_ID);
    state.themeUnsubscribe?.();
    state.themeUnsubscribe=fireMod.onSnapshot(ref,snapshot=>{
      if(!snapshot.exists())return;
      const value=writeAppearanceCache(snapshot.data()||{});
      applyAppearance('agenda_movil',value);
    },()=>{});
  }catch(_){}
}

function relativeTime(value){
  const date=value?.toDate?value.toDate():new Date(value);
  if(Number.isNaN(date.getTime()))return'Esperando actualización';
  const seconds=Math.max(0,Math.round((Date.now()-date.getTime())/1000));
  if(seconds<45)return'Actualizado hace unos segundos';
  const minutes=Math.floor(seconds/60);if(minutes<60)return`Actualizado hace ${minutes} min`;
  const hours=Math.floor(minutes/60);if(hours<24)return`Actualizado hace ${hours} h`;
  return`Actualizado ${formatDateTime(value)}`;
}


function openCache(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(CACHE_DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(CACHE_STORE))db.createObjectStore(CACHE_STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function cacheGet(){
  try{
    const db=await openCache();
    const value=await new Promise((resolve,reject)=>{
      const request=db.transaction(CACHE_STORE,'readonly').objectStore(CACHE_STORE).get(CACHE_KEY);
      request.onsuccess=()=>resolve(request.result||null);
      request.onerror=()=>reject(request.error);
    });
    db.close();
    return value;
  }catch(_){
    return null;
  }
}
async function cacheSet(value){
  try{
    const db=await openCache();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(CACHE_STORE,'readwrite');
      tx.objectStore(CACHE_STORE).put(value,CACHE_KEY);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }catch(_){}
}

function dateISO(value){
  if(!value)return'';
  if(value instanceof Date&&!Number.isNaN(value.getTime())){
    return`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  }
  const source=text(value);
  let match=source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return`${match[1]}-${match[2]}-${match[3]}`;
  match=source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(match)return`${match[3]}-${String(match[2]).padStart(2,'0')}-${String(match[1]).padStart(2,'0')}`;
  const date=new Date(source);
  if(Number.isNaN(date.getTime()))return'';
  return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function localDate(iso){
  const match=text(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?new Date(+match[1],+match[2]-1,+match[3]):new Date(iso);
}
function todayISO(){return dateISO(new Date())}
function valueFrom(row,keys){
  for(const key of keys){
    if(row?.[key]!==undefined&&row?.[key]!==null)return row[key];
  }
  return'';
}
function eventFromRow(row,index){
  const scenario=text(valueFrom(row,['escenario','ESCENARIO ASIGNADO','ESCENARIO']));
  const isThird=/TERCER|PISO\s*3|\b3\d{2}\b/i.test(scenario);
  return{
    id:text(row.id||row.__EVENT_ID||index),
    fechaISO:dateISO(valueFrom(row,['fechaISO','FECHA'])),
    escenario:scenario||'Sin escenario asignado',
    horarioEvento:text(valueFrom(row,['horarioEvento','HORARIO DEL EVENTO','HORARIO'])),
    empresa:text(valueFrom(row,['empresa','NOMBRE DE LA EMPRESA','EMPRESA']))||'Empresa sin registrar',
    cantidadPersonas:Number(valueFrom(row,['cantidadPersonas','CANTIDAD DE PERSONAS','PAX']))||0,
    horarioAyB:text(valueFrom(row,['horarioAyB','HORARIO AYB','HORARIO A&B'])),
    descripcionAlimentacion:text(valueFrom(row,['descripcionAlimentacion','DESCRIPCION ALIMENTACION','DESCRIPCIÓN ALIMENTACIÓN'])),
    acomodacion:text(valueFrom(row,['acomodacion','ACOMODACION','ACOMODACIÓN'])),
    modalidadServicio:text(valueFrom(row,['modalidadServicio','MODALIDAD DE SERVICIO','MODALIDAD'])),
    medioPago:text(valueFrom(row,['medioPago','MEDIO DE PAGO','PAGO'])),
    observacion:text(valueFrom(row,['observacion','OBSERVACION','OBSERVACIÓN'])),
    estado:text(valueFrom(row,['estado','ESTADO'])),
    desarrolloActividad:text(valueFrom(row,['desarrolloActividad','DESARROLLO ACTIVIDAD'])),
    hojaOrigen:text(valueFrom(row,['hojaOrigen','HOJA_ORIGEN'])),
    piso:isThird?'Tercer piso':'Segundo piso'
  };
}
function roomRank(room){
  const source=normalize(room).toUpperCase();
  if(/TERCER|\b3\d{2}\b/.test(source)){
    const match=source.match(/\b(\d{3})\b/);
    return[2,match?Number(match[1]):9999,source];
  }
  if(/SALON\s*1\b/.test(source))return[1,1,source];
  if(/SALON\s*2\s*(\+|Y)\s*3/.test(source))return[1,4,source];
  if(/SALON\s*2\b/.test(source))return[1,2,source];
  if(/SALON\s*3\b/.test(source))return[1,3,source];
  if(/COMPLETO/.test(source))return[1,5,source];
  return[1,20,source];
}
function compareEvents(a,b){
  const first=roomRank(a.escenario),second=roomRank(b.escenario);
  return first[0]-second[0]||first[1]-second[1]||first[2].localeCompare(second[2],'es',{numeric:true})||a.empresa.localeCompare(b.empresa,'es')||a.horarioEvento.localeCompare(b.horarioEvento,'es',{numeric:true});
}
function formatDate(iso,options){
  const date=localDate(iso);
  return Number.isNaN(date.getTime())?'Fecha sin registrar':date.toLocaleDateString('es-CO',options);
}
function formatDateTime(value){
  const date=value?.toDate?value.toDate():new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
}
function serviceValue(value,fallback='Sin registrar'){return text(value).trim()||fallback}
function compactSpaces(value){
  return text(value)
    .replace(/\u00a0/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function serviceLines(value){
  return text(value)
    .replace(/\r/g,'')
    .split(/\n+/)
    .map(compactSpaces)
    .filter(Boolean);
}
function scheduleEntries(value){
  const source=text(value).replace(/\r/g,'\n').trim();
  if(!source)return[];
  const timeStart=/^\s*\d{1,2}:\d{2}\s*(?:A\.?\s*M\.?|P\.?\s*M\.?)\s*-/i;
  const entries=[];
  let current='';
  serviceLines(source).forEach(line=>{
    if(timeStart.test(line)){
      if(current)entries.push(compactSpaces(current));
      current=line;
    }else if(current){
      current=`${current} ${line}`;
    }else{
      current=line;
    }
  });
  if(current)entries.push(compactSpaces(current));
  return entries;
}
function meaningfulFood(value){
  const source=normalize(value).toUpperCase();
  if(!source)return false;
  return!/^(N\/?A|NA|NO|SIN ALIMENTACION|SIN SERVICIO|NO APLICA|CANCELADO)$/.test(source);
}
function hasFood(event){
  return meaningfulFood(event.horarioAyB)||meaningfulFood(event.descripcionAlimentacion);
}
function foodPairs(event){
  if(!hasFood(event))return[];
  const schedules=scheduleEntries(event.horarioAyB);
  const descriptions=serviceLines(event.descripcionAlimentacion);
  const total=Math.max(schedules.length,descriptions.length,1);
  return Array.from({length:total},(_,index)=>({
    time:compactSpaces(schedules[index]||'Servicio'),
    description:compactSpaces(descriptions[index]||'Alimentación registrada')
  })).filter(item=>item.time||item.description);
}
function foodStatusMarkup(event){
  return hasFood(event)
    ?'<span class="food-status is-with"><i></i>Con alimentación</span>'
    :'<span class="food-status is-without"><i></i>Sin alimentación</span>';
}
function foodMarkup(event){
  const pairs=foodPairs(event);
  if(!pairs.length)return'<div class="food-empty-detail">Sin alimentación registrada para este evento.</div>';
  return`<div class="food-combo">${pairs.map(item=>`
    <div class="food-line">
      <b>${esc(item.time)}</b>
      <span>${esc(item.description)}</span>
    </div>`).join('')}</div>`;
}
function dataHash(events){
  return events.map(event=>[
    event.id,event.fechaISO,event.empresa,event.cantidadPersonas,event.escenario,event.horarioEvento,
    event.horarioAyB,event.descripcionAlimentacion,event.acomodacion,event.modalidadServicio,
    event.medioPago,event.observacion,event.estado
  ].join('|')).join('||');
}

function setConnection(message,connected=false){
  $('mobileConnectionText').textContent=message;
  $('mobileConnectionDot').classList.toggle('is-connected',connected);
}
function setNotice(message,type=''){
  const notice=$('mobileNotice');
  notice.hidden=!message;
  notice.className=`agenda-notice ${type?`is-${type}`:''}`;
  notice.textContent=message||'';
}
function updateHeader(){
  $('mobileUpdatedAt').textContent=state.updatedAt?relativeTime(state.updatedAt):'Esperando actualización';
}
function filteredEvents(){
  const query=normalize($('mobileSearch').value).toLowerCase();
  const exactDate=$('mobileDateFilter').value;
  const floor=$('mobileFloorFilter')?.value||'';
  const food=$('mobileFoodFilter')?.value||'';
  const status=$('mobileStatusFilter')?.value||'';
  const today=todayISO();
  return state.all.filter(event=>{
    if(exactDate&&event.fechaISO!==exactDate)return false;
    if(!exactDate&&state.view==='today'&&event.fechaISO!==today)return false;
    if(!exactDate&&state.view==='upcoming'&&event.fechaISO<=today)return false;
    if(query&&!`${event.empresa} ${event.escenario} ${event.estado} ${event.acomodacion}`.toLowerCase().includes(query))return false;
    if(floor&&event.piso!==floor)return false;
    if(food==='with'&&!hasFood(event))return false;
    if(food==='without'&&hasFood(event))return false;
    if(status&&normalize(event.estado).toLowerCase()!==normalize(status).toLowerCase())return false;
    return true;
  });
}
function eventRows(events){
  return`<div class="event-table">
    <div class="event-table-header" aria-hidden="true">
      <span>Empresa</span><span>Salón y piso</span><span>Acomodación</span><span>Personas</span><span>Servicio</span>
    </div>
    ${events.map(event=>`<button class="event-summary-row" type="button" data-id="${esc(event.id)}">
      <span class="event-summary-company">
        <strong>${esc(event.empresa)}</strong>
        <small>Ver detalle completo</small>
      </span>
      <span class="event-summary-location">
        <strong>${esc(event.escenario)}</strong>
        <small>${esc(event.piso)}</small>
      </span>
      <span class="event-summary-layout">
        <small>Acomodación</small>
        <strong>${esc(serviceValue(event.acomodacion,'Sin registrar'))}</strong>
      </span>
      <span class="event-summary-pax">
        <strong>${event.cantidadPersonas.toLocaleString('es-CO')}</strong>
        <small>personas</small>
      </span>
      <span class="event-summary-food">${foodStatusMarkup(event)}</span>
    </button>`).join('')}
  </div>`;
}
function floorSection(title,events,type){
  if(!events.length)return'';
  return`<section class="floor-section ${type==='third'?'is-third':''}">
    <div class="floor-heading">
      <div><span class="floor-marker">${type==='third'?'03':'02'}</span><div><small>Programación de la fecha</small><h3>${title}</h3></div></div>
      <b>${events.length}</b>
    </div>
    ${eventRows(events)}
  </section>`;
}
function render(){
  updateHeader();
  const data=filteredEvents().sort((a,b)=>a.fechaISO.localeCompare(b.fechaISO)||compareEvents(a,b));
  const agenda=$('mobileAgenda');
  if(!data.length){
    agenda.innerHTML=`<div class="agenda-empty"><strong>${state.all.length?'No hay eventos para los filtros seleccionados.':'Aún no hay información publicada.'}</strong><p>${state.all.length?'Selecciona otra vista, fecha o búsqueda.':'La agenda se actualizará automáticamente cuando el equipo principal publique el Excel.'}</p></div>`;
    return;
  }
  const groups=new Map();
  data.forEach(event=>{
    if(!groups.has(event.fechaISO))groups.set(event.fechaISO,[]);
    groups.get(event.fechaISO).push(event);
  });
  agenda.innerHTML=[...groups.entries()].map(([date,events])=>{
    const second=events.filter(event=>event.piso==='Segundo piso').sort(compareEvents);
    const third=events.filter(event=>event.piso==='Tercer piso').sort(compareEvents);
    const currentDate=localDate(date);
    return`<article class="date-group">
      <header class="date-group-header">
        <div>
          <span class="date-block"><strong>${String(currentDate.getDate()).padStart(2,'0')}</strong><span>${currentDate.toLocaleDateString('es-CO',{month:'short'}).replace('.','')}</span></span>
          <div><h2>${esc(formatDate(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</h2><p>Selecciona una empresa para consultar el detalle completo.</p></div>
        </div>
        <span class="date-group-count">${events.length} eventos</span>
      </header>
      ${floorSection('Segundo piso',second,'second')}
      ${floorSection('Tercer piso',third,'third')}
    </article>`;
  }).join('');
}
function normalField(label,value,wide=false){
  return`<div class="detail-field ${wide?'is-wide':''}"><small>${esc(label)}</small><strong>${esc(serviceValue(value))}</strong></div>`;
}
function openDetail(event){
  state.selected=event;
  $('mobileDetailTitle').textContent=event.empresa;
  $('mobileDetailSubtitle').textContent=`${formatDate(event.fechaISO,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${event.escenario}`;
  $('mobileDetailBody').innerHTML=`
    ${normalField('Fecha',formatDate(event.fechaISO,{day:'2-digit',month:'2-digit',year:'numeric'}))}
    ${normalField('Escenario asignado',event.escenario)}
    ${normalField('Piso',event.piso)}
    ${normalField('Horario del evento',event.horarioEvento)}
    ${normalField('Cantidad de personas',event.cantidadPersonas.toLocaleString('es-CO'))}
    ${normalField('Acomodación del espacio',event.acomodacion)}
    <div class="detail-food-card"><div class="detail-food-heading"><small>Alimentación</small>${foodStatusMarkup(event)}</div>${foodMarkup(event)}</div>
    ${normalField('Modalidad de servicio',event.modalidadServicio)}
    ${normalField('Medio de pago',event.medioPago)}
    ${normalField('Estado',event.estado)}
    ${normalField('Observación',event.observacion,true)}
    ${normalField('Desarrollo actividad',event.desarrolloActividad,true)}
  `;
  $('mobileDetailModal').classList.add('is-open');
  $('mobileDetailModal').setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeDetail(){
  state.selected=null;
  $('mobileDetailModal').classList.remove('is-open');
  $('mobileDetailModal').setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}

async function applyEvents(events,updatedAt,notify=true,cloudHash=''){
  const normalized=events.map(eventFromRow).filter(event=>event.fechaISO);
  const nextHash=dataHash(normalized);
  const changed=Boolean(state.lastHash&&nextHash!==state.lastHash);
  state.all=normalized;
  state.lastHash=nextHash;
  state.cloudHash=cloudHash||state.cloudHash;
  state.updatedAt=updatedAt||state.updatedAt;
  await cacheSet({
    events:state.all,
    updatedAt:state.updatedAt,
    hash:state.lastHash,
    cloudHash:state.cloudHash
  });
  setConnection('Sincronización activa',true);
  setNotice(changed&&notify?'La agenda recibió una actualización automática.':'',changed?'success':'');
  if(changed&&notify){
    import('./notifications.js').then(module=>module.showNotification(
      'Agenda actualizada',
      `${normalized.length} eventos disponibles. Consulta los cambios recientes.`,
      {tag:'agenda-realtime',url:'./agenda_movil.html',renotify:true}
    )).catch(()=>{});
  }
  render();
}
async function loadChunks(meta,notify=false){
  const count=Number(meta?.chunkCount)||0;
  if(!count)return false;
  const expectedCount=Number(meta?.count)||0;
  if(meta.dataHash&&state.cloudHash===meta.dataHash&&state.all.length===expectedCount){
    state.updatedAt=meta.publishedAt||meta.clientPublishedAt||state.updatedAt;
    setConnection('Sincronización activa',true);
    render();
    return true;
  }
  const docs=await Promise.all(
    Array.from({length:count},(_,index)=>
      state.sdk.fireMod.getDoc(state.sdk.fireMod.doc(state.db,META_COLLECTION,chunkId(index)))
    )
  );
  const events=[];
  docs.forEach(snapshot=>{
    if(snapshot.exists()&&Array.isArray(snapshot.data()?.events))events.push(...snapshot.data().events);
  });
  if(!events.length&&expectedCount>0)throw new Error('La publicación no contiene bloques de datos.');
  await applyEvents(
    events,
    meta.publishedAt||meta.clientPublishedAt,
    notify,
    meta.dataHash||''
  );
  return true;
}
async function loadLegacyCollection(notify=false){
  const snapshot=await state.sdk.fireMod.getDocs(state.sdk.fireMod.collection(state.db,EVENTS_COLLECTION));
  const events=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
  await applyEvents(events,state.updatedAt,notify,`legacy:${events.length}`);
}
async function refreshFromCloud({notify=false,force=false}={}){
  if(state.refreshing||!state.db)return;
  state.refreshing=true;
  try{
    const metaSnap=await state.sdk.fireMod.getDoc(state.sdk.fireMod.doc(state.db,META_COLLECTION,'publicacion'));
    const meta=metaSnap.exists()?metaSnap.data():{};
    state.meta=meta;
    if(force)state.cloudHash='';
    const loaded=await loadChunks(meta,notify);
    if(!loaded)await loadLegacyCollection(notify);
    if(!state.all.length)setNotice('Todavía no se han publicado eventos desde el equipo principal.','');
  }catch(error){
    console.warn('Agenda refresh:',error);
    setConnection('Reintentando conexión…',false);
    const cached=await cacheGet();
    if(cached?.events?.length){
      state.all=cached.events;
      state.updatedAt=cached.updatedAt;
      state.lastHash=cached.hash||dataHash(cached.events);
      state.cloudHash=cached.cloudHash||'';
      render();
      setNotice('Mostrando la última información guardada mientras se restablece la conexión.','');
    }else{
      setNotice('No fue posible descargar la agenda. El sistema volverá a intentarlo automáticamente.','error');
    }
  }finally{
    state.refreshing=false;
  }
}
async function initializeFirebase(){
  if(state.initialized)return;
  state.initialized=true;
  const cached=await cacheGet();
  if(cached?.events?.length){
    state.all=cached.events;
    state.updatedAt=cached.updatedAt;
    state.lastHash=cached.hash||dataHash(cached.events);
    state.cloudHash=cached.cloudHash||'';
    render();
    hideBoot();
  }
  try{
    const [appMod,authMod,fireMod]=await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);
    const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(FIREBASE_CONFIG);
    import('./firebase-app-check.js').then(module=>module.initializeAppCheck()).catch(()=>{});
    state.auth=authMod.getAuth(app);
    state.db=fireMod.getFirestore(app);
    state.sdk={appMod,authMod,fireMod};
    try{await authMod.setPersistence(state.auth,authMod.browserLocalPersistence);}catch(_){}
    if(!state.auth.currentUser){
      try{await authMod.signInAnonymously(state.auth);}catch(error){console.warn('Anonymous auth:',error);}
    }
    const metaRef=fireMod.doc(state.db,META_COLLECTION,'publicacion');
    state.metaUnsubscribe=fireMod.onSnapshot(metaRef,async snapshot=>{
      const meta=snapshot.exists()?snapshot.data():{};
      state.meta=meta;
      try{
        const loaded=await loadChunks(meta,true);
        if(!loaded)await loadLegacyCollection(true);
      }catch(error){
        console.warn('Realtime agenda:',error);
        refreshFromCloud({notify:true,force:true});
      }
    },error=>{
      console.warn('Meta listener:',error);
      refreshFromCloud();
    });
    bindRealtimeChanges(fireMod);
    bindRemoteAppearance(fireMod);
    await refreshFromCloud();
    hideBoot();
    state.fallbackTimer=setInterval(()=>{
      if(!document.hidden)refreshFromCloud();
    },FALLBACK_INTERVAL_MS);
    window.addEventListener('focus',()=>refreshFromCloud(),{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)refreshFromCloud();
    });
  }catch(error){
    hideBoot();
    console.error('Firebase móvil:',error);
    setConnection('Firebase no pudo iniciar',false);
    setNotice('No fue posible iniciar la agenda. Se volverá a intentar automáticamente.','error');
  }
}

document.querySelectorAll('.agenda-tab').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.agenda-tab').forEach(item=>item.classList.remove('is-active'));
  button.classList.add('is-active');
  state.view=button.dataset.view;
  $('mobileDateFilter').value='';
  saveFilters();
  render();
}));
$('mobileSearch').addEventListener('input',render);
$('mobileDateFilter').addEventListener('change',render);
['mobileFloorFilter','mobileFoodFilter','mobileStatusFilter'].forEach(id=>{
  $(id)?.addEventListener('change',()=>{saveFilters();render();});
});
const largeText=localStorage.getItem('rptAgendaLargeTextV1')==='1';
document.body.classList.toggle('is-large-text',largeText);
$('mobileTextSize').classList.toggle('is-active',largeText);
$('mobileTextSize').addEventListener('click',()=>{
  const active=!document.body.classList.contains('is-large-text');
  document.body.classList.toggle('is-large-text',active);
  $('mobileTextSize').classList.toggle('is-active',active);
  localStorage.setItem('rptAgendaLargeTextV1',active?'1':'0');
});
$('mobileRefresh').addEventListener('click',()=>refreshFromCloud({notify:true,force:true}));
$('mobileChangesToggle')?.addEventListener('click',openChanges);
$('mobileChangesClose')?.addEventListener('click',closeChanges);
$('mobileChangesBackdrop')?.addEventListener('click',closeChanges);
$('mobileAgenda').addEventListener('click',event=>{
  const row=event.target.closest('.event-summary-row');
  if(!row)return;
  const item=state.all.find(record=>record.id===row.dataset.id);
  if(item)openDetail(item);
});
$('mobileCopyDetail').addEventListener('click',async()=>{
  const event=state.selected;if(!event)return;
  const food=foodPairs(event).map(item=>`${item.time} — ${item.description}`).join('\n')||'Sin alimentación';
  const detail=[
    event.empresa,formatDate(event.fechaISO,{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
    `${event.escenario} · ${event.piso}`,`Horario: ${event.horarioEvento||'Sin registrar'}`,
    `Personas: ${event.cantidadPersonas}`,`Acomodación: ${serviceValue(event.acomodacion)}`,
    `Alimentación:\n${food}`,`Estado: ${serviceValue(event.estado)}`
  ].join('\n');
  try{await navigator.clipboard.writeText(detail);$('mobileCopyDetail').textContent='Detalle copiado';setTimeout(()=>$('mobileCopyDetail').textContent='Copiar detalle',1400);}
  catch(_){$('mobileCopyDetail').textContent='No fue posible copiar';}
});
$('mobileCloseDetail').addEventListener('click',closeDetail);
$('mobileDetailModal').addEventListener('click',event=>{
  if(event.target.id==='mobileDetailModal')closeDetail();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')closeDetail();
});
window.addEventListener('pagehide',()=>{
  state.metaUnsubscribe?.();
  state.changesUnsubscribe?.();
  state.themeUnsubscribe?.();
  clearInterval(state.fallbackTimer);
},{once:true});

const savedFilters=readFilters();
if(savedFilters.floor&&$('mobileFloorFilter'))$('mobileFloorFilter').value=savedFilters.floor;
if(savedFilters.food&&$('mobileFoodFilter'))$('mobileFoodFilter').value=savedFilters.food;
if(savedFilters.status&&$('mobileStatusFilter'))$('mobileStatusFilter').value=savedFilters.status;
if(savedFilters.view&&['today','upcoming','all'].includes(savedFilters.view)){
  state.view=savedFilters.view;
  document.querySelectorAll('.agenda-tab').forEach(button=>button.classList.toggle('is-active',button.dataset.view===state.view));
}
setInterval(updateHeader,30000);
updateHeader();
render();
initializeFirebase();
