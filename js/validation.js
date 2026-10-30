const REPORT_KEY='rptValidationReportV1';

const text=value=>value===undefined||value===null?'':String(value).trim();
function normalized(value){
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase();
}
function validDate(value){
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return true;
  const source=text(value);
  if(!source)return false;
  if(/^\d{4}-\d{2}-\d{2}/.test(source))return !Number.isNaN(new Date(source).getTime());
  if(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(source)){
    const [d,m,y]=source.split(/[\/-]/).map(Number);
    const date=new Date(y,m-1,d);
    return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d;
  }
  return !Number.isNaN(new Date(source).getTime());
}
function signature(row){
  return [
    text(row.FECHA),
    normalized(row['NOMBRE DE LA EMPRESA']),
    normalized(row['ESCENARIO ASIGNADO']),
    normalized(row['HORARIO DEL EVENTO'])
  ].join('|');
}
function issue(row,type,severity,message,field=''){
  return {
    id:`issue_${Math.random().toString(36).slice(2,9)}`,
    type,severity,message,field,
    sheet:text(row.HOJA_ORIGEN)||'Sin hoja',
    row:Number(row.__FILA_ORIGEN)||0,
    company:text(row['NOMBRE DE LA EMPRESA'])||'Sin empresa'
  };
}
export function validateRows(rows=[],context={}){
  const issues=[];
  const seen=new Map();
  const stats={valid:0,invalidDate:0,missingCompany:0,missingScenario:0,duplicates:0,foodMismatch:0,unknownStatus:0};
  const acceptedStatuses=['CONFIRMADO','TENTATIVO O PENDIENTE','PROGRAMADO','EN CURSO','EJECUTADO','FINALIZADO','CANCELADO',''];
  rows.forEach(row=>{
    let severe=false;
    if(!validDate(row.FECHA)){
      issues.push(issue(row,'invalid-date','error','La fecha no tiene un formato válido.','FECHA'));
      stats.invalidDate++;severe=true;
    }
    if(!text(row['NOMBRE DE LA EMPRESA'])){
      issues.push(issue(row,'missing-company','error','La empresa está vacía.','NOMBRE DE LA EMPRESA'));
      stats.missingCompany++;severe=true;
    }
    if(!text(row['ESCENARIO ASIGNADO'])){
      issues.push(issue(row,'missing-scenario','warning','El escenario está vacío.','ESCENARIO ASIGNADO'));
      stats.missingScenario++;
    }
    const key=signature(row);
    if(seen.has(key)){
      issues.push(issue(row,'duplicate','warning',`Posible duplicado del registro ${seen.get(key)}.`,'Registro'));
      stats.duplicates++;
    }else seen.set(key,`${text(row.HOJA_ORIGEN)||'Hoja'} fila ${Number(row.__FILA_ORIGEN)||'?'}`);
    const ayb=text(row['HORARIO AYB']);
    const food=text(row['DESCRIPCION ALIMENTACION']);
    if(Boolean(ayb)!==Boolean(food)){
      issues.push(issue(row,'food-mismatch','warning','Horario AYB y Descripción Alimentación están incompletos entre sí.',ayb?'DESCRIPCION ALIMENTACION':'HORARIO AYB'));
      stats.foodMismatch++;
    }
    const status=normalized(row.ESTADO);
    if(!acceptedStatuses.includes(status)){
      issues.push(issue(row,'unknown-status','info',`Estado no estandarizado: ${text(row.ESTADO)}.`,'ESTADO'));
      stats.unknownStatus++;
    }
    if(!severe)stats.valid++;
  });
  const errorCount=issues.filter(item=>item.severity==='error').length;
  const warningCount=issues.filter(item=>item.severity==='warning').length;
  const infoCount=issues.filter(item=>item.severity==='info').length;
  return {
    generatedAt:new Date().toISOString(),
    totalRows:rows.length,
    validRows:stats.valid,
    errorCount,warningCount,infoCount,
    stats,
    sheets:Array.isArray(context.sheets)?context.sheets:[],
    fileName:context.fileName||localStorage.getItem('excelSync:fileName')||'',
    issues
  };
}
export function saveValidationReport(report){
  try{localStorage.setItem(REPORT_KEY,JSON.stringify(report));}catch(_){}
  window.dispatchEvent(new CustomEvent('rptValidationUpdated',{detail:report}));
  return report;
}
export function getValidationReport(){
  try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'null');}catch(_){return null;}
}
export function clearValidationReport(){
  localStorage.removeItem(REPORT_KEY);
}
