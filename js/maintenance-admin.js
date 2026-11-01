import {FIREBASE_OWNER_UID} from './firebase-config.js';
import {getSDK,connect,refresh,subscribe,getState} from './maintenance-client.js';
import {PAGE_LABELS,MESSAGES,stateOf,makeSchedule,bogotaInput,remaining,duration,formatBogota} from './maintenance-state.js';
import {addSystemLog} from './system-log.js';
const pages=['index','eventos','minuta','agenda_movil','agendas','usuarios'];
export async function mount(host){
 if(!window.RPTAdminAccess?.hasAccess())throw new Error('Se requiere validación administrativa.');
 if(host.dataset.initialized)return;host.dataset.initialized='true';
 host.innerHTML=`<header class="technical-heading"><span>DISPONIBILIDAD POR MÓDULO</span><h2>Mantenimiento</h2><p>Programa una interrupción temporal. Los demás módulos continúan disponibles.</p></header>
 <p id="maintenanceConnection" role="status" class="technical-note">Comprobando conexión de mantenimiento…</p>
 <details id="ownerLoginPanel" class="technical-box"><summary>Cuenta propietaria de Firebase <span id="ownerStateBadge">Comprobando…</span></summary><p>Utiliza la cuenta que ya administra esta publicación.</p><form id="ownerLoginForm" class="technical-form" data-update-transient><label>Correo Firebase<input id="ownerEmail" type="email" autocomplete="username" required></label><label>Contraseña Firebase<input id="ownerPassword" type="password" autocomplete="current-password" required></label><button id="ownerLoginButton" type="submit" disabled>Conectar Firebase</button></form><p id="ownerLoginMessage" role="status"></p></details>
 <div class="maintenance-admin-grid"><section class="technical-box"><h3>Definir mantenimiento</h3><form id="maintenanceForm" class="technical-form">
 <label>Módulo<select id="maintenancePage">${pages.map(key=>`<option value="${key}">${PAGE_LABELS[key]}</option>`).join('')}</select></label>
 <label>Acción<select id="maintenanceMode"><option value="schedule">Programar</option><option value="now">Activar ahora</option><option value="off">Desactivar</option></select></label>
 <label>Inicio · America/Bogota<input id="maintenanceStart" type="datetime-local" required></label><label>Finalización estimada · America/Bogota<input id="maintenanceEnd" type="datetime-local"><small>Opcional. No finaliza el mantenimiento automáticamente.</small></label>
 <label>Duración de referencia (minutos)<input id="maintenanceMinutes" type="number" min="1" max="10080" value="30"><small>Permite calcular la estimación; también puedes editar la fecha final.</small></label>
 <label>Mensaje predeterminado<select id="maintenanceTemplate"><option value="mejoras">Mejora programada</option><option value="tecnica">Actualización técnica</option><option value="mantenimiento">Mantenimiento programado</option><option value="personalizado">Personalizado</option></select></label>
 <label class="full">Mensaje para los usuarios<textarea id="maintenanceMessage" rows="3" maxlength="240">${MESSAGES.mejoras}</textarea></label>
 <div class="full"><button id="activateMaintenance" type="submit" disabled>Guardar mantenimiento</button></div></form><p id="configMessage" role="status" aria-live="polite"></p></section>
 <section class="technical-box"><h3>Estado por módulo</h3><p class="technical-note">El contador indica una estimación. Finaliza el mantenimiento cuando el módulo esté listo.</p><div id="maintenanceList"></div></section></div>`;
 const $=id=>host.querySelector('#'+id);let sdk,owner=false,busy=false,signature='';
 function notify(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('technical-error',error);}
 function render(){
  const state=getState(),config=state.config;
  $('maintenanceConnection').textContent=state.error||(state.confirmed?`Estado confirmado con Firebase · ${formatBogota(state.checkedAt)}`:'Pendiente de confirmación con Firebase. Los estados guardados son una referencia local.');
  const next=JSON.stringify([config,state.confirmed,owner,Object.values(config?.pages||{}).map(item=>[stateOf(item),remaining(item)===0])]);
  if(signature!==next){signature=next;$('maintenanceList').replaceChildren();
   if(!config){const p=document.createElement('p');p.textContent='Todavía no se ha leído la configuración.';$('maintenanceList').append(p);}
   else for(const key of [...new Set([...pages,...Object.keys(config.pages||{}).filter(key=>stateOf(config.pages[key])!=='disabled')])]){
    if(!PAGE_LABELS[key])continue;const item=config.pages?.[key],status=stateOf(item),entry=document.createElement('article');entry.className='maintenance-entry';
    const label={disabled:'Desactivado',scheduled:'Programado',active:'Activo',invalid:'Configuración por revisar'}[status];
    const title=document.createElement('strong');title.textContent=`${PAGE_LABELS[key]} · ${label}${state.confirmed?'':' · sin confirmar'}`;entry.append(title);
    if(status==='active'||status==='scheduled'){
     const text=document.createElement('p');text.textContent=`Inicio: ${formatBogota(item.startsAt)} · Final estimado: ${formatBogota(item.until)}`;entry.append(text);
     const message=document.createElement('p');message.textContent=item.message||MESSAGES.mejoras;entry.append(message);
     if(item.until){const count=document.createElement('small');count.dataset.countUntil=item.until;entry.append(count);}
     const actions=document.createElement('div');actions.className='technical-actions';
     for(const[action,label]of [['extend','+15 min'],['stop','Finalizar']]){const button=document.createElement('button');button.type='button';button.dataset[action]=key;button.textContent=label;button.disabled=!owner||busy;actions.append(button);}entry.append(actions);
    }$('maintenanceList').append(entry);
   }
  }
  host.querySelectorAll('[data-count-until]').forEach(node=>{const ms=Math.max(0,Date.parse(node.dataset.countUntil)-Date.now());node.textContent=ms>0?`Estimación restante: ${duration(ms)}`:'Estimación vencida · pendiente de finalización administrativa';});
  $('activateMaintenance').disabled=!owner||busy;
 }
 function setOwner(){owner=Boolean(sdk?.auth.currentUser?.uid===FIREBASE_OWNER_UID);$('ownerStateBadge').textContent=owner?'Conectada':'Se requiere la cuenta propietaria';$('ownerLoginForm').hidden=owner;render();}
 const stop=subscribe(render);let ticker=setInterval(()=>{if(!document.hidden)render();},1000);
 window.addEventListener('pagehide',event=>{if(!event.persisted)stop();clearInterval(ticker);});
 window.addEventListener('pageshow',event=>{if(event.persisted){clearInterval(ticker);ticker=setInterval(()=>{if(!document.hidden)render();},1000);connect().catch(()=>{});}});
 const initial=Date.now()+60000;$('maintenanceStart').value=bogotaInput(initial);$('maintenanceEnd').value=bogotaInput(initial+30*60000);
 $('maintenanceMinutes').addEventListener('change',()=>{const start=$('maintenanceStart').value;const stamp=Date.parse(start+'-05:00');if(Number.isFinite(stamp))$('maintenanceEnd').value=bogotaInput(stamp+Math.max(1,Number($('maintenanceMinutes').value)||1)*60000);});
 $('maintenanceTemplate').addEventListener('change',()=>{const text=MESSAGES[$('maintenanceTemplate').value];if(text)$('maintenanceMessage').value=text;});
 $('maintenanceMode').addEventListener('change',()=>{const now=$('maintenanceMode').value==='now',off=$('maintenanceMode').value==='off';if(now)$('maintenanceStart').value=bogotaInput(Date.now());for(const id of ['maintenanceStart','maintenanceEnd','maintenanceMinutes','maintenanceTemplate','maintenanceMessage'])$(id).disabled=off||id==='maintenanceStart'&&now;});
 async function save(page,item,title){
  if(!window.RPTAdminAccess?.hasAccess()||sdk?.auth.currentUser?.uid!==FIREBASE_OWNER_UID)throw new Error('Valida el acceso local y conecta la cuenta propietaria de Firebase.');
  if(!PAGE_LABELS[page])throw new Error('El módulo seleccionado no es válido.');
  // Escritura parcial: conserva los otros módulos y las conexiones existentes.
  await sdk.fireMod.setDoc(sdk.ref,{pages:{[page]:item},updatedAt:sdk.fireMod.serverTimestamp(),clientUpdatedAt:new Date().toISOString(),updatedBy:sdk.auth.currentUser.email||''},{merge:true});
  addSystemLog({source:'Mantenimiento',level:'success',title,detail:PAGE_LABELS[page]});
  window.dispatchEvent(new CustomEvent('rpt:work-saved',{detail:{formId:'maintenanceForm'}}));
  try{await refresh();notify('configMessage',`${title}: ${PAGE_LABELS[page]}.`);}catch(_){notify('configMessage','El servidor recibió el cambio. La lectura de confirmación está pendiente.',true);}
 }
 async function perform(task){if(busy)return;busy=true;signature='';render();try{await task();}catch(error){const validation=/^(Indica una fecha|La finalización estimada)/.test(error?.message||'');notify('configMessage',validation?error.message:'No fue posible guardar el cambio. Comprueba la conexión y la cuenta propietaria; no se confirmó una modificación.',true);addSystemLog({source:'Mantenimiento',level:'error',title:'No se confirmó el cambio de mantenimiento'});}finally{busy=false;signature='';render();}}
 $('maintenanceForm').addEventListener('submit',event=>{event.preventDefault();const page=$('maintenancePage').value;perform(async()=>{
  if($('maintenanceMode').value==='off'){await save(page,{...(getState().config?.pages?.[page]||{}),active:false},'Mantenimiento desactivado');return;}
  const item=makeSchedule({start:$('maintenanceMode').value==='now'?bogotaInput():$('maintenanceStart').value,end:$('maintenanceEnd').value,message:$('maintenanceMessage').value,template:$('maintenanceTemplate').value});
  await save(page,item,stateOf(item)==='scheduled'?'Mantenimiento programado':'Mantenimiento activado');
 });});
 $('maintenanceList').addEventListener('click',event=>{const target=event.target.closest('[data-stop],[data-extend]');if(!target)return;perform(async()=>{
  // Lee el módulo actual antes de modificarlo; no sobrescribe las otras páginas.
  await refresh();const page=target.dataset.stop||target.dataset.extend,item=getState().config?.pages?.[page];if(!item?.active)throw new Error('El mantenimiento ya no está activo.');
  if(target.dataset.stop)await save(page,{...item,active:false},'Mantenimiento finalizado');
  else await save(page,{...item,until:new Date(Math.max(Date.now(),Date.parse(item.until)||0)+15*60000).toISOString()},'Estimación ampliada');
 });});
 $('ownerLoginForm').addEventListener('submit',async event=>{event.preventDefault();$('ownerLoginButton').disabled=true;try{
  const result=await sdk.authMod.signInWithEmailAndPassword(sdk.auth,$('ownerEmail').value.trim(),$('ownerPassword').value);
  if(result.user.uid!==FIREBASE_OWNER_UID){await sdk.authMod.signOut(sdk.auth);throw new Error('Cuenta no autorizada.');}
  setOwner();await connect();notify('ownerLoginMessage','Cuenta propietaria conectada.');window.dispatchEvent(new CustomEvent('rpt:work-saved',{detail:{formId:'ownerLoginForm'}}));
 }catch(_){notify('ownerLoginMessage','No fue posible conectar la cuenta propietaria. Revisa sus credenciales y la conexión.',true);}finally{$('ownerPassword').value='';$('ownerLoginButton').disabled=false;}});
 try{sdk=await getSDK();setOwner();sdk.authMod.onAuthStateChanged(sdk.auth,setOwner);$('ownerLoginButton').disabled=false;await connect();}catch(_){notify('maintenanceConnection','No fue posible confirmar la configuración con Firebase. Puedes reintentar al recuperar la conexión.',true);}
 window.addEventListener('online',()=>connect().catch(()=>{}));
 return{refresh:()=>connect().catch(()=>{})};
}
