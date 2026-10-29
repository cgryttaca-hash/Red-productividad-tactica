import { PUSH_CONFIG } from './push-config.js';
import { FIREBASE_CONFIG } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
let authPromise;
let enabling;
let messagingPromise;
let configurationPromise;

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
  return { secure: window.isSecureContext, notifications: 'Notification' in window, serviceWorker: 'serviceWorker' in navigator, push: 'PushManager' in window, installed: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true };
}

function apiBase() {
  if (!PUSH_CONFIG.apiBaseUrl) return '';
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
    const value = await response.json();
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
  const current = await navigator.serviceWorker.getRegistration('./');
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
  const permission = capabilities.notifications ? Notification.permission : 'unsupported';
  if (!capabilities.secure || !capabilities.serviceWorker || !capabilities.push || !capabilities.notifications) return { state: 'unsupported', permission, subscribed: false, registered: false };
  if (!apiBase()) return { state: 'unconfigured', permission, subscribed: false, registered: false };
  const worker = await registration();
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription || permission !== 'granted') return { state: permission === 'denied' ? 'denied' : 'inactive', permission, subscribed: false, registered: false };
  const body = synchronize ? await subscriptionBody(worker, await configuration()) : { endpoint: subscription.endpoint };
  const value = await request(synchronize ? '/subscriptions' : '/status', { method: 'POST', token: await token(), body });
  return { state: value.registered ? 'active' : 'unregistered', permission, subscribed: true, registered: value.registered === true };
}

export function enablePush() {
  if (enabling) return enabling;
  const capabilities = pushCapabilities();
  if (!capabilities.secure || !capabilities.serviceWorker || !capabilities.push || !capabilities.notifications) return Promise.reject(new Error('Este navegador no admite Web Push en este contexto. En iPhone o iPad, instala y abre la PWA y utiliza una versión compatible.'));
  if (!apiBase()) return Promise.reject(new Error('El servicio push aún no está configurado. Consulta las instrucciones de despliegue.'));
  const permission = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
  enabling = (async () => {
    if (await permission !== 'granted') throw new Error('El navegador no autorizó las notificaciones. Puedes cambiar el permiso en los ajustes del sitio.');
    const settings = await configuration();
    const key = applicationKey(settings.publicKey);
    const worker = await registration();
    let subscription = await worker.pushManager.getSubscription();
    if (subscription?.options?.applicationServerKey && String(new Uint8Array(subscription.options.applicationServerKey)) !== String(key)) {
      await request('/subscriptions', { method: 'DELETE', token: await token(), body: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const value = await request('/subscriptions', { method: 'POST', token: await token(), body: await subscriptionBody(worker, settings) });
    if (value.registered !== true) throw new Error('La suscripción existe en el navegador pero no quedó confirmada por el servidor.');
    return { state: 'active', permission: 'granted', subscribed: true, registered: true, transport: value.transport };
  })().finally(() => { enabling = null; });
  return enabling;
}

export async function disablePush() {
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
  return { state: 'inactive', subscribed: false, registered: false };
}
