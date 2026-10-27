import {getSession,logout} from './local-auth.js';
import {registerCurrentDevice,currentDeviceStatus} from './device-registry.js';
async function heartbeat(){
  const session=getSession();if(!session)return;
  try{
    await registerCurrentDevice(session);
    const status=await currentDeviceStatus();
    if(status.revoked){
      localStorage.setItem('rptDeviceRevokedV1','1');
      logout();
      localStorage.setItem('rptRevokedMessageV1','Este equipo fue revocado por el administrador.');
      location.replace('login.html');
      return;
    }
    localStorage.removeItem('rptDeviceRevokedV1');
  }catch(error){console.warn('Device registry:',error);}
}
setTimeout(heartbeat,700);
setInterval(()=>{if(!document.hidden)heartbeat();},300000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)heartbeat();});
