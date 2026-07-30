import {
  FIREBASE_CONFIG,
  FIREBASE_COLLECTION,
  FIREBASE_META_COLLECTION,
  FIREBASE_META_DOCUMENT,
  isFirebaseConfigured
} from "./firebase-config.js?v=20260730-firebase3";

const FIREBASE_SDK_VERSION = "12.16.0";

let initializeApp;
let getApps;
let getAuth;
let setPersistence;
let browserLocalPersistence;
let signInAnonymously;
let onAuthStateChanged;
let getFirestore;
let collection;
let doc;
let query;
let orderBy;
let onSnapshot;




async function loadFirebaseSdk(){
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
  ]);

  ({initializeApp, getApps} = appModule);
  ({getAuth, setPersistence, browserLocalPersistence, signInAnonymously, onAuthStateChanged} = authModule);
  ({getFirestore, collection, doc, query, orderBy, onSnapshot} = firestoreModule);
}

const state = {
  mode:"today",
  all:[],
  view:[],
  connected:false,
  publishedAt:null,
  unsubscribeEvents:null,
  unsubscribeMeta:null
};

const $ = id => document.getElementById(id);
const text = value => value === undefined || value === null ? "" : String(value).trim();
const normalize = value => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const MONTHS_SHORT = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[character]));
}

