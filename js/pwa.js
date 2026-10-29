import { isInstalledContext, isAppleMobile } from './pwa-context.js';

if (!window.__RPT_PWA_STARTED__) {
  window.__RPT_PWA_STARTED__ = true;
  let deferredPrompt;
  let reloadRequested = false;
  let justInstalled = false;
  let lastCheck = 0;
  function installationState() {
    const installed = isInstalledContext();
    const previous = window.__RPT_PWA_STATE__;
    window.__RPT_PWA_STATE__ = { installed, justInstalled, canPrompt: Boolean(deferredPrompt && !installed && !isAppleMobile()) };
    document.querySelectorAll('[data-install-app]').forEach(button => { button.hidden = !window.__RPT_PWA_STATE__.canPrompt; });
    if (JSON.stringify(previous) !== JSON.stringify(window.__RPT_PWA_STATE__)) window.dispatchEvent(new CustomEvent('rptPwaStateChanged', { detail: window.__RPT_PWA_STATE__ }));
  }
  function offerUpdate(registration) {
    if (!registration.waiting || document.getElementById('pwaUpdateNotice')) return;
    const notice = document.createElement('div');
    notice.id = 'pwaUpdateNotice'; notice.setAttribute('role', 'status');
    const description = document.createElement('span');
    description.textContent = 'Nueva versión disponible. Guarda tu trabajo antes de actualizar.';
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Actualizar';
    button.addEventListener('click', () => { reloadRequested = true; registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); });
    notice.append(description, button); document.body.append(notice);
  }
  async function register() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      offerUpdate(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offerUpdate(registration); });
      });
      window.dispatchEvent(new CustomEvent('rptPwaReady', { detail: { registration } }));
      return registration;
    } catch (error) {
      console.warn('No se pudo preparar la instalación:', error);
      window.dispatchEvent(new CustomEvent('rptPwaError', { detail: { message: 'No se pudo preparar la instalación. Comprueba HTTPS y la conexión.' } }));
      return null;
    }
  }
  window.__RPT_PWA_REGISTRATION__ = register();
  navigator.serviceWorker?.addEventListener('controllerchange', () => { if (reloadRequested) location.reload(); });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; installationState(); });
  window.addEventListener('appinstalled', () => { justInstalled = true; deferredPrompt = null; installationState(); });
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', installationState);
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-install-app]');
    if (!button || !deferredPrompt || isInstalledContext()) return;
    const prompt = deferredPrompt; deferredPrompt = null; installationState();
    try { await prompt.prompt(); await prompt.userChoice; } catch (error) { console.warn('Instalación:', error); }
    installationState();
  });
  async function checkUpdate() {
    if (document.hidden || !navigator.onLine || Date.now() - lastCheck < 60000) return;
    lastCheck = Date.now();
    const registration = await window.__RPT_PWA_REGISTRATION__;
    if (registration) { await registration.update().catch(() => {}); offerUpdate(registration); }
  }
  function networkState() { document.documentElement.classList.toggle('is-offline', !navigator.onLine); window.dispatchEvent(new CustomEvent('rptNetworkChanged', { detail: { online: navigator.onLine } })); }
  window.addEventListener('online', () => { networkState(); checkUpdate(); });
  window.addEventListener('offline', networkState);
  window.addEventListener('focus', () => { installationState(); checkUpdate(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { installationState(); checkUpdate(); } });
  networkState(); installationState();
}
