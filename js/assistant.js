import {readAdminRecords,requireControlAccess} from './admin-records.js';
import {ASSISTANT_CONFIG} from './assistant-config.js';
import {FIREBASE_CONFIG,FIREBASE_APP_CHECK_SITE_KEY} from './firebase-config.js';
import {PUSH_CONFIG} from './push-config.js';
import {isInstalledContext} from './pwa-context.js';
if(window.RPTAdminAccess?.hasAccess()){
const core=window.RPTAssistantCore,$=id=>document.getElementById(id),SDK='https://www.gstatic.com/firebasejs/12.16.0';
let completeText='',busy=false,sdkPromise,remoteReady=false,remoteSettings;
function message(text,error=false){$('assistantMessage').hidden=!text;$('assistantMessage').textContent=text;$('assistantMessage').className=`message ${error?'error':'info'}`;}
function query(){return{action:$('assistantAction').value,from:$('assistantFrom').value,to:$('assistantTo').value,company:$('assistantCompany').value,room:$('assistantRoom').value,status:$('assistantStatus').value};}
function rows(){
 const snapshot=readAdminRecords();
 $('assistantSource').textContent=snapshot.available?`${snapshot.rows.length} registros existentes en este navegador. La consulta no los modifica.`:'No hay registros locales. Vincula la fuente mediante los controles existentes de Sistema o Eventos.';
 return snapshot.rows;
}
function display(result,remote=false){requireControlAccess();completeText=result.text;$('assistantMode').textContent=remote?'SOLICITUD INTERPRETADA POR IA · DATOS DE FIREBASE':'RESULTADO LOCAL · SIN IA';$('assistantTitle').textContent=result.title;$('assistantSummary').textContent=`${result.count} eventos · ${result.knownPax} personas registradas${result.missingPax?` · ${result.missingPax} evento(s) sin cantidad`:''}${remote?` · publicación ${result.sourceHash}`:''}`;$('assistantOutput').value=completeText.slice(0,120000);$('assistantTruncated').hidden=completeText.length<=120000;$('assistantCopy').disabled=false;$('assistantDownload').disabled=false;message(remote?'La IA interpretó los filtros mostrados en el reporte. Revisa el rango y los registros antes de compartir.':'');if(remote)window.dispatchEvent(new CustomEvent('rpt:work-saved',{detail:{fields:['assistantQuestion']}}));}
function local(){if(document.getElementById('admin-panel-assistant')?.hidden)return;try{requireControlAccess();const result=core.run(rows(),query());if(result.query.action==='configuration')result.text+='\n\nCONFIGURACIÓN OBSERVABLE EN ESTA VISTA\n'+[`Conexión segura: ${window.isSecureContext?'sí':'no; usa HTTPS o localhost'}`,`Service Worker disponible: ${'serviceWorker'in navigator?'sí':'no'}`,`Página controlada por el gestor: ${navigator.serviceWorker?.controller?'sí':'no o pendiente de la primera carga'}`,`Aplicación instalada: ${isInstalledContext()?'sí':'no; abierta en navegador'}`,`Proyecto Firebase: ${FIREBASE_CONFIG.projectId||'sin configurar'}`,`Servidor de avisos: ${PUSH_CONFIG.apiBaseUrl?'dirección configurada; comprueba la prueba de envío':'sin configurar'}`,`IA externa: ${ASSISTANT_CONFIG.enabled&&ASSISTANT_CONFIG.apiBaseUrl?'dirección configurada; su autorización se comprueba al consultar':'desactivada o sin configurar'}`,`App Check: ${FIREBASE_APP_CHECK_SITE_KEY?'clave pública configurada':'sin configurar'}`].join('\n');display(result);}catch(error){message(error.message,true);}}
function base(){const raw=ASSISTANT_CONFIG.apiBaseUrl;if(!raw)return'';const url=new URL(raw,location.href);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('El asistente necesita una dirección HTTPS.');return url.href.replace(/\/$/,'');}
async function sdk(){if(!sdkPromise)sdkPromise=Promise.all([import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`)]).then(async([appMod,authMod])=>{const app=appMod.getApps()[0]||appMod.initializeApp(FIREBASE_CONFIG),auth=authMod.getAuth(app);await auth.authStateReady?.();return{app,auth,authMod};}).catch(error=>{sdkPromise=null;throw error;});return sdkPromise;}
async function request(path,options={}){requireControlAccess();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),40000);try{const response=await fetch(base()+path,{cache:'no-store',credentials:'omit',signal:controller.signal,...options});let result;try{result=await response.json();}catch(_){throw new Error('El servidor no devolvió una respuesta válida del asistente.');}if(!response.ok)throw new Error(result.error||'No se pudo completar la consulta.');return result;}finally{clearTimeout(timer);}}
$('assistantQuery').addEventListener('submit',event=>{event.preventDefault();local();});
$('assistantTomorrow').addEventListener('click',()=>{$('assistantFrom').value=$('assistantTo').value=core.tomorrow();local();});
$('assistantAll').addEventListener('click',()=>{$('assistantFrom').value=$('assistantTo').value='';local();});
$('assistantCopy').addEventListener('click',async()=>{requireControlAccess();try{await navigator.clipboard.writeText(completeText);message('Reporte copiado. Revisa el contenido antes de compartirlo.');}catch(_){$('assistantOutput').focus();$('assistantOutput').select();message('Selecciona Copiar o pulsa Ctrl + C. Para un reporte extenso, descarga el texto completo.');}});
$('assistantDownload').addEventListener('click',()=>{requireControlAccess();const url=URL.createObjectURL(new Blob([completeText],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`Reporte-operativo-${core.today()}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('assistantLogin').addEventListener('submit',async event=>{event.preventDefault();try{requireControlAccess();const{auth,authMod}=await sdk();await authMod.setPersistence(auth,authMod.browserLocalPersistence);await authMod.signInWithEmailAndPassword(auth,$('assistantEmail').value.trim(),$('assistantPassword').value);message('Identidad Firebase conectada. El servidor comprobará su autorización al consultar.');window.dispatchEvent(new CustomEvent('rpt:work-saved',{detail:{formId:'assistantLogin'}}));}catch(_){message('No se pudo conectar la cuenta Firebase. Comprueba las credenciales y la configuración.',true);}finally{$('assistantPassword').value='';}});
$('assistantAsk').addEventListener('click',async()=>{
  if(busy||!remoteReady)return;busy=true;$('assistantAsk').disabled=true;$('assistantQuestion').setAttribute('aria-busy','true');message('Interpretando la solicitud y consultando la publicación…');
  try{const question=$('assistantQuestion').value.trim();if(!question)throw new Error('Escribe una solicitud antes de consultar.');const{auth,app}=await sdk();if(!auth.currentUser||auth.currentUser.isAnonymous)throw new Error('Conecta una cuenta Firebase autorizada. La sesión local no autoriza el uso de IA.');const headers={'Content-Type':'application/json',Authorization:`Bearer ${await auth.currentUser.getIdToken()}`};if(remoteSettings.requiresAppCheck){if(!FIREBASE_APP_CHECK_SITE_KEY)throw new Error('Falta configurar App Check para la integración de IA.');await(await import('./firebase-app-check.js')).initializeAppCheck();const check=await import(`${SDK}/firebase-app-check.js`);headers['X-Firebase-AppCheck']=(await check.getToken(check.getAppCheck(app),false)).token;}display(await request('/query',{method:'POST',headers,body:JSON.stringify({question,query:query()})}),true);}
  catch(error){message(error.name==='AbortError'?'La consulta tardó demasiado. Puedes usar la consulta local.':error.message,true);}
  finally{busy=false;$('assistantAsk').disabled=!remoteReady;$('assistantQuestion').removeAttribute('aria-busy');}
});
$('assistantFrom').value=$('assistantTo').value=core.today();local();
window.addEventListener('eventDataUpdated',local);window.addEventListener('storage',event=>{if(event.key==='eventData')local();});
if(!ASSISTANT_CONFIG.enabled||!ASSISTANT_CONFIG.apiBaseUrl)$('assistantAIState').textContent='Integración de IA pendiente de configuración. La consulta local está disponible.';
else request('/config').then(settings=>{remoteSettings=settings;remoteReady=settings.enabled===true;$('assistantAsk').disabled=!remoteReady;$('assistantAIState').textContent=remoteReady?'Disponible para cuentas autorizadas.':'Servidor pendiente de configuración: '+settings.missing.join(', ');}).catch(error=>{$('assistantAIState').textContent=error.message;});

document.querySelectorAll('[data-assistant-quick]').forEach(button=>button.addEventListener('click',()=>{
 requireControlAccess();$('assistantAction').value=button.dataset.assistantQuick;
 if(button.dataset.assistantPeriod==='today')$('assistantFrom').value=$('assistantTo').value=core.today();
 if(button.dataset.assistantPeriod==='all')$('assistantFrom').value=$('assistantTo').value='';
 local();
}));
window.addEventListener('rptAdminSectionChanged',event=>{if(event.detail?.section==='assistant')local();});
}
