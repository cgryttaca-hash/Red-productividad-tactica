/* =========================================================
   NÚCLEO COMPARTIDO - Agenda de Eventos
   Fuente única: módulo principal EVENTOS.
   Este archivo NO lee Excel en módulos secundarios.
   Solo normaliza, consulta localStorage, factura, exporta y audita.
   ========================================================= */
(function () {
  'use strict';

  const APP = 'AgendaEventosFuenteUnica';
  const STORAGE = {
    events: 'agendaEventos:fuentePrincipalEventos',
    eventsMeta: 'agendaEventos:fuentePrincipalEventosMeta',
    invoices: 'agendaEventos:facturasEditables',
    audit: 'agendaEventos:auditoriaSistema',
    ip: 'agendaEventos:ipPublica',
    user: 'agendaEventos:usuarioActual'
  };

  const CHANNEL = 'agendaEventos:dataChannel';
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel(CHANNEL) : null;

  const ALIASES = {
    fecha: ['FECHA', 'FECHA EVENTO', 'DIA', 'DÍA', 'DATE'],
    escenario: ['ESCENARIO ASIGNADO', 'ESCENARIO', 'SALON', 'SALÓN', 'ESPACIO', 'UBICACION', 'UBICACIÓN'],
    horarioEvento: ['HORARIO DEL EVENTO', 'HORARIO EVENTO', 'HORA EVENTO', 'HORA', 'HORARIO'],
    empresa: ['NOMBRE DE LA EMPRESA', 'NOMBRE EMPRESA', 'EMPRESA', 'CLIENTE', 'NOMBRE DEL CLIENTE'],
    personas: ['CANTIDAD DE PERSONAS', 'CANTIDAD PERSONAS', 'PERSONAS', 'PAX', 'ASISTENTES'],
    horarioAyb: ['HORARIO AYB', 'HORARIO A&B', 'HORARIO ALIMENTACION', 'HORARIO ALIMENTACIÓN', 'HORA AYB'],
    alimentacion: ['DESCRIPCION ALIMENTACION', 'DESCRIPCIÓN ALIMENTACIÓN', 'ALIMENTACION', 'ALIMENTACIÓN', 'MENU', 'MENÚ', 'SERVICIO ALIMENTACION'],
    acomodacion: ['ACOMODACION', 'ACOMODACIÓN', 'MONTAJE'],
    modalidad: ['MODALIDAD DE SERVICIO', 'MODALIDAD', 'TIPO SERVICIO'],
    pago: ['MEDIO DE PAGO', 'PAGO', 'FORMA DE PAGO'],
    observacion: ['OBSERVACION', 'OBSERVACIÓN', 'OBSERVACIONES', 'NOTAS'],
    estado: ['ESTADO', 'ESTATUS']
  };

  const strip = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizeKey = value => strip(value).toUpperCase();

  const safeJsonParse = (value, fallback = null) => {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  };

  const unique = arr => [...new Set((arr || []).filter(Boolean))];

  const hash = text => {
    let h = 0;
    const s = String(text ?? '');
    for (let i = 0; i < s.length; i += 1) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  };

  const getFirstValue = (row, aliasList) => {
    if (!row || typeof row !== 'object') return '';
    const map = Object.keys(row).reduce((acc, key) => {
      acc[normalizeKey(key)] = key;
      return acc;
    }, {});

    for (const alias of aliasList) {
      const exact = map[normalizeKey(alias)];
      if (exact !== undefined) return row[exact];
    }

    const normalizedAliases = aliasList.map(normalizeKey);
    for (const key of Object.keys(row)) {
      const nk = normalizeKey(key);
      if (normalizedAliases.some(alias => nk.includes(alias) || alias.includes(nk))) return row[key];
    }
    return '';
  };

  const excelSerialToISO = serial => {
    const days = Number(serial);
    if (!Number.isFinite(days)) return '';
    const utcDays = Math.floor(days - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (Number.isNaN(dateInfo.getTime())) return '';
    return dateInfo.toISOString().slice(0, 10);
  };

  const parseDateToISO = value => {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value === 'number') return excelSerialToISO(value);

    const raw = strip(value);
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

    const slash = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (slash) {
      let [, d, m, y] = slash;
      if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return raw;
  };

  const formatDate = iso => {
    if (!iso) return '';
    const value = String(iso).slice(0, 10);
    const parts = value.split('-');
    if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  };

  const toNumber = value => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeEvent = (row, index = 0) => {
    const fecha = parseDateToISO(row.fecha ?? row.Fecha ?? getFirstValue(row, ALIASES.fecha));
    const empresa = strip(row.empresa ?? row.Empresa ?? getFirstValue(row, ALIASES.empresa));
    const escenario = strip(row.escenario ?? row.Escenario ?? getFirstValue(row, ALIASES.escenario));
    const horarioEvento = strip(row.horarioEvento ?? row['Horario evento'] ?? getFirstValue(row, ALIASES.horarioEvento));
    const personas = toNumber(row.personas ?? row.Personas ?? getFirstValue(row, ALIASES.personas));

    const base = {
      fecha,
      fechaTexto: formatDate(fecha),
      escenario,
      horarioEvento,
      empresa,
      personas,
      horarioAyb: strip(row.horarioAyb ?? row['Horario AYB'] ?? getFirstValue(row, ALIASES.horarioAyb)),
      alimentacion: strip(row.alimentacion ?? row.Alimentacion ?? row['Alimentación'] ?? getFirstValue(row, ALIASES.alimentacion)),
      acomodacion: strip(row.acomodacion ?? row.Acomodacion ?? row['Acomodación'] ?? getFirstValue(row, ALIASES.acomodacion)),
      modalidad: strip(row.modalidad ?? row.Modalidad ?? getFirstValue(row, ALIASES.modalidad)),
      pago: strip(row.pago ?? row.Pago ?? row['Medio de pago'] ?? getFirstValue(row, ALIASES.pago)),
      observacion: strip(row.observacion ?? row.Observacion ?? row['Observación'] ?? getFirstValue(row, ALIASES.observacion)),
      estado: strip(row.estado ?? row.Estado ?? getFirstValue(row, ALIASES.estado)),
      raw: row.raw || row
    };

    base.id = strip(row.id || row.ID || `evt_${hash(`${base.fecha}|${base.empresa}|${base.escenario}|${base.horarioEvento}|${base.personas}|${index}`)}`);
    return base;
  };

  const saveEventsFromEventos = (events, meta = {}) => {
    const normalized = (events || [])
      .map((row, index) => normalizeEvent(row, index))
      .filter(event => event.fecha || event.empresa || event.escenario || event.personas || event.pago);

    localStorage.setItem(STORAGE.events, JSON.stringify(normalized));
    localStorage.setItem(STORAGE.eventsMeta, JSON.stringify({
      updatedAt: new Date().toISOString(),
      count: normalized.length,
      source: 'eventos.html',
      ...meta
    }));
    publish('events-updated', { count: normalized.length });
    window.dispatchEvent(new CustomEvent('agendaEventos:events-updated', { detail: { count: normalized.length } }));
    return normalized;
  };

  const getEvents = () => {
    const direct = safeJsonParse(localStorage.getItem(STORAGE.events), []);
    if (Array.isArray(direct)) return direct.map((row, index) => normalizeEvent(row, index));
    return [];
  };

  const getEventsMeta = () => safeJsonParse(localStorage.getItem(STORAGE.eventsMeta), {}) || {};

  const getInvoices = () => safeJsonParse(localStorage.getItem(STORAGE.invoices), {}) || {};

  const mergeInvoices = events => {
    const map = getInvoices();
    return (events || []).map(event => ({
      ...event,
      facturaEstado: map[event.id]?.facturaEstado || 'Pendiente',
      facturaNumero: map[event.id]?.facturaNumero || '',
      facturaFechaRadicada: map[event.id]?.facturaFechaRadicada || '',
      facturaObservacion: map[event.id]?.facturaObservacion || ''
    }));
  };

  const saveInvoicePatch = (eventId, patch) => {
    const map = getInvoices();
    const prev = map[eventId] || {};
    map[eventId] = {
      facturaEstado: patch.facturaEstado ?? prev.facturaEstado ?? 'Pendiente',
      facturaNumero: patch.facturaNumero ?? prev.facturaNumero ?? '',
      facturaFechaRadicada: patch.facturaFechaRadicada ?? prev.facturaFechaRadicada ?? '',
      facturaObservacion: patch.facturaObservacion ?? prev.facturaObservacion ?? ''
    };
    localStorage.setItem(STORAGE.invoices, JSON.stringify(map));
    publish('invoices-updated', { eventId });
    return map[eventId];
  };

  const compareDates = (date, from, to) => {
    const value = parseDateToISO(date);
    if (!value) return true;
    if (from && value < from) return false;
    if (to && value > to) return false;
    return true;
  };

  const includesText = (row, text) => {
    const q = normalizeKey(text);
    if (!q) return true;
    return normalizeKey(Object.values(row || {}).join(' ')).includes(q);
  };

  const groupBy = (rows, getter) => (rows || []).reduce((acc, row) => {
    const key = getter(row) || 'Sin clasificar';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sumBy = (rows, getter) => (rows || []).reduce((total, row) => total + toNumber(getter(row)), 0);

  const rowsToCsv = rows => {
    const data = rows || [];
    const headers = unique(data.flatMap(row => Object.keys(row)));
    const esc = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [headers.join(';'), ...data.map(row => headers.map(h => esc(row[h])).join(';'))].join('\n');
  };

  const downloadCsv = (filename, rows) => {
    const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.xlsx$/i, '.csv');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadWorkbook = (filename, sheets) => {
    if (!window.XLSX) {
      const first = Object.values(sheets || {})[0] || [];
      downloadCsv(filename, first);
      return;
    }
    const workbook = XLSX.utils.book_new();
    Object.entries(sheets || {}).forEach(([sheetName, rows]) => {
      const ws = XLSX.utils.json_to_sheet(rows || []);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName.slice(0, 31));
    });
    XLSX.writeFile(workbook, filename);
  };

  const getUser = () => {
    const stored = safeJsonParse(localStorage.getItem(STORAGE.user), null);
    if (stored?.name) return stored.name;
    if (localStorage.getItem('currentUser')) return localStorage.getItem('currentUser');
    if (sessionStorage.getItem('currentUser')) return sessionStorage.getItem('currentUser');
    return 'Usuario local';
  };

  const getBrowser = () => {
    const ua = navigator.userAgent || '';
    if (ua.includes('Edg/')) return 'Microsoft Edge';
    if (ua.includes('Chrome/')) return 'Google Chrome';
    if (ua.includes('Firefox/')) return 'Mozilla Firefox';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    return 'Navegador local';
  };

  const initPublicIp = async () => {
    const cached = localStorage.getItem(STORAGE.ip);
    if (cached) return cached;
    if (!window.fetch) return 'No disponible en modo local';

    const controller = ('AbortController' in window) ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 1200) : null;

    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      const data = await response.json();
      if (data?.ip) {
        localStorage.setItem(STORAGE.ip, data.ip);
        return data.ip;
      }
    } catch (_) {
      // En uso local o sin internet no debe bloquear la carga de las páginas.
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    return 'No disponible en modo local';
  };

  const auditLog = async (accion, modulo, detalle = '') => {
    const now = new Date();
    const records = safeJsonParse(localStorage.getItem(STORAGE.audit), []) || [];
    const record = {
      id: `AUD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${hash(`${now.toISOString()}-${Math.random()}`)}`,
      fecha: now.toISOString().slice(0, 10),
      hora: now.toLocaleTimeString('es-CO', { hour12: false }),
      usuario: getUser(),
      modulo,
      accion,
      detalle: String(detalle || '').slice(0, 700),
      ip: await initPublicIp(),
      navegador: getBrowser(),
      plataforma: navigator.platform || 'No identificada',
      url: location.pathname.split('/').pop() || location.pathname,
      userAgent: navigator.userAgent || 'No disponible'
    };
    records.unshift(record);
    localStorage.setItem(STORAGE.audit, JSON.stringify(records.slice(0, 5000)));
    publish('audit-updated', { id: record.id });
    return record;
  };



  const hideLoaders = () => {
    if (typeof window.EventosHideLoaders === 'function') {
      window.EventosHideLoaders();
      return;
    }
    ['pageLoader', 'agendaPreloader', 'loader'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('is-hidden', 'hidden', 'loaded');
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      setTimeout(() => { el.style.display = 'none'; }, 350);
    });
  };

  const getAudit = () => safeJsonParse(localStorage.getItem(STORAGE.audit), []) || [];
  const saveAudit = rows => {
    localStorage.setItem(STORAGE.audit, JSON.stringify(rows || []));
    publish('audit-updated', {});
  };

  function publish(type, detail = {}) {
    const payload = { type, detail, at: Date.now() };
    if (bc) bc.postMessage(payload);
    try { localStorage.setItem('agendaEventos:lastBroadcast', JSON.stringify(payload)); } catch (_) {}
  }

  const onDataChange = callback => {
    const handler = event => {
      if (event.key === STORAGE.events || event.key === STORAGE.invoices || event.key === STORAGE.audit || event.key === 'agendaEventos:lastBroadcast') {
        callback(event);
      }
    };
    window.addEventListener('storage', handler);
    if (bc) bc.addEventListener('message', () => callback());
    window.addEventListener('agendaEventos:events-updated', callback);
    return () => {
      window.removeEventListener('storage', handler);
      if (bc) bc.close();
      window.removeEventListener('agendaEventos:events-updated', callback);
    };
  };

  window.EventosCore = {
    APP,
    STORAGE,
    ALIASES,
    strip,
    normalizeKey,
    parseDateToISO,
    formatDate,
    toNumber,
    unique,
    hash,
    normalizeEvent,
    saveEventsFromEventos,
    getEvents,
    getEventsMeta,
    getInvoices,
    mergeInvoices,
    saveInvoicePatch,
    compareDates,
    includesText,
    groupBy,
    sumBy,
    downloadWorkbook,
    auditLog,
    getAudit,
    saveAudit,
    onDataChange,
    safeJsonParse,
    publish,
    hideLoaders
  };
})();
