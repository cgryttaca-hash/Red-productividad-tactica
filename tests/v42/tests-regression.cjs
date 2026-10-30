const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
process.env.ORIGINAL_PROJECT_PATH ||= path.resolve(__dirname,'../../../base-version');
process.env.ACTUAL_PROJECT_PATH ||= path.resolve(__dirname,'../..');
process.env.TEST_OUTPUT_PATH ||= path.resolve(__dirname,'../../test-results/v42');
process.env.TEST_VENDOR_PATH ||= path.resolve(__dirname,'../../assets/vendor');
const helpers = require('./verify-helpers.cjs');
const evidence = process.env.TEST_OUTPUT_PATH;
const passed = [];
const check = name => { passed.push(name); process.stdout.write(`PASS ${name}\n`); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fixtures = helpers.fixtureRows.map((record, index) => ({ ...record, __EVENT_ID: `event-${index}`, __FILA_ORIGEN: index + 2 }));
let baseUrl;

async function seed(page) {
  await page.evaluate(rows => {
    localStorage.setItem('eventData', JSON.stringify(rows));
    localStorage.setItem('eventDataUpdatedAt', '2026-10-27T15:00:00Z');
    window.dispatchEvent(new CustomEvent('eventDataUpdated'));
  }, fixtures);
}

async function rows(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.map(element => {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('.agenda-generate-action,.agenda-details-action').forEach(button => button.remove());
    return copy.textContent;
  }));
}

async function eventsFlow(page, version) {
  await helpers.goto(page, version, 'eventos.html');
  const results = {};
  for (const filter of ['Todos', 'Segundo piso', 'Tercer piso']) {
    await page.locator(`[data-filter="${filter}"]`).click();
    results[filter] = await rows(page, '#dataTable tbody tr');
  }
  await page.locator('[data-filter="Todos"]').click();
  await page.locator('#toggleFiltersBtn').click();
  await page.locator('#search').fill('Horizonte');
  results.search = await rows(page, '#dataTable tbody tr');
  await page.locator('#search').fill('');
  await page.locator('#paymentFilter').selectOption('Efectivo');
  results.payment = await rows(page, '#dataTable tbody tr');
  await page.locator('#paymentFilter').selectOption('');
  await page.locator('#dateFrom').fill('2026-10-28');
  await page.locator('#dateTo').fill('2026-10-28');
  await page.locator('#dateTo').press('Tab');
  results.date = await rows(page, '#dataTable tbody tr');
  await page.locator('#resetBtn').click();
  await page.locator('[data-filter="Todos"]').click();
  await page.locator('#hideNoFood').check({ force: true });
  results.food = await rows(page, '#dataTable tbody tr');
  await page.locator('#hideNoFood').uncheck({ force: true });
  await page.mouse.move(0, 0);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(evidence, `eventos-${version}.pdf`), preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  return results;
}

async function minuteFlow(page, version) {
  await page.evaluate(() => localStorage.setItem('minutaCoworkingRows', JSON.stringify([['27/10/2026','Cliente guardado','08:00','12:00','Cowork','2','Efectivo']])));
  await helpers.goto(page, version, 'minuta.html');
  await page.locator('#minuteDatePicker').fill('2026-10-27');
  await page.locator('#minuteDatePicker').press('Tab');
  const today = await rows(page, '.minute-events-table tbody tr');
  await page.locator('#btnNextDate').click();
  const tomorrow = await rows(page, '.minute-events-table tbody tr');
  await page.locator('#btnPrevDate').click();
  await page.locator('#btnNextEvents').click();
  const next = await page.locator('#nextEventsList').textContent();
  await page.locator('#closeNextEventsModal').click();
  await page.locator('#addCoworkRow').click();
  await page.locator('#tbodyCoworking tr').last().locator('[contenteditable]').nth(0).fill('27/10/2026');
  await page.locator('#tbodyCoworking tr').last().locator('[contenteditable]').nth(1).fill('Cliente de verificación');
  const cowork = await page.evaluate(() => localStorage.getItem('minutaCoworkingRows'));
  await page.locator('#tbodyCoworking tr').last().locator('.row-delete').click();
  await page.evaluate(() => { window.print = () => {}; });
  await page.locator('#btnPrint').click();
  await page.mouse.move(0, 0);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(evidence, `minuta-${version}.pdf`), preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  return { today, tomorrow, next, cowork };
}

