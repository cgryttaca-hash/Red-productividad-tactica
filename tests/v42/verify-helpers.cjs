const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const workspace = path.resolve(__dirname, '..');
const roots = {
  original: path.resolve(process.env.ORIGINAL_PROJECT_PATH || path.resolve(__dirname,'../../../base-version')),
  actual: path.resolve(process.env.ACTUAL_PROJECT_PATH || path.resolve(__dirname,'../..'))
};
const evidence = process.env.TEST_OUTPUT_PATH || path.resolve(__dirname,'../../test-results/v42');
const vendorPath = process.env.TEST_VENDOR_PATH || path.join(__dirname, 'vendor');
fs.mkdirSync(evidence, { recursive: true });
const results = { checks: [], pageErrors: [], missingLocal: [], notes: [], consoleErrors: [] };
const fixedTimestamp = '2026-10-27T15:00:00.000Z';
const eventRow = (date, company, room, food, status = 'Confirmado', payment = 'Transferencia') => ({
  FECHA: date,
  'ESCENARIO ASIGNADO': room,
  'HORARIO DEL EVENTO': '08:00 AM - 12:00 PM',
  'NOMBRE DE LA EMPRESA': company,
  'CANTIDAD DE PERSONAS': 35,
  'HORARIO AYB': food ? '09:30 AM - Café' : '',
  'DESCRIPCION ALIMENTACION': food ? 'Café y refrigerio\n35 servicios' : 'SIN ALIMENTACIÓN',
  ACOMODACION: 'Auditorio',
  'MODALIDAD DE SERVICIO': 'A la mesa',
  'MEDIO DE PAGO': payment,
  OBSERVACION: 'Preparar salón antes de las 07:30 AM',
  ESTADO: status,
  HOJA_ORIGEN: 'OCTUBRE',
  __FILA_ORIGEN: 2
});
const fixtureRows = [
  eventRow('2026-10-27', 'Empresa Horizonte', 'Salón 1 - Segundo piso', true),
  eventRow('2026-10-27', 'Fundación Norte', 'Salón 301 - Tercer piso', false, 'Programado', 'Efectivo'),
  eventRow('2026-10-27', 'Evento cancelado', 'Salón 2 - Segundo piso', true, 'Cancelado'),
  eventRow('2026-10-28', 'Encuentro Futuro', 'Salón 2 - Segundo piso', true),
  eventRow('2026-10-26', 'Evento anterior', 'Salón 3 - Segundo piso', false, 'Finalizado')
];

function check(name, details) {
  results.checks.push({ name, result: 'PASS', details });
  process.stdout.write(`PASS ${name}\n`);
}

function allFiles(root, prefix = '') {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? allFiles(path.join(root, entry.name), relative) : [relative];
  });
}

function hashFile(root, relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
}

