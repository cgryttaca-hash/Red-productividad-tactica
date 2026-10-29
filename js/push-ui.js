import { disablePush, enablePush, inspectPush } from './push-client.js';

const status = document.getElementById('agendaPushStatus');
const summary = document.getElementById('agendaPushSummary');
const enableButton = document.getElementById('agendaEnablePush');
const disableButton = document.getElementById('agendaDisablePush');
let busy = false;

function show(value, error = false) {
  const descriptions = {
    active: 'Dispositivo registrado para alertas de alimentación, 15 minutos antes del servicio (hora de Colombia). La recepción depende de la conexión y del dispositivo.',
    inactive: 'Avisos en segundo plano desactivados. La agenda abierta puede mostrar alertas de alimentación cuando tiene datos recientes.',
    unconfigured: 'Los avisos en segundo plano necesitan la configuración del servicio de envío. El permiso de notificaciones por sí solo no los activa.',
    unregistered: 'Existe una suscripción en el navegador, pero el servicio de envío no la ha confirmado. Actívala de nuevo.',
    denied: 'El permiso está bloqueado. Cámbialo en los ajustes del sitio o de la aplicación antes de activar los avisos.',
    unsupported: 'Web Push no está disponible en este contexto. En iPhone o iPad, abre la aplicación añadida a Inicio en una versión compatible.'
  };
  status.textContent = typeof value === 'string' ? value : descriptions[value.state] || 'No fue posible comprobar los avisos.';
  summary.textContent = value.state === 'active' ? 'Avisos en segundo plano: activos' : 'Instalación y avisos';
  status.classList.toggle('push-status-error', error);
  if (typeof value !== 'string') disableButton.hidden = !value.subscribed;
  if (typeof value !== 'string') {
    window.__RPT_PUSH_STATUS__ = value;
    window.dispatchEvent(new CustomEvent('rptPushStateChanged', { detail: value }));
  }
}

async function run(operation) {
  if (busy) return;
  busy = true;
  enableButton.disabled = true;
  disableButton.disabled = true;
  try { show(await operation()); }
  catch (error) { show(error.message || 'No fue posible completar la operación. Inténtalo de nuevo.', true); }
  finally { busy = false; enableButton.disabled = false; disableButton.disabled = false; }
}

enableButton.addEventListener('click', () => run(enablePush));
disableButton.addEventListener('click', () => run(disablePush));
document.getElementById('agendaCheckPush').addEventListener('click', () => run(() => inspectPush({ synchronize: true })));
window.addEventListener('rptPwaReady', () => run(() => inspectPush({ synchronize: true })));
document.addEventListener('visibilitychange', () => { if (!document.hidden) run(() => inspectPush({ synchronize: true })); });
navigator.serviceWorker?.addEventListener('message', event => { if (event.data?.type === 'RPT_PUSH_SUBSCRIPTION_CHANGED') run(() => inspectPush({ synchronize: true })); });
run(() => inspectPush());
