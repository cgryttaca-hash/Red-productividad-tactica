const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
process.env.ORIGINAL_PROJECT_PATH ||= path.join(__dirname,'base/Red-productividad-tactica-main');
process.env.ACTUAL_PROJECT_PATH ||= path.join(__dirname,'app');
process.env.TEST_OUTPUT_PATH ||= path.join(__dirname,'evidence');
process.env.TEST_VENDOR_PATH ||= 'C:/Users/user/Documents/Codex/2026-10-27/referenced-chatgpt-conversation-this-is-an/work/vendor';
const helpers=require('./verify-helpers.cjs');
const {webkit}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const passed=[];
const check=name=>{passed.push(name);console.log(`PASS ${name}`);};
let safari;
let updateServer;
const authMock=`export const browserLocalPersistence={};const auth={currentUser:{uid:'push-test-user',getIdToken:async()=>'test-id-token'},authStateReady:async()=>{}};export const getAuth=()=>auth;export const setPersistence=async()=>{};export const signInAnonymously=async()=>({user:auth.currentUser});export const onAuthStateChanged=(value,callback)=>{queueMicrotask(()=>callback(value.currentUser));return()=>{}};`;

async function activation(baseUrl){
  const context=await helpers.contextFor('actual',{viewport:{width:390,height:844}});
  const curve=crypto.createECDH('prime256v1');curve.generateKeys();
  const publicKey=curve.getPublicKey().toString('base64url');
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/flow-test',keys:{p256dh:publicKey,auth:crypto.randomBytes(16).toString('base64url')}};
  const calls=[];
  let registered=false,verified=false,providerDown=false;
  await context.route('**/js/push-config.js',route=>route.fulfill({contentType:'text/javascript',body:"export const PUSH_CONFIG={apiBaseUrl:'https://push.example'};"}));
  await context.route('**/firebase-auth.js',route=>route.fulfill({contentType:'text/javascript',body:authMock,headers:{'Access-Control-Allow-Origin':'*'}}));
  await context.route('**/firebase-messaging.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:`export const isSupported=async()=>true;export const getMessaging=()=>({});export const getToken=async(messaging,options)=>{if(!window.__installed||window.__permission!=='granted')throw new Error('FCM requested before consent');window.__tokens++;window.__sameWorker=options.serviceWorkerRegistration===window.__registration;return window.__token;};export const deleteToken=async()=>{window.__deleted++;return true;};`}));
  await context.route('https://push.example/**',async route=>{
    const request=route.request();
    const headers={'Access-Control-Allow-Origin':baseUrl,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
    const endpoint=new URL(request.url()).pathname;
    calls.push({endpoint,method:request.method(),body:request.postDataJSON()});
    if(endpoint==='/config')return route.fulfill({headers,json:{publicKey,fcmEnabled:true,projectId:'red-productividad-tactica'}});
    assert.equal(request.headers().authorization,'Bearer test-id-token');
    if(endpoint==='/subscriptions'){
      if(request.method()==='DELETE'){registered=false;verified=false;}
      else{registered=true;assert.equal(request.postDataJSON().transport,'fcm');}
      return route.fulfill({headers,json:{registered,sendVerified:verified,transport:'fcm'}});
    }
    if(endpoint==='/test'){
      if(providerDown)return route.fulfill({headers,status:502,json:{error:'Proveedor de prueba no confirmó el envío'}});
      verified=true;return route.fulfill({headers,json:{accepted:true,providerId:'controlled-provider-id'}});
    }
    return route.fulfill({headers,json:{registered,sendVerified:verified}});
  });
  await context.addInitScript(({subscription,bytes,scope})=>{
    window.__installed=false;window.__permission='default';window.__permissionCalls=0;window.__tokens=0;window.__subscribes=0;window.__registrations=0;window.__deleted=0;window.__token='test-fcm-token-from-sdk-01234567890123456789';
    let current;
    const nativeMedia=matchMedia.bind(window);
    window.matchMedia=query=>query==='(display-mode: standalone)'?{get matches(){return window.__installed;},addEventListener(){},removeEventListener(){}}:nativeMedia(query);
    Object.defineProperty(Notification,'permission',{get:()=>window.__permission,configurable:true});
    Notification.requestPermission=async()=>{window.__permissionCalls++;window.__gesture=navigator.userActivation.isActive;window.__permission='granted';return'granted';};
    window.__registration={scope,active:{postMessage(){}},addEventListener(){},update:async()=>{},pushManager:{getSubscription:async()=>current,subscribe:async()=>{if(!window.__installed||window.__permission!=='granted')throw new Error('Subscribed before consent');window.__subscribes++;current={endpoint:subscription.endpoint,options:{applicationServerKey:new Uint8Array(bytes).buffer},toJSON:()=>subscription,unsubscribe:async()=>{current=null;return true;}};return current;}}};
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register:async()=>{window.__registrations++;return window.__registration;},getRegistration:async()=>window.__registration,ready:Promise.resolve(window.__registration),addEventListener(){}}});
  },{subscription,bytes:[...curve.getPublicKey()],scope:`${baseUrl}/actual/`});
  const page=await context.newPage();
  await helpers.goto(page,'actual','agenda_movil.html');
  await page.locator('[data-view="all"]').click();
  assert.equal(await page.locator('.event-summary-row').count(),5);
  assert.equal(await page.locator('#agendaPushStatus').getAttribute('data-state'),'not-installed');
  assert(await page.locator('#agendaPushActions').isHidden());
  assert.equal(calls.length,0);
  assert.deepEqual(await page.evaluate(()=>[window.__permissionCalls,window.__tokens,window.__subscribes]),[0,0,0]);
  await page.evaluate(async()=>{
    await Promise.all([import('./js/pwa.js?duplicate-one'),import('./js/pwa.js?duplicate-two')]);
    const event=new Event('beforeinstallprompt',{cancelable:true});
    event.prompt=async()=>{window.__installCalls=(window.__installCalls||0)+1;};event.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(event);
  });
  await page.locator('#agendaRequirementsGate').evaluate(element=>{element.open=true;});
  await page.locator('#agendaInstallButton').click();
  assert.equal(await page.evaluate(()=>window.__installCalls),1);
  assert.equal(await page.evaluate(()=>window.__registrations),1);
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
  assert.equal(calls.length,0);
  await page.evaluate(()=>{window.__installed=true;window.dispatchEvent(new Event('focus'));});
  await page.waitForFunction(()=>document.getElementById('agendaEnablePush').disabled===false);
  assert.equal(calls.filter(call=>call.endpoint==='/config').length,1);
  assert.deepEqual(await page.evaluate(()=>[window.__permissionCalls,window.__tokens,window.__subscribes]),[0,0,0]);
  await page.locator('.agenda-push-panel').evaluate(element=>{element.open=true;});
  await page.locator('#agendaEnablePush').click();
  await page.waitForFunction(()=>window.__RPT_PUSH_STATUS__?.state==='active');
  assert.deepEqual(await page.evaluate(()=>[window.__permissionCalls,window.__tokens,window.__subscribes,window.__gesture,window.__sameWorker]),[1,1,1,true,true]);
  assert.equal(calls.filter(call=>call.endpoint==='/test').length,1);
  const checked=calls.length;
  await page.evaluate(()=>{for(let repeat=0;repeat<5;repeat++)window.dispatchEvent(new Event('focus'));});
  await page.waitForTimeout(100);assert.equal(calls.length,checked);
  await page.locator('#agendaCheckPush').click();
  await page.waitForFunction(()=>!document.getElementById('agendaCheckPush').disabled);
  assert.equal(await page.evaluate(()=>window.__subscribes),1);
  await page.locator('#agendaDisablePush').click();
  await page.waitForFunction(()=>window.__RPT_PUSH_STATUS__?.state==='inactive');
  assert.equal(await page.evaluate(()=>window.__deleted),1);
  providerDown=true;
  await page.locator('#agendaEnablePush').click();
  await page.waitForFunction(()=>window.__RPT_PUSH_STATUS__?.state==='registered');
  assert(!(await page.locator('#agendaPushSummary').textContent()).includes('activas'));
  providerDown=false;
  await page.locator('#agendaTestPush').click();
  await page.waitForFunction(()=>window.__RPT_PUSH_STATUS__?.state==='active');
  await page.locator('#agendaDisablePush').click();
  await page.waitForFunction(()=>window.__RPT_PUSH_STATUS__?.state==='inactive');
  await page.evaluate(()=>{window.__permission='denied';});
  await page.locator('#agendaCheckPush').click();
  await page.waitForFunction(()=>window.__RPT_PUSH_STATUS__?.state==='denied');
  assert.equal(await page.evaluate(()=>window.__permissionCalls),1);
  await page.screenshot({path:path.join(process.env.TEST_OUTPUT_PATH,'flujo-permiso-denegado.png'),fullPage:true});
  await context.close();
  check('Navegador sin instalar: consulta libre, cero permisos/tokens/registros push; instalación nativa única y apertura instalada diferenciadas');
  check('PWA instalada: configuración previa, permiso tras clic real, FCM con el mismo worker, registro y prueba de envío antes de indicar avisos activos');
  check('Fallo del proveedor sin falso activo; prueba posterior, baja, renovación sin suscripción duplicada y permiso denegado sin nuevas solicitudes');
}

