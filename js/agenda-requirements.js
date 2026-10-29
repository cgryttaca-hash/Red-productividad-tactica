import { isInstalledContext, isAppleMobile } from './pwa-context.js';

function updateInstallation() {
  const installed = isInstalledContext();
  const apple = isAppleMobile();
  document.documentElement.classList.toggle('is-apple-mobile', apple);
  document.body.classList.remove('agenda-requirements-pending');
  document.getElementById('agendaRequirementsGate').hidden = installed;
  document.getElementById('agendaInstallText').textContent = apple
    ? 'En Safari: Compartir → Añadir a pantalla de inicio. Después abre Agenda desde su icono.'
    : 'Puedes consultar aquí o instalar la agenda desde el menú del navegador para tenerla siempre a mano.';
  if (window.__RPT_PWA_STATE__?.justInstalled && !installed) document.getElementById('agendaInstallText').textContent = 'Instalación completada. Abre Agenda desde su icono para activar las notificaciones.';
  window.dispatchEvent(new CustomEvent('rptAgendaRequirementsReady', { detail: { installed } }));
}

window.addEventListener('rptPwaStateChanged', updateInstallation);
window.addEventListener('focus', updateInstallation, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateInstallation(); });
updateInstallation();
