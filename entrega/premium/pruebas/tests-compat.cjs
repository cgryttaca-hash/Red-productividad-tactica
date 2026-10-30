const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.ORIGINAL_PROJECT_PATH ||= path.join(__dirname, '../premium-base/Red-productividad-tactica-main');
process.env.ACTUAL_PROJECT_PATH ||= path.join(__dirname, 'app');
process.env.TEST_OUTPUT_PATH ||= path.join(__dirname, 'evidence');
process.env.TEST_VENDOR_PATH ||= 'C:/Users/user/Documents/Codex/2026-10-27/referenced-chatgpt-conversation-this-is-an/work/vendor';
const helpers = require('./verify-helpers.cjs');
const { webkit } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const passed = [];
const check = name => { passed.push(name); process.stdout.write(`PASS ${name}\n`); };
let safari;

async function pushFlow(baseUrl) {
  const context = await helpers.contextFor('actual');
  const curve = crypto.createECDH('prime256v1');
  curve.generateKeys();
  const publicKey = curve.getPublicKey();
  const subscriptionData = { endpoint: 'https://web.push.apple.com/controlled-test', keys: { p256dh: publicKey.toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
  const subscriptions = new Map();
  let unavailable = false;
  await context.route('**/js/push-config.js', route => route.fulfill({ contentType: 'text/javascript', body: "export const PUSH_CONFIG={apiBaseUrl:'https://push.example'};" }));
  await context.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `export const browserLocalPersistence={}; const auth={currentUser:{uid:'push-user',getIdToken:async()=>'test-token'},authStateReady:async()=>{}}; export const getAuth=()=>auth; export const setPersistence=async()=>{}; export const signInAnonymously=async()=>({user:auth.currentUser}); export const onAuthStateChanged=(value,callback)=>{queueMicrotask(()=>callback(value.currentUser));return()=>{}};` }));
  await context.route('https://push.example/**', async route => {
    const request = route.request();
    const headers = { 'Access-Control-Allow-Origin': baseUrl, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/config') { await route.fulfill({ json: { publicKey: publicKey.toString('base64url') }, headers }); return; }
    if (unavailable) { await route.fulfill({ status: 503, json: { error: 'Servidor de prueba no disponible' }, headers }); return; }
    assert.equal(request.headers().authorization, 'Bearer test-token');
    const body = request.postDataJSON();
    if (pathname === '/subscriptions' && request.method() === 'POST') subscriptions.set(body.subscription.endpoint, body.subscription);
    if (pathname === '/subscriptions' && request.method() === 'DELETE') subscriptions.delete(body.endpoint);
    await route.fulfill({ json: { registered: subscriptions.has(body.endpoint || body.subscription?.endpoint) }, headers });
  });
  await context.addInitScript(({ subscriptionData, publicBytes, scope }) => {
    let subscribed = null;
    window.__permission = 'granted';
    window.__permissionRequests = 0;
    window.__subscribeCalls = 0;
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => window.__permission });
    Notification.requestPermission = async () => { window.__permissionRequests++; window.__permissionGesture = navigator.userActivation.isActive; window.__permission = 'granted'; return 'granted'; };
    navigator.standalone = true;
    const registration = { scope, active: { postMessage() {} }, update: async () => {}, addEventListener() {}, pushManager: {
      getSubscription: async () => subscribed,
      subscribe: async () => {
        window.__subscribeCalls++;
        subscribed = { endpoint: subscriptionData.endpoint, options: { applicationServerKey: new Uint8Array(publicBytes).buffer }, toJSON: () => subscriptionData, unsubscribe: async () => { subscribed = null; return true; } };
        return subscribed;
      }
    } };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => registration, register: async () => registration, addEventListener() {}, ready: Promise.resolve(registration) } });
  }, { subscriptionData, publicBytes: [...publicKey], scope: `${baseUrl}/actual/` });
  const page = await context.newPage();
  await helpers.goto(page, 'actual', 'agenda_movil.html');
  await page.locator('.agenda-push-panel').evaluate(element => { element.open = true; });
  assert(!(await page.locator('#agendaPushSummary').textContent()).includes('activos'));
  assert.equal(await page.evaluate(() => window.__permissionRequests), 0);
  await page.evaluate(() => { window.__permission = 'default'; });
  await page.locator('#agendaEnablePush').click();
  await page.waitForFunction(() => document.getElementById('agendaPushSummary').textContent.includes('activos'));
  assert.equal(await page.evaluate(() => window.__permissionRequests), 1);
  assert.equal(await page.evaluate(() => window.__permissionGesture), true);
  await page.locator('#agendaEnablePush').click();
  await page.waitForFunction(() => !document.getElementById('agendaEnablePush').disabled);
  assert.equal(await page.evaluate(() => window.__subscribeCalls), 1);
  assert.equal(subscriptions.size, 1);
  await page.screenshot({ path: path.join(process.env.TEST_OUTPUT_PATH, 'push-flujo-controlado.png'), fullPage: true });
  check('Cliente push con API controlada: permiso solo tras clic real, suscripción única y estado activo solo con confirmación del servidor');
  unavailable = true;
  await page.locator('#agendaCheckPush').click();
  await page.waitForFunction(() => document.getElementById('agendaPushStatus').textContent.includes('no disponible'));
  assert(!(await page.locator('#agendaPushSummary').textContent()).includes('activos'));
  unavailable = false;
  await page.locator('#agendaDisablePush').click();
  await page.waitForFunction(() => document.getElementById('agendaDisablePush').hidden);
  assert.equal(subscriptions.size, 0);
  await page.evaluate(() => { window.__permission = 'denied'; });
  await page.locator('#agendaEnablePush').click();
  await page.waitForFunction(() => document.getElementById('agendaPushStatus').textContent.includes('no autorizó'));
  assert.equal(await page.evaluate(() => window.__permissionRequests), 1);
  check('Cliente push: error de registro sin falso activo, baja real en el flujo controlado y permiso denegado sin solicitudes automáticas');
  await context.close();
}

