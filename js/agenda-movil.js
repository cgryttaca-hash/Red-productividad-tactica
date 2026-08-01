import {FIREBASE_CONFIG,EVENTS_COLLECTION,META_COLLECTION} from './firebase-config.js';

const SDK='https://www.gstatic.com/firebasejs/12.16.0';
const $=id=>document.getElementById(id);
const state={all:[],view:'today',source:'',updatedAt:'',unsubscribe:null};
const text=v=>v===undefined||v===null?'':String(v);
const normalize=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function dateISO(value){
  if(!value)return'';
  const source=text(value);
  let m=source.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;
  const d=new Date(source);if(Number.isNaN(d.getTime()))return'';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localDate(iso){
  const m=text(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(iso);
}
function todayISO(){return dateISO(new Date())}
function eventFromRow(row,index){
  return{
    id:text(row.id||row.__EVENT_ID||index),
    fechaISO:dateISO(row.fechaISO||row.FECHA),
    escenario:text(row.escenario||row['ESCENARIO ASIGNADO']),
    horarioEvento:text(row.horarioEvento||row['HORARIO DEL EVENTO']),
    empresa:text(row.empresa||row['NOMBRE DE LA EMPRESA'])||'Empresa sin registrar',
    cantidadPersonas:Number(row.cantidadPersonas??row['CANTIDAD DE PERSONAS'])||0,
    horarioAyB:text(row.horarioAyB||row['HORARIO AYB']),
    descripcionAlimentacion:text(row.descripcionAlimentacion||row['DESCRIPCION ALIMENTACION']),
    acomodacion:text(row.acomodacion||row.ACOMODACION),
    medioPago:text(row.medioPago||row['MEDIO DE PAGO']),
    modalidadServicio:text(row.modalidadServicio||row['MODALIDAD DE SERVICIO']),
    observacion:text(row.observacion||row.OBSERVACION),
    estado:text(row.estado||row.ESTADO),
    desarrolloActividad:text(row.desarrolloActividad||row['DESARROLLO ACTIVIDAD']),
    hojaOrigen:text(row.hojaOrigen||row.HOJA_ORIGEN),
    piso:text(row.piso)||(/TERCER|PISO\s*3|\b3\d{2}\b/i.test(text(row.escenario||row['ESCENARIO ASIGNADO']))?'Tercer piso':'Segundo piso')
  };
}
function roomRank(room){
  const s=normalize(room).toUpperCase();
  if(/TERCER|\b3\d{2}\b/.test(s))return[2,extractNumber(s)||9999,s];
  if(/SALON\s*1\b/.test(s))return[1,1,s];
  if(/SALON\s*2\s*(\+|Y)\s*3/.test(s))return[1,4,s];
  if(/SALON\s*2\b/.test(s))return[1,2,s];
  if(/SALON\s*3\b/.test(s))return[1,3,s];
  if(/COMPLETO/.test(s))return[1,5,s];
  return[1,20,s];
}
function extractNumber(value){const m=value.match(/\b(\d{3})\b/);return m?Number(m[1]):0}
function compareEvents(a,b){
  const ra=roomRank(a.escenario),rb=roomRank(b.escenario);
  return ra[0]-rb[0]||ra[1]-rb[1]||ra[2].localeCompare(rb[2],'es',{numeric:true})||a.horarioEvento.localeCompare(b.horarioEvento,'es',{numeric:true})||a.empresa.localeCompare(b.empresa,'es');
}
function formatDate(iso,options){const d=localDate(iso);return Number.isNaN(d.getTime())?'Fecha sin registrar':d.toLocaleDateString('es-CO',options)}
function formatDateTime(value){const d=value?.toDate?value.toDate():new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'})}

function updateHeader(){
  const now=new Date();
  $('mobileTodayDay').textContent=String(now.getDate()).padStart(2,'0');
  $('mobileTodayMonth').textContent=now.toLocaleDateString('es-CO',{month:'short'}).replace('.','');
  $('mobileEventCount').textContent=`${state.all.length} eventos`;
  $('mobileUpdatedAt').textContent=state.updatedAt?`Actualizado ${formatDateTime(state.updatedAt)}`:'Esperando actualización';
}
function filterEvents(){
  const q=normalize($('mobileSearch').value).toLowerCase();
  const exact=$('mobileDateFilter').value;
  const today=todayISO();
  return state.all.filter(event=>{
    if(exact&&event.fechaISO!==exact)return false;
    if(!exact&&state.view==='today'&&event.fechaISO!==today)return false;
    if(!exact&&state.view==='upcoming'&&event.fechaISO<=today)return false;
    if(q&&![
      event.empresa,event.escenario,event.horarioEvento,event.horarioAyB,
      event.descripcionAlimentacion,event.observacion,event.estado
    ].join(' ').toLowerCase().includes(q))return false;
    return true;
  });
}
function serviceValue(value,fallback){return text(value).trim()||fallback}
function eventCard(event){
  return`<article class="event-card" data-id="${esc(event.id)}">
    <div class="event-card-top"><div class="event-company"><small>Empresa</small><h4>${esc(event.empresa)}</h4></div><span class="event-room">${esc(event.escenario||'Sin escenario')}</span></div>
    <div class="event-primary"><div><small>Horario del evento</small><strong>${esc(serviceValue(event.horarioEvento,'Sin horario registrado'))}</strong></div><div class="event-pax"><small>Personas</small><strong>${event.cantidadPersonas.toLocaleString('es-CO')}</strong></div></div>
    <div class="service-sequence">
      <div class="service-line"><small>Horario AYB</small><strong>${esc(serviceValue(event.horarioAyB,'Sin horario AYB'))}</strong></div>
      <div class="service-line"><small>Descripción Alimentación</small><strong>${esc(serviceValue(event.descripcionAlimentacion,'Sin descripción de alimentación'))}</strong></div>
    </div>
    <div class="event-footer"><span class="event-status">${esc(event.estado||'Sin estado')}</span><button class="event-open" type="button">Ver detalle →</button></div>
  </article>`;
}
function floorSection(title,events,type){
  if(!events.length)return'';
  return`<section class="floor-section ${type==='third'?'is-third':''}">
    <div class="floor-heading"><div><span class="floor-marker">${type==='third'?'03':'02'}</span><div><small>Programación de la fecha</small><h3>${title}</h3></div></div><b>${events.length}</b></div>
    <div class="event-list">${events.map(eventCard).join('')}</div>
  </section>`;
}
function render(){
  updateHeader();
  const data=filterEvents().sort((a,b)=>a.fechaISO.localeCompare(b.fechaISO)||compareEvents(a,b));
  const agenda=$('mobileAgenda');
  if(!data.length){
    const message=state.all.length?'No hay eventos para los filtros seleccionados.':'Aún no hay información publicada.';
    agenda.innerHTML=`<div class="mobile-empty"><strong>${esc(message)}</strong><p>${state.all.length?'Selecciona otra vista, fecha o término de búsqueda.':'La agenda se actualizará automáticamente cuando el propietario publique el Excel.'}</p></div>`;
    return;
  }
  const groups=new Map();
  data.forEach(event=>{if(!groups.has(event.fechaISO))groups.set(event.fechaISO,[]);groups.get(event.fechaISO).push(event)});
  agenda.innerHTML=[...groups.entries()].map(([date,events])=>{
    const second=events.filter(e=>e.piso!=='Tercer piso').sort(compareEvents);
    const third=events.filter(e=>e.piso==='Tercer piso').sort(compareEvents);
    const d=localDate(date);
    return`<article class="date-group">
      <header class="date-group-header"><div><span class="date-block"><strong>${String(d.getDate()).padStart(2,'0')}</strong><span>${d.toLocaleDateString('es-CO',{month:'short'}).replace('.','')}</span></span><div><h2>${esc(formatDate(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</h2><p>Agenda organizada por piso y salón</p></div></div><span class="date-group-count">${events.length} eventos</span></header>
      ${floorSection('Segundo piso',second,'second')}
      ${floorSection('Tercer piso',third,'third')}
    </article>`;
  }).join('');
}
function openDetail(event){
  $('mobileDetailTitle').textContent=event.empresa;
  $('mobileDetailSubtitle').textContent=`${formatDate(event.fechaISO,{weekday:'long',day:'numeric',month:'long'})} · ${event.escenario}`;
  const fields=[
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
  $('mobileDetailBody').innerHTML=fields.map(([label,value])=>`<div class="detail-field ${['Horario AYB','Descripción Alimentación','Observación','Desarrollo actividad'].includes(label)?'is-wide':''}"><small>${esc(label)}</small><strong>${esc(serviceValue(value,'Sin registrar'))}</strong></div>`).join('');
  $('mobileDetailModal').classList.add('is-open');$('mobileDetailModal').setAttribute('aria-hidden','false');
}
function closeDetail(){$('mobileDetailModal').classList.remove('is-open');$('mobileDetailModal').setAttribute('aria-hidden','true')}

function setNotice(message,type=''){
  const notice=$('mobileNotice');notice.hidden=!message;notice.className=`mobile-notice ${type?`is-${type}`:''}`;notice.textContent=message||'';
}
function loadLocalFallback(){
  try{
    const rows=JSON.parse(localStorage.getItem('eventData')||'[]');
    if(Array.isArray(rows)&&rows.length){
      state.all=rows.map(eventFromRow).filter(e=>e.fechaISO);
      state.source='Datos locales';state.updatedAt=localStorage.getItem('eventDataUpdatedAt')||new Date().toISOString();
      $('mobileConnectionText').textContent='Mostrando la copia local disponible';
      setNotice('Firebase no respondió; se muestra la última copia disponible en este dispositivo.');
      render();return true;
    }
  }catch(_){}
  return false;
}
async function connectFirebase(allowAnonymousRetry=true){
  try{
    const [{initializeApp,getApps},{getFirestore,collection,doc,onSnapshot}]=await Promise.all([
      import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-firestore.js`)
    ]);
    const app=getApps().length?getApps()[0]:initializeApp(FIREBASE_CONFIG);
    const db=getFirestore(app);
    let connected=false;
    state.unsubscribe?.();
    state.unsubscribe=onSnapshot(collection(db,EVENTS_COLLECTION),snapshot=>{
      connected=true;
      state.all=snapshot.docs.map((item,index)=>eventFromRow({id:item.id,...item.data()},index)).filter(e=>e.fechaISO);
      state.source='Firebase';$('mobileConnectionText').textContent='Sincronización en tiempo real activa';setNotice('');
      render();
    },async error=>{
      console.error(error);
      if(!connected&&allowAnonymousRetry&&String(error?.code||'').includes('permission')){
        try{
          const authMod=await import(`${SDK}/firebase-auth.js`);
          const auth=authMod.getAuth(app);
          if(!auth.currentUser) await authMod.signInAnonymously(auth);
          connectFirebase(false);
          return;
        }catch(authError){console.error(authError);}
      }
      $('mobileConnectionText').textContent='No fue posible conectar con Firebase';
      if(!loadLocalFallback())setNotice('La agenda no tiene permiso de lectura o no existe información publicada.','error');
    });
    onSnapshot(doc(db,META_COLLECTION,'publicacion'),snapshot=>{
      const data=snapshot.data();if(data){state.updatedAt=data.publishedAt||data.clientPublishedAt||'';render()}
    },()=>{});
  }catch(error){
    console.error(error);$('mobileConnectionText').textContent='Conexión no disponible';
    if(!loadLocalFallback())setNotice('No fue posible cargar Firebase ni una copia local.','error');
  }
}
document.querySelectorAll('.mobile-tab').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.mobile-tab').forEach(item=>item.classList.remove('is-active'));button.classList.add('is-active');
  state.view=button.dataset.view;$('mobileDateFilter').value='';render();
}));
$('mobileSearch').addEventListener('input',render);
$('mobileDateFilter').addEventListener('change',render);
$('mobileRefresh').addEventListener('click',()=>{if(state.source==='Firebase')return;connectFirebase()});
$('mobileAgenda').addEventListener('click',event=>{const card=event.target.closest('.event-card');if(!card)return;const item=state.all.find(row=>row.id===card.dataset.id);if(item)openDetail(item)});
$('mobileCloseDetail').addEventListener('click',closeDetail);
$('mobileDetailModal').addEventListener('click',event=>{if(event.target.id==='mobileDetailModal')closeDetail()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDetail()});
window.addEventListener('storage',event=>{if(['eventData','eventDataUpdatedAt'].includes(event.key)&&state.source!=='Firebase')loadLocalFallback()});
updateHeader();connectFirebase();
