import { PUSH_CONFIG } from './push-config.js';
import { FIREBASE_CONFIG } from './firebase-config.js';
import { isInstalledContext } from './pwa-context.js';
import { setNotificationSettings } from './notifications.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
let authPromise;
let enabling;
let messagingPromise;
let configurationPromise;
let prepared;

function configurationError(message) { return Object.assign(new Error(message), { code: 'configuration' }); }

export async function preparePush({ force = false } = {}) {
  if (!isInstalledContext()) return { state: 'not-installed', ready: false, registered: false, subscribed: false };
  const capabilities = pushCapabilities();
  if (!capabilities.secure || !capabilities.serviceWorker || !capabilities.push || !capabilities.notifications) return { state: 'unsupported', ready: false, registered: false };
  if (force) { configurationPromise = null; prepared = null; }
  try {
    if (!apiBase()) return { state: 'unconfigured', ready: false, detail: 'Falta definir la URL del backend en PUSH_CONFIG.apiBaseUrl.' };
    const settings = await configuration();
    applicationKey(settings.publicKey);
    if (settings.projectId && settings.projectId !== FIREBASE_CONFIG.projectId) throw configurationError('El servicio corresponde a otro proyecto Firebase.');
    prepared = settings;
    return { state: 'inactive', ready: true };
  } catch (error) {
    prepared = null;
    return { state: 'unconfigured', ready: false, detail: error.message || 'No se pudo validar la configuración del servidor.' };
  }
}

async function configuration() {
  if (!configurationPromise) configurationPromise = request('/config').catch(error => { configurationPromise = null; throw error; });
  return configurationPromise;
}

