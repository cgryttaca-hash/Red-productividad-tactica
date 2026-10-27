const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const helpers = require('./verify.cjs');

async function main() {
  const { baseUrl } = await helpers.start();
  const context = await helpers.contextFor('actual');
  const page = await helpers.login(context, 'actual');
  for (const [label, file] of [['Agenda de eventos', 'eventos.html'], ['Minuta', 'minuta.html']]) {
    await helpers.goto(page, 'actual', 'index.html');
    await page.locator('.module-card').filter({ hasText: label }).click();
    await page.waitForURL(`**/${file}`);
    await page.locator(file === 'eventos.html' ? '#btnInicio' : '#btnBack').click();
    await page.waitForURL('**/index.html');
  }
  await helpers.goto(page, 'actual', 'index.html');
  const popupPromise = context.waitForEvent('page');
  await page.locator('.module-card[href="agenda_movil.html"]').click();
  const popup = await popupPromise;
  await popup.waitForURL('**/agenda_movil.html');
  await popup.close();
  helpers.check('Navegación real de las tres tarjetas; Eventos y Minuta regresan al inicio y Agenda Móvil abre en otra pestaña');

  await page.locator('#excelSyncControl').click();
  assert.equal(await page.locator('#excelSyncModal').getAttribute('aria-hidden'), 'false');
  await page.locator('#excelSyncClose').click();
  await page.locator('#firebaseSyncControl').click();
  assert.equal(await page.locator('#firebaseSyncModal').getAttribute('aria-hidden'), 'false');
  assert(await page.locator('#firebaseLoginForm').isVisible());
  await page.screenshot({ path: path.join(helpers.evidence, 'publicacion-modal.png'), fullPage: true });
  await page.locator('.firebase-sync-close').click();
  await page.locator('[data-activity-tab="errors"]').click();
  assert(await page.locator('[data-activity-view="errors"]').isVisible());
  await page.locator('[data-activity-tab="mobile"]').click();
  assert(await page.locator('[data-activity-view="mobile"]').isVisible());
  await page.locator('#refreshDashboard').click();
  helpers.check('Modales de Excel y publicación, pestañas de actividad y actualización del panel operativas');

  await page.evaluate(async () => {
    const auth = await import('./js/local-auth.js');
    await auth.createUser({ username: 'consulta', displayName: 'Consulta', password: 'ClavePrueba2026', role: 'viewer' });
  });
  await page.locator('#logoutButton').click();
  await page.waitForURL('**/login.html');
  await page.locator('#username').fill('consulta');
  await page.locator('#password').fill('ClavePrueba2026');
  await page.locator('#loginButton').click();
  await page.waitForURL('**/index.html');
  assert(await page.locator('#usersLink').isHidden());
  assert(await page.locator('#configLink').isHidden());
  assert(await page.locator('[data-admin-only]').isHidden());
  await page.goto(`${baseUrl}/actual/configuracion.html`);
  await page.waitForURL('**/index.html');
  helpers.check('Usuario de consulta: inicio de sesión y permisos administrativos originales conservados');
  await context.close();

  const offline = {};
  for (const version of ['original', 'actual']) {
    const pwa = await helpers.contextFor(version, { serviceWorkers: 'allow' });
    const pwaPage = await pwa.newPage();
    await pwaPage.goto(`${baseUrl}/${version}/login.html`);
    await pwaPage.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    const cacheName = version === 'actual' ? 'rpt-shell-3.6.4-corporate-20261027' : 'rpt-shell-3.6.4-notifications-only';
    await pwaPage.waitForFunction(async name => {
      const cache = await caches.open(name);
      return Boolean(await cache.match('./agenda_movil.html'));
    }, cacheName);
    await pwaPage.goto(`${baseUrl}/${version}/agenda_movil.html`);
    await pwaPage.waitForFunction(() => !document.documentElement.classList.contains('maintenance-pending'));
    await pwaPage.waitForTimeout(1500);
    const cachedUrls = await pwaPage.evaluate(async name => (await (await caches.open(name)).keys()).map(request => request.url), cacheName);
    if (version === 'actual') {
      assert(cachedUrls.some(file => file.endsWith('/css/corporate-ui.css')));
      assert(!cachedUrls.some(file => /\/(?:auditoria|diagnostico|equipos|respaldos)\.(?:html|js)$/.test(file)));
    }
    await pwa.setOffline(true);
    const response = await pwaPage.reload({ waitUntil: 'domcontentloaded' });
    await pwaPage.waitForTimeout(1800);
    offline[version] = await pwaPage.evaluate(() => ({ title: document.title, maintenancePending: document.documentElement.classList.contains('maintenance-pending'), stylesheetCount: document.styleSheets.length, scripts: [...document.scripts].map(script => script.src.split('/').pop()), bodyVisibility: getComputedStyle(document.body).visibility }));
    offline[version].status = response.status();
    offline[version].cachedUrls = cachedUrls;
    assert.equal(offline[version].title, 'Agenda de eventos');
    assert.equal(offline[version].status, 200);
    await pwa.setOffline(false);
    await pwa.close();
  }
  assert.equal(offline.actual.maintenancePending, offline.original.maintenancePending);
  assert.equal(offline.actual.stylesheetCount, offline.original.stylesheetCount);
  assert.equal(offline.actual.bodyVisibility, offline.original.bodyVisibility);
  helpers.results.offline = offline;
  helpers.check('Service worker real: instalación, precarga del nuevo CSS y exclusión de rutas retiradas correctas');
  helpers.check('Agenda Móvil offline: HTML servido desde caché y mismo estado de visibilidad que el original');
  if (offline.actual.maintenancePending) helpers.results.notes.push('La recarga offline conserva maintenance-pending tanto en el ZIP original como en el actualizado en este entorno de prueba. La apertura operativa offline completa queda pendiente de comprobar con la PWA instalada y la caché real del dispositivo.');

  const browserErrors = helpers.results.pageErrors.filter(item => !item.url.includes('/agenda_movil.html') || !item.message.includes('Failed to fetch'));
  assert.equal(browserErrors.length, 0, JSON.stringify(browserErrors));
  fs.writeFileSync(path.join(helpers.evidence, 'pruebas-complementarias.json'), JSON.stringify(helpers.results, null, 2));
}

main().catch(error => {
  helpers.results.failure = { message: error.message, stack: error.stack };
  fs.writeFileSync(path.join(helpers.evidence, 'pruebas-complementarias.json'), JSON.stringify(helpers.results, null, 2));
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
}).finally(helpers.finish);
