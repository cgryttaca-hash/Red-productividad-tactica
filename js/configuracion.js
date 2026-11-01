import {getSession,logout} from './local-auth.js';
import {isInstalledContext} from './pwa-context.js';
import {SYSTEM_VERSION,RELEASE_NAME} from './system-version.js';
import {mount} from './maintenance-admin.js';
const $=id=>document.getElementById(id),session=getSession();
$('sessionName').textContent=session?.displayName||session?.username||'Administrador';$('logoutButton').addEventListener('click',()=>{logout();location.replace('login.html');});
$('systemVersion').textContent=SYSTEM_VERSION;$('releaseLabel').textContent=RELEASE_NAME;$('deploymentHost').textContent=location.hostname||'Archivo local';
function renderInstallation(){$('pwaState').textContent=isInstalledContext()?'Instalada':'Web';$('pwaDetail').textContent=isInstalledContext()?'Ejecutándose como aplicación':'Puedes instalarla desde el menú del navegador';}
renderInstallation();window.addEventListener('rptPwaStateChanged',renderInstallation);mount($('maintenanceAdminUI'));
