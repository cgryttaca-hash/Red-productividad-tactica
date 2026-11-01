import {addSystemLog} from './system-log.js';
// Observador: no interviene en descargas, verificación o activación.
if(!window.__RPT_TECHNICAL_LOG__){
 window.__RPT_TECHNICAL_LOG__=true;
 const key='rptTechnicalUpdateLogV1';let last;try{last=JSON.parse(localStorage.getItem(key)||'{}');}catch(_){last={};}
 function record(state={}){
  const titles={downloading:'Inicio de descarga de actualización',preparing:'Inicio de activación de actualización',completed:'Actualización confirmada',error:'Error de actualización'};
  if(!titles[state.phase])return;
  const operation=state.detectedAt||state.startedAt||state.checkedAt||'',signature=JSON.stringify([state.phase,state.newVersion||state.version,operation,state.failure?.at,state.failure?.code]);
  if(last.signature===signature)return;
  last={signature};try{localStorage.setItem(key,JSON.stringify(last));}catch(_){}
  addSystemLog({source:'Actualizaciones',level:state.phase==='error'?'error':state.phase==='completed'?'success':'info',title:titles[state.phase],detail:state.phase==='error'?state.message||'La comprobación no se completó.':`Versión ${state.newVersion||state.version||'no informada por el gestor'}.`,meta:{phase:state.phase}});
 }
 window.addEventListener('rptUpdateState',event=>record(event.detail));
 if(window.RPTUpdates)record(window.RPTUpdates.state);
}
