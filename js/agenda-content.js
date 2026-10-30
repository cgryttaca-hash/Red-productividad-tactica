const asText = value => value === undefined || value === null ? '' : String(value).replace(/\r\n?/g, '\n').trim();
const normalized = value => asText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
const escapeHtml = value => asText(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function field(record, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(record || {}).find(candidate => normalized(candidate) === normalized(alias));
    if (key !== undefined && asText(record[key]) !== '') return asText(record[key]);
  }
  return '';
}

export function eventIdentity(record) {
  if (asText(record.__EVENT_ID)) return `id:${asText(record.__EVENT_ID)}`;
  if (asText(record.HOJA_ORIGEN) && asText(record.__FILA_ORIGEN)) return `source:${asText(record.HOJA_ORIGEN)}:${asText(record.__FILA_ORIGEN)}`;
  const comparableDate = value => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const source = asText(value);
    const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[0];
    const local = source.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : source;
  };
  return `record:${JSON.stringify(Object.keys(record).sort().map(key => [key, key === 'FECHA' ? comparableDate(record[key]) : record[key]]))}`;
}

export function resolveEvent(records, identity) {
  const matches = records.filter(record => eventIdentity(record) === identity);
  if (matches.length !== 1) throw new Error(matches.length ? 'Hay registros idénticos sin identificador único. Genera la agenda desde una importación con hoja y fila de origen.' : 'El evento cambió o ya no está disponible. Actualiza la lista y selecciónalo de nuevo.');
  return matches[0];
}

export function displayDate(value) {
  const source = asText(value);
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : source;
}

export function executiveForEvent(record){
  return{
    name:field(record,['NOMBRE COMPLETO DEL EJECUTIVO','NOMBRE DEL EJECUTIVO','NOMBRE EJECUTIVO','EJECUTIVO','ASESOR COMERCIAL']),
    email:field(record,['CORREO ELECTRONICO DEL EJECUTIVO','CORREO ELECTRONICO EJECUTIVO','CORREO DEL EJECUTIVO','CORREO EJECUTIVO','EMAIL EJECUTIVO','EMAIL DEL EJECUTIVO','EMAIL ASESOR']),
    phone:field(record,['TELEFONO DEL EJECUTIVO','TELEFONO EJECUTIVO','CELULAR DEL EJECUTIVO','CELULAR EJECUTIVO','TELEFONO ASESOR'])
  };
}

export function buildAgenda(record) {
  const company = field(record, ['NOMBRE DE LA EMPRESA', 'EMPRESA', 'CLIENTE']);
  const date = field(record, ['FECHA']);
  const room = field(record, ['ESCENARIO ASIGNADO', 'ESCENARIO', 'SALON']);
  const attendees = field(record, ['CANTIDAD DE PERSONAS', 'PAX']);
  const schedule = field(record, ['HORARIO DEL EVENTO', 'HORARIO']);
  const sections = [];
  const missing = [];
  const required = (label, value) => {
    if (!value) missing.push(label);
    return { label, value: value || 'Pendiente de confirmar' };
  };
  const add = (title, entries) => {
    const populated = entries.filter(entry => entry.value !== '');
    if (populated.length) sections.push({ title, entries: populated });
  };
  add('Información general', [required('Empresa o cliente', company), required('Fecha', displayDate(date)), required('Lugar o salón', room), required('Cantidad de asistentes', attendees), { label: 'Tipo de evento', value: field(record, ['TIPO DE EVENTO', 'TIPO EVENTO']) }]);
  const times = schedule.match(/^\s*(\d{1,2}:\d{2}\s*(?:[AP]\.?\s*M\.?)?)\s*[-–—]\s*(\d{1,2}:\d{2}\s*(?:[AP]\.?\s*M\.?)?)\s*$/i);
  add('Programación y horarios', [required('Horario del evento', schedule), ...(times ? [{ label: 'Hora de inicio', value: times[1].trim() }, { label: 'Hora de finalización', value: times[2].trim() }] : []), { label: 'Horarios A/B', value: field(record, ['HORARIO AYB', 'HORARIO A&B', 'HORARIO A Y B']) }, { label: 'Actividades registradas', value: field(record, ['DESARROLLO ACTIVIDAD', 'DESARROLLO DE ACTIVIDAD', 'PROGRAMACION']) }]);
  add('Montaje y acomodación', [{ label: 'Acomodación o montaje', value: field(record, ['ACOMODACION', 'TIPO DE MONTAJE', 'MONTAJE']) }]);
  add('Alimentación y servicios', [{ label: 'Descripción de alimentos', value: field(record, ['DESCRIPCION ALIMENTACION', 'ALIMENTACION']) }, { label: 'Modalidad de servicio', value: field(record, ['MODALIDAD DE SERVICIO', 'MODALIDAD', 'TIPO DE SERVICIO']) }, { label: 'Requerimientos registrados', value: field(record, ['REQUERIMIENTOS OPERATIVOS', 'REQUERIMIENTOS']) }]);
  add('Observaciones y pendientes', [{ label: 'Observaciones operativas', value: field(record, ['OBSERVACION', 'OBSERVACIONES']) }, { label: 'Información pendiente de confirmar', value: missing.join('; ') }]);
  add('Control del evento', [{ label: 'Estado', value: field(record, ['ESTADO']) || 'No registrado' }, { label: 'Medio de pago', value: field(record, ['MEDIO DE PAGO', 'FORMA DE PAGO']) }]);
  const title = 'AGENDA OPERATIVA DEL EVENTO';
  const text = [title, ...sections.map((section, index) => `${index + 1}. ${section.title.toUpperCase()}\n${section.entries.map(entry => `- ${entry.label}: ${entry.value.replace(/\n/g, '\n  ')}`).join('\n')}`)].join('\n\n');
  const html = `<article><h1>${title}</h1>${sections.map((section, index) => `<section><h2>${index + 1}. ${escapeHtml(section.title)}</h2><dl>${section.entries.map(entry => `<dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(entry.value).replace(/\n/g, '<br>')}</dd>`).join('')}</dl></section>`).join('')}</article>`;
  return { company, date: displayDate(date), room, sections, text, html };
}
