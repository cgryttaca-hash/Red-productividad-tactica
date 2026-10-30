(function(){
  const pages=new Set(['index.html','eventos.html','minuta.html','minuta_compartir.html','agendas.html','agenda_movil.html','usuarios.html','configuracion.html','validacion.html','laboratorio.html','asistente.html','recuperacion.html','offline.html','mantenimiento.html','login.html']);
  const mobilePages=new Set(['agenda_movil.html','login.html','recuperacion.html','offline.html','mantenimiento.html']);
  const params=new URLSearchParams(location.search),current=location.pathname.split('/').pop()||'index.html';
  if(current==='agenda_movil.html'||current==='login.html'&&(params.get('mode')==='mobile'||params.get('return')==='agenda_movil.html'))sessionStorage.setItem('rptNavigationScope','mobile');
  const mobile=()=>sessionStorage.getItem('rptNavigationScope')==='mobile';
  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}};
  function session(){const value=read(mobile()?'rptMobileAuthSessionV1':'rptAuthSessionV1'),users=read('rptAuthUsersV1');if(localStorage.getItem('rptDeviceRevokedV1')==='1'||!value||!Array.isArray(users)||value.deviceId!==localStorage.getItem('rptAuthDeviceV1'))return null;const expires=value.expiresAt;if(expires&&(!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now()))return null;const user=users.find(item=>item.id===value.userId&&item.active);if(!user)return null;const{passwordHash,salt,...safe}=user;return{...value,role:user.role,user:safe};}
  function safePage(value,fallback=mobile()?'agenda_movil.html':'index.html'){if(typeof value!=='string'||!pages.has(value)||mobile()&&!mobilePages.has(value))return fallback;const active=session();if(['usuarios.html','configuracion.html','validacion.html','laboratorio.html'].includes(value)&&active?.role!=='admin')return fallback;return value;}
  function loginURL(){return mobile()?'login.html?mode=mobile&return=agenda_movil.html':'login.html?return='+encodeURIComponent(safePage(current));}
  window.RPTNavigation=Object.freeze({mobile,session,safePage,loginURL,pages:[...pages]});
})();
