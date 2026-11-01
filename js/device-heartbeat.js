import {getSession} from './local-auth.js';
import {registerCurrentDevice} from './device-registry.js';
function heartbeat(){if(!window.RPTDeviceAccess?.allowed||document.hidden)return;const session=getSession();if(session)registerCurrentDevice(session).catch(()=>{});}
const timer=setInterval(heartbeat,300000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