async function webkitFlow(baseUrl) {
  safari = await webkit.launch({ executablePath: process.env.WEBKIT_PATH || path.join(__dirname, '../browsers/webkit-2336/Playwright.exe'), headless: true });
  const source = fs.readFileSync(path.join(__dirname, 'verify-helpers.cjs'), 'utf8');
  const extract = name => {
    const marker = 'const ' + name + ' = `';
    const start = source.indexOf(marker);
    assert(start >= 0, name);
    return source.slice(start + marker.length, source.indexOf('`;', start + marker.length));
  };
  const vendor = process.env.TEST_VENDOR_PATH;
  async function profile(installed, ipad = false) {
    const context = await safari.newContext({ viewport: ipad ? { width: 820, height: 1180 } : { width: 390, height: 844 }, locale: 'es-CO', timezoneId: 'America/Bogota', hasTouch: true, isMobile: true, userAgent: ipad ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === baseUrl) return route.continue();
      if (url.hostname === 'www.gstatic.com') {
        const mock = url.pathname.endsWith('firebase-app.js') ? 'appMock' : url.pathname.endsWith('firebase-auth.js') ? 'authMock' : 'firestoreMock';
        return route.fulfill({ contentType: 'text/javascript', body: extract(mock), headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      const name = url.hostname === 'cdn.sheetjs.com' ? 'xlsx-020.js' : url.hostname === 'cdnjs.cloudflare.com' ? 'xlsx-018.js' : url.pathname.includes('datalabels') ? 'datalabels.js' : 'chart.js';
      if (['cdn.sheetjs.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'].includes(url.hostname)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(vendor, name)) });
      return route.fulfill({ status: 204 });
    });
    await context.addInitScript(({ rows, installed, ipad }) => {
      window.__testEvents = rows;
      if (ipad) Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
      if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
      if (installed) {
        navigator.standalone = true;
        if (!('Notification' in window)) window.Notification = class {};
        Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
      }
      localStorage.setItem('eventData', JSON.stringify(rows));
      localStorage.setItem('eventDataUpdatedAt', '2026-10-27T15:00:00Z');
      localStorage.setItem('rptAuthDeviceV1', 'webkit-device');
      localStorage.setItem('rptAuthUsersV1', JSON.stringify([{ id: 'webkit-user', active: true, role: 'admin', displayName: 'Verificación Safari', username: 'webkit' }]));
      localStorage.setItem('rptAuthSessionV1', JSON.stringify({ userId: 'webkit-user', deviceId: 'webkit-device', role: 'admin', displayName: 'Verificación Safari', username: 'webkit' }));
    }, { rows: helpers.fixtureRows.map((row, index) => ({ ...row, __EVENT_ID: `wk-${index}`, __FILA_ORIGEN: index + 2 })), installed, ipad });
    return context;
  }
  for (const ipad of [false, true]) {
    const context = await profile(false, ipad);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/actual/agenda_movil.html`);
    await page.waitForFunction(() => !document.documentElement.classList.contains('maintenance-pending'));
    assert((await page.locator('#agendaInstallText').textContent()).includes('Safari'));
    assert(await page.locator('#agendaRequirementsGate').isVisible());
    await page.screenshot({ path: path.join(process.env.TEST_OUTPUT_PATH, `webkit-${ipad ? 'ipad' : 'iphone'}-instalacion.png`), fullPage: true });
    await context.close();
  }
  check('WebKit: instrucciones de instalación en perfiles iPhone y iPad con identificación de escritorio; acceso instalado detectado por capacidades');
  const context = await profile(true);
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseUrl}/actual/agenda_movil.html`);
  await page.waitForFunction(() => !document.documentElement.classList.contains('maintenance-pending'));
  assert(await page.locator('#agendaRequirementsGate').isHidden());
  await page.locator('[data-view="all"]').click();
  await page.locator('#mobileSearch').fill('Horizonte');
  await page.locator('.event-summary-row').first().click();
  assert((await page.locator('#mobileDetailBody').textContent()).includes('Salón 1'));
  await page.locator('#mobileCloseDetail').click();
  assert.equal(await page.locator('#mobileSearch').evaluate(element => getComputedStyle(element).fontSize), '16px');
  await page.setViewportSize({ width: 844, height: 390 });
  const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('body *')].map(element => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width })).filter(entry => entry.right > innerWidth + 1).slice(0, 15) }));
  assert(geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
  assert.equal(await page.locator('#mobileSearch').evaluate(element => getComputedStyle(element).fontSize), '16px');
  await page.screenshot({ path: path.join(process.env.TEST_OUTPUT_PATH, 'webkit-iphone-horizontal.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/actual/agendas.html`);
  await page.locator('#agendasSearch').fill('Horizonte');
  await page.locator('#agendasEventList button').click();
  assert.equal(await page.locator('#agendaSelectedCompany').textContent(), 'Empresa Horizonte');
  await page.locator('#copyEventAgenda').click();
  await page.waitForFunction(() => document.getElementById('agendaCopyMessage').textContent.length > 0);
  const copied = await page.locator('#agendaCopyMessage').textContent();
  assert(/copiada|seleccionado/.test(copied));
  await page.screenshot({ path: path.join(process.env.TEST_OUTPUT_PATH, 'webkit-agenda-modal.png'), fullPage: true });
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await context.close();
  check('WebKit: agenda instalada simulada, consulta, detalle, campos sin zoom, modal Agendas y copia/fallback sin excepciones');
}

async function main() {
  const { baseUrl } = await helpers.start();
  await pushFlow(baseUrl);
  await webkitFlow(baseUrl);
  fs.writeFileSync(path.join(process.env.TEST_OUTPUT_PATH, 'pruebas-compatibilidad.json'), JSON.stringify({ passed, notes: ['WebKit 26.5 en Windows, perfiles de pantalla y agente de usuario. No equivale a prueba física en iPhone/iPad.', 'PushManager, permiso y backend se sustituyen por implementaciones controladas en el flujo del cliente. No se envió una notificación a APNs/FCM.'] }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await safari?.close(); await helpers.finish(); });
