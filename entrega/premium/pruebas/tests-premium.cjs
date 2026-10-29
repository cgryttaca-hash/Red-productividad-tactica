const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require(process.env.SHARP_PATH || 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
process.env.ORIGINAL_PROJECT_PATH ||= path.join(__dirname, '../premium-base/Red-productividad-tactica-main');
process.env.ACTUAL_PROJECT_PATH ||= path.join(__dirname, 'app');
process.env.TEST_OUTPUT_PATH ||= path.join(__dirname, 'evidence');
process.env.TEST_VENDOR_PATH ||= 'C:/Users/user/Documents/Codex/2026-10-27/referenced-chatgpt-conversation-this-is-an/work/vendor';
const helpers = require('./verify-helpers.cjs');
const passed = [];
const check = name => { passed.push(name); process.stdout.write(`PASS ${name}\n`); };
const root = process.env.ACTUAL_PROJECT_PATH;

async function assets() {
  const brand = path.join(root, 'assets/agenda-brand');
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-192.png', 192], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180], ['icon-96.png', 96]]) {
    const metadata = await sharp(path.join(brand, file)).metadata();
    assert.equal(metadata.width, size); assert.equal(metadata.height, size);
  }
  const ico = fs.readFileSync(path.join(brand, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(2), 1); assert.equal(ico.readUInt16LE(4), 4);
  const pixels = await sharp(path.join(brand, 'icon-maskable-512.png')).removeAlpha().raw().toBuffer();
  const background = [...pixels.subarray(0, 3)];
  let maxRadius = 0;
  for (let row = 0; row < 512; row++) for (let column = 0; column < 512; column++) {
    const offset = (row * 512 + column) * 3;
    if (Math.max(...background.map((color, channel) => Math.abs(color - pixels[offset + channel]))) > 12) maxRadius = Math.max(maxRadius, Math.hypot(column - 256, row - 256));
  }
  assert(maxRadius < 204.8, `Maskable symbol outside safe circle: ${maxRadius}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'agenda.webmanifest')));
  assert.equal(manifest.name, JSON.parse(fs.readFileSync(path.join(process.env.ORIGINAL_PROJECT_PATH, 'agenda.webmanifest'))).name);
  for (const icon of manifest.icons) assert(fs.existsSync(path.join(root, icon.src)));
  assert.equal(manifest.start_url, './agenda_movil.html'); assert.equal(manifest.scope, './');
  for (const file of ['minuta.html', 'js/minuta.js', 'css/minuta.css', 'eventos.html', 'js/eventos.js', 'css/eventos.css', 'js/excel-sync.js', 'js/firebase-sync.js', 'js/data-core.js', 'js/agenda-content.js', 'js/agendas.js', 'css/agendas.css', 'firestore.rules']) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), fs.readFileSync(path.join(process.env.ORIGINAL_PROJECT_PATH, file), 'utf8'), file);
  const reminder = fs.readFileSync(path.join(root, 'js/agenda-reminders.js'), 'utf8');
  assert(!/eventEnd|tomorrowEvents|Evento finalizado|Agenda del día siguiente/.test(reminder));
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const assets = JSON.parse(worker.match(/const ASSETS=(\[[\s\S]*?\]);/)[1]);
  for (const asset of assets) assert(asset === './' || fs.existsSync(path.join(root, asset)), asset);
  assert.equal(fs.readdirSync(brand).length,19);
  check('19 recursos de identidad reales; dimensiones e ICO válidos; símbolo maskable en círculo seguro; manifiesto y caché coherentes; 14 archivos operativos protegidos idénticos');
}

async function performance(baseUrl) {
  const baseline=await helpers.contextFor('original',{installed:true});
  const baselinePage=await baseline.newPage();
  await helpers.goto(baselinePage,'original','agenda_movil.html');
  const baselineReads=await baselinePage.evaluate(()=>window.__testReads);
  await baseline.close();
  const context = await helpers.contextFor('actual', { installed: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await helpers.goto(page, 'actual', 'agenda_movil.html');
  await page.waitForFunction(() => window.__RPT_AGENDA_EVENTS__?.length === 5);
  const first = await page.evaluate(() => ({ reads: window.__testReads, listeners: window.__testListeners }));
  assert.equal(first.reads['eventos_meta/publicacion'] || 0, 0);
  assert.equal(first.reads['eventos_meta/agenda_chunk_0000'], 1);
  assert.equal(first.listeners['eventos_meta/publicacion'], 1);
  fs.writeFileSync(path.join(process.env.TEST_OUTPUT_PATH,'medicion-lecturas.json'),JSON.stringify({baseline:baselineReads,premium:first.reads,scope:'Carga inicial con cinco eventos, un bloque y Firebase controlado'},null,2));
  const unchanged = await page.evaluate(async () => {
    const firstCard = document.querySelector('.date-group');
    document.querySelector('#mobileRefresh').click();
    await new Promise(resolve => setTimeout(resolve, 200));
    return { sameNode: firstCard === document.querySelector('.date-group'), reads: window.__testReads };
  });
  assert(unchanged.sameNode);
  assert.equal(unchanged.reads['eventos_meta/agenda_chunk_0000'], 1);
  const changed = await page.evaluate(async () => {
    const firestore = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
    const rows = window.__testEvents.map((row, index) => index ? row : { ...row, 'NOMBRE DE LA EMPRESA': 'Empresa actualizada' });
    await firestore.setDoc(firestore.doc({}, 'eventos_meta', 'agenda_chunk_0000'), { dataHash: 'fixture-v2', chunkHash: 'block-1', events: rows });
    await firestore.setDoc(firestore.doc({}, 'eventos_meta', 'publicacion'), { dataHash: 'fixture-v2', count: rows.length, chunkCount: 1, chunkHashes: ['block-1'], clientPublishedAt: '2026-10-27T15:00:00Z' });
    await new Promise(resolve => setTimeout(resolve, 200));
    await firestore.setDoc(firestore.doc({}, 'eventos_meta', 'publicacion'), { dataHash: 'fixture-v3', count: rows.length, chunkCount: 1, chunkHashes: ['block-1'], clientPublishedAt: '2026-10-27T15:00:00Z' });
    await new Promise(resolve => setTimeout(resolve, 200));
    return { updated: window.__RPT_AGENDA_EVENTS__[0].empresa, reads: window.__testReads };
  });
  assert.equal(changed.updated, 'Empresa actualizada');
  assert.equal(changed.reads['eventos_meta/agenda_chunk_0000'], 2);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  assert((await page.locator('#mobileConnectionText').textContent()).includes('guardada'));
  assert.equal(await page.evaluate(() => window.__RPT_AGENDA_FRESHNESS__.live), false);
  await page.locator('[data-view="all"]').click();
  await page.locator('#mobileSearch').fill('');
  await page.locator('.agenda-push-panel').evaluate(element => { element.open = false; });
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${width}`);
    if (width === 390 || width === 1440) await page.screenshot({ path: path.join(process.env.TEST_OUTPUT_PATH, `agenda-premium-${width}.png`), fullPage: true });
  }
  await page.locator('.event-summary-row').first().click();
  await page.screenshot({ path: path.join(process.env.TEST_OUTPUT_PATH, 'agenda-premium-detalle.png'), fullPage: true });
  await context.close();
  check('Carga inicial: una lectura de bloques y un listener, sin consulta meta duplicada; refresco sin reconstruir tarjetas; reutilización de bloques idénticos y copia guardada identificada');
}