async function agendaFlow(page) {
  await helpers.goto(page, 'actual', 'eventos.html');
  await page.locator('#toggleFiltersBtn').click();
  await page.locator('#search').fill('Horizonte');
  const before = await page.evaluate(() => localStorage.getItem('eventData'));
  await page.locator('#dataTable .agenda-details-action,.agenda-details-action').click();
  assert(await page.locator('#eventAgendaModal').isVisible());
  assert.equal(await page.locator('#agendaSelectedCompany').textContent(), 'Empresa Horizonte');
  assert((await page.locator('#generatedAgendaContent').textContent()).includes('Salón 1'));
  await page.screenshot({ path: path.join(evidence, 'agenda-modal-escritorio.png'), fullPage: true });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#copyEventAgenda').click();
  await page.waitForFunction(() => document.getElementById('agendaCopyMessage').textContent.includes('texto limpio'));
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert(copied.replace(/\r\n?/g, '\n').includes('AGENDA OPERATIVA DEL EVENTO\n\n1. INFORMACIÓN GENERAL'));
  assert(copied.includes('Empresa Horizonte') && !copied.includes('__EVENT_ID'));
  await page.locator('#copyRichEventAgenda').click();
  await page.waitForFunction(() => document.getElementById('agendaCopyMessage').textContent.includes('con formato'));
  const rich = await page.evaluate(async () => (await navigator.clipboard.read()).map(item => item.types));
  assert(rich.some(types => types.includes('text/plain') && types.includes('text/html')));
  assert.equal(await page.evaluate(() => localStorage.getItem('eventData')), before);
  check('Agenda desde el evento correcto: modal, copia real en texto y HTML, saltos de línea y registro original sin alteraciones');
  await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('eventData'));
    records[0].OBSERVACION = 'Observación recién actualizada';
    localStorage.setItem('eventData', JSON.stringify(records));
  });
  await page.locator('#copyEventAgenda').click();
  assert((await page.evaluate(() => navigator.clipboard.readText())).includes('Observación recién actualizada'));
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('blocked'); } } });
    document.execCommand = () => false;
  });
  await page.locator('#selectEventAgenda').click();
  assert(await page.locator('#agendaPlainText').isVisible());
  assert((await page.locator('#agendaCopyMessage').textContent()).includes('texto está seleccionado'));
  assert(await page.locator('#agendaPlainText').evaluate(element => element.selectionEnd - element.selectionStart > 100));
  await page.locator('#closeEventAgenda').press('Escape');
  assert(await page.locator('#eventAgendaModal').isHidden());
  check('Datos actuales al copiar y alternativa manual con texto seleccionado cuando el portapapeles está bloqueado');
  await seed(page);
  await helpers.goto(page, 'actual', 'agendas.html');
  assert.equal(await page.locator('#agendasEventList tr').count(), fixtures.length);
  await page.locator('#agendasSearch').fill('Futuro');
  await page.locator('#agendasEventList button').click();
  assert.equal(await page.locator('#agendaSelectedCompany').textContent(), 'Encuentro Futuro');
  const popupPromise = page.context().waitForEvent('page');
  await page.locator('#printEventAgenda').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  assert((await popup.locator('body').textContent()).includes('Encuentro Futuro'));
  assert(!(await popup.locator('body').textContent()).includes('Empresa Horizonte'));
  await popup.pdf({ path: path.join(evidence, 'agenda-generada.pdf'), printBackground: true });
  await popup.close();
  await page.locator('#closeEventAgenda').click();
  await page.locator('#agendasSearch').fill('');
  await page.locator('#agendasDate').fill('2026-10-28');
  assert.equal(await page.locator('#agendasEventList tr').count(), 1);
  check('Nuevo módulo Agendas: lista compartida, búsqueda, fecha e impresión aislada del evento seleccionado');
}