function staticChecks() {
  const originalFiles = allFiles(roots.original);
  const actualFiles = allFiles(roots.actual);
  const removed = originalFiles.filter(relative => !actualFiles.includes(relative));
  const modified = originalFiles.filter(relative => actualFiles.includes(relative) && hashFile(roots.original, relative) !== hashFile(roots.actual, relative));
  const added = actualFiles.filter(relative => !originalFiles.includes(relative));
  results.files = { modified, removed, added };
  assert.deepEqual(removed.sort(), ['auditoria.html', 'diagnostico.html', 'equipos.html', 'respaldos.html', 'js/auditoria.js', 'js/diagnostico.js', 'js/equipos.js', 'js/respaldos.js'].sort());
  check('Solo se retiran las cuatro páginas y sus cuatro controladores exclusivos', removed);
  const protectedFiles = ['agenda_movil.html', 'css/agenda-movil.css', 'js/agenda-movil.js', 'js/agenda-reminders.js', 'js/agenda-requirements.js', 'agenda.webmanifest', 'js/maintenance-guard.js', 'mantenimiento.html', 'css/mantenimiento.css', 'js/mantenimiento.js', 'offline.html', 'js/pwa.js', 'js/notifications.js', 'js/performance-monitor.js', 'js/firebase-config.js', 'js/firebase-app-check.js', 'js/firebase-sync.js', 'js/puente_movil_eventos.js', 'data/eventos_publicos.json', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png'];
  results.protectedHashes = protectedFiles.map(relative => {
    const original = hashFile(roots.original, relative);
    const actual = hashFile(roots.actual, relative);
    assert.equal(actual, original, relative);
    return { file: relative, original, actual };
  });
  check('Agenda Móvil y sus dependencias: 22 archivos idénticos por SHA-256', protectedFiles);
  for (const relative of ['js/eventos.js', 'js/minuta.js', 'css/eventos.css', 'css/minuta.css', 'js/excel-sync.js', 'js/validation.js', 'js/data-core.js', 'js/local-auth.js', 'js/auth-guard.js', 'js/usuarios.js', 'js/validacion-page.js', 'js/laboratorio.js', 'js/audit-store.js', 'js/backup-store.js', 'js/device-registry.js', 'js/device-heartbeat.js', 'firestore.rules']) {
    assert.equal(hashFile(roots.actual, relative), hashFile(roots.original, relative), relative);
  }
  check('Lógica operativa, lector Excel, autenticación, validaciones y servicios compartidos intactos');
  for (const relative of ['eventos.html', 'minuta.html']) {
    const normalize = source => source.replace(' data-ui="corporate"', '').replace(/  <link rel="stylesheet" href="css\/corporate-ui.css[^\n]+\n/, '');
    assert.equal(normalize(fs.readFileSync(path.join(roots.actual, relative), 'utf8')), fs.readFileSync(path.join(roots.original, relative), 'utf8'));
  }
  check('HTML de Eventos y Minuta: únicamente atributo de diseño y enlace CSS de pantalla');
  const workerOriginal = fs.readFileSync(path.join(roots.original, 'sw.js'), 'utf8');
  const workerActual = fs.readFileSync(path.join(roots.actual, 'sw.js'), 'utf8');
  assert.equal(workerActual.slice(workerActual.indexOf("self.addEventListener('install'")), workerOriginal.slice(workerOriginal.indexOf("self.addEventListener('install'")));
  check('Service worker: lógica de caché, offline y notificaciones idéntica');
  for (const relative of actualFiles.filter(relative => relative.endsWith('.html'))) {
    const content = fs.readFileSync(path.join(roots.actual, relative), 'utf8');
    assert(!/(?:href|src)=["'](?:\.\/)?(?:auditoria|diagnostico|equipos|respaldos)\.html/i.test(content), relative);
    assert(!/<option[^>]+value="(?:auditoria|diagnostico|equipos|respaldos)"/i.test(content), relative);
    for (const match of content.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const target = match[1].split(/[?#]/)[0];
      if (!target || /^(?:https?:|data:|mailto:)/.test(target)) continue;
      assert(fs.existsSync(path.resolve(roots.actual, path.dirname(relative), target)), `${relative}: ${target}`);
    }
  }
  check('Sin enlaces locales rotos ni accesos HTML a los módulos retirados');
  const stylesheet = fs.readFileSync(path.join(roots.actual, 'css/corporate-ui.css'), 'utf8');
  assert(!stylesheet.includes('@import'));
  assert(!stylesheet.includes('@media print'));
  assert(!fs.readFileSync(path.join(roots.actual, 'agenda_movil.html'), 'utf8').includes('corporate-ui'));
  check('Diseño aislado: CSS solo para pantalla y sin carga en Agenda Móvil');
}

const appMock = `
const apps=[];
export const getApps=()=>apps;
export function initializeApp(config,name='[DEFAULT]'){const app={name,options:config};apps.push(app);return app;}
`;
const authMock = `
const sessions=new Map();
export const browserLocalPersistence={};
export function getAuth(app){if(!sessions.has(app.name))sessions.set(app.name,{currentUser:null,authStateReady:async()=>{}});return sessions.get(app.name);}
export const setPersistence=async()=>{};
export function onAuthStateChanged(auth,callback){queueMicrotask(()=>callback(auth.currentUser));return()=>{};}
export async function signInAnonymously(auth){auth.currentUser={uid:'mock-anonymous'};return{user:auth.currentUser};}
export async function signOut(auth){auth.currentUser=null;}
export async function signInWithEmailAndPassword(){throw new Error('Cuenta propietaria no utilizada durante las pruebas locales');}
`;
const firestoreMock = `
const store=new Map();
const listeners=new Map();
export const getFirestore=()=>({});
export const collection=(database,name)=>({path:name});
export const doc=(database,name,id)=>({path:id?name+'/'+id:(database.path?database.path+'/'+name:name)});
export const serverTimestamp=()=>new Date('2026-10-27T15:00:00Z');
function snapshot(ref){
 let value=store.get(ref.path);
 if(value===undefined&&ref.path.endsWith('/mantenimiento'))value=window.__testMaintenance||{pages:{}};
 if(value===undefined&&ref.path.endsWith('/publicacion'))value={chunkCount:1,count:window.__testEvents.length,dataHash:'fixture-v1',clientPublishedAt:'2026-10-27T15:00:00Z'};
 if(value===undefined&&ref.path.includes('/agenda_chunk_'))value={events:window.__testEvents};
 return{id:ref.path.split('/').pop(),exists:()=>value!==undefined,data:()=>value};
}
export const getDoc=async ref=>{window.__testReads=window.__testReads||{};window.__testReads[ref.path]=(window.__testReads[ref.path]||0)+1;return snapshot(ref);};
export const getDocs=async()=>({docs:window.__testEvents.map((row,index)=>({id:String(index),data:()=>row}))});
export function onSnapshot(ref,options,callback){if(typeof options==='function')callback=options;listeners.set(ref.path,callback);window.__testListeners=window.__testListeners||{};window.__testListeners[ref.path]=(window.__testListeners[ref.path]||0)+1;queueMicrotask(()=>callback(snapshot(ref)));return()=>{listeners.delete(ref.path);window.__testListeners[ref.path]--;};}
export async function setDoc(ref,value,options){store.set(ref.path,options?.merge?{...store.get(ref.path),...value}:value);listeners.get(ref.path)?.(snapshot(ref));}
export async function deleteDoc(ref){store.delete(ref.path);}
export function writeBatch(){return{set:(ref,value)=>store.set(ref.path,value),delete:ref=>store.delete(ref.path),commit:async()=>{}};}
`;

const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const [, version, ...segments] = decodeURIComponent(url.pathname).split('/');
  const root = roots[version];
  if (!root) { response.writeHead(404); response.end(); return; }
  const target = path.resolve(root, segments.join('/') || 'index.html');
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  response.end(fs.readFileSync(target));
});

let baseUrl;
let browser;
async function contextFor(version, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-CO', timezoneId: 'America/Bogota', serviceWorkers: 'block', ...options });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === baseUrl) return route.continue();
    const vendors = { 'cdnjs.cloudflare.com': 'xlsx-0.20.3.min.js', 'cdn.sheetjs.com': 'xlsx-0.20.3.min.js' };
    if (vendors[url.hostname]) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(vendorPath, vendors[url.hostname])) });
    if (url.hostname === 'cdn.jsdelivr.net') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(vendorPath, url.pathname.includes('datalabels') ? 'chartjs-datalabels-2.2.0.min.js' : 'chart-4.6.1.min.js')) });
    if (url.hostname === 'www.gstatic.com') {
      const source = url.pathname.endsWith('firebase-app.js') ? appMock : url.pathname.endsWith('firebase-auth.js') ? authMock : url.pathname.endsWith('firebase-firestore.js') ? firestoreMock : '';
      if (source) return route.fulfill({ contentType: 'text/javascript', body: source, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.hostname === 'actions.google.com') return route.fulfill({ status: 204 });
    return route.abort();
  });
  await context.addInitScript(({ rows, stamp, installed }) => {
    window.__testEvents = rows;
    const NativeDate = Date;
    const frozen = new NativeDate(stamp).getTime();
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [frozen])); }
      static now() { return frozen; }
    };
    const originalMatchMedia = window.matchMedia.bind(window);
    if (installed) window.matchMedia = query => query === '(display-mode: standalone)' ? { matches: true, media: query, addEventListener() {}, removeEventListener() {} } : originalMatchMedia(query);
    if (installed && 'Notification' in window) Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
  }, { rows: fixtureRows, stamp: fixedTimestamp, installed: options.installed || false });
  context.on('page', page => {
    page.on('pageerror', error => results.pageErrors.push({ version, url: page.url(), message: error.message }));
    page.on('console', message => { if (message.type() === 'error') results.consoleErrors.push({ version, url: page.url(), message: message.text() }); });
    page.on('response', response => { if (response.status() === 404 && response.url().startsWith(baseUrl) && !response.url().endsWith('favicon.ico')) results.missingLocal.push(response.url()); });
  });
  return context;
}