function todayISO(){
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function parseISO(value){
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function displayDate(value){
  const date = parseISO(value);
  if(!date) return text(value) || "—";
  return date.toLocaleDateString("es-419", {day:"2-digit", month:"2-digit", year:"numeric"});
}

function dayNumber(value){
  const date = parseISO(value);
  return date ? String(date.getDate()).padStart(2,"0") : "--";
}

function monthShort(value){
  const date = parseISO(value);
  return date ? MONTHS_SHORT[date.getMonth()] : "---";
}

function formatDateTime(value){
  if(!value) return "Sin publicación registrada";
  try{
    const date = value?.toDate ? value.toDate() : new Date(value);
    if(!Number.isNaN(date.getTime())) return `Actualizado ${date.toLocaleString("es-419", {dateStyle:"short", timeStyle:"short"})}`;
  }catch(_){ /* no bloquea */ }
  return "Actualización disponible";
}

function setLiveStatus(type, label){
  const element = $("liveStatus");
  element.classList.remove("is-loading", "is-error");
  if(type === "loading") element.classList.add("is-loading");
  if(type === "error") element.classList.add("is-error");
  $("liveStatusText").textContent = label;
}

function updateHeader(){
  const now = new Date();
  $("todayLabel").textContent = now.toLocaleDateString("es-419", {weekday:"long", day:"numeric", month:"long", year:"numeric"});
  $("lastPublished").textContent = formatDateTime(state.publishedAt);
}

function floorRank(value){
  if(value === "Segundo piso") return 1;
  if(value === "Tercer piso") return 2;
  return 3;
}

function normalizeEvent(id, data){
  return {
    id,
    fechaISO:text(data.fechaISO),
    empresa:text(data.empresa) || "Sin empresa registrada",
    escenario:text(data.escenario) || "Sin espacio asignado",
    piso:text(data.piso) || "Otro espacio",
    horarioEvento:text(data.horarioEvento) || "Sin horario registrado",
    horarioAyB:text(data.horarioAyB) || "Sin horario A&B",
    alimentacion:text(data.alimentacion) || "Sin alimentación registrada",
    tieneAlimentacion:Boolean(data.tieneAlimentacion),
    cantidadPersonas:Number(data.cantidadPersonas) || 0,
    acomodacion:text(data.acomodacion),
    modalidadServicio:text(data.modalidadServicio),
    medioPago:text(data.medioPago),
    estado:text(data.estado),
    observacion:text(data.observacion),
    hojaOrigen:text(data.hojaOrigen)
  };
}

function buildFloorFilter(){
  const select = $("floorFilter");
  const previous = select.value;
  const floors = [...new Set(state.all.map(event => event.piso).filter(Boolean))]
    .sort((a,b) => floorRank(a) - floorRank(b) || a.localeCompare(b,"es"));
  select.innerHTML = '<option value="">Todos los espacios</option>' + floors
    .map(floor => `<option value="${escapeHtml(floor)}">${escapeHtml(floor)}</option>`)
    .join("");
  if(floors.includes(previous)) select.value = previous;
}

function filteredEvents(){
  const today = todayISO();
  const queryText = normalize($("searchInput").value);
  const date = $("dateFilter").value;
  const floor = $("floorFilter").value;
  let events = state.all.slice();

  if(state.mode === "today") events = events.filter(event => event.fechaISO === today);
  if(state.mode === "upcoming") events = events.filter(event => event.fechaISO >= today);
  if(date) events = events.filter(event => event.fechaISO === date);
  if(floor) events = events.filter(event => event.piso === floor);
  if(queryText){
    events = events.filter(event => normalize([
      event.empresa,
      event.escenario,
      event.piso,
      event.horarioEvento,
      event.alimentacion,
      event.estado
    ].join(" ")).includes(queryText));
  }

  events.sort((a,b) =>
    a.fechaISO.localeCompare(b.fechaISO) ||
    floorRank(a.piso) - floorRank(b.piso) ||
    a.horarioEvento.localeCompare(b.horarioEvento,"es",{numeric:true}) ||
    a.empresa.localeCompare(b.empresa,"es")
  );
  return events;
}

function render(){
  updateHeader();
  state.view = filteredEvents();
  $("eventsCount").textContent = `${state.view.length} ${state.view.length === 1 ? "evento" : "eventos"}`;
  $("eventsContext").textContent = state.mode === "today" ? "Programación de hoy" : state.mode === "upcoming" ? "Agenda vigente y próxima" : "Todos los eventos publicados";

  if(!state.view.length){
    const title = state.all.length ? "No hay eventos con estos filtros" : "Aún no hay eventos publicados";
    const message = state.all.length
      ? "Cambia la fecha, el espacio o la búsqueda para ampliar los resultados."
      : "Cuando el propietario publique la hoja Eventos, la información aparecerá aquí automáticamente.";
    $("eventsList").innerHTML = `<div class="empty-state"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
    return;
  }

  $("eventsList").innerHTML = state.view.map(event => `
    <article class="event-card" data-id="${escapeHtml(event.id)}" data-floor="${escapeHtml(event.piso)}" tabindex="0" role="button" aria-label="Ver detalle de ${escapeHtml(event.empresa)}">
      <div class="event-card-head">
        <div class="event-company">
          <small>${escapeHtml(event.piso)}</small>
          <h2>${escapeHtml(event.empresa)}</h2>
          <div class="event-place">
            <svg viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
            <span>${escapeHtml(event.escenario)}</span>
          </div>
        </div>
        <div class="event-date"><strong>${dayNumber(event.fechaISO)}</strong><span>${monthShort(event.fechaISO)}</span></div>
      </div>
      <div class="event-data-grid">
        <div class="event-data"><small>Horario</small><strong>${escapeHtml(event.horarioEvento)}</strong></div>
        <div class="event-data"><small>Personas</small><strong>${event.cantidadPersonas || "—"}</strong></div>
      </div>
      <div class="event-tags">
        ${event.estado ? `<span class="event-tag">${escapeHtml(event.estado)}</span>` : ""}
        ${event.tieneAlimentacion ? '<span class="event-tag is-food">Con alimentación</span>' : ""}
      </div>
    </article>
  `).join("");
}

function openDetail(event){
  $("detailTitle").textContent = event.empresa;
  $("detailSubtitle").textContent = `${displayDate(event.fechaISO)} · ${event.escenario}`;
  $("detailHighlights").innerHTML = `
    <article><small>Horario A&B</small><strong>${escapeHtml(event.horarioAyB)}</strong></article>
    <article><small>Descripción alimentación</small><strong>${escapeHtml(event.alimentacion)}</strong></article>
  `;

  const rows = [
    ["Fecha", displayDate(event.fechaISO)],
    ["Piso", event.piso],
    ["Escenario", event.escenario],
    ["Horario del evento", event.horarioEvento],
    ["Cantidad de personas", event.cantidadPersonas || "—"],
    ["Acomodación", event.acomodacion || "—"],
    ["Modalidad de servicio", event.modalidadServicio || "—"],
    ["Medio de pago", event.medioPago || "—"],
    ["Estado", event.estado || "—"],
    ["Observación", event.observacion || "—"]
  ];
  $("detailRows").innerHTML = rows.map(([label,value]) => `
    <div class="detail-row"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>
  `).join("");
  $("detailModal").classList.add("is-open");
  $("detailModal").setAttribute("aria-hidden","false");
}

function closeDetail(){
  $("detailModal").classList.remove("is-open");
  $("detailModal").setAttribute("aria-hidden","true");
}

function bindUi(){
  document.querySelectorAll(".view-tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".view-tab").forEach(item => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.mode = button.dataset.mode;
      $("dateFilter").value = "";
      render();
    });
  });

  [$("searchInput"), $("floorFilter"), $("dateFilter")].forEach(element => element.addEventListener("input", render));
  $("eventsList").addEventListener("click", event => {
    const card = event.target.closest(".event-card");
    if(!card) return;
    const item = state.view.find(entry => entry.id === card.dataset.id);
    if(item) openDetail(item);
  });
  $("eventsList").addEventListener("keydown", event => {
    if(!["Enter"," "].includes(event.key)) return;
    const card = event.target.closest(".event-card");
    if(!card) return;
    event.preventDefault();
    const item = state.view.find(entry => entry.id === card.dataset.id);
    if(item) openDetail(item);
  });
  $("detailClose").addEventListener("click", closeDetail);
  $("detailModal").addEventListener("click", event => { if(event.target === $("detailModal")) closeDetail(); });
  document.addEventListener("keydown", event => { if(event.key === "Escape") closeDetail(); });
}

function renderConfigurationMessage(){
  setLiveStatus("error", "Sin configurar");
  $("eventsList").innerHTML = `
    <div class="config-state">
      <strong>Firebase todavía no está configurado</strong>
      <p>El propietario debe completar <b>js/firebase-config.js</b>, habilitar Authentication y publicar las reglas de Firestore. Después esta página funcionará automáticamente.</p>
    </div>
  `;
  $("eventsCount").textContent = "0 eventos";
  $("eventsContext").textContent = "Configuración pendiente";
}

async function initializeFirebase(){
  if(!isFirebaseConfigured()){
    renderConfigurationMessage();
    return;
  }

  try{
    setLiveStatus("loading", "Conectando");
    await loadFirebaseSdk();
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);
    await setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, async user => {
      if(!user){
        try{
          await signInAnonymously(auth);
        }catch(error){
          console.error(error);
          setLiveStatus("error", "Acceso bloqueado");
          $("eventsList").innerHTML = `<div class="config-state"><strong>No se pudo abrir la agenda</strong><p>El propietario debe habilitar el proveedor Anónimo en Firebase Authentication y revisar las reglas de Firestore.</p></div>`;
        }
        return;
      }

      if(state.unsubscribeEvents) state.unsubscribeEvents();
      if(state.unsubscribeMeta) state.unsubscribeMeta();

      const eventsQuery = query(collection(db, FIREBASE_COLLECTION), orderBy("fechaISO"));
      state.unsubscribeEvents = onSnapshot(eventsQuery, snapshot => {
        state.connected = true;
        state.all = snapshot.docs.map(item => normalizeEvent(item.id, item.data()));
        buildFloorFilter();
        setLiveStatus("ready", "En tiempo real");
        render();
      }, error => {
        console.error(error);
        setLiveStatus("error", "Sin acceso");
        $("eventsList").innerHTML = `<div class="config-state"><strong>No se pudieron leer los eventos</strong><p>Revisa las reglas de Firestore y confirma que la colección ${escapeHtml(FIREBASE_COLLECTION)} permita lectura a usuarios autenticados.</p></div>`;
      });

      state.unsubscribeMeta = onSnapshot(doc(db, FIREBASE_META_COLLECTION, FIREBASE_META_DOCUMENT), snapshot => {
        if(snapshot.exists()) state.publishedAt = snapshot.data().publishedAt || snapshot.data().sourceUpdatedAt || null;
        updateHeader();
      });
    });
  }catch(error){
    console.error(error);
    setLiveStatus("error", "Error de conexión");
    $("eventsList").innerHTML = `<div class="config-state"><strong>No fue posible iniciar Firebase</strong><p>Verifica los valores de js/firebase-config.js y vuelve a publicar el repositorio.</p></div>`;
  }
}

bindUi();
updateHeader();
setInterval(updateHeader, 60000);
initializeFirebase();