async function unconfigured(){
  const context=await helpers.contextFor('actual',{installed:true,viewport:{width:390,height:844}});
  await context.addInitScript(()=>{window.__permissionCalls=0;Notification.requestPermission=async()=>{window.__permissionCalls++;return'granted';};});
  const page=await context.newPage();
  await helpers.goto(page,'actual','agenda_movil.html');
  await page.locator('.agenda-push-panel').evaluate(element=>{element.open=true;});
  assert.equal(await page.locator('#agendaPushStatus').getAttribute('data-state'),'unconfigured');
  assert((await page.locator('#agendaPushStatus').textContent()).includes('PUSH_CONFIG.apiBaseUrl'));
  assert(await page.locator('#agendaEnablePush').isDisabled());
  assert.equal(await page.evaluate(()=>window.__permissionCalls),0);
  await page.locator('[data-view="all"]').click();
  await page.locator('.event-summary-row').first().click();
  assert(await page.locator('#mobileDetailModal').isVisible());
  await context.close();
  check('Configuración real pendiente visible y específica, sin solicitar permisos ni impedir filtros o detalle');
}

async function unsupportedConfiguration(){
  const context=await helpers.contextFor('actual');
  await context.addInitScript(()=>{delete window.Notification;});
  const page=await helpers.login(context,'actual');
  await helpers.goto(page,'actual','configuracion.html');
  assert(await page.locator('#enableNotifications').isDisabled());
  assert((await page.locator('#notificationState').textContent()).includes('instalar'));
  await context.close();
  check('Configuración funciona en navegador sin API Notification; autorización deshabilitada antes de instalar y preferencias disponibles');
}

