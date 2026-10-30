export const FOOD_TIME_ZONE = 'America/Bogota';
export const FOOD_LEAD_MS = 15 * 60 * 1000;
export const FOOD_MAX_DELAY_MS = 45 * 1000;
export const FOOD_RULE_VERSION = 'food-only-v1';
const text = value => value === undefined || value === null ? '' : String(value).trim();
const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ');
const emptyFood = value => !normalize(value) || /^(SIN ALIMENTACION|SIN SERVICIO|NO REQUIERE ALIMENTACION|NO APLICA|CANCELADO|N\/?A|NINGUNO|NINGUNA|NO|0)[.!\s]*$/.test(normalize(value));
const formatters = new Map();

function formatter(timeZone) {
  if (!formatters.has(timeZone)) formatters.set(timeZone, new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
  return formatters.get(timeZone);
}

function zonedParts(epoch, timeZone) {
  return Object.fromEntries(formatter(timeZone).formatToParts(new Date(epoch)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

export function localTimeToEpoch(dateISO, hour, minute, timeZone = FOOD_TIME_ZONE) {
  const match = text(dateISO).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  const calendar = new Date(wanted);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return null;
  let candidate = wanted;
  for (let attempt = 0; attempt < 4; attempt++) {
    const local = zonedParts(candidate, timeZone);
    const observed = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    candidate += wanted - observed;
  }
  const matches = epoch => {
    const local = zonedParts(epoch, timeZone);
    return local.year === year && local.month === month && local.day === day && local.hour === hour && local.minute === minute;
  };
  if (!matches(candidate)) return null;
  for (const delta of [-120, -90, -60, -30, -15, 15, 30, 60, 90, 120]) if (matches(candidate + delta * 60000)) return null;
  return candidate;
}

export function parseFoodTimes(value) {
  const source = text(value).replace(/\r/g, '').replace(/_x000D_|<br\s*\/?\s*>/gi, '\n');
  const entries = source.split(/[\n;|/]+|,(?=\s*\d{1,2}:\d{2})/).map(line => line.trim()).filter(Boolean);
  const results = [];
  for (const line of entries) {
    const match = line.match(/(?:^|\s|[-–—:])(?:\s*)(\d{1,2})(?::(\d{2}))?\s*([AP]\.?\s*M\.?|M)?(?=\s|[-–—:]|$)/i);
    if (!match || (!match[2] && !match[3])) continue;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = normalize(match[3]).replace(/[.\s]/g, '');
    if (meridiem === 'M' && hour !== 12) continue;
    if (minute > 59 || hour > 23 || (meridiem && (hour < 1 || hour > 12))) continue;
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    results.push({ hour, minute, originalTime: match[0].trim().replace(/^[^\d]*/, ''), line });
  }
  return results;
}

const foodKey=value=>normalize(value).replace(/[^A-Z0-9]/g,'');
export function foodFields(record){
  if(Array.isArray(record?.foodGroups)){const groups=record.foodGroups.filter(g=>g&&typeof g.schedule==='string'&&typeof g.description==='string').map(g=>({schedule:g.schedule,description:g.description}));if(groups.length)return groups;}
  const groups=new Map();
  for(const[key,value]of Object.entries(record||{})){
    const normalized=foodKey(key),schedule=/^(?:HORARIOS?(?:AYB|AB|ALIMENTACION)|HORARIOAYB)(\d*)$/.exec(normalized),description=/^(?:DESCRIPCION(?:DE)?ALIMENTACION|ALIMENTACION|DESCRIPCIONALIMENTOS)(\d*)$/.exec(normalized);
    if(!schedule&&!description)continue;const group=(schedule||description)[1]||'',entry=groups.get(group)||{schedule:[],description:[]};
    const raw=schedule&&typeof value==='number'&&value>=0&&value<1?`${String(Math.round(value*1440)/60|0).padStart(2,'0')}:${String(Math.round(value*1440)%60).padStart(2,'0')}`:text(value).replace(/_x000D_|<br\s*\/?\s*>/gi,'\n').replace(/\r\n?/g,'\n');
    const target=schedule?entry.schedule:entry.description;if(raw&&!target.includes(raw))target.push(raw);groups.set(group,entry);
  }
  return[...groups.values()].map(entry=>({schedule:entry.schedule.join('\n'),description:entry.description.join('\n')}));
}
export function eventFoodServices(record){
 const groups=foodFields(record),services=[],unassigned=[];
 for(const group of groups){const paired=pairFoodServices(group.schedule,group.description);services.push(...paired.services);unassigned.push(...paired.unassigned);if(!paired.services.length&&group.schedule)unassigned.push(group.schedule);}
 return{services,unassigned:services.length?[...new Set(unassigned)]:[],schedule:groups.map(g=>g.schedule).filter(Boolean).join('\n'),description:groups.map(g=>g.description).filter(Boolean).join('\n')};
}
export function pairFoodServices(schedule,description){
  const times=parseFoodTimes(schedule),lines=text(description).replace(/\r/g,'').split('\n').map(value=>value.trim()).filter(Boolean),used=new Set();
  const labels=times.map(item=>item.line.replace(item.originalTime,'').replace(/^[\s:–—-]+|[\s:–—-]+$/g,'').trim());
  const matches=(label,line)=>{const a=normalize(label),b=normalize(line);return a&&b&&(a===b||b.startsWith(a+' ')||a.startsWith(b+' '));};
  const starts=lines.map(line=>{const explicit=parseFoodTimes(line)[0];if(explicit)return times.map((t,i)=>t.hour===explicit.hour&&t.minute===explicit.minute?i:-1).filter(i=>i>=0);return labels.map((label,i)=>matches(label,line)?i:-1).filter(i=>i>=0);});
  const result=times.map((item,index)=>{const label=labels[index];
    if(times.length===1){lines.forEach((_,i)=>used.add(i));return{...item,service:label||text(description),description:label?text(description):'',relation:'single-service'};}
    const blocks=[];for(let i=0;i<lines.length;i++){if(starts[i].length===1&&starts[i][0]===index){const selected=[i];for(let n=i+1;n<lines.length&&!starts[n].length;n++)selected.push(n);blocks.push(selected);}}
    if(blocks.length===1){blocks[0].forEach(i=>used.add(i));const content=blocks[0].map(i=>lines[i]).join('\n');return{...item,service:label||content,description:label&&normalize(label)!==normalize(content)?content:'',relation:'service-label'};}
    if(!label&&lines.length===times.length&&!labels.some(Boolean)&&!starts.some(v=>v.length)){used.add(index);return{...item,service:lines[index],description:'',relation:'parallel-lines'};}
    if(lines.length===1&&!label){used.add(0);return{...item,service:lines[0],description:'',relation:'shared-description'};}
    return{...item,service:label,description:'',relation:label?'schedule-label':'unresolved'};
  });
  return{services:result,unassigned:lines.filter((_,index)=>!used.has(index))};
}

function field(event, primary, original) {
  return text(event[primary] !== undefined ? event[primary] : event[original]);
}

export function planFoodAlerts(events, { timeZone = FOOD_TIME_ZONE } = {}) {
  formatter(timeZone);
  const alerts = [];
  const issues = [];
  const seen = new Set();
  const identities = new Map();
  const ambiguousIds = new Set();
  for (const event of Array.isArray(events) ? events : []) {
    const eventId = text(event.id || event.__EVENT_ID);
    const food=eventFoodServices(event);const description=food.description;
    const foodSchedule=food.schedule;
    const state = field(event, 'estado', 'ESTADO');
    const identity = JSON.stringify([field(event, 'fechaISO', 'FECHA'), field(event, 'empresa', 'NOMBRE DE LA EMPRESA'), field(event, 'escenario', 'ESCENARIO ASIGNADO'), foodSchedule, description, state]);
    if (eventId && identities.has(eventId) && identities.get(eventId) !== identity) {
      if (!ambiguousIds.has(eventId)) issues.push({ eventId, reason: 'conflicting-event-id' });
      ambiguousIds.add(eventId);
      continue;
    }
    identities.set(eventId, identity);
    if (/CANCEL/.test(normalize(state))) continue;
    if (emptyFood(description)) {
      if (!description && parseFoodTimes(foodSchedule).length) issues.push({ eventId, reason: 'missing-food-description' });
      continue;
    }
    if (!eventId || encodeURIComponent(eventId).length > 1000) { issues.push({ eventId, reason: 'missing-stable-id' }); continue; }
    const company = field(event, 'empresa', 'NOMBRE DE LA EMPRESA');
    if (!company) { issues.push({ eventId, reason: 'missing-company' }); continue; }
    const dateISO = field(event, 'fechaISO', 'FECHA').slice(0, 10);
    const times = food.services;
    if (!times.length) { issues.push({ eventId, reason: 'missing-or-invalid-food-time' }); continue; }
    const descriptions = description.replace(/\r/g, '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    for (const [index, service] of times.entries()) {
      const foodAt = localTimeToEpoch(dateISO, service.hour, service.minute, timeZone);
      if (foodAt === null) { issues.push({ eventId, reason: 'invalid-or-ambiguous-food-date' }); continue; }
      const id = `food_${encodeURIComponent(eventId)}_${foodAt}`;
      const serviceDescription = [service.service,service.description].filter(Boolean).join('\n');
      if(!serviceDescription){issues.push({eventId,reason:'ambiguous-food-service'});continue;}
      if (seen.has(id)) {
        const existing = alerts.find(alert => alert.id === id);
        if (existing && existing.description !== serviceDescription && !existing.description.split('\n').includes(serviceDescription)) {
          existing.description += `\n${serviceDescription}`;
          existing.signature = JSON.stringify([eventId, foodAt, existing.company, existing.description, existing.room, timeZone]);
        }
        continue;
      }
      seen.add(id);
      const room = field(event, 'escenario', 'ESCENARIO ASIGNADO');
      const alertAt = foodAt - FOOD_LEAD_MS;
      const timeLabel = `${String(service.hour).padStart(2, '0')}:${String(service.minute).padStart(2, '0')}`;
      const signature = JSON.stringify([eventId, foodAt, company, serviceDescription, room, timeZone]);
      alerts.push({ id, eventId, foodAt, alertAt, expiresAt: alertAt + FOOD_MAX_DELAY_MS, timeZone, company, description: serviceDescription, room, timeLabel, signature });
    }
  }
  return { alerts: alerts.filter(alert => !ambiguousIds.has(alert.eventId)).sort((first, second) => first.alertAt - second.alertAt || first.id.localeCompare(second.id)), issues };
}

export function foodNotification(alert) {
  const excerpt = (value, maximum) => { const characters = Array.from(value); return characters.length > maximum ? `${characters.slice(0, maximum - 1).join('')}…` : value; };
  const location = alert.room ? ` Lugar: ${excerpt(alert.room, 100)}.` : '';
  return { title: 'ALIMENTACIÓN PROGRAMADA', body: `Alimentación para ${excerpt(alert.company, 80)}. Servicio: ${excerpt(alert.description, 240)}. Hora programada: ${alert.timeLabel} (${alert.timeZone}).${location}`, kind: 'food', alertId: alert.id, foodAt: String(alert.foodAt), alertAt: String(alert.alertAt), expiresAt: String(alert.expiresAt), tag: alert.id, url: './agenda_movil.html' };
}

export function isFoodAlertDue(alert, now) {
  return now >= alert.alertAt && now <= alert.expiresAt && now < alert.foodAt;
}
