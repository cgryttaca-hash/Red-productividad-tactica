export function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=String(text);if(className)node.className=className;return node;}
export const number=value=>value===null||value===undefined?'No disponible':new Intl.NumberFormat('es-CO',{maximumFractionDigits:1}).format(value);
export function heading(title,description){const node=el('header',undefined,'control-heading');node.append(el('h2',title),el('p',description));return node;}
export function sourceNote(snapshot){return el('p',snapshot.available?`Fuente: registros existentes en este navegador${snapshot.fileName?' · '+snapshot.fileName:''}${snapshot.updatedAt?' · actualización '+snapshot.updatedAt:''}. Consulta de solo lectura.`:'No hay registros locales disponibles. Vincula la fuente mediante los controles existentes de Sistema o Eventos. No se muestran datos de ejemplo.','control-source');}
export function metrics(entries){const list=el('dl',undefined,'control-metrics');for(const[label,value,note]of entries){const item=el('div');item.append(el('dt',label),el('dd',typeof value==='string'?value:number(value)));if(note)item.append(el('small',note));list.append(item);}return list;}
export function table(headers,rows,caption){const wrap=el('div',undefined,'control-table-wrap'),node=el('table');if(caption)node.append(el('caption',caption));const head=el('thead'),tr=el('tr');for(const value of headers){const th=el('th',value);th.scope='col';tr.append(th);}head.append(tr);const body=el('tbody');for(const row of rows){const entry=el('tr');for(const value of row)entry.append(el('td',value===null||value===undefined?'No disponible':String(value)));body.append(entry);}if(!rows.length){const row=el('tr'),cell=el('td','No hay datos para los criterios seleccionados.');cell.colSpan=headers.length;row.append(cell);body.append(row);}node.append(head,body);wrap.append(node);return wrap;}
export function download(text,name,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),anchor=el('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function rangeForm(prefix,{includeAll=false,includeText=true}={}){
 const form=el('form',undefined,'control-filters');form.dataset.updateTransient='';
 const label=(title,input)=>{const wrapper=el('label');wrapper.append(el('span',title),input);return wrapper;};
 const period=el('select');period.id=prefix+'Period';period.name='period';
 for(const[value,title]of [['today','Hoy'],['week','Esta semana'],['month','Este mes'],['year','Este año'],['custom','Rango personalizado'],...(includeAll?[['all','Todas las fechas']]:[])]){const option=el('option',title);option.value=value;period.append(option);}
 const from=el('input'),to=el('input');from.type=to.type='date';from.id=prefix+'From';to.id=prefix+'To';from.name='from';to.name='to';
 form.append(label('Período',period),label('Desde',from),label('Hasta',to));
 if(includeText)for(const[name,title]of [['company','Empresa'],['room','Salón'],['status','Estado']]){const input=el('input');input.name=name;input.maxLength=160;input.id=prefix+name[0].toUpperCase()+name.slice(1);input.placeholder='Todos';form.append(label(title,input));}
 const button=el('button','Consultar','control-primary');button.type='submit';form.append(button);return form;
}
