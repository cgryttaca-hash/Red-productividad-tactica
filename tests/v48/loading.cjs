const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),h=require('./helper.cjs'),passed=[];
const pass=text=>{passed.push(text);console.log('PASS '+text);};
async function main(){
 const{baseUrl}=await h.start(),context=await h.contextFor('actual'),page=await h.login(context,'actual');await h.authorize(page);
 const fresh=await h.contextFor('actual'),root=path.resolve(__dirname,'../..');
 for(const file of fs.readdirSync(root).filter(name=>name.endsWith('.html'))){
  if(['administracion.html','usuarios.html','configuracion.html','validacion.html','laboratorio.html','recuperacion.html','asistente.html'].includes(file))await h.authorize(page);
  const target=['login.html','agenda_movil.html'].includes(file)?await fresh.newPage():page;
  await target.evaluate(()=>sessionStorage.removeItem('rptNavigationScope')).catch(()=>{});
  const source=fs.readFileSync(path.join(root,file),'utf8'),scripts=[...source.matchAll(/data-device-src="([^"]+)"/g)].map(match=>match[1]),script=scripts.find(name=>name!=='js/loading.js');assert(script,file);
  let release,complete;const pause=new Promise(resolve=>release=resolve),handled=new Promise(resolve=>complete=resolve),url=new URL(script,baseUrl+'/actual/').href;
  const handler=async route=>{await pause;try{await route.continue();}finally{complete();}};await target.route(url,handler);
  await target.goto(baseUrl+'/actual/'+file,{waitUntil:'domcontentloaded'});
  await target.locator('#rptPagePreloader svg').waitFor();assert(new URL(target.url()).pathname.endsWith('/'+file),target.url());assert(await target.locator('#rptPagePreloader').isVisible(),file);
  assert.equal(await target.evaluate(()=>RPTPageLoad.state.ready),false,file);
  assert.equal(await target.locator('#rptPagePreloader progress').count(),0,file);
  const text=await target.locator('#rptPagePreloader .rpt-loading-text').textContent();assert(!/[\u00c3\ufffd]/.test(text),file+' '+text);
  if(['index.html','minuta.html','agenda_movil.html'].includes(file))await target.screenshot({path:path.join(h.out,'carga-'+file.replace('.html','.png')),fullPage:true});
  release();await handled;await target.unroute(url,handler);await target.waitForFunction(()=>window.RPTPageLoad?.state.ready&&window.__RPT_PAGE_SCRIPTS_READY__);assert(await target.locator('#rptPagePreloader').isHidden(),file);
  pass(file+': preloader con icono visible mientras falta un recurso real y oculto al terminar, sin porcentaje inventado');
 }
 await h.authorize(page);await page.waitForFunction(()=>window.RPTLoading&&window.__RPT_PAGE_SCRIPTS_READY__);
 for(const[id,text]of [['excel-qa','Preparando Archivo Maestro de Eventos'],['firebase-qa','Estableciendo conexión'],['loginForm','Validando acceso'],['adminAccessForm','Validando acceso administrativo']]){
  await page.evaluate(id=>{RPTLoading.run(id,'Ensayo',()=>new Promise(resolve=>window.__finishLoad=resolve));},id);
  await page.locator('#operationStatus').filter({hasText:text}).waitFor();assert(await page.locator('#operationStatus').isVisible());
  if(id==='excel-qa')await page.screenshot({path:path.join(h.out,'preloader-excel.png'),fullPage:true});
  await page.evaluate(()=>window.__finishLoad());await page.waitForFunction(()=>document.getElementById('operationStatus').hidden);pass(text+': ligado a la promesa de trabajo y retirado al resolverla');
 }
 await page.evaluate(()=>{window.__qaAttempt=0;RPTLoading.run('qa-retry','Ensayo',async()=>{if(++window.__qaAttempt===1)throw Error('Fallo de ensayo');}).catch(()=>{});});await page.locator('#operationStatus button').filter({hasText:'Reintentar'}).click();await page.waitForFunction(()=>window.__qaAttempt===2&&document.getElementById('operationStatus').hidden);pass('Fallo real de una promesa y reintento único sin duplicar la operación');
 await page.route('**/js/operating-center.js',route=>route.abort());await page.goto(baseUrl+'/actual/index.html');await page.locator('#rptPageRetry').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>RPTPageLoad.state.ready),false);await page.screenshot({path:path.join(h.out,'preloader-error.png'),fullPage:true});pass('Fallo de recurso inicial conserva el error y ofrece reintento sin declarar lista la página');
 assert.equal(h.results.pageErrors.length,0,JSON.stringify(h.results.pageErrors));h.save('preloaders',{passed,pageErrors:h.results.pageErrors,limits:['Carga de recursos y promesas demoradas por el ensayo local; no se añade espera al producto.']});await context.close();await fresh.close();
}
main().catch(error=>{console.error(error);h.save('preloaders-fallo',{passed,error:error.stack,pageErrors:h.results.pageErrors});process.exitCode=1;}).finally(h.finish);
