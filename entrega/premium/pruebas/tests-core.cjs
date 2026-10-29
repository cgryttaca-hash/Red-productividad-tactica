const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const root = process.env.ACTUAL_PROJECT_PATH || path.join(__dirname, 'app');
const evidence = process.env.TEST_OUTPUT_PATH || path.join(__dirname, 'evidence');
fs.mkdirSync(evidence, { recursive: true });
const passed = [];
const check = name => { passed.push(name); process.stdout.write(`PASS ${name}\n`); };

async function main() {
  const { buildAgenda, eventIdentity, resolveEvent } = await import(pathToFileURL(path.join(root, 'js/agenda-content.js')));
  const event = { __EVENT_ID: 'only-real-id', HOJA_ORIGEN: 'OCTUBRE', __FILA_ORIGEN: 7, FECHA: '2026-10-28T05:00:00.000Z', 'NOMBRE DE LA EMPRESA': '<script>alert(1)</script> & Empresa', 'ESCENARIO ASIGNADO': 'Salón 1', 'CANTIDAD DE PERSONAS': 0, 'HORARIO DEL EVENTO': '08:00 AM - 12:00 PM', 'HORARIO AYB': '09:30 AM', 'DESCRIPCION ALIMENTACION': 'Café\nRefrigerio', OBSERVACION: 'Montar primero\nRevisar sonido', ESTADO: 'Confirmado', contraseña: 'NUNCA-COMPARTIR' };
  const before = JSON.stringify(event);
  const agenda = buildAgenda(event);
  assert.equal(JSON.stringify(event), before);
  assert(agenda.text.includes('28/10/2026'));
  assert(agenda.text.includes('Cantidad de asistentes: 0'));
  assert(agenda.text.includes('Hora de inicio: 08:00 AM'));
  assert(agenda.text.includes('Hora de finalización: 12:00 PM'));
  assert(agenda.text.includes('Café\n  Refrigerio'));
  assert(!agenda.text.includes('only-real-id') && !agenda.text.includes('NUNCA-COMPARTIR') && !agenda.text.includes('__FILA'));
  assert(!agenda.html.includes('<script>'));
  assert(agenda.html.includes('&lt;script&gt;'));
  check('Generación sin mutaciones, fechas estables, cero asistentes, horarios exactos, multilínea y exclusión de datos internos');
  assert(buildAgenda({}).text.includes('Pendiente de confirmar'));
  assert(!buildAgenda({}).text.includes('ALIMENTACIÓN Y SERVICIOS'));
  assert(!buildAgenda({ 'HORARIO DEL EVENTO': 'En la mañana' }).text.includes('Hora de inicio'));
  check('Campos ausentes y horarios ambiguos sin datos inventados ni secciones opcionales vacías');
  assert.equal(resolveEvent([event], eventIdentity(event)), event);
  assert.throws(() => resolveEvent([], eventIdentity(event)), /cambió/);
  assert.throws(() => resolveEvent([event, { ...event }], eventIdentity(event)), /idénticos/);
  const sourceFree = { FECHA: '2026-10-28', 'NOMBRE DE LA EMPRESA': 'Sin metadatos' };
  assert.equal(eventIdentity(sourceFree), eventIdentity({ ...sourceFree, FECHA: new Date(2026, 9, 28) }));
  check('Selección única por identificador; rechazo de registros borrados o ambiguos y compatibilidad con fechas del render original');

  const service = require(path.join(root,'functions/push-service.js'));
  const webPush = require(require.resolve('web-push',{paths:[path.join(root,'functions'),path.join(__dirname,'../actual/functions')]}));
  const vapid = webPush.generateVAPIDKeys();
  const receiver = crypto.createECDH('prime256v1');
  receiver.generateKeys();
  const subscription = { endpoint: 'https://web.push.apple.com/test-subscription', keys: { p256dh: receiver.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
  assert.deepEqual(service.validateSubscription(subscription), subscription);
  for (const endpoint of ['http://127.0.0.1/secret', 'https://169.254.169.254/latest', 'https://push.apple.com.evil.test/send', 'https://user:pass@fcm.googleapis.com/x']) assert.throws(() => service.validateEndpoint(endpoint));
  assert.throws(() => service.validateSubscription({ ...subscription, keys: { auth: 'bad', p256dh: 'bad' } }));
  assert.throws(() => service.agendaUrl('https://otro.example/app/', 'https://empresa.example'));
  check('Validación push: proveedores HTTPS, claves y ámbito; rechazo de destinos internos, falsos proveedores y orígenes ajenos');
  const requestDetails = webPush.generateRequestDetails(subscription, JSON.stringify({ title: 'Prueba cifrada' }), { vapidDetails: { subject: 'mailto:pruebas@example.com', publicKey: vapid.publicKey, privateKey: vapid.privateKey } });
  assert(requestDetails.body.length > 0);
  assert.equal(requestDetails.headers['Content-Encoding'], 'aes128gcm');
  assert(requestDetails.headers.Authorization.startsWith('vapid '));
  check('Construcción real del mensaje Web Push: cifrado aes128gcm y autenticación VAPID, sin enviar a una red externa');
  const stored = new Map();
  const store = {
    async get(id) { return stored.get(id); },
    async save(id, value) { if (stored.has(id) && stored.get(id).uid !== value.uid) throw service.failure('Otra sesión', 409); stored.set(id, { ...stored.get(id), ...value }); },
    async remove(id, uid) { if (stored.has(id) && stored.get(id).uid !== uid) throw service.failure('Otra sesión', 403); stored.delete(id); }
  };
  const handler = service.createHandler({ store, verifyToken: async token => { if (token === 'bad') throw Error('bad'); return { uid: token }; }, getConfig: () => ({ publicKey: vapid.publicKey, origins: ['https://empresa.example'] }) });
  async function call(method, route, body, token = 'user-1', origin = 'https://empresa.example') {
    const response = { code: 200, headers: {}, set(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(value) { this.value = value; }, send(value) { this.value = value; } };
    await handler({ method, path: route, body, get: key => ({ Origin: origin, Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' })[key] }, response);
    return response;
  }
  assert.equal((await call('OPTIONS', '/subscriptions')).code, 204);
  assert.equal((await call('GET', '/config', null)).value.publicKey, vapid.publicKey);
  assert.equal((await call('GET', '/config', null)).value.fcmEnabled, true);
  assert.equal((await call('GET', '/config', null)).value.timeZone, 'America/Bogota');
  assert.equal((await call('POST', '/subscriptions', { subscription, scope: 'https://empresa.example/', transport: 'fcm', fcmToken: 'invalid token' })).code, 400);
  const fcmToken='valid-fcm-token-from-controlled-sdk-0123456789';
  assert.equal((await call('POST', '/subscriptions', { subscription, scope: 'https://empresa.example/', transport: 'fcm', fcmToken })).value.transport, 'fcm');
  assert.equal([...stored.values()][0].fcmToken, fcmToken);
  assert.equal((await call('POST', '/subscriptions', { subscription, scope: 'https://empresa.example/sistema/' })).value.registered, true);
  assert.equal((await call('POST', '/subscriptions', { subscription, scope: 'https://empresa.example/sistema/' })).value.registered, true);
  assert.equal(stored.size, 1);
  assert.equal((await call('POST', '/status', { endpoint: subscription.endpoint })).value.registered, true);
  assert.equal((await call('POST', '/status', { endpoint: subscription.endpoint }, 'user-2')).value.registered, false);
  assert.equal((await call('DELETE', '/subscriptions', { endpoint: subscription.endpoint }, 'user-2')).code, 403);
  assert.equal((await call('POST', '/subscriptions', { subscription, scope: 'https://empresa.example/' }, 'bad')).code, 401);
  assert.equal((await call('GET', '/config', null, '', 'https://evil.test')).code, 403);
  assert.equal((await call('DELETE', '/subscriptions', { endpoint: subscription.endpoint })).value.registered, false);
  assert.equal(stored.size, 0);
  check('API autenticada: alta idempotente, estado, baja, permisos por sesión y CORS; sin duplicar suscripciones');
  const delivered = [];
  const expired = [];
  const deliveryStore = { async *batches() { yield [{ id: 'new', subscription, agendaUrl: 'https://empresa.example/agenda_movil.html' }, { id: 'seen', lastPublicationHash: 'hash-new', subscription }, { id: 'expired', subscription: { ...subscription, gone: true } }]; }, delivered: async id => delivered.push(id), expire: async id => expired.push(id) };
  const result = await service.sendPublication({ publication: { dataHash: 'hash-new', count: 3 }, previous: { dataHash: 'hash-old' }, current: { dataHash: 'hash-new' }, store: deliveryStore, send: async target => { if (target.gone) throw { statusCode: 410 }; } });
  assert.equal(result.sent, 1);
  assert.deepEqual(delivered, ['new']);
  assert.deepEqual(expired, ['expired']);
  assert.equal((await service.sendPublication({ publication: { dataHash: 'old' }, current: { dataHash: 'new' }, store: deliveryStore })).skipped, true);
  check('Envío por publicación: omite versiones antiguas y entregadas, y elimina suscripciones expiradas 410');
  const exports = require(path.join(root,'functions/index.js'));
  assert.equal(typeof exports.agendaPush, 'function');
  assert.equal(typeof exports.notifyAgendaPublication, 'function');
  assert.equal(typeof exports.dispatchFoodAlert, 'function');
  assert.equal(typeof exports.reconcileFoodAlerts, 'function');
  check('Backend Firebase cargado con dependencias reales y cuatro funciones exportadas');

  const listeners = {};
  const notifications = [];
  const environment = { URL, Request, Response, location: { origin: 'https://empresa.example' }, clients: { matchAll: async () => [], openWindow: async value => value }, self: { registration: { scope: 'https://empresa.example/app/', active: true, showNotification: async (title, payload) => notifications.push({ title, payload }) }, addEventListener: (type, listener) => { listeners[type] = listener; }, clients: { claim: async () => {}, matchAll: async () => [] }, skipWaiting: () => {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), environment);
  let pending;
  listeners.push({ data: { json: () => ({ title: 'Agenda actualizada', url: 'https://evil.test/' }) }, waitUntil: value => { pending = value; } });
  await pending;
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].payload.data.url, 'https://empresa.example/app/agenda_movil.html');
  listeners.push({ data: { json: () => ({ data: { title: 'Aviso FCM', body: 'Actualización técnica', url: './agenda_movil.html' } }) }, waitUntil: value => { pending = value; } });
  await pending;
  assert.equal(notifications[1].title, 'Aviso FCM');
  check('Handlers push estándar y FCM: solicitud de visualización y navegación limitada al ámbito de la aplicación');
  for (const filename of ['agenda.webmanifest', 'manifest.webmanifest']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.id, manifest.start_url);
    for (const icon of manifest.icons) {
      const bytes = fs.readFileSync(path.join(root, icon.src));
      const size = icon.sizes.split('x').map(Number);
      assert.equal(bytes.readUInt32BE(16), size[0]);
      assert.equal(bytes.readUInt32BE(20), size[1]);
    }
  }
  check('Manifiestos instalables con identidades estables e iconos PNG de dimensiones correctas');
  const cachedKey = fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/const CACHE='([^']+)'/)[1];
  let waitingCalls = 0;
  let networkCalls = 0;
  let precached = [];
  const removedCaches = [];
  const workerScope = 'https://empresa.example/app/';
  environment.Request = class extends Request { constructor(input, options) { super(new URL(input, workerScope), options); } };
  environment.self.skipWaiting = () => { waitingCalls++; };
  const cache = {
    async addAll(requests) {
      precached = requests.map(request => request.url);
      for (const url of precached) assert(fs.existsSync(path.join(root, new URL(url).pathname.slice(5) || 'index.html')));
    },
    async match() { return new Response('cached-resource'); },
    async put() {}
  };
  environment.caches = { open: async () => cache, keys: async () => [cachedKey, 'rpt-shell-old', 'unrelated-cache'], delete: async name => removedCaches.push(name) };
  environment.fetch = async () => { networkCalls++; return new Response('fresh-public-data'); };
  listeners.install({ waitUntil: value => { pending = value; } });
  await pending;
  assert(precached.some(url => url.endsWith('/agendas.html')));
  assert.equal(waitingCalls, 0);
  environment.self.registration.active = null;
  listeners.install({ waitUntil: value => { pending = value; } });
  await pending;
  assert.equal(waitingCalls, 1);
  listeners.activate({ waitUntil: value => { pending = value; } });
  await pending;
  assert.deepEqual(removedCaches, ['rpt-shell-old']);
  check('Worker: precarga completa de rutas existentes, primera activación y actualización en espera; limpieza limitada a sus cachés');
  listeners.fetch({ request: { method: 'GET', url: workerScope + 'js/agenda-movil.js?v=previous', mode: 'cors', headers: new Headers() }, respondWith: value => { pending = value; } });
  assert.equal(await (await pending).text(), 'cached-resource');
  assert.equal(networkCalls, 0);
  listeners.fetch({ request: { method: 'GET', url: workerScope + 'data/eventos_publicos.json', mode: 'cors', headers: new Headers() }, respondWith: value => { pending = value; } });
  assert.equal(await (await pending).text(), 'fresh-public-data');
  assert.equal(networkCalls, 1);
  listeners.message({ data: { type: 'SKIP_WAITING' } });
  assert.equal(waitingCalls, 2);
  check('Worker: versiones de recursos coherentes, datos públicos actualizados desde red y aceptación explícita de actualización');
  fs.writeFileSync(path.join(evidence, 'pruebas-core.json'), JSON.stringify({ passed, note: 'La API usa almacén y tokens controlados en estas pruebas. Se comprueba cifrado real, sin envío a APNs/FCM ni credenciales productivas.' }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
