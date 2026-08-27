const KEY='rptPerformanceV1';
const LIMIT=40;
const startedAt=performance.now();

function read(){
  try{
    const rows=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(rows)?rows:[];
  }catch(_){return[];}
}
function write(rows){
  try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,LIMIT)));}catch(_){}
}
function save(entry){
  write([{id:`perf_${Date.now().toString(36)}`,timestamp:new Date().toISOString(),...entry},...read()]);
  window.dispatchEvent(new CustomEvent('rptPerformanceUpdated',{detail:entry}));
}
function navTiming(){
  const nav=performance.getEntriesByType('navigation')[0];
  if(!nav)return null;
  return {
    type:nav.type,
    domInteractive:Math.round(nav.domInteractive),
    domContentLoaded:Math.round(nav.domContentLoadedEventEnd),
    loadComplete:Math.round(nav.loadEventEnd),
    transferSize:Number(nav.transferSize)||0,
    decodedBodySize:Number(nav.decodedBodySize)||0
  };
}
export function markOperation(name,duration,meta={}){
  save({kind:'operation',name:String(name),duration:Math.round(Number(duration)||0),meta});
}
export function getMetrics(limit=30){
  return read().slice(0,Math.max(1,Number(limit)||30));
}
export function clearMetrics(){
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('rptPerformanceUpdated',{detail:{cleared:true}}));
}
export function latestNavigation(){
  return read().find(row=>row.kind==='navigation')||null;
}
function recordNavigation(){
  const timing=navTiming();
  save({
    kind:'navigation',
    name:location.pathname.split('/').pop()||'index.html',
    duration:Math.round(performance.now()-startedAt),
    meta:timing||{}
  });
}
if(document.readyState==='complete')setTimeout(recordNavigation,0);
else window.addEventListener('load',()=>setTimeout(recordNavigation,0),{once:true});
