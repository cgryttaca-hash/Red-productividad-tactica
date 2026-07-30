import {
  FIREBASE_CONFIG,
  FIREBASE_OWNER_UID,
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
let onAuthStateChanged;
let signInWithEmailAndPassword;
let sendPasswordResetEmail;
let signOut;
let getFirestore;
let collection;
let doc;
let getDocs;
let getDoc;
let writeBatch;
let serverTimestamp;




async function loadFirebaseSdk(){
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
  ]);

  ({initializeApp, getApps} = appModule);
  ({getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut} = authModule);
  ({getFirestore, collection, doc, getDocs, getDoc, writeBatch, serverTimestamp} = firestoreModule);
}

const PUBLISH_DEBOUNCE_MS = 1400;
const MAX_BATCH_OPERATIONS = 400;
const VERSION = 1;

let app = null;
let auth = null;
let db = null;
let currentUser = null;
let initialized = false;
let publishTimer = null;
let publishInProgress = false;
let ui = {};

const text = value => value === undefined || value === null ? "" : String(value).trim();
const normalize = value => text(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim();
const upper = value => normalize(value).toUpperCase();

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[character]));
}

function localDateISO(value){
  if(!value) return "";
  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
  }

  const source = text(value);
  let match = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(match) return `${match[3]}-${String(match[2]).padStart(2,"0")}-${String(match[1]).padStart(2,"0")}`;

  const parsed = new Date(source);
  if(Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2,"0")}-${String(parsed.getDate()).padStart(2,"0")}`;
}

function numericValue(value){
  if(typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(text(value).replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function floorFromScenario(value){
  const source = upper(value);
  if(/(^|\D)(2|02)(\D|$)/.test(source) || source.includes("SEGUNDO")) return "Segundo piso";
  if(/(^|\D)(3|03)(\D|$)/.test(source) || source.includes("TERCER")) return "Tercer piso";
  return "Otro espacio";
}

function valueFrom(row, keys){
  for(const key of keys){
    if(Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null){
      return row[key];
    }
  }
  return "";
}

function hasFood(value){
  const source = upper(value);
  if(!source) return false;
  return !["NO", "N/A", "NA", "SIN ALIMENTACION", "SIN SERVICIO", "NO APLICA"].includes(source);
}

function hashString(value){
  let hash = 2166136261;
  const source = String(value);
  for(let index = 0; index < source.length; index += 1){
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function publicEvent(row, occurrenceMap){
  const fechaISO = localDateISO(valueFrom(row, ["FECHA", "fecha", "date"]));
  const empresa = text(valueFrom(row, ["NOMBRE DE LA EMPRESA", "EMPRESA", "empresa", "cliente"]));
  const escenario = text(valueFrom(row, ["ESCENARIO ASIGNADO", "ESCENARIO", "escenario", "salon", "salón"]));
  const horarioEvento = text(valueFrom(row, ["HORARIO DEL EVENTO", "HORARIO", "horario"]));
  const horarioAyB = text(valueFrom(row, ["HORARIO AYB", "HORARIO A&B", "horario ayb"]));
  const alimentacion = text(valueFrom(row, ["DESCRIPCION ALIMENTACION", "DESCRIPCIÓN ALIMENTACIÓN", "ALIMENTACION", "alimentacion"]));

  if(!fechaISO || !empresa) return null;

  const event = {
    schemaVersion: VERSION,
    fechaISO,
    empresa,
    escenario: escenario || "Sin espacio asignado",
    piso: floorFromScenario(escenario),
    horarioEvento: horarioEvento || "Sin horario registrado",
    horarioAyB: horarioAyB || "Sin horario A&B",
    alimentacion: alimentacion || "Sin alimentación registrada",
    tieneAlimentacion: hasFood(alimentacion),
    cantidadPersonas: numericValue(valueFrom(row, ["CANTIDAD DE PERSONAS", "PAX", "personas"])),
    acomodacion: text(valueFrom(row, ["ACOMODACION", "ACOMODACIÓN", "acomodacion"])),
    modalidadServicio: text(valueFrom(row, ["MODALIDAD DE SERVICIO", "MODALIDAD", "servicio"])),
    medioPago: text(valueFrom(row, ["MEDIO DE PAGO", "PAGO", "pago"])),
    estado: text(valueFrom(row, ["ESTADO", "STATUS", "estado"])),
    observacion: text(valueFrom(row, ["OBSERVACION", "OBSERVACIÓN", "observacion"])),
    hojaOrigen: text(valueFrom(row, ["HOJA_ORIGEN", "HOJA ORIGEN"]))
  };

  const baseSignature = [event.fechaISO, event.empresa, event.escenario, event.horarioEvento, event.horarioAyB].join("|");
  const occurrence = (occurrenceMap.get(baseSignature) || 0) + 1;
  occurrenceMap.set(baseSignature, occurrence);
  const signature = `${baseSignature}|${occurrence}`;
  const id = `ev_${hashString(signature)}`;
  const contentHash = hashString(JSON.stringify(event));

  return {id, contentHash, ...event};
}

function getLocalEvents(){
  let rows = [];
  try{
    const parsed = JSON.parse(localStorage.getItem("eventData") || "[]");
    if(Array.isArray(parsed)) rows = parsed;
  }catch(error){
    console.error("No se pudo leer eventData:", error);
  }

  const occurrences = new Map();
  return rows
    .map(row => publicEvent(row, occurrences))
    .filter(Boolean)
    .sort((a, b) => a.fechaISO.localeCompare(b.fechaISO) || a.horarioEvento.localeCompare(b.horarioEvento, "es", {numeric:true}));
}

function ensureUi(){
  if(document.getElementById("firebaseCloudModal")) return;

  const control = document.createElement("button");
  control.id = "firebaseCloudControl";
  control.className = "firebase-cloud-control is-offline";
  control.type = "button";
  control.innerHTML = `
    <span class="firebase-cloud-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M7.5 18.5h10a4 4 0 0 0 .6-8A6.5 6.5 0 0 0 5.8 9a4.8 4.8 0 0 0 1.7 9.5Z"/></svg>
    </span>
    <span class="firebase-cloud-copy"><small>Publicación móvil</small><strong id="firebaseCloudControlText">Configurar Firebase</strong></span>
    <span class="firebase-cloud-dot" aria-hidden="true"></span>
  `;

  const target = document.querySelector(".header-tools") ||
    document.querySelector(".command-left") ||
    document.querySelector(".minute-actions") ||
    document.querySelector(".top-actions");
  if(target){
    target.insertBefore(control, target.firstChild);
    control.classList.add("is-inline");
  }else{
    document.body.appendChild(control);
    control.classList.add("is-floating");
  }

  const modal = document.createElement("div");
  modal.id = "firebaseCloudModal";
  modal.className = "firebase-cloud-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="firebase-cloud-dialog" role="dialog" aria-modal="true" aria-labelledby="firebaseCloudTitle">
      <button id="firebaseCloudClose" class="firebase-cloud-close" type="button" aria-label="Cerrar">×</button>
      <div class="firebase-cloud-heading">
        <span class="firebase-cloud-heading-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7.5 18.5h10a4 4 0 0 0 .6-8A6.5 6.5 0 0 0 5.8 9a4.8 4.8 0 0 0 1.7 9.5Z"/></svg>
        </span>
        <div>
          <span>Firebase · tiempo real</span>
          <h2 id="firebaseCloudTitle">Publicación de eventos</h2>
          <p>Solo el propietario puede publicar. La agenda móvil permanece en modo consulta.</p>
        </div>
      </div>

      <div id="firebaseCloudStatus" class="firebase-cloud-status is-offline">
        <span class="firebase-cloud-status-dot" aria-hidden="true"></span>
        <div><small>Estado</small><strong id="firebaseCloudStatusText">Firebase aún no está configurado</strong><span id="firebaseCloudStatusDetail">Revisa CONFIGURAR_FIREBASE.txt</span></div>
      </div>

      <form id="firebaseOwnerForm" class="firebase-owner-form">
        <label>Correo del propietario<input id="firebaseOwnerEmail" type="email" autocomplete="username" required placeholder="propietario@correo.com"></label>
        <label>Contraseña<input id="firebaseOwnerPassword" type="password" autocomplete="current-password" required placeholder="••••••••"></label>
        <button id="firebaseOwnerLogin" type="submit">Ingresar como propietario</button>
        <button id="firebaseOwnerReset" class="firebase-owner-reset" type="button">Restablecer contraseña</button>
      </form>

      <div id="firebaseOwnerSession" class="firebase-owner-session" hidden>
        <div><small>Sesión activa</small><strong id="firebaseOwnerIdentity">—</strong></div>
        <button id="firebaseOwnerLogout" type="button">Cerrar sesión</button>
      </div>

      <dl class="firebase-cloud-details">
        <div><dt>Eventos locales</dt><dd id="firebaseLocalCount">0</dd></div>
        <div><dt>Última carga Excel</dt><dd id="firebaseLocalUpdated">—</dd></div>
        <div><dt>Última publicación</dt><dd id="firebasePublishedAt">—</dd></div>
      </dl>

      <div id="firebaseCloudMessage" class="firebase-cloud-message" hidden></div>

      <div class="firebase-cloud-actions">
        <button id="firebasePublishNow" class="firebase-primary-action" type="button">Publicar ahora</button>
        <a class="firebase-secondary-action" href="agenda_movil.html" target="_blank" rel="noopener">Abrir agenda móvil</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  ui = {
    control,
    controlText:document.getElementById("firebaseCloudControlText"),
    modal,
    close:document.getElementById("firebaseCloudClose"),
    status:document.getElementById("firebaseCloudStatus"),
    statusText:document.getElementById("firebaseCloudStatusText"),
    statusDetail:document.getElementById("firebaseCloudStatusDetail"),
    form:document.getElementById("firebaseOwnerForm"),
    email:document.getElementById("firebaseOwnerEmail"),
    password:document.getElementById("firebaseOwnerPassword"),
    login:document.getElementById("firebaseOwnerLogin"),
    reset:document.getElementById("firebaseOwnerReset"),
    session:document.getElementById("firebaseOwnerSession"),
    identity:document.getElementById("firebaseOwnerIdentity"),
    logout:document.getElementById("firebaseOwnerLogout"),
    localCount:document.getElementById("firebaseLocalCount"),
    localUpdated:document.getElementById("firebaseLocalUpdated"),
    publishedAt:document.getElementById("firebasePublishedAt"),
    message:document.getElementById("firebaseCloudMessage"),
    publish:document.getElementById("firebasePublishNow")
  };

  control.addEventListener("click", openModal);
  ui.close.addEventListener("click", closeModal);
  ui.modal.addEventListener("click", event => { if(event.target === ui.modal) closeModal(); });
  ui.form.addEventListener("submit", loginOwner);
  ui.reset.addEventListener("click", resetOwnerPassword);
  ui.logout.addEventListener("click", logoutOwner);
  ui.publish.addEventListener("click", () => publishEvents({manual:true}));
  document.addEventListener("keydown", event => { if(event.key === "Escape") closeModal(); });
  ui.email.value = localStorage.getItem("firebase:ownerEmail") || "cgryttaca@gmail.com";
  refreshLocalSummary();
}

function openModal(){
  refreshLocalSummary();
  ui.modal.classList.add("is-open");
  ui.modal.setAttribute("aria-hidden", "false");
}

function closeModal(){
  ui.modal.classList.remove("is-open");
  ui.modal.setAttribute("aria-hidden", "true");
}

function formatDateTime(value){
  if(!value) return "—";
  try{
    const date = value?.toDate ? value.toDate() : new Date(value);
    if(!Number.isNaN(date.getTime())) return date.toLocaleString("es-419", {dateStyle:"short", timeStyle:"short"});
  }catch(_){ /* no bloquea */ }
  return text(value) || "—";
}

function showMessage(message, type="info"){
  if(!ui.message) return;
  ui.message.hidden = !message;
  ui.message.className = `firebase-cloud-message is-${type}`;
  ui.message.textContent = message || "";
}

function setState(state, detail=""){
  if(!ui.control) return;
  const states = {
    offline:{control:"Configurar Firebase", text:"Firebase aún no está configurado", className:"is-offline"},
    signedOut:{control:"Iniciar sesión", text:"Propietario desconectado", className:"is-warning"},
    ready:{control:"Nube conectada", text:"Listo para publicar", className:"is-ready"},
    publishing:{control:"Publicando…", text:"Actualizando agenda móvil…", className:"is-syncing"},
    error:{control:"Error en nube", text:"No se pudo completar la operación", className:"is-error"}
  };
  const config = states[state] || states.offline;
  [ui.control, ui.status].forEach(element => {
    element.classList.remove("is-offline", "is-warning", "is-ready", "is-syncing", "is-error");
    element.classList.add(config.className);
  });
  ui.controlText.textContent = config.control;
  ui.statusText.textContent = config.text;
  ui.statusDetail.textContent = detail || "Consulta el estado y las acciones disponibles.";
}

function refreshLocalSummary(){
  if(!ui.localCount) return;
  ui.localCount.textContent = String(getLocalEvents().length);
  ui.localUpdated.textContent = formatDateTime(localStorage.getItem("eventDataUpdatedAt"));
  ui.publishedAt.textContent = formatDateTime(localStorage.getItem("firebase:lastPublishedAt"));
}

function firebaseAuthMessage(error){
  const code = String(error?.code || "");
  const messages = {
    "auth/invalid-credential":"El correo o la contraseña no coinciden. Revisa que estés usando exactamente la cuenta creada en Firebase. Si olvidaste la contraseña, restablécela o crea una nueva desde Authentication → Usuarios.",
    "auth/user-not-found":"No existe una cuenta de Firebase con ese correo.",
    "auth/wrong-password":"La contraseña no coincide con la cuenta registrada.",
    "auth/invalid-email":"El correo electrónico no tiene un formato válido.",
    "auth/operation-not-allowed":"El acceso por Correo electrónico/contraseña todavía no está habilitado en Authentication → Método de acceso.",
    "auth/user-disabled":"La cuenta propietaria está deshabilitada en Firebase Authentication.",
    "auth/too-many-requests":"Firebase bloqueó temporalmente los intentos por seguridad. Espera unos minutos y vuelve a intentar.",
    "auth/network-request-failed":"No fue posible comunicarse con Firebase. Revisa la conexión a internet y vuelve a intentar.",
    "auth/unauthorized-domain":"Este dominio no está autorizado. Agrega cgryttaca-hash.github.io en Authentication → Configuración → Dominios autorizados.",
    "auth/internal-error":"Firebase devolvió un error interno. Recarga la página e inténtalo nuevamente."
  };
  return messages[code] || `No fue posible iniciar sesión${code ? ` (${code})` : ""}. Revisa el correo, la contraseña y la configuración de Authentication.`;
}

async function loginOwner(event){
  event.preventDefault();
  if(!auth) return;
  showMessage("");
  ui.login.disabled = true;
  const email = ui.email.value.trim();
  try{
    localStorage.setItem("firebase:ownerEmail", email);
    await signInWithEmailAndPassword(auth, email, ui.password.value);
    ui.password.value = "";
  }catch(error){
    console.error("Firebase Auth:", error?.code, error);
    showMessage(firebaseAuthMessage(error), "error");
  }finally{
    ui.login.disabled = false;
  }
}

async function resetOwnerPassword(){
  if(!auth) return;
  const email = ui.email.value.trim();
  if(!email){
    showMessage("Escribe primero el correo del propietario para enviar el enlace de restablecimiento.", "error");
    ui.email.focus();
    return;
  }
  ui.reset.disabled = true;
  try{
    localStorage.setItem("firebase:ownerEmail", email);
    await sendPasswordResetEmail(auth, email);
    showMessage(`Firebase envió un enlace de restablecimiento a ${email}. Revisa también la carpeta de correo no deseado.`, "success");
  }catch(error){
    console.error("Firebase password reset:", error?.code, error);
    showMessage(firebaseAuthMessage(error), "error");
  }finally{
    ui.reset.disabled = false;
  }
}

async function logoutOwner(){
  if(auth) await signOut(auth);
}

function isOwner(user){
  return Boolean(user && user.uid === FIREBASE_OWNER_UID);
}

function schedulePublish(){
  clearTimeout(publishTimer);
  publishTimer = setTimeout(() => publishEvents({manual:false}), PUBLISH_DEBOUNCE_MS);
}

async function commitOperations(operations){
  for(let start = 0; start < operations.length; start += MAX_BATCH_OPERATIONS){
    const batch = writeBatch(db);
    operations.slice(start, start + MAX_BATCH_OPERATIONS).forEach(operation => {
      if(operation.type === "delete") batch.delete(operation.ref);
      else batch.set(operation.ref, operation.data, {merge:false});
    });
    await batch.commit();
  }
}

async function publishEvents({manual=false}={}){
  if(publishInProgress) return false;
  refreshLocalSummary();

  if(!isFirebaseConfigured()){
    setState("offline", "Completa js/firebase-config.js y firestore.rules.");
    showMessage("Firebase todavía no está configurado. Sigue CONFIGURAR_FIREBASE.txt.", "error");
    if(manual) openModal();
    return false;
  }
  if(!isOwner(currentUser)){
    setState("signedOut", currentUser ? "La cuenta iniciada no coincide con el UID propietario." : "Inicia sesión con la cuenta propietaria.");
    if(manual) openModal();
    return false;
  }

  const events = getLocalEvents();
  if(!events.length){
    showMessage("No hay eventos locales para publicar. Vincula y sincroniza primero el Excel.", "error");
    if(manual) openModal();
    return false;
  }

  publishInProgress = true;
  setState("publishing", `${events.length} eventos preparados.`);
  showMessage("");

  try{
    const sourceUpdatedAt = localStorage.getItem("eventDataUpdatedAt") || new Date().toISOString();
    const metaRef = doc(db, FIREBASE_META_COLLECTION, FIREBASE_META_DOCUMENT);
    const metaSnapshot = await getDoc(metaRef);
    const meta = metaSnapshot.exists() ? metaSnapshot.data() : null;

    if(!manual && meta?.sourceUpdatedAt === sourceUpdatedAt && meta?.count === events.length){
      setState("ready", `La agenda móvil ya contiene ${events.length} eventos.`);
      return true;
    }

    const collectionRef = collection(db, FIREBASE_COLLECTION);
    const existingSnapshot = await getDocs(collectionRef);
    const existing = new Map(existingSnapshot.docs.map(snapshot => [snapshot.id, snapshot.data()]));
    const desiredIds = new Set(events.map(event => event.id));
    const operations = [];

    existingSnapshot.docs.forEach(snapshot => {
      if(!desiredIds.has(snapshot.id)) operations.push({type:"delete", ref:snapshot.ref});
    });

    events.forEach(event => {
      const previous = existing.get(event.id);
      if(previous?.contentHash === event.contentHash) return;
      operations.push({
        type:"set",
        ref:doc(collectionRef, event.id),
        data:{
          ...event,
          sourceUpdatedAt,
          publishedBy:currentUser.uid,
          updatedAt:serverTimestamp()
        }
      });
    });

    await commitOperations(operations);
    const metaBatch = writeBatch(db);
    metaBatch.set(metaRef, {
      schemaVersion:VERSION,
      count:events.length,
      sourceUpdatedAt,
      sourceFileName:localStorage.getItem("excelSync:fileName") || "",
      publishedBy:currentUser.uid,
      publishedAt:serverTimestamp()
    }, {merge:false});
    await metaBatch.commit();

    const publishedAt = new Date().toISOString();
    localStorage.setItem("firebase:lastPublishedAt", publishedAt);
    refreshLocalSummary();
    setState("ready", `${events.length} eventos disponibles en tiempo real.`);
    showMessage(`Publicación completada: ${events.length} eventos. ${operations.length} cambios enviados.`, "success");
    window.dispatchEvent(new CustomEvent("firebaseEventsPublished", {detail:{count:events.length, operations:operations.length}}));
    return true;
  }catch(error){
    console.error("Error publicando eventos:", error);
    setState("error", error?.message || "Revisa las reglas y la conexión.");
    showMessage("No fue posible publicar. Verifica Firestore, las reglas y el UID del propietario.", "error");
    if(manual) openModal();
    return false;
  }finally{
    publishInProgress = false;
  }
}

async function initialize(){
  if(initialized) return;
  initialized = true;
  ensureUi();

  if(!isFirebaseConfigured()){
    setState("offline", "Completa js/firebase-config.js y firestore.rules.");
    ui.form.hidden = true;
    ui.publish.disabled = true;
    showMessage("Integración preparada. Falta pegar la configuración del proyecto Firebase.", "info");
    return;
  }

  try{
    await loadFirebaseSdk();
    app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    await setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, user => {
      currentUser = user;
      const owner = isOwner(user);
      ui.form.hidden = Boolean(user);
      ui.session.hidden = !user;
      ui.identity.textContent = user ? `${user.email || "Cuenta Firebase"} · ${owner ? "Propietario" : "Sin permiso de publicación"}` : "—";
      ui.publish.disabled = !owner;

      if(!user){
        setState("signedOut", "Inicia sesión para publicar los cambios del Excel.");
        return;
      }
      if(!owner){
        setState("signedOut", "La cuenta iniciada no coincide con FIREBASE_OWNER_UID.");
        showMessage("Esta cuenta puede estar autenticada, pero no tiene permiso de propietario.", "error");
        return;
      }
      setState("ready", "La publicación automática está activa.");
      schedulePublish();
    });
  }catch(error){
    console.error(error);
    setState("error", error?.message || "No se pudo iniciar Firebase.");
    showMessage("No fue posible iniciar Firebase. Verifica firebase-config.js.", "error");
  }

  window.addEventListener("eventDataUpdated", () => {
    refreshLocalSummary();
    if(isOwner(currentUser)) schedulePublish();
  });
  window.addEventListener("storage", event => {
    if(["eventData", "eventDataUpdatedAt"].includes(event.key)){
      refreshLocalSummary();
      if(isOwner(currentUser)) schedulePublish();
    }
  });
}

window.FirebaseEventPublisher = {
  publish:() => publishEvents({manual:true}),
  openPanel:openModal,
  getLocalEvents
};

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once:true});
else initialize();