async function mobileFlow(version) {
  const context = await helpers.contextFor(version, { installed: true, viewport: { width: 390, height: 844 } });
  const page = version==='actual'?await helpers.login(context,version):await context.newPage();if(version==='actual')await page.evaluate(()=>localStorage.setItem('rptMobileAuthSessionV1',localStorage.getItem('rptAuthSessionV1')));
  await helpers.goto(page, version, 'agenda_movil.html');
  const results = {};
  for (const view of ['all', 'today', 'upcoming']) {
    await page.locator(`[data-view="${view}"]`).click();
    results[view] = await page.locator('#mobileAgenda').textContent();
  }
  await page.locator('[data-view="all"]').click();
  await page.locator('#mobileFloorFilter').selectOption('Tercer piso');
  results.floor = await page.locator('#mobileAgenda').textContent();
  await page.locator('#mobileFloorFilter').selectOption('');
  await page.locator('#mobileFoodFilter').selectOption('with');
  results.food = await page.locator('#mobileAgenda').textContent();
  await page.locator('#mobileFoodFilter').selectOption('');
  await page.locator('#mobileSearch').fill('Horizonte');
  await page.locator('.event-summary-row').first().click();
  results.detail = await page.locator('#mobileDetailBody').textContent();
  await page.locator('#mobileCloseDetail').click();
  if (version === 'actual') {
    await page.locator('.agenda-push-panel').evaluate(element => { element.open = true; });
    assert(!(await page.locator('#agendaPushSummary').textContent()).includes('activos'));
    await page.screenshot({ path: path.join(evidence, 'agenda-movil-compatibilidad.png'), fullPage: true });
  }
  await context.close();
  return results;
}

async function excelFlow(page) {
  await helpers.goto(page, 'actual', 'index.html');
  const imported = await page.evaluate(async sourceRows => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(sourceRows.map(({ __EVENT_ID, HOJA_ORIGEN, __FILA_ORIGEN, ...record }) => record));
    XLSX.utils.book_append_sheet(workbook, sheet, 'OCTUBRE');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const parsed = await ExcelFileSync.importFile(new File([bytes], 'Verificacion-agendas.xlsx'));
    return { count: parsed.rows.length, ids: parsed.rows.map(record => record.__EVENT_ID), sheets: parsed.sheets };
  }, fixtures);
  assert.equal(imported.count, fixtures.length);
  assert.equal(new Set(imported.ids).size, fixtures.length);
  assert.deepEqual(imported.sheets, ['OCTUBRE']);
  await helpers.goto(page, 'actual', 'eventos.html');
  await page.locator('#toggleFiltersBtn').click();
  await page.locator('#search').fill('Horizonte');
  await page.locator('#dataTable .agenda-generate-action,.agenda-details-action').click();
  assert.equal(await page.locator('#agendaSelectedCompany').textContent(), 'Empresa Horizonte');
  await page.locator('#closeEventAgenda').click();
  await seed(page);
  check('Importación XLSX real: cinco identificadores originales únicos, hoja mensual y generación del evento correcto después de cargar el archivo');
}

