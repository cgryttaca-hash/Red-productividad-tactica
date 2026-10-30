import { enablePush, disablePush, inspectPush, preparePush, testPush } from './push-client.js';
import { isInstalledContext } from './pwa-context.js';
import { PUSH_CONFIG } from './push-config.js';

const status = document.getElementById('agendaPushStatus');
const summary = document.getElementById('agendaPushSummary');
const enableButton = document.getElementById('agendaEnablePush');
const disableButton = document.getElementById('agendaDisablePush');
const testButton = document.getElementById('agendaTestPush');
const checkButton = document.getElementById('agendaCheckPush');
let busy = false;
let readiness;
let lastCheck = 0;

function show(value) {
  const descriptions = {
    'not-installed': 'Puedes consultar la agenda en este navegador. Para activar notificaciones, instala la aplicación y ábrela desde su icono.',
    inactive: 'Notificaciones no activadas. Si quieres recibir alertas de alimentación, pulsa Activar notificaciones.',
    configuring: 'Comprobando la configuración del servicio…',
    active: 'Avisos activos: registro confirmado y envío aceptado por el servicio. La recepción depende de la conexión y del dispositivo.',
    registered: 'Dispositivo registrado. Pulsa Comprobar estado para verificar la conexión del servicio.',
    unregistered: 'Las notificaciones necesitan volver a activarse en este dispositivo.',
    denied: 'Permiso bloqueado. Habilita Notificaciones para esta aplicación en los ajustes del navegador o del sistema y vuelve a abrirla.',
    unsupported: 'Este contexto no admite notificaciones. En iPhone/iPad usa una PWA de Inicio y una versión compatible.',
    unconfigured: 'Las notificaciones de alimentación con la aplicación cerrada requieren conectar el servicio existente. La consulta sigue disponible.',
    error: 'No fue posible comprobar los avisos. Puedes seguir consultando la agenda.'
  };
  window.__RPT_PUSH_STATUS__ = value;
  status.textContent = `${descriptions[value.state] || descriptions.error}${value.detail&&value.state!=='unconfigured' ? ` ${value.detail}` : ''}`;
  status.classList.toggle('push-status-error', value.state==='error');
  status.dataset.state = value.state;
  summary.textContent = value.state === 'active' ? 'Avisos externos activos' : value.state === 'registered' ? 'Avisos externos: comprobar envío' : 'Instalación y avisos externos opcionales';
  const installed = isInstalledContext();
  document.getElementById('agendaPushActions').hidden = !installed || value.state==='unconfigured';
  enableButton.hidden = ['active', 'registered', 'denied', 'unsupported'].includes(value.state);
  enableButton.disabled = busy || !readiness?.ready;
  disableButton.hidden = !value.subscribed;
  disableButton.disabled = busy;
  checkButton.disabled = busy;
  window.dispatchEvent(new CustomEvent('rptPushStateChanged', { detail: value }));
}

async function run(operation) {
  if (busy) return;
  busy = true;
  show({ ...(window.__RPT_PUSH_STATUS__ || {}), state: 'configuring' });
  try { show(await operation()); }
  catch (error) { show({ state: error.code === 'configuration' ? 'unconfigured' : 'error', detail: error.message, subscribed: Boolean(window.__RPT_PUSH_STATUS__?.subscribed) }); }
  finally { busy = false; show(window.__RPT_PUSH_STATUS__); }
}

async function check({ synchronize = false } = {}) {
  if (!PUSH_CONFIG.apiBaseUrl?.trim()) { readiness = null; return { state: 'unconfigured', registered: false, subscribed: false }; }
  if (!isInstalledContext()) { readiness = null; return { state: 'not-installed', registered: false, subscribed: false }; }
  readiness = await preparePush({ force: synchronize });
  if (!readiness.ready) return readiness;
  return inspectPush({ synchronize });
}

enableButton.addEventListener('click', () => run(enablePush));
disableButton.addEventListener('click', () => run(disablePush));
checkButton.addEventListener('click', () => run(async () => { const value=await check({ synchronize: true }); return value.state==='registered'?testPush():value; }));
function resume() { if (!document.hidden && Date.now() - lastCheck > 60000) { lastCheck = Date.now(); run(() => check({ synchronize: true })); } }
window.addEventListener('rptPwaReady', resume);
window.addEventListener('rptPwaStateChanged', () => { if (!isInstalledContext()) show({ state: 'not-installed' }); else { lastCheck = 0; resume(); } });
document.addEventListener('visibilitychange', resume);
navigator.serviceWorker?.addEventListener('message', event => { if (event.data?.type === 'RPT_PUSH_SUBSCRIPTION_CHANGED' && isInstalledContext()) run(() => check({ synchronize: true })); });
lastCheck = Date.now();
run(() => check());
