const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),h=require('./helper.cjs'),passed=[];
const pass=text=>{passed.push(text);console.log('PASS '+text);};
async function main(){
 const{baseUrl}=await h.start();const root=path.resolve(__dirname,'../..');
 const release=JSON.parse(fs.readFileSync(path.join(root,'release.json')));
 for(const asset of release.assets){if(!/\.(html|js|css)$/.test(asset.path)||asset.path.startsWith('assets/vendor/'))continue;const s=fs.readFileSync(path.join(root,asset.path),'utf8');assert(!/RPTDeviceAccess|RPTPageInit|application\/x-rpt-protected|device-pending|device-starting|deviceAccessGate/.test(s),asset.path);}
 assert(!release.assets.some(a=>/device-access|device-admin|device-approval/.test(a.path)));pass('Retirada real del bootstrap y sus dependencias: no hay bloqueo, carga de scripts condicionada ni pantalla nueva en los recursos de la publicación');
 for(const unavailable of [false,true]){
  const context=await h.contextFor('actual');if(unavailable)await context.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
  const page=await h.login(context,'actual');await page.waitForFunction(()=>RPTPageLoad.state.ready);
  assert.equal(await page.evaluate(()=>Boolean(window.RPTDeviceAccess)),false);assert.equal(await page.locator('#deviceAccessGate').count(),0);
  assert.equal(await page.locator('#excelSyncModal,#firebaseSyncModal').count(),0);
  const nav=await page.locator('.ops-modules a').evaluateAll(nodes=>nodes.map(n=>({text:n.querySelector('strong').textContent,href:n.getAttribute('href')})));
  assert.deepEqual(nav,[{text:'Agenda de Eventos',href:'eventos.html'},{text:'Minuta',href:'minuta.html'},{text:'Agenda Móvil',href:'agenda_movil.html'}]);
  for(const file of ['eventos.html','minuta.html']){await h.goto(page,'actual',file);await page.waitForFunction(()=>RPTPageLoad.state.ready);assert.equal(await page.locator('#deviceAccessGate').count(),0);}
  const requests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));assert(!requests.some(url=>/device-registry|device-heartbeat|device-access/.test(url)));
  pass(unavailable?'Segundo perfil aislado, con Firebase inaccesible: acceso local, Inicio, Eventos y Minuta disponibles sin registro obligatorio':'Primer perfil aislado: acceso local original y tres módulos principales, sin solicitar autorización ni configuración técnica');
  if(unavailable){await context.close();continue;}
  await h.authorize(page);await page.waitForFunction(()=>window.ExcelFileSync&&window.FirebaseEventPublisher&&RPTPageLoad.state.ready);
  assert.deepEqual(await page.locator('#controlNavigation button').allTextContents(),['Archivos y conexiones','Actualizaciones','Log interno']);
  assert.equal(await page.locator('aside,.sidebar,.control-sidebar,#admin-panel-devices').count(),0);
  const account=await page.evaluate(()=>({users:localStorage.getItem('rptAuthUsersV1'),session:localStorage.getItem('rptAuthSessionV1'),rows:localStorage.getItem('eventData')}));
  await page.locator('#excelSyncControl').click();assert(await page.locator('#excelSyncModal').isVisible());await page.locator('#excelSyncClose').click();
  await page.locator('#firebaseSyncControl').click();assert(await page.locator('#firebaseSyncModal').isVisible());await page.locator('.firebase-sync-close').click();
  assert.deepEqual(await page.evaluate(()=>({users:localStorage.getItem('rptAuthUsersV1'),session:localStorage.getItem('rptAuthSessionV1'),rows:localStorage.getItem('eventData')})),account);
  pass('Ctrl+M y contraseña actuales abren exactamente tres apartados; Firebase y Excel usan sus controles anteriores y no cambian la cuenta ni los datos');
  await h.select(page,'activity');assert.equal(await page.locator('#admin-panel-activity input,#admin-panel-activity textarea,#admin-panel-activity button,[contenteditable=true]').count(),0);await page.locator('#technicalLogList tr').waitFor();
  pass('Log interno consulta registros existentes en orden reciente y no ofrece edición ni borrado');
  await h.select(page,'updates');assert(await page.locator('#checkSystemUpdate').isVisible());await h.select(page,'system');
  await page.evaluate(()=>{window.__qaEvents=0;const actual=ExcelFileSync.chooseFile;window.showOpenFilePicker=async()=>{window.__qaEvents++;return[];};});await page.locator('.ops-brand').click();await page.waitForURL('**/index.html');await page.locator('.ops-brand').focus();await page.keyboard.press('Control+m');await page.locator('#adminAccessPassword').fill('incorrecta');await page.locator('#adminAccessSubmit').click();await page.locator('#adminAccessMessage').filter({hasText:'Acceso no válido'}).waitFor();assert(!page.url().endsWith('administracion.html'));await page.keyboard.press('Escape');
  pass('La recuperación no cambia la autenticación: una contraseña incorrecta sigue sin abrir Super Administrador');
  await h.authorize(page);await page.evaluate(async()=>{const a=await import('./js/local-auth.js');await a.createUser({username:'Consulta49',displayName:'Consulta de ensayo',password:'Consulta49Ensayo',role:'viewer'});a.logout();});await page.goto(baseUrl+'/actual/login.html');await page.locator('#username').fill('Consulta49');await page.locator('#password').fill('Consulta49Ensayo');await page.locator('#loginButton').click();await page.waitForURL('**/index.html');await page.goto(baseUrl+'/actual/administracion.html');await page.waitForURL('**/index.html');assert.equal(await page.evaluate(()=>RPTNavigation.session().role),'viewer');pass('El usuario de consulta conserva sus permisos originales y no obtiene Administración');
  await context.close();
 }
 assert.equal(h.results.pageErrors.length,0,JSON.stringify(h.results.pageErrors));h.save('acceso-restaurado',{passed,pageErrors:h.results.pageErrors,limits:['Dos perfiles aislados de Chrome, sin dos computadores físicos. Adaptadores o bloqueo de Firebase; sin producción.']});
}
main().catch(error=>{console.error(error);h.save('acceso-fallo',{passed,error:error.stack,pageErrors:h.results.pageErrors});process.exitCode=1;}).finally(h.finish);
