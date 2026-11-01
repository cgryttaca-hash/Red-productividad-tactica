const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),h=require('./helper.cjs'),legacy=require('../v48/helper.cjs');
const app=path.resolve(__dirname,'../..'),broken=path.resolve(process.env.BROKEN_PROJECT_PATH),release=JSON.parse(fs.readFileSync(path.join(app,'release.json')));
let lastPage;
async function main(){
 assert.equal(JSON.parse(fs.readFileSync(path.join(broken,'package.json'))).version,'4.8.0');h.roots.actual=broken;await h.start();
 const context=await legacy.contextFor('actual',{serviceWorkers:'allow'});let page=await h.login(context,'actual');lastPage=page;await h.authorize(page);await h.select(page,'updates');await page.waitForFunction(()=>document.getElementById('activeRelease').textContent==='4.8.0');
 await page.evaluate(()=>{RPTUpdates.setAutomatic(true);localStorage.setItem('recovery-preserve','dato-intacto');});
 const before=await page.evaluate(()=>({users:localStorage.getItem('rptAuthUsersV1'),session:localStorage.getItem('rptAuthSessionV1'),data:localStorage.getItem('eventData'),device:localStorage.getItem('rptAuthDeviceV1')}));
 context.qaRecords.get=()=>{throw Error('Firebase no confirma el equipo en el ensayo');};
 await page.reload();await page.locator('#deviceGateState').filter({hasText:'No se pudo confirmar con Firebase'}).waitFor();assert.equal(await page.evaluate(()=>Boolean(window.RPTUpdates)),false);
 h.roots.actual=app;
 // Equivalente controlado de obtener los archivos actuales sin pasar por el worker antiguo.
 // No se borra ni desregistra el worker, IndexedDB, localStorage o datos del usuario.
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBypassServiceWorker',{bypass:true});await page.reload();
 await page.waitForFunction(()=>window.RPTPageLoad?.state.ready&&window.RPTUpdates?.version==='4.9.0');assert.equal(await page.locator('#deviceAccessGate').count(),0);
 await page.evaluate(()=>RPTUpdates.check());await page.waitForFunction(()=>document.getElementById('activeRelease')?.textContent==='4.9.0',{},{timeout:45000});
 assert.equal((await page.evaluate(()=>RPTUpdates.status())).active.version,release.version);
 await cdp.send('Network.setBypassServiceWorker',{bypass:false});const reopenURL=new URL('index.html',page.url()).href;await page.close();page=await context.newPage();lastPage=page;await page.goto(reopenURL);await page.waitForFunction(()=>RPTPageLoad.state.ready&&RPTUpdates.version==='4.9.0');
 assert.deepEqual(await page.evaluate(()=>({users:localStorage.getItem('rptAuthUsersV1'),session:localStorage.getItem('rptAuthSessionV1'),data:localStorage.getItem('eventData'),device:localStorage.getItem('rptAuthDeviceV1')})),before);
 assert.equal(await page.evaluate(()=>localStorage.getItem('recovery-preserve')),'dato-intacto');assert.equal(await page.evaluate(()=>Boolean(window.RPTDeviceAccess)),false);
 await h.authorize(page);assert.deepEqual(await page.locator('#controlNavigation button').allTextContents(),['Archivos y conexiones','Actualizaciones','Log interno']);
 const status=await page.evaluate(()=>RPTUpdates.status());assert.equal(status.active.digest,release.digest);
 const passed=['Reproducido el bloqueo 4.8 instalado: Firebase no confirma el equipo y el gestor de actualización no llega a cargarse','Recuperación 4.8 → 4.9 con descarga directa inicial y después worker 4.9 activo: desaparece la autorización obligatoria y se conservan usuarios, sesión, datos y configuración local','Ctrl+M funciona tras la recuperación y muestra únicamente los tres apartados solicitados'];
 h.save('recuperacion-48',{passed,status,limits:['Service Workers y cachés reales en HTTP local. La descarga inicial sin el worker antiguo se simula con Network.setBypassServiceWorker de Chrome; no se prueba un atajo físico en el equipo del usuario.','Firebase interceptado en el ensayo; no se escribe producción. Si 4.8 ya bloquea una PWA instalada, puede ser necesaria una recarga forzada inicial tras publicar 4.9.']});passed.forEach(v=>console.log('PASS '+v));await context.close();
}
main().catch(async error=>{console.error(error);let diagnostic;if(lastPage&&!lastPage.isClosed())diagnostic=await lastPage.evaluate(()=>({url:location.pathname,load:window.RPTPageLoad?.state,device:window.RPTDeviceAccess?.state,classes:document.documentElement.className,version:window.RPTUpdates?.version,state:window.RPTUpdates?.state,html:document.documentElement.outerHTML.slice(-2000)}));console.log('DIAGNOSTICO',diagnostic);h.save('recuperacion-48-fallo',{error:error.stack,diagnostic,pageErrors:h.results.pageErrors});process.exitCode=1;}).finally(h.finish);
