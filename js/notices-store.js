import {currentSession,isAdministrator,readStore,transact,NO_CHANGE} from './local-record-store.js';
export const NOTICES_KEY='rptInternalNoticesV1';
export const RECEIPTS_PREFIX='rptNoticeReceiptsV1:';
const text=value=>typeof value==='string'?value.trim():'';
export function phase(notice,now=Date.now()){
  if(notice.status==='draft')return'draft';
  if(notice.status==='withdrawn')return'withdrawn';
  if(notice.startsAt&&Date.parse(notice.startsAt)>now)return'scheduled';
  if(notice.expiresAt&&Date.parse(notice.expiresAt)<=now)return'expired';
  return'active';
}
function validate(input){
  const title=text(input.title),body=text(input.body),status=input.status||'draft';
  if(!title||title.length>160)throw new Error('Escribe un título de hasta 160 caracteres.');
  if(!body||body.length>5000)throw new Error('Escribe el aviso, con un máximo de 5000 caracteres.');
  if(!['draft','published','withdrawn'].includes(status))throw new Error('El estado del aviso no es válido.');
  const startsAt=text(input.startsAt),expiresAt=text(input.expiresAt);
  for(const value of [startsAt,expiresAt])if(value&&!Number.isFinite(Date.parse(value)))throw new Error('La vigencia del aviso no contiene fechas válidas.');
  if(startsAt&&expiresAt&&Date.parse(expiresAt)<=Date.parse(startsAt))throw new Error('El final debe ser posterior al inicio de la vigencia.');
  return{title,body,status,startsAt,expiresAt,level:['info','important','urgent'].includes(input.level)?input.level:'info'};
}
function all(){const values=Object.values(readStore(NOTICES_KEY).items);if(values.some(value=>!value||typeof value.id!=='string'||typeof value.version!=='string'||typeof value.title!=='string'||typeof value.body!=='string'))throw new Error('Hay un aviso guardado que no es válido. No se modificó el historial.');return values;}
export function nextNoticeTransition(){const times=all().filter(item=>item.status==='published').flatMap(item=>[Date.parse(item.startsAt),Date.parse(item.expiresAt)]).filter(time=>time>Date.now());return times.length?Math.min(...times):null;}
export function notices({administration=false,now=Date.now()}={}){
  const session=currentSession();if(!session)return[];
  const receipts=readStore(RECEIPTS_PREFIX+session.userId).items;
  return all().filter(notice=>administration&&isAdministrator()||!['draft','scheduled'].includes(phase(notice,now))).map(notice=>{const receipt=receipts[notice.id],current=receipt?.version===notice.version;return{...notice,phase:phase(notice,now),read:Boolean(current&&receipt.readAt),closed:Boolean(current&&receipt.closedAt)};}).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export async function saveNotice(input,{id='',version=''}={}){
  const value=validate(input);
  return transact(NOTICES_KEY,box=>{
    if(!isAdministrator())throw new Error('Solo el administrador puede crear o publicar avisos.');
    const previous=id?box.items[id]:null;
    if(id&&(!previous||previous.version!==version))throw new Error('Este aviso cambió en otra ventana. Recarga su versión antes de guardar.');
    if(!id&&Object.keys(box.items).length>=1000)throw new Error('Se alcanzaron 1000 avisos. Exporta el historial y elimina los que ya no necesites.');
    const identifier=id||crypto.randomUUID(),now=new Date().toISOString();
    const notice={...value,id:identifier,version:crypto.randomUUID(),category:'administrative',createdAt:previous?.createdAt||now,updatedAt:now,createdBy:previous?.createdBy||currentSession().userId};
    box.items[identifier]=notice;return notice;
  });
}
export async function deleteNotice(id,version){return transact(NOTICES_KEY,box=>{if(!isAdministrator())throw new Error('Solo el administrador puede eliminar avisos.');if(box.items[id]?.version!==version)throw new Error('El aviso cambió. Actualiza la lista antes de eliminarlo.');delete box.items[id];return true;});}
export async function receipt(id,version,{close=false}={}){
  const session=currentSession();if(!session)throw new Error('La sesión no está disponible.');
  return transact(RECEIPTS_PREFIX+session.userId,box=>{if(currentSession()?.userId!==session.userId)throw new Error('La sesión cambió. Vuelve a abrir el aviso.');const notice=readStore(NOTICES_KEY).items[id];if(!notice||notice.version!==version||notice.status==='draft')throw new Error('El aviso cambió. Actualiza la lista antes de marcarlo.');const previous=box.items[id];if(previous?.version===version&&previous.readAt&&(!close||previous.closedAt))return NO_CHANGE;const now=new Date().toISOString();box.items[id]={version,readAt:previous?.version===version?previous.readAt||now:now,closedAt:close?now:previous?.version===version?previous.closedAt||'':''};return true;});
}
export async function addSystemNotice(title,body,{tag='',id='',expiresAt='',category='system'}={}){
  if(!currentSession())return false;
  const identifier='system:'+(id||tag||crypto.randomUUID());
  return transact(NOTICES_KEY,box=>{const previous=box.items[identifier];if(previous&&previous.title===title&&previous.body===body&&previous.status==='published'&&previous.expiresAt===expiresAt)return NO_CHANGE;if(!previous&&Object.keys(box.items).length>=1000)throw new Error('El historial de avisos está lleno. El administrador puede exportarlo y liberar espacio.');const now=new Date().toISOString();box.items[identifier]={id:identifier,version:crypto.randomUUID(),title:String(title).slice(0,160),body:String(body).slice(0,5000),status:'published',level:category==='food'?'important':'info',category:category==='food'?'food':'system',startsAt:'',expiresAt,createdAt:previous?.createdAt||now,updatedAt:now};return true;});
}
export async function reconcileFoodNotices(alerts){if(!currentSession())return;const ids=new Set(alerts.map(alert=>'system:'+alert.id));return transact(NOTICES_KEY,box=>{let changed=false;for(const notice of Object.values(box.items)){if(notice.category==='food'&&phase(notice)==='active'&&!ids.has(notice.id)){notice.status='withdrawn';notice.version=crypto.randomUUID();notice.updatedAt=new Date().toISOString();changed=true;}}return changed?true:NO_CHANGE;});}
