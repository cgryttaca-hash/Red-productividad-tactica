(function(){
 if(window.RPTAdminAccess)return;
 const key='rptAdminAccessV1',routes=new Set(['administracion.html','usuarios.html','configuracion.html','validacion.html','laboratorio.html','recuperacion.html','asistente.html']);
 const current=location.pathname.split('/').pop()||'index.html';
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch(_){return null;}};
 function hasAccess(){const session=window.RPTNavigation?.session(),receipt=read();return Boolean(!window.RPTNavigation?.mobile()&&session?.user?.role==='admin'&&receipt?.userId===session.userId&&receipt.deviceId===session.deviceId&&receipt.loginAt===session.loginAt&&receipt.passwordChangedAt===(session.user.passwordChangedAt||null)&&Number.isFinite(receipt.validatedAt)&&receipt.validatedAt<=Date.now());}
 function revoke(){sessionStorage.removeItem(key);}
 if(!routes.has(current))revoke();
 window.RPTAdminAccess=Object.freeze({hasAccess,revoke,isProtectedRoute:()=>routes.has(current)});
})();
