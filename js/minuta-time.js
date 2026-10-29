(function (scope) {
  const TIME_ZONE = 'America/Bogota';
  const GREETING_PERIODS = Object.freeze([
    { start: 5, end: 12, greeting: 'buenos días' },
    { start: 12, end: 19, greeting: 'buenas tardes' }
  ]);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  function parts(epoch = Date.now()) {
    return Object.fromEntries(formatter.formatToParts(new Date(epoch)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  }
  function todayISO(epoch = Date.now()) {
    const value = parts(epoch);
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
  }
  function tomorrowISO(epoch = Date.now()) {
    const value = parts(epoch);
    return new Date(Date.UTC(value.year, value.month - 1, value.day + 1)).toISOString().slice(0, 10);
  }
  function validDate(year, month, day) {
    const value = new Date(Date.UTC(year, month - 1, day));
    return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
  }
  function parseCoworkDate(value) {
    const source = String(value || '').trim();
    let match = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
    let year, month, day;
    if (match) { year = Number(match[1]); month = Number(match[2]); day = Number(match[3]); }
    else {
      match = source.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (!match) return '';
      day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
    }
    return validDate(year, month, day) ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
  }
  function displayDate(iso) { const [year, month, day] = iso.split('-'); return `${day}/${month}/${year}`; }
  function localDate(iso) { const [year, month, day] = iso.split('-').map(Number); return new Date(year, month - 1, day); }
  function longDate(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('es-CO', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function message(iso, epoch = Date.now()) {
    const hour = parts(epoch).hour;
    const greeting = GREETING_PERIODS.find(period => hour >= period.start && hour < period.end)?.greeting || 'buenas noches';
    const relation = iso === tomorrowISO(epoch) ? 'al día de mañana' : iso === todayISO(epoch) ? 'al día de hoy' : 'al día indicado';
    return `Equipo, ${greeting}. Les comparto la minuta de eventos correspondiente ${relation}, ${longDate(iso)}. Muchas gracias.`;
  }
  const api = Object.freeze({ TIME_ZONE, GREETING_PERIODS, todayISO, tomorrowISO, parseCoworkDate, displayDate, localDate, longDate, message });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.RPTMinuteTime = api;
})(typeof window === 'undefined' ? globalThis : window);