async function messagingContext() {
  if (!messagingPromise) messagingPromise = (async () => {
    const [appModule, messagingModule] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-messaging.js`)]);
    if (!await messagingModule.isSupported()) return null;
    const app = appModule.getApps().length ? appModule.getApps()[0] : appModule.initializeApp(FIREBASE_CONFIG);
    return { messaging: messagingModule.getMessaging(app), messagingModule };
  })().catch(error => { messagingPromise = null; throw error; });
  return messagingPromise;
}

async function subscriptionBody(worker, settings) {
  if (!isInstalledContext() || Notification.permission !== 'granted') throw new Error('Las notificaciones solo se registran desde la aplicación instalada y autorizada.');
  let fcmToken = '';
  if (settings.fcmEnabled) {
    const context = await messagingContext();
    if (context) fcmToken = await context.messagingModule.getToken(context.messaging, { vapidKey: settings.publicKey, serviceWorkerRegistration: worker });
  }
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription) throw new Error('El navegador no confirmó una suscripción push.');
  return { subscription: subscription.toJSON(), scope: worker.scope, transport: fcmToken ? 'fcm' : 'webpush', ...(fcmToken ? { fcmToken } : {}) };
}

export function pushCapabilities() {
  return { secure: window.isSecureContext, notifications: 'Notification' in window, serviceWorker: 'serviceWorker' in navigator, push: 'PushManager' in window, installed: isInstalledContext() };
}

function apiBase() {
  if (!String(PUSH_CONFIG.apiBaseUrl || '').trim()) return '';
  const url = new URL(PUSH_CONFIG.apiBaseUrl, location.href);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('El servicio push requiere HTTPS.');
  return url.href.replace(/\/$/, '');
}

async function request(path, { token, body, method = 'GET' } = {}) {
  const base = apiBase();
  if (!base) throw new Error('Los avisos push requieren configurar el servicio de envío. Los avisos locales siguen disponibles.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base}${path}`, { method, signal: controller.signal, cache: 'no-store', credentials: 'omit', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    let value;
    try { value = await response.json(); } catch (_) { throw configurationError('La URL configurada no devuelve la API de avisos. Comprueba el despliegue del backend.'); }
    if (!response.ok) throw new Error(value.error || 'No fue posible registrar los avisos en el servidor.');
    return value;
  } finally { clearTimeout(timer); }
}

async function token() {
  if (!authPromise) authPromise = (async () => {
    const [appModule, authModule] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`)]);
    const app = appModule.getApps().length ? appModule.getApps()[0] : appModule.initializeApp(FIREBASE_CONFIG);
    const auth = authModule.getAuth(app);
    try { await authModule.setPersistence(auth, authModule.browserLocalPersistence); } catch (_) { }
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    if (!auth.currentUser) await authModule.signInAnonymously(auth);
    return { auth, authModule };
  })().catch(error => { authPromise = null; throw error; });
  const { auth, authModule } = await authPromise;
  if (!auth.currentUser) await authModule.signInAnonymously(auth);
  return auth.currentUser.getIdToken();
}

async function registration() {
  let current = await navigator.serviceWorker.getRegistration('./');
  if (!current?.active && navigator.serviceWorker.ready) {
    let timeout;
    try { current = await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('La aplicación está preparando su instalación. Vuelve a comprobar en unos segundos.')), 8000); })]); }
    finally { clearTimeout(timeout); }
  }
  if (!current?.active) throw new Error('La aplicación todavía no está lista. Espera unos segundos y vuelve a intentarlo.');
  return current;
}

function applicationKey(value) {
  const encoded = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  let bytes;
  try { bytes = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), character => character.charCodeAt(0)); } catch (_) { throw new Error('La clave pública del servicio push no es válida.'); }
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('La clave pública del servicio push no es válida.');
  return bytes;
}

export async function inspectPush({ synchronize = false } = {}) {
  const capabilities = pushCapabilities();
  if (!capabilities.installed) return { state: 'not-installed', registered: false, subscribed: false };
  const permission = capabilities.notifications ? Notification.permission : 'unsupported';
  if (!capabilities.secure || !capabilities.serviceWorker || !capabilities.push || !capabilities.notifications) return { state: 'unsupported', permission, subscribed: false, registered: false };
  if (permission !== 'granted') return { state: permission === 'denied' ? 'denied' : 'inactive', permission, subscribed: false, registered: false };
  if (!prepared) { const ready = await preparePush(); if (!ready.ready) return ready; }
  const worker = await registration();
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription || permission !== 'granted') return { state: permission === 'denied' ? 'denied' : 'inactive', permission, subscribed: false, registered: false };
  let value = await request('/status', { method: 'POST', token: await token(), body: { endpoint: subscription.endpoint } });
  if (synchronize && value.registered) {
    const body = await subscriptionBody(worker, prepared);
    value = await request('/subscriptions', { method: 'POST', token: await token(), body });
    if (body.subscription.endpoint !== subscription.endpoint) await request('/subscriptions', { method: 'DELETE', token: await token(), body: { endpoint: subscription.endpoint } });
  }
  return { state: value.registered ? value.sendVerified ? 'active' : 'registered' : 'unregistered', permission, subscribed: true, registered: value.registered === true };
}

export function enablePush() {
  if (enabling) return enabling;
  const capabilities = pushCapabilities();
  if (!capabilities.installed) return Promise.reject(new Error('Abre la aplicación instalada desde su icono antes de activar notificaciones.'));
  if (!capabilities.secure || !capabilities.serviceWorker || !capabilities.push || !capabilities.notifications) return Promise.reject(new Error('Este navegador no admite Web Push en este contexto. En iPhone o iPad, instala y abre la PWA y utiliza una versión compatible.'));
  if (!prepared) return Promise.reject(configurationError('El administrador debe completar y validar la configuración del servicio de avisos.'));
  if (navigator.userActivation?.isActive === false) return Promise.reject(new Error('Pulsa Activar notificaciones para autorizar los avisos.'));
  const permission = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
  enabling = (async () => {
    if (await permission !== 'granted') throw new Error('El navegador no autorizó las notificaciones. Puedes cambiar el permiso en los ajustes del sitio.');
    const settings = prepared;
    const key = applicationKey(settings.publicKey);
    const worker = await registration();
    let subscription = await worker.pushManager.getSubscription();
    if (subscription?.options?.applicationServerKey && String(new Uint8Array(subscription.options.applicationServerKey)) !== String(key)) {
      await request('/subscriptions', { method: 'DELETE', token: await token(), body: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const body = await subscriptionBody(worker, settings);
    const value = await request('/subscriptions', { method: 'POST', token: await token(), body });
    if (value.registered !== true) throw new Error('La suscripción existe en el navegador pero no quedó confirmada por el servidor.');
    setNotificationSettings({ enabled: true, mobile: true });
    if (value.sendVerified) return { state: 'active', permission: 'granted', subscribed: true, registered: true, transport: value.transport };
    try { return await testPush(); }
    catch (error) { return { state: 'registered', subscribed: true, registered: true, detail: `El envío aún no está verificado. ${error.message}` }; }
  })().finally(() => { enabling = null; });
  return enabling;
}

export async function disablePush() {
  if (!isInstalledContext()) return { state: 'not-installed', subscribed: false, registered: false };
  const worker = await registration();
  const subscription = await worker.pushManager.getSubscription();
  if (subscription) {
    await request('/subscriptions', { method: 'DELETE', token: await token(), body: { endpoint: subscription.endpoint } });
    const settings = await configuration();
    if (settings.fcmEnabled) {
      const context = await messagingContext();
      if (context) await context.messagingModule.deleteToken(context.messaging);
    }
    if (await worker.pushManager.getSubscription() && !await subscription.unsubscribe()) throw new Error('El navegador no confirmó la desactivación. Comprueba el permiso del sitio.');
  }
  setNotificationSettings({ enabled: false });
  return { state: 'inactive', subscribed: false, registered: false };
}

export async function testPush() {
  if (!isInstalledContext() || !('Notification' in window) || Notification.permission !== 'granted') throw new Error('Abre la aplicación instalada y autoriza las notificaciones antes de probar el envío.');
  const worker = await registration();
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription) return { state: 'inactive', registered: false, subscribed: false };
  const result = await request('/test', { method: 'POST', token: await token(), body: { endpoint: subscription.endpoint } });
  if (result.accepted !== true) throw new Error('El proveedor no confirmó el envío de prueba.');
  return { state: 'active', registered: true, subscribed: true, detail: 'Prueba aceptada por el proveedor; comprueba su llegada en este dispositivo.' };
}