async function responsive(page) {
  const files = ['index.html', 'eventos.html', 'minuta.html', 'agendas.html', 'usuarios.html', 'configuracion.html', 'validacion.html', 'laboratorio.html'];
  const widths = [1440, 1024, 768, 390, 360];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const file of files) {
      await helpers.goto(page, 'actual', file);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${file}: overflow ${width}`);
      if (file === 'index.html') {
        assert.equal(await page.locator('.operations-menu .module-card').count(), 4);
        assert(!/Respaldos|Diagnóstico|Auditoría|Equipos/.test(await page.locator('body').innerText()));
        if (width === 1440 || width === 390) await page.screenshot({ path: path.join(evidence, `inicio-${width}.png`), fullPage: true });
      }
      if (file === 'agendas.html') {
        await page.locator('#agendasEventList button').first().click();
        const rect = await page.locator('.event-agenda-dialog').boundingBox();
        assert(rect.x >= 0 && rect.x + rect.width <= width + 1);
        if (width === 390) await page.screenshot({ path: path.join(evidence, 'agenda-modal-movil.png'), fullPage: true });
        await page.locator('#closeEventAgenda').click();
      }
    }
  }
  check('40 revisiones de pantalla y cinco tamaños del modal sin desbordamiento; cuatro módulos principales y secciones retiradas ausentes');
}

async function offlineFlow() {
  const context = await helpers.contextFor('actual', { installed: true, serviceWorkers: 'allow', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/actual/agenda_movil.html`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  await page.reload();
  await page.waitForFunction(() => window.__RPT_AGENDA_EVENTS__?.length > 0);
  const before = await page.locator('#mobileAgenda').textContent();
  const cache = await page.evaluate(async () => {
    const names = await caches.keys();
    const name = names.find(value => value.startsWith('rpt-shell-')&&value.includes('-4.0.0-'));
    const storage = await caches.open(name);
    return (await storage.keys()).map(request => request.url);
  });
  assert(cache.some(url => url.endsWith('/js/maintenance-guard.js')));
  assert(cache.some(url => url.endsWith('/agenda.webmanifest')));
  assert(cache.some(url => url.endsWith('/agendas.html')));
  assert(!cache.some(url => /(?:auditoria|diagnostico|equipos|respaldos)\.html/.test(url)));
  await context.route('https://www.gstatic.com/**', route => route.abort());
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible' && window.__RPT_AGENDA_EVENTS__?.length > 0);
  assert.equal(await page.locator('#mobileAgenda').textContent(), before);
  assert(await page.locator('#agendaRequirementsGate').isHidden());
  await page.screenshot({ path: path.join(evidence, 'agenda-movil-offline.png'), fullPage: true });
  await page.evaluate(() => localStorage.setItem('rptMaintenanceCacheV1', JSON.stringify({ pages: { agenda_movil: { active: true, startsAt: '2026-10-27T14:00:00Z', until: '2026-10-28T14:00:00Z', durationMs: 86400000, message: 'Mantenimiento de verificación' } } })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/mantenimiento.html?**');
  assert.equal(await page.locator('#maintenanceModule').textContent(), 'Agenda Móvil');
  await context.close();
  check('PWA real: instalación del único worker, recursos versionados y manifest cacheados; Agenda Móvil visible con datos offline y mantenimiento vigente respetado');
}

async function main() {
  ({ baseUrl } = await helpers.start());
  const flows = {};
  let actualPage;
  for (const version of ['original', 'actual']) {
    const context = await helpers.contextFor(version);
    const page = await helpers.login(context, version);
    await seed(page);
    flows[version] = { events: await eventsFlow(page, version), minute: await minuteFlow(page, version), mobile: await mobileFlow(version) };
    if (version === 'actual') actualPage = page;
    else await context.close();
    process.stdout.write(`FLOW ${version}: eventos, minuta y agenda móvil\n`);
  }
  assert.deepEqual(flows.actual, flows.original);
  check('Regresión comparativa: filtros y datos de Eventos, fechas/coworking de Minuta y vistas/filtros/detalle de Agenda Móvil idénticos');
  const primaryErrors = [...helpers.results.pageErrors];
  const primaryMissing = [...helpers.results.missingLocal];
  const primaryConsoleErrors = [...helpers.results.consoleErrors];
  assert.equal(primaryErrors.length, 0, JSON.stringify(primaryErrors));
  assert.equal(primaryMissing.length, 0, JSON.stringify(primaryMissing));
  assert.equal(primaryConsoleErrors.length, 0, JSON.stringify(primaryConsoleErrors));
  assert.equal(helpers.results.pageErrors.length, 0, JSON.stringify(helpers.results.pageErrors));
  check('Sin excepciones JavaScript ni recursos locales inexistentes en la prueba principal');
  fs.writeFileSync(path.join(evidence, 'pruebas-browser.json'), JSON.stringify({ passed, primaryErrors, primaryMissing, primaryConsoleErrors, errors: helpers.results.pageErrors, consoleErrors: helpers.results.consoleErrors, notes: ['Firebase sustituido por servicio controlado. Instalación y permisos se simulan salvo la instalación real del service worker local. No se probó un teléfono físico.'] }, null, 2));
}

main().catch(error => {
  fs.writeFileSync(path.join(evidence, 'pruebas-browser-fallo.json'), JSON.stringify({ passed, error: error.stack, pageErrors: helpers.results.pageErrors, missing: helpers.results.missingLocal }, null, 2));
  console.error(error);
  process.exitCode = 1;
}).finally(helpers.finish);