async function localFood(baseUrl){
  const context=await helpers.contextFor('actual',{installed:true});
  const page=await context.newPage();
  await helpers.goto(page,'actual','agenda_movil.html');
  const result=await page.evaluate(async()=>{
    const {localTimeToEpoch}=await import('./js/food-alerts-core.js');
    const alertAt=localTimeToEpoch('2026-10-28',12,0)-900000;
    Date.now=()=>alertAt;
    const requests=[];
    const worker={active:{postMessage:value=>requests.push(value)}};
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{getRegistration:async()=>worker}});
    const food={id:'fallback-real',empresa:'Empresa real',fechaISO:'2026-10-28',horarioAyB:'12:00 PM',descripcionAlimentacion:'Almuerzo real',estado:'Confirmado'};
    window.__RPT_AGENDA_ALERT_EVENTS__=[food];
    window.__RPT_AGENDA_FRESHNESS__={live:true,checkedAt:alertAt};
    window.__RPT_PUSH_STATUS__={state:'active'};
    const check=async()=>{window.dispatchEvent(new CustomEvent('rptAgendaDataReady'));await new Promise(resolve=>setTimeout(resolve,30));};
    await check();const active=requests.length;
    window.__RPT_PUSH_STATUS__={state:'unconfigured'};
    await check();await check();const local=requests.length;
    window.__RPT_AGENDA_ALERT_EVENTS__=[{...food,id:'cancelled',estado:'Cancelado'},{...food,id:'missing-company',empresa:''}];await check();
    Date.now=()=>alertAt+45001;window.__RPT_AGENDA_FRESHNESS__.checkedAt=alertAt+45001;
    window.__RPT_AGENDA_ALERT_EVENTS__=[{...food,id:'late'}];await check();
    Date.now=()=>alertAt;window.__RPT_AGENDA_FRESHNESS__={live:false,checkedAt:alertAt};
    window.__RPT_AGENDA_ALERT_EVENTS__=[{...food,id:'stale'}];await check();
    return{active,local,final:requests.length,payload:requests[0]?.payload};
  });
  assert.equal(result.active,0);assert.equal(result.local,1);assert.equal(result.final,1);
  assert.equal(result.payload.data.kind,'food');assert(result.payload.body.includes('Empresa real'));
  await context.close();
  check('Respaldo local: alimentación única con datos reales recientes; suprimida con push activo, datos guardados, empresa ausente, cancelación o alerta vencida');
}