async function visual(baseUrl){
  const sizes=[];
  for(const version of ['original','actual']){
    const context=await helpers.contextFor(version,{installed:true,viewport:{width:390,height:844}});
    const page=await context.newPage();await helpers.goto(page,version,'agenda_movil.html');
    await page.locator('[data-view="all"]').click();await page.locator('#mobileSearch').fill('Horizonte');
    sizes.push({version,card:(await page.locator('.event-summary-row').first().boundingBox()).height,header:(await page.locator('.agenda-header').boundingBox()).height});
    if(version==='actual'){
      for(const width of [320,360,390,768,844,1024,1440]){
        await page.setViewportSize({width,height:width===844?390:844});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Agenda ${width}`);
        await page.locator('.event-summary-row').first().click();
        const box=await page.locator('.detail-dialog').boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
        if(width===390)await page.screenshot({path:path.join(process.env.TEST_OUTPUT_PATH,'agenda-compacta-detalle.png'),fullPage:true});
        await page.locator('#mobileCloseDetail').click();
        if(width===390||width===1440)await page.screenshot({path:path.join(process.env.TEST_OUTPUT_PATH,`agenda-compacta-${width}.png`),fullPage:true});
      }
    }
    await context.close();
  }
  assert(sizes[1].card<sizes[0].card*.7,JSON.stringify(sizes));assert(sizes[1].header<sizes[0].header*.75);
  fs.writeFileSync(path.join(process.env.TEST_OUTPUT_PATH,'medicion-compactacion.json'),JSON.stringify(sizes,null,2));
  const context=await helpers.contextFor('actual');const page=await helpers.login(context,'actual');
  await context.addInitScript(()=>{if(location.pathname.endsWith('/mantenimiento.html')){window.__testMaintenance={pages:{index:{active:true,startsAt:'2026-10-27T14:00:00Z',until:'2026-10-27T16:00:00Z',durationMs:7200000,message:'Mantenimiento de prueba'}}};localStorage.setItem('rptMaintenanceCacheV1',JSON.stringify(window.__testMaintenance));}});
  const pages=fs.readdirSync(process.env.ACTUAL_PROJECT_PATH).filter(file=>file.endsWith('.html')).sort((left,right)=>left==='mantenimiento.html'?1:right==='mantenimiento.html'?-1:left.localeCompare(right));
  for(const width of [360,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    for(const file of pages){
      await page.evaluate(()=>localStorage.removeItem('rptMaintenanceCacheV1'));
      await helpers.goto(page,'actual',file);
      assert.equal(await page.locator('html').getAttribute('data-visual-theme'),'premium',file);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(244, 247, 251)',file);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${file} overflow ${width}`);
      if([390,1440].includes(width))await page.screenshot({path:path.join(process.env.TEST_OUTPUT_PATH,`${file.replace('.html','')}-${width}.png`),fullPage:true});
    }
  }
  await context.close();
  check('Agenda compacta medida frente a la base; siete anchos/orientaciones, detalle y controles preservados sin desbordamiento');
  check('Las doce páginas HTML usan el tema premium; 60 revisiones de fondo, navegación y ancho en cinco tamaños');
}

