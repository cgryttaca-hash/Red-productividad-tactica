(function(scope){
  const ZONE='America/Bogota';
  const ACTIONS=['list','summary','issues','duplicates','whatsapp','minuta','configuration','suggestions','statistics'];
  const text=value=>value===null||value===undefined?'':String(value).trim();
  const fold=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  function date(value){
    if(typeof value==='number'&&Number.isFinite(value)&&value>0&&value<100000)return new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
    const source=text(value),match=source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/)||source.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if(!match)return'';
    const [y,m,d]=match[1].length===4?[+match[1],+match[2],+match[3]]:[+match[3],+match[2],+match[1]];
    const result=new Date(Date.UTC(y,m-1,d));return result.getUTCFullYear()===y&&result.getUTCMonth()===m-1&&result.getUTCDate()===d?result.toISOString().slice(0,10):'';
  }
  function today(now=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
  function tomorrow(now=Date.now()){return new Date(Date.parse(today(now)+'T12:00:00Z')+86400000).toISOString().slice(0,10);}
  function normalize(row,index){
    const value=(...keys)=>{for(const key of keys)if(row[key]!==null&&row[key]!==undefined&&text(row[key])!=='')return row[key];return'';};
    const pax=value('CANTIDAD DE PERSONAS','cantidadPersonas','pax');
    return{id:text(value('__EVENT_ID','id'))||`fila-${index+1}`,date:date(value('FECHA','fechaISO','fecha')),company:text(value('NOMBRE DE LA EMPRESA','empresa')),room:text(value('ESCENARIO ASIGNADO','escenario')),time:text(value('HORARIO DEL EVENTO','horarioEvento')),pax:pax!==''&&Number.isFinite(Number(pax))&&Number(pax)>=0?Number(pax):null,foodTime:text(value('HORARIO AYB','horarioAyB')),food:text(value('DESCRIPCION ALIMENTACION','descripcionAlimentacion')),status:text(value('ESTADO','estado')),layout:text(value('ACOMODACION','acomodacion')),service:text(value('MODALIDAD DE SERVICIO','modalidadServicio')),payment:text(value('MEDIO DE PAGO','medioPago')),notes:text(value('OBSERVACION','observacion'))};
  }
  function validateQuery(value={}){
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('La consulta no es válida.');
    const query={action:value.action||'summary',from:text(value.from),to:text(value.to),company:text(value.company),room:text(value.room),status:text(value.status)};
    if(!ACTIONS.includes(query.action))throw new Error('La operación no está permitida.');
    for(const key of ['from','to'])if(query[key]&&date(query[key])!==query[key])throw new Error('Usa una fecha válida con formato año-mes-día.');
    if(query.from&&query.to&&query.from>query.to)throw new Error('La fecha final debe ser posterior a la inicial.');
    if(['company','room','status'].some(key=>query[key].length>160))throw new Error('El filtro es demasiado largo.');
    return query;
  }
  function statistics(events){
    const group=key=>{const counts=new Map();for(const event of events){const label=typeof key==='function'?key(event):event[key];if(!label)continue;const id=fold(label),entry=counts.get(id)||{label,count:0};entry.count++;counts.set(id,entry);}return[...counts.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'es',{numeric:true}));};
    const known=events.filter(event=>event.pax!==null),pax=known.reduce((sum,event)=>sum+event.pax,0);
    return{events:events.length,knownPax:pax,missingPax:events.length-known.length,averagePax:known.length?pax/known.length:null,companies:group('company'),rooms:group('room'),states:group(event=>event.status||'Sin estado registrado'),days:group('date').sort((a,b)=>a.label.localeCompare(b.label)),months:group(event=>event.date.slice(0,7)).sort((a,b)=>a.label.localeCompare(b.label))};
  }
  function run(rows,value={},now=Date.now()){
    if(!Array.isArray(rows)||rows.length>20000)throw new Error('Los datos no son una lista de eventos válida.');
    const query=validateQuery(value);
    const events=rows.filter(row=>row&&typeof row==='object'&&!Array.isArray(row)).map(normalize).filter(event=>(!query.from||event.date>=query.from)&&(!query.to||(event.date&&event.date<=query.to))&&['company','room','status'].every(key=>!query[key]||fold(event[key]).includes(fold(query[key])))).sort((a,b)=>(a.date+a.time+a.company).localeCompare(b.date+b.time+b.company,'es',{numeric:true}));
    const issues=[];const groups=new Map();
    for(const event of events){
      const missing=[['date','fecha'],['company','empresa'],['room','salón'],['time','horario'],['pax','cantidad de personas']].filter(([key])=>event[key]===null||event[key]==='').map(([,label])=>label);
      if(missing.length)issues.push({id:event.id,company:event.company,missing});
      if(event.food&&!event.foodTime)issues.push({id:event.id,company:event.company,missing:['horario de alimentación: hay descripción pero no hora; no se programa un aviso supuesto']});
      const key=[event.date,fold(event.company),fold(event.room),fold(event.time)].join('|');
      if(event.date&&event.company&&event.room&&event.time){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event.id);}
    }
    const duplicates=[...groups.values()].filter(ids=>ids.length>1);
    const knownPax=events.filter(event=>event.pax!==null).reduce((sum,event)=>sum+event.pax,0);
    const title={list:'Consulta de eventos',summary:'Resumen operativo',issues:'Campos por revisar',duplicates:'Posibles duplicados',whatsapp:'Mensaje para el equipo',minuta:'Preparación de minuta',configuration:'Comprobación de datos',suggestions:'Sugerencias de operación',statistics:'Estadísticas de los registros'}[query.action];
    const missingPax=events.filter(event=>event.pax===null).length;
    const lines=[title.toUpperCase(),`Fecha de consulta: ${today(now)} · Colombia`,`Rango: ${query.from||'sin inicio'} a ${query.to||'sin fin'}`,`Filtros: empresa ${query.company||'todas'} · salón ${query.room||'todos'} · estado ${query.status||'todos'}`,`Eventos encontrados: ${events.length}`,`Personas registradas: ${knownPax}${missingPax?` · ${missingPax} evento(s) sin cantidad`:''}`,''];
    if(query.action==='whatsapp'){
      const hour=Number(new Intl.DateTimeFormat('en',{timeZone:ZONE,hour:'2-digit',hourCycle:'h23'}).format(new Date(now)));
      lines.push(`Equipo, ${hour>=5&&hour<12?'buenos días':hour>=12&&hour<19?'buenas tardes':'buenas noches'}. Comparto la programación registrada para ${query.from&&query.from===query.to?query.from:'el rango indicado'}.`,'');
    }
    const calculated=query.action==='statistics'?statistics(events):null;
    if(calculated){
      lines.push('CIFRAS CALCULADAS DESDE LOS REGISTROS · NO SON HECHOS GENERADOS POR IA',`Promedio de PAX por evento con cantidad: ${calculated.averagePax===null?'No disponible':calculated.averagePax.toLocaleString('es-CO',{maximumFractionDigits:1})}`,'PAX corresponde a personas registradas; no acredita asistencia real.');
      for(const[section,values]of [['EMPRESAS CON MÁS EVENTOS',calculated.companies],['SALONES MÁS UTILIZADOS',calculated.rooms],['EVENTOS POR ESTADO',calculated.states],['EVENTOS POR DÍA',calculated.days],['EVENTOS POR MES',calculated.months]])lines.push('',section,...(values.length?values.map(item=>`${item.label}: ${item.count}`):['No hay información suficiente.']));
    }else if(['issues','configuration','suggestions'].includes(query.action)){
      lines.push(...(issues.length?issues.map(issue=>`• ${issue.company||'Empresa sin dato'} [${issue.id}]: ${issue.missing.join(', ')}.`):['No se encontraron campos faltantes entre los campos comprobados.']));
      if(query.action==='suggestions')lines.push('Revisa los campos señalados antes de publicar. Usa los filtros de fecha para preparar el turno. Comprueba los avisos desde la aplicación instalada; no se inventan horarios.');
    }else if(query.action==='duplicates')lines.push(...(duplicates.length?duplicates.map(ids=>`Coinciden fecha, empresa, salón y horario: ${ids.join(', ')}. Revisar manualmente; no se eliminó nada.`):['No se encontraron coincidencias exactas en fecha, empresa, salón y horario.']));
    else for(const event of events)lines.push(`• ${event.date||'Fecha sin dato'} · ${event.company||'Empresa sin dato'} [${event.id}]`,`  Salón: ${event.room||'Sin dato'} · Horario: ${event.time||'Sin dato'} · PAX: ${event.pax??'Sin dato'} · Estado: ${event.status||'Sin dato'}`,`  Alimentación: ${event.food||'Sin dato'} · Horario A&B: ${event.foodTime||'Sin dato'}`,`  Acomodación: ${event.layout||'Sin dato'} · Servicio: ${event.service||'Sin dato'} · Pago: ${event.payment||'Sin dato'}`,`  Observación: ${event.notes||'Sin dato'}`,'');
    if(!events.length)lines.push('No hay eventos que coincidan. No se completan datos por suposición.');
    if(query.action==='minuta')lines.push('Para la imagen oficial a color, abre Minuta y pulsa Ctrl + Q. La imagen corresponde a mañana en Colombia e incluye todas las filas de Coworking.');
    return{title,query,count:events.length,knownPax,missingPax,events,issues,duplicates,text:lines.join('\n'),...(calculated?{statistics:calculated}:{})};
  }
  const api=Object.freeze({ACTIONS,ZONE,date,today,tomorrow,normalize,validateQuery,statistics,run});
  if(typeof module==='object'&&module.exports)module.exports=api;else scope.RPTAssistantCore=api;
})(typeof window==='undefined'?globalThis:window);