async function fcm(baseUrl) {
  const context = await helpers.contextFor('actual', { installed: true });
  const key = crypto.createECDH('prime256v1'); key.generateKeys();
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test-only', keys: { p256dh: key.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
  const registered = [];
  let removed = false;
  await context.route('**/js/push-config.js', route => route.fulfill({ contentType: 'text/javascript', body: "export const PUSH_CONFIG={apiBaseUrl:'https://push.example'};" }));
  await context.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `export const browserLocalPersistence={};const auth={currentUser:{uid:'fcm-test',getIdToken:async()=>'id-token'},authStateReady:async()=>{}};export const getAuth=()=>auth;export const setPersistence=async()=>{};export const signInAnonymously=async()=>({user:auth.currentUser});export const onAuthStateChanged=(auth,callback)=>{callback(auth.currentUser);return()=>{}};` }));
  await context.route('**/firebase-messaging.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `export const isSupported=async()=>true;export const getMessaging=()=>({});export const getToken=async(messaging,options)=>{window.__fcmOptions={key:options.vapidKey,sameWorker:options.serviceWorkerRegistration===window.__pushRegistration};return window.__fcmToken;};export const deleteToken=async()=>{window.__fcmDeleted=true;return true;};` }));
  await context.route('https://push.example/**', async route => {
    const request = route.request();
    const headers = { 'Access-Control-Allow-Origin': baseUrl, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (new URL(request.url()).pathname === '/config') return route.fulfill({ json: { publicKey: key.getPublicKey().toString('base64url'), fcmEnabled: true }, headers });
    assert.equal(request.headers().authorization, 'Bearer id-token');
    const body = request.postDataJSON();
    if (request.method() === 'DELETE') removed = true;
    else if (body.subscription) registered.push(body);
    return route.fulfill({ json: { registered: request.method() !== 'DELETE', transport: 'fcm' }, headers });
  });
  await context.addInitScript(({ subscription, publicBytes, scope }) => {
    let current;
    window.__fcmToken = 'test-token-one-from-sdk';
    window.__pushRegistration = { scope, active: { postMessage() {} }, addEventListener() {}, update: async () => {}, pushManager: { getSubscription: async () => current, subscribe: async () => { current = { endpoint: subscription.endpoint, options: { applicationServerKey: new Uint8Array(publicBytes).buffer }, toJSON: () => subscription, unsubscribe: async () => { current = null; return true; } }; return current; } } };
    Object.defineProperty(navigator, 'serviceWorker', { value: { getRegistration: async () => window.__pushRegistration, register: async () => window.__pushRegistration, addEventListener() {}, ready: Promise.resolve(window.__pushRegistration) }, configurable: true });
  }, { subscription, publicBytes: [...key.getPublicKey()], scope: `${baseUrl}/actual/` });
  const page = await context.newPage();
  await helpers.goto(page, 'actual', 'agenda_movil.html');
  await page.locator('.agenda-push-panel').evaluate(element => { element.open = true; });
  await page.locator('#agendaEnablePush').click();
  await page.waitForFunction(() => window.__RPT_PUSH_STATUS__?.state === 'active');
  assert.equal(registered.at(-1).transport, 'fcm');
  assert.equal(registered.at(-1).fcmToken, 'test-token-one-from-sdk');
  assert.equal(await page.evaluate(() => window.__fcmOptions.sameWorker), true);
  await page.evaluate(() => { window.__fcmToken = 'test-token-two-from-sdk'; });
  await page.locator('#agendaCheckPush').click();
  await page.waitForFunction(() => !document.getElementById('agendaCheckPush').disabled);
  await page.waitForTimeout(100);
  assert.equal(registered.at(-1).fcmToken, 'test-token-two-from-sdk');
  await page.locator('#agendaDisablePush').click();
  await page.waitForFunction(() => window.__RPT_PUSH_STATUS__?.state === 'inactive');
  assert(removed); assert.equal(await page.evaluate(() => window.__fcmDeleted), true);
  await context.close();
  check('FCM controlado: getToken con VAPID y el único worker existente, persistencia en backend, renovación y deleteToken al desactivar');
}

async function workerReceipts(baseUrl) {
  const context = await helpers.contextFor('actual', { installed: true, serviceWorkers: 'allow', permissions: ['notifications'] });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/actual/agenda_movil.html`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const worker = context.serviceWorkers()[0];
  const result = await worker.evaluate(async () => {
    const requested=[];
    const nativeShow=self.registration.showNotification.bind(self.registration);
    self.registration.showNotification=async(title,options)=>{requested.push({title,options});return nativeShow(title,options);};
    const now = Date.now();
    const payload = { kind: 'food', alertId: `food_test_${now}`, alertAt: String(now - 1000), expiresAt: String(now + 44000), foodAt: String(now + 899000), title: 'ALIMENTACIÓN PROGRAMADA', body: 'Prueba local de deduplicación', url: './agenda_movil.html' };
    await Promise.all([displayNotification(payload), displayNotification(payload)]);
    await displayNotification({ ...payload, alertId: 'food_expired', alertAt: String(now - 900000), foodAt: String(now), expiresAt: String(now - 855000) });
    await displayNotification({ kind: 'end', title: 'Evento finalizado' });
    const notifications = await self.registration.getNotifications();
    const result = { count: requested.length, title: requested[0]?.title, data: requested[0]?.options.data, visibleCount: notifications.length };
    for (const notification of notifications) notification.close();
    return result;
  });
  assert.equal(result.count, 1);
  assert.equal(result.title, 'ALIMENTACIÓN PROGRAMADA');
  assert.equal(result.data.kind, 'food');
  assert(result.data.url.startsWith(baseUrl));
  await context.close();
  check('Worker e IndexedDB reales: dos solicitudes concurrentes provocan una solicitud de visualización; alimentación vencida y aviso de finalización descartados');
}

async function main() {
  await assets();
  const { baseUrl } = await helpers.start();
  await performance(baseUrl);
  await fcm(baseUrl);
  await localFood(baseUrl);
  await workerReceipts(baseUrl);
  assert.equal(helpers.results.pageErrors.length, 0, JSON.stringify(helpers.results.pageErrors));
  assert.equal(helpers.results.missingLocal.length, 0, JSON.stringify(helpers.results.missingLocal));
  fs.writeFileSync(path.join(process.env.TEST_OUTPUT_PATH, 'pruebas-premium.json'), JSON.stringify({ passed, limits: ['FCM y Firebase controlados localmente; worker y sus recibos ejecutados en Chrome local. No se prueba recepción en un teléfono.'] }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(helpers.finish);