async function login(context, version) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/${version}/login.html`);
  await page.locator('#username').fill('Admin');
  await page.locator('#password').fill('Admin2026');
  await page.locator('#loginButton').click();
  await page.waitForURL(`**/${version}/index.html`);
  await page.waitForFunction(() => !document.documentElement.classList.contains('maintenance-pending'));
  const center=await page.locator('.ops-layout').count()>0;
  if(!center)await page.waitForFunction(() => document.getElementById('excelSyncModal'));
  await page.evaluate(({rows,center}) => {
    localStorage.setItem('eventData', JSON.stringify(rows));
    localStorage.setItem('eventDataUpdatedAt', '2026-10-27T15:00:00Z');
    localStorage.setItem('eventDataSheets', '["OCTUBRE"]');
    if(!center){localStorage.setItem('excelSync:fileName', 'Operación octubre.xlsx');localStorage.setItem('excelSync:lastCheck', '2026-10-27T15:00:00Z');}
    window.dispatchEvent(new CustomEvent('eventDataUpdated'));
    document.getElementById('excelSyncClose')?.click();
  }, {rows:fixtureRows,center});
  await page.reload();
  await page.waitForFunction(() => !document.documentElement.classList.contains('maintenance-pending') && (document.querySelector('.ops-layout')||document.getElementById('loader')?.classList.contains('is-hidden')));
  return page;
}

async function goto(page, version, file) {
  await page.goto(`${baseUrl}/${version}/${file}`);
  await page.waitForFunction(() => !document.documentElement.classList.contains('auth-pending') && !document.documentElement.classList.contains('maintenance-pending'));
  await page.waitForTimeout(550);
}

async function tableText(page, selector) {
  return page.locator(selector).allTextContents();
}

async function printSignature(page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(250);
  const signature = await page.evaluate(() => [...document.body.querySelectorAll('*')].filter(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return !['SCRIPT', 'LINK'].includes(element.tagName) && style.visibility === 'visible' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  }).map(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return [element.tagName, element.id, element.className, ...['display', 'visibility', 'color', 'backgroundColor', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'margin', 'border', 'width', 'height', 'tableLayout'].map(property => style[property]), rect.x, rect.y, rect.width, rect.height];
  }));
  await page.emulateMedia({ media: 'screen' });
  return signature;
}

async function eventsFlow(page, version) {
  await goto(page, version, 'eventos.html');
  const flow = {};
  await page.locator('[data-filter="Todos"]').click();
  flow.all = await tableText(page, '#dataTable tbody tr');
  await page.locator('[data-filter="Segundo piso"]').click();
  flow.second = await tableText(page, '#dataTable tbody tr');
  await page.locator('[data-filter="Tercer piso"]').click();
  flow.third = await tableText(page, '#dataTable tbody tr');
  await page.locator('[data-filter="Todos"]').click();
  await page.locator('#toggleFiltersBtn').click();
  await page.locator('#search').fill('Horizonte');
  flow.search = await tableText(page, '#dataTable tbody tr');
  assert.equal(flow.search.length, 1);
  await page.locator('#search').fill('');
  await page.locator('#paymentFilter').selectOption('Efectivo');
  flow.payment = await tableText(page, '#dataTable tbody tr');
  await page.locator('#paymentFilter').selectOption('');
  await page.locator('#dateFrom').fill('2026-10-28');
  await page.locator('#dateTo').fill('2026-10-28');
  await page.locator('#dateTo').press('Tab');
  flow.date = await tableText(page, '#dataTable tbody tr');
  assert.equal(flow.date.length, 1);
  await page.locator('#resetBtn').click();
  await page.locator('[data-filter="Todos"]').click();
  await page.locator('#hideNoFood').check({ force: true });
  flow.food = await tableText(page, '#dataTable tbody tr');
  await page.locator('#hideNoFood').uncheck({ force: true });
  await page.locator('#btnPreview').click();
  assert.equal(await page.locator('#previewModal').getAttribute('aria-hidden'), 'false');
  flow.preview = await tableText(page, '#previewTableHost tbody tr');
  await page.locator('#closePreview').click();
  await page.evaluate(() => { window.__printCalls = 0; window.print = () => window.__printCalls++; });
  await page.locator('#btnPrint').click();
  assert.equal(await page.evaluate(() => window.__printCalls), 1);
  flow.print = await printSignature(page);
  if (version === 'actual') {
    await page.screenshot({ path: path.join(evidence, 'eventos-escritorio.png'), fullPage: true });
  }
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(evidence, `eventos-impresion-${version}.pdf`), preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  return flow;
}

async function minuteFlow(page, version) {
  await goto(page, version, 'minuta.html');
  const flow = {};
  await page.locator('#minuteDatePicker').fill('2026-10-27');
  await page.locator('#minuteDatePicker').press('Tab');
  flow.today = await tableText(page, '.minute-events-table tbody tr');
  assert(flow.today.join('').toUpperCase().includes('HORIZONTE'));
  assert(!flow.today.join('').toUpperCase().includes('EVENTO CANCELADO'));
  await page.locator('#btnNextDate').click();
  flow.tomorrow = await tableText(page, '.minute-events-table tbody tr');
  await page.locator('#btnPrevDate').click();
  await page.locator('#btnNextEvents').click();
  flow.next = await tableText(page, '.next-event-card');
  await page.locator('#closeNextEventsModal').click();
  await page.locator('#addCoworkRow').click();
  const coworkCell = page.locator('#tbodyCoworking tr').last().locator('[contenteditable]').nth(1);
  await coworkCell.fill('Cliente coworking de prueba');
  flow.coworkSaved = await page.evaluate(() => localStorage.getItem('minutaCoworkingRows'));
  assert(flow.coworkSaved.includes('Cliente coworking de prueba'));
  await page.reload();
  await page.waitForTimeout(650);
  assert((await page.locator('#tbodyCoworking').innerText()).includes('Cliente coworking de prueba'));
  await page.locator('#tbodyCoworking tr').last().locator('.row-delete').click();
  flow.coworkAfterDelete = await page.evaluate(() => localStorage.getItem('minutaCoworkingRows'));
  await page.locator('#minuteDatePicker').fill('2026-10-27');
  await page.locator('#minuteDatePicker').press('Tab');
  await page.evaluate(() => { window.__printCalls = 0; window.print = () => window.__printCalls++; });
  await page.locator('#btnPrint').click();
  assert.equal(await page.evaluate(() => window.__printCalls), 1);
  flow.print = await printSignature(page);
  if (version === 'actual') {
    await page.screenshot({ path: path.join(evidence, 'minuta-escritorio.png'), fullPage: true });
  }
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(evidence, `minuta-impresion-${version}.pdf`), preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  return flow;
}

async function mobileFlow(version, installed) {
  const context = await contextFor(version, { viewport: { width: 390, height: 844 }, installed });
  const page = await context.newPage();
  await goto(page, version, 'agenda_movil.html');
  const flow = {};
  flow.gate = await page.locator('#agendaRequirementsGate').isVisible();
  assert.equal(flow.gate, !installed);
  if (installed) {
    await page.locator('[data-view="all"]').click();
    flow.all = await page.locator('#mobileAgenda').textContent();
    await page.locator('#mobileSearch').fill('Horizonte');
    flow.search = await page.locator('#mobileAgenda').textContent();
    assert(flow.search.includes('Horizonte'));
    assert(!flow.search.includes('Fundación Norte'));
    await page.locator('#mobileSearch').fill('');
    await page.locator('#mobileFloorFilter').selectOption('Tercer piso');
    flow.floor = await page.locator('#mobileAgenda').textContent();
    await page.locator('#mobileFloorFilter').selectOption('');
    await page.locator('#mobileFoodFilter').selectOption('with');
    flow.food = await page.locator('#mobileAgenda').textContent();
    await page.locator('#mobileFoodFilter').selectOption('');
    await page.locator('#mobileStatusFilter').selectOption('Confirmado');
    flow.status = await page.locator('#mobileAgenda').textContent();
    await page.locator('#mobileStatusFilter').selectOption('');
    await page.locator('#mobileDateFilter').fill('2026-10-28');
    await page.locator('#mobileDateFilter').press('Tab');
    flow.date = await page.locator('#mobileAgenda').textContent();
    await page.locator('#mobileDateFilter').fill('');
    await page.locator('#mobileDateFilter').press('Tab');
    await page.locator('#mobileSearch').fill('Horizonte');
    await page.locator('.event-summary-row[data-id]').first().click();
    flow.detail = await page.locator('#mobileDetailBody').textContent();
    await page.locator('#mobileCloseDetail').click();
    await page.locator('#mobileSearch').fill('');
    await page.locator('#mobileTextSize').click();
    flow.largeText = await page.evaluate(() => localStorage.getItem('rptAgendaLargeTextV1'));
    await page.locator('#mobileTextSize').click();
    await page.locator('#mobileRefresh').click();
    flow.storedFilters = await page.evaluate(() => localStorage.getItem('rptAgendaFiltersV1'));
  }
  const screenshot = await page.screenshot({ path: path.join(evidence, `agenda-movil-${installed ? 'operativa' : 'acceso'}-${version}.png`), fullPage: true });
  flow.screenshotHash = crypto.createHash('sha256').update(screenshot).digest('hex');
  flow.styles = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => new URL(link.href).pathname.split('/').pop()));
  await context.close();
  return flow;
}

async function workbookFlow(page, version) {
  await goto(page, version, 'laboratorio.html');
  const workbook = await page.evaluate(rows => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows.map(({ HOJA_ORIGEN, __FILA_ORIGEN, ...row }) => row));
    XLSX.utils.book_append_sheet(book, sheet, 'OCTUBRE');
    return Array.from(new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' })));
  }, fixtureRows);
  const payload = { name: 'verificacion-octubre.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(workbook) };
  const previous = await page.evaluate(() => localStorage.getItem('eventData'));
  await page.locator('#labFile').setInputFiles(payload);
  await page.waitForFunction(() => document.getElementById('labMessage').textContent && !document.getElementById('labMessage').textContent.includes('Analizando'));
  assert.equal(await page.locator('#labRows').textContent(), '5', await page.locator('#labMessage').textContent());
  assert.equal(await page.evaluate(() => localStorage.getItem('eventData')), previous);
  const lab = await tableText(page, '#labPreview tr');
  await goto(page, version, 'index.html');
  const imported = await page.evaluate(async bytes => {
    const file = new File([new Uint8Array(bytes)], 'verificacion-octubre.xlsx');
    const parsed = await ExcelFileSync.importFile(file);
    const sameParsed = await ExcelFileSync.importFile(file);
    return { rows: parsed.rows, sheets: parsed.sheets, columnMaps: parsed.columnMaps, repeat: sameParsed.rows, diff: JSON.parse(localStorage.getItem('eventDataLastDiff') || 'null'), validation: JSON.parse(localStorage.getItem('rptValidationReportV1') || 'null') };
  }, workbook);
  assert.equal(imported.rows.length, 5);
  assert.equal(imported.sheets[0], 'OCTUBRE');
  assert.deepEqual(imported.rows, imported.repeat);
  await page.waitForTimeout(100);
  const internalDependencies = await page.evaluate(async () => {
    const [snapshots, audit] = await Promise.all([import('./js/backup-store.js'), import('./js/audit-store.js')]);
    return { snapshots: (await snapshots.listSnapshots()).length, auditEntries: (await audit.getRecent(100)).length };
  });
  assert(internalDependencies.snapshots > 0);
  assert(internalDependencies.auditEntries > 0);
  if (imported.validation) imported.validation.issues = imported.validation.issues.map(({ id, ...issue }) => issue);
  return { lab, imported, internalDependencies };
}

async function administrationFlow(page, version) {
  await goto(page, version, 'usuarios.html');
  await page.locator('#newDisplayName').fill('Usuario de verificación');
  await page.locator('#newUsername').fill('verificacion');
  await page.locator('#newPassword').fill('ClaveDePrueba2026');
  await page.locator('#createUserForm button').click();
  await page.waitForFunction(() => document.getElementById('usersTableBody').textContent.includes('verificacion'));
  const userRows = await tableText(page, '#usersTableBody tr');
  await goto(page, version, 'configuracion.html');
  await page.locator('#notifyExcel').uncheck();
  await page.locator('#saveNotifications').click();
  assert((await page.locator('#notificationMessage').textContent()).includes('guardadas'));
  const maintenanceOptions = await page.locator('#maintenancePage option').allTextContents();
  if (version === 'actual') assert.equal(maintenanceOptions.length, 7);
  await goto(page, version, 'validacion.html');
  const count = await page.locator('#totalRows').textContent();
  assert.equal(count, '5');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportValidation').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'validacion-excel.csv');
  return { userRows: userRows.map(text => text.replace(/usr_[a-z0-9_]+/g, 'USER_ID')), validationRows: count, exportName: download.suggestedFilename() };
}

async function responsiveChecks(page) {
  const viewports = [1440, 1366, 1024, 768, 390, 360];
  const files = ['index.html', 'eventos.html', 'minuta.html', 'usuarios.html', 'configuracion.html', 'validacion.html', 'laboratorio.html', 'login.html'];
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    for (const file of files) {
      if (file === 'login.html') {
        const blankContext = await contextFor('actual', { viewport: { width, height: 900 } });
        const blankPage = await blankContext.newPage();
        await blankPage.goto(`${baseUrl}/actual/login.html`);
        assert(await blankPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${file} overflow at ${width}`);
        await blankContext.close();
        continue;
      }
      await goto(page, 'actual', file);
      const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert(overflow.document <= overflow.viewport + 1, `${file} overflow at ${width}: ${JSON.stringify(overflow)}`);
      if (file === 'index.html') {
        assert(await page.locator('#firebaseSyncControlText').isVisible(), `Firebase status hidden at ${width}`);
        assert.notEqual(await page.locator('#firebaseSyncControlText').evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)');
        const targets = await page.locator('.module-card').evaluateAll(elements => elements.map(element => ({ href: element.getAttribute('href'), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
        assert.equal(targets.length, 3);
        assert(targets.every(target => target.width > 200 && target.height >= 72));
        assert(!/(Auditoría|Diagnóstico|Respaldos|Equipos)/.test(await page.locator('body').innerText()));
        if (width === 1440 || width === 390) await page.screenshot({ path: path.join(evidence, `inicio-${width}.png`), fullPage: true });
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  check('48 revisiones adaptables: 8 pantallas × 6 anchos, sin desbordamiento de página', viewports);
}

async function main() {
  staticChecks();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const contexts = {};
  const pages = {};
  const flows = {};
  for (const version of ['original', 'actual']) {
    contexts[version] = await contextFor(version);
    pages[version] = await login(contexts[version], version);
    flows[version] = {};
    check(`Inicio de sesión real con autenticación local: ${version}`);
    flows[version].events = await eventsFlow(pages[version], version);
    process.stdout.write(`FLOW ${version}: eventos\n`);
    flows[version].minute = await minuteFlow(pages[version], version);
    process.stdout.write(`FLOW ${version}: minuta\n`);
    flows[version].workbook = await workbookFlow(pages[version], version);
    process.stdout.write(`FLOW ${version}: excel\n`);
    flows[version].administration = await administrationFlow(pages[version], version);
    process.stdout.write(`FLOW ${version}: administración\n`);
    flows[version].mobileGate = await mobileFlow(version, false);
    flows[version].mobileApp = await mobileFlow(version, true);
  }
  assert.deepEqual(flows.actual.events, flows.original.events);
  check('Eventos: resultados idénticos para todos, pisos, empresa, pago, fechas, alimentación y vista previa');
  check('Eventos: botón de impresión invocado y estilos/geometría de impresión idénticos al original');
  assert.deepEqual(flows.actual.minute, flows.original.minute);
  check('Minuta: fecha, navegación, cancelados, próximos eventos y edición/persistencia/eliminación de coworking idénticos');
  check('Minuta: botón de impresión invocado y estilos/geometría de impresión idénticos al original');
  assert.deepEqual(flows.actual.workbook, flows.original.workbook);
  check('Excel XLSX real: lectura, hojas, columnas, importación repetida y Laboratorio sin alterar producción idénticos');
  check('Servicios internos usados por Excel: copias automáticas y registro interno disponibles sin sus módulos de administración');
  assert.deepEqual(flows.actual.administration, flows.original.administration);
  check('Usuarios, preferencias de notificación, validación y exportación CSV funcionan');
  assert.deepEqual(flows.actual.mobileGate, flows.original.mobileGate);
  assert.deepEqual(flows.actual.mobileApp, flows.original.mobileApp);
  check('Agenda Móvil: acceso y pantalla operativa idénticos píxel a píxel en 390 × 844');
  check('Agenda Móvil: filtros, búsqueda, fecha, detalle, tamaño de texto, actualización y preferencias idénticos con Firebase simulado');
  await responsiveChecks(pages.actual);
  assert.equal(results.pageErrors.length, 0, JSON.stringify(results.pageErrors));
  assert.equal(results.missingLocal.length, 0, JSON.stringify(results.missingLocal));
  check('Sin excepciones JavaScript ni recursos locales faltantes durante las pruebas');
  results.notes.push('Firebase interceptado con un servicio de prueba en memoria: no se leyó ni escribió en producción. Instalación y permisos de Agenda Móvil simulados únicamente para la prueba operativa.');
  results.notes.push('Las bibliotecas Excel y Chart.js son las mismas URLs del proyecto original; se sirvieron copias temporales durante las pruebas.');
  fs.writeFileSync(path.join(evidence, 'resultados.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(evidence, 'flujos.json'), JSON.stringify(flows, null, 2));
  process.stdout.write(`COMPLETED ${results.checks.length} checks\n`);
}

async function start() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  return { browser, baseUrl };
}

async function finish() {
  await browser?.close();
  server.close();
}

module.exports = { start, finish, contextFor, login, goto, roots, evidence, fixtureRows, results, check };

