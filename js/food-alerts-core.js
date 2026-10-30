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
    const match = line.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([AP]\.?\s*M\.?|M)?(?=\s|[-–—:]|$)/i);
    if (!match || (!match[2] && !match[3])) continue;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = normalize(match[3]).replace(/[.\s]/g, '');
    if (meridiem === 'M' && hour !== 12) continue;
    if (minute > 59 || hour > 23 || (meridiem && (hour < 1 || hour > 12))) continue;
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    results.push({ hour, minute, originalTime: match[0].trim(), line });
  }
  return results;
}

export function pairFoodServices(schedule,description){
  const times=parseFoodTimes(schedule),lines=text(description).replace(/\r/g,'').split('\n').map(value=>value.trim()).filter(Boolean),used=new Set();
  const labels=times.map(item=>item.line.slice(item.originalTime.length).replace(/^[\s:–—-]+/,'').trim());
  const matches=(label,line)=>{const a=normalize(label),b=normalize(line);return a&&b&&(a===b||b.startsWith(a+' ')||a.startsWith(b+' '));};
  const result=times.map((item,index)=>{const label=labels[index],candidates=lines.map((line,i)=>matches(label,line)?i:-1).filter(i=>i>=0);let chosen=-1,relation='';
    if(times.length===1)return{...item,service:label||text(description),description:label?text(description):'',relation:'single-service'};
    if(candidates.length===1&&!used.has(candidates[0])){chosen=candidates[0];relation='service-label';}
    else if(!label&&lines.length===times.length&&!labels.some(Boolean)){chosen=index;relation='parallel-lines';}
    else if(lines.length===1&&!label){return{...item,service:lines[0],description:'',relation:'shared-description'};}
    if(chosen>=0){used.add(chosen);return{...item,service:label||lines[chosen],description:label&&normalize(label)!==normalize(lines[chosen])?lines[chosen]:'',relation};}
    return{...item,service:label,description:'',relation:label?'schedule-label':'unresolved'};
  });
  return{services:result,unassigned:lines.filter((line,index)=>!used.has(index)&&times.length>1&&!result.some(row=>['shared-description'].includes(row.relation)))};
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
    const description = field(event, 'descripcionAlimentacion', 'DESCRIPCION ALIMENTACION');
    const foodSchedule = field(event, 'horarioAyB', 'HORARIO AYB');
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
    const times = pairFoodServices(foodSchedule,description).services;
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