async function webkitFlow(baseUrl){
  safari=await webkit.launch({executablePath:process.env.WEBKIT_PATH||path.join(__dirname,'../browsers/webkit-2336/Playwright.exe'),headless:true});
  const source=fs.readFileSync(path.join(__dirname,'verify-helpers.cjs'),'utf8');
  const extract=name=>{const marker=`const ${name} = \``;const start=source.indexOf(marker)+marker.length;return source.slice(start,source.indexOf('`;',start));};
  for(const installed of [false,true])for(const ipad of [false,true]){
    const context=await safari.newContext({viewport:ipad?{width:820,height:1180}:{width:390,height:844},locale:'es-CO',timezoneId:'America/Bogota',isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:ipad?'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===baseUrl)return route.continue();if(url.hostname==='www.gstatic.com')return route.fulfill({contentType:'text/javascript',body:extract(url.pathname.endsWith('firebase-app.js')?'appMock':url.pathname.endsWith('firebase-auth.js')?'authMock':'firestoreMock'),headers:{'Access-Control-Allow-Origin':'*'}});return route.fulfill({status:204});});
    await context.addInitScript(({rows,installed,ipad})=>{window.__testEvents=rows;if(ipad){Object.defineProperty(navigator,'platform',{get:()=>'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});}if(installed)navigator.standalone=true;window.__permissionCalls=0;if(!('Notification'in window))window.Notification=class{};Object.defineProperty(Notification,'permission',{get:()=>'default'});Notification.requestPermission=async()=>{window.__permissionCalls++;return'granted';};},{rows:helpers.fixtureRows,installed,ipad});
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${baseUrl}/actual/agenda_movil.html`);await page.waitForFunction(()=>!document.documentElement.classList.contains('maintenance-pending'));
    await page.locator('[data-view="all"]').click();await page.locator('#mobileSearch').fill('Horizonte');await page.locator('.event-summary-row').first().click();
    assert((await page.locator('#mobileDetailBody').textContent()).includes('Salón 1'));await page.locator('#mobileCloseDetail').click();
    assert.equal(await page.evaluate(()=>window.__permissionCalls),0);
    assert.equal(await page.locator('#mobileSearch').evaluate(element=>getComputedStyle(element).fontSize),'16px');
    if(!installed){assert((await page.locator('#agendaInstallText').textContent()).includes('Safari'));assert(await page.locator('#agendaPushActions').isHidden());}
    await page.screenshot({path:path.join(process.env.TEST_OUTPUT_PATH,`webkit-${ipad?'ipad':'iphone'}-${installed?'instalada':'navegador'}.png`),fullPage:true});
    await page.setViewportSize({width:844,height:390});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(errors.length,0,JSON.stringify(errors));await context.close();
  }
  check('WebKit iPhone/iPad: consulta sin permiso en navegador y PWA simulada, guía Safari, campos de 16 px, detalle y orientación horizontal');
}

async function updateFlow(browser){
  let phase=0;
  const roots=[process.env.ORIGINAL_PROJECT_PATH,process.env.ACTUAL_PROJECT_PATH];
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
  updateServer=http.createServer((request,response)=>{const url=new URL(request.url,'http://localhost');const filename=path.resolve(roots[phase],decodeURIComponent(url.pathname).slice(1)||'index.html');if(!filename.startsWith(roots[phase]+path.sep)||!fs.existsSync(filename)){response.writeHead(404);response.end();return;}response.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});response.end(fs.readFileSync(filename));});
  await new Promise(resolve=>updateServer.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${updateServer.address().port}`;
  const context=await helpers.contextFor('actual',{installed:true,serviceWorkers:'allow',viewport:{width:390,height:844}});
  await context.route(`${origin}/**`,route=>route.continue());
  const page=await context.newPage();await page.goto(`${origin}/agenda_movil.html`);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.waitForFunction(()=>navigator.serviceWorker.controller&&window.__RPT_AGENDA_EVENTS__?.length===5);
  await page.evaluate(()=>localStorage.setItem('preserve-user-data','restoration-marker'));
  await page.locator('[data-view="all"]').click();await page.locator('#mobileFloorFilter').selectOption('Tercer piso');
  phase=1;
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
  assert(await page.locator('#pwaUpdateNotice').isVisible());
  assert.equal(await page.locator('html').getAttribute('data-visual-theme'),null);
  const reloaded=page.waitForEvent('load');await page.locator('#pwaUpdateNotice button').click();await reloaded;
  await page.waitForFunction(()=>document.documentElement.dataset.visualTheme==='premium'&&window.__RPT_AGENDA_EVENTS__?.length===5);
  assert.equal(await page.evaluate(()=>localStorage.getItem('preserve-user-data')),'restoration-marker');
  assert.equal(await page.locator('#mobileFloorFilter').inputValue(),'Tercer piso');
  const registrations=await page.evaluate(async()=>({count:(await navigator.serviceWorker.getRegistrations()).length,caches:await caches.keys()}));
  assert.equal(registrations.count,1);assert.deepEqual(registrations.caches,['rpt-shell-20261029-pwa-premium-v3']);
  await context.setOffline(true);await context.route('https://www.gstatic.com/**',route=>route.abort());await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__RPT_AGENDA_EVENTS__?.length===5&&!document.documentElement.classList.contains('maintenance-pending'));
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.agenda-app')).filter),'none');
  await context.close();await new Promise(resolve=>updateServer.close(resolve));updateServer=null;
  check('Actualización real desde el worker anterior: espera hasta aceptar, un único registro, caché anterior retirada, datos/filtros conservados y reapertura offline');
}

async function main(){
  const {baseUrl,browser}=await helpers.start();
  await activation(baseUrl);await unconfigured();await unsupportedConfiguration();await visual(baseUrl);await webkitFlow(baseUrl);await updateFlow(browser);
  assert.equal(helpers.results.pageErrors.length,0,JSON.stringify(helpers.results.pageErrors));
  assert.equal(helpers.results.missingLocal.length,0,JSON.stringify(helpers.results.missingLocal));
  fs.writeFileSync(path.join(process.env.TEST_OUTPUT_PATH,'pruebas-flujo-pwa.json'),JSON.stringify({passed,limitations:['Proveedores, permisos y Firebase controlados. Chrome/WebKit locales; instalación y recepción en teléfonos físicos no comprobadas.','La actualización del service worker y sus cachés se ejecutó realmente sobre un servidor local con dos versiones.']},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await safari?.close();if(updateServer)await new Promise(resolve=>updateServer.close(resolve));await helpers.finish();});
