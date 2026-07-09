(function () {
  'use strict';

  const C = window.EventosCore;
  const state = { rows: [], filtered: [], timers: new Map(), lastValues: new Map() };
  const $ = id => document.getElementById(id);

  const fieldLabels = {
    facturaEstado: 'Estado factura',
    facturaNumero: 'N.° factura',
    facturaFechaRadicada: 'Fecha radicada',
    facturaObservacion: 'Observación factura'
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const showLoader = visible => $('pageLoader').classList.toggle('is-hidden', !visible);
  const showToast = message => {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  };

  const setSourceStatus = () => {
    const meta = C.getEventsMeta();
    if (!state.rows.length) {
      $('sourceStatus').textContent = 'Sin datos. Primero cargue el archivo en el módulo Eventos.';
      return;
    }
    const date = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString('es-CO') : 'actualización no registrada';
    $('sourceStatus').textContent = `Fuente: Eventos · ${state.rows.length.toLocaleString('es-CO')} registros · ${date}`;
  };

  const loadRows = () => {
    state.rows = C.mergeInvoices(C.getEvents());
    state.lastValues.clear();
    state.rows.forEach(row => {
      Object.keys(fieldLabels).forEach(field => state.lastValues.set(`${row.id}:${field}`, row[field] || ''));
    });
    populateFilters();
    applyFilters();
    setSourceStatus();
  };

  const fillSelect = (id, values) => {
    const select = $(id);
    const current = select.value;
    const clean = C.unique(values.map(v => String(v || '').trim()).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'es'));
    select.innerHTML = '<option value="">Todos</option>' + clean.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    select.value = clean.includes(current) ? current : '';
  };

  const populateFilters = () => {
    fillSelect('filterPayment', state.rows.map(row => row.pago));
  };

  const getFilters = () => ({
    search: $('filterSearch').value,
    from: $('filterFrom').value,
    to: $('filterTo').value,
    payment: $('filterPayment').value,
    invoice: $('filterInvoice').value
  });

  const applyFilters = () => {
    const f = getFilters();
    state.filtered = state.rows.filter(row => {
      if (!C.compareDates(row.fecha, f.from, f.to)) return false;
      if (f.payment && row.pago !== f.payment) return false;
      if (f.invoice && (row.facturaEstado || 'Pendiente') !== f.invoice) return false;
      const searchable = {
        fecha: row.fecha,
        empresa: row.empresa,
        personas: row.personas,
        pago: row.pago,
        facturaEstado: row.facturaEstado,
        facturaNumero: row.facturaNumero,
        facturaFechaRadicada: row.facturaFechaRadicada,
        facturaObservacion: row.facturaObservacion
      };
      if (!C.includesText(searchable, f.search)) return false;
      return true;
    });
    render();
  };

  const statusOptions = selected => ['Pendiente', 'Radicada', 'No aplica', 'Anulada']
    .map(value => `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`).join('');

  const render = () => {
    const tbody = $('invoiceTbody');
    $('resultCount').textContent = `${state.filtered.length.toLocaleString('es-CO')} registros visibles`;
    if (!state.filtered.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No hay eventos para mostrar con los filtros actuales.</td></tr>';
      return;
    }

    tbody.innerHTML = state.filtered.map(row => {
      const estado = row.facturaEstado || 'Pendiente';
      return `
        <tr data-id="${escapeHtml(row.id)}">
          <td class="readonly">${escapeHtml(C.formatDate(row.fecha))}</td>
          <td class="readonly">${escapeHtml(row.empresa || 'Sin empresa')}</td>
          <td class="readonly">${Number(row.personas || 0).toLocaleString('es-CO')}</td>
          <td class="readonly">${escapeHtml(row.pago || 'Sin pago')}</td>
          <td><select class="status-select" data-field="facturaEstado" data-status="${escapeHtml(estado)}">${statusOptions(estado)}</select></td>
          <td><input data-field="facturaNumero" type="text" value="${escapeHtml(row.facturaNumero || '')}" placeholder="Ej. FV-0001"></td>
          <td><input data-field="facturaFechaRadicada" type="date" value="${escapeHtml(row.facturaFechaRadicada || '')}"></td>
          <td><input data-field="facturaObservacion" type="text" value="${escapeHtml(row.facturaObservacion || '')}" placeholder="Observación"></td>
        </tr>
      `;
    }).join('');
  };

  const updateLocalRow = (id, field, value) => {
    const row = state.rows.find(item => item.id === id);
    if (!row) return null;
    row[field] = value;
    return row;
  };

  const autosave = (id, field, value) => {
    const key = `${id}:${field}`;
    const previous = state.lastValues.get(key) || '';
    if (previous === value) return;

    updateLocalRow(id, field, value);
    C.saveInvoicePatch(id, { [field]: value });
    state.lastValues.set(key, value);

    clearTimeout(state.timers.get(key));
    const timer = setTimeout(async () => {
      const row = state.rows.find(item => item.id === id);
      await C.auditLog('MODIFICACIÓN FACTURA', 'Eventos para facturar', `${fieldLabels[field]} actualizado para ${row?.empresa || 'evento sin empresa'} (${C.formatDate(row?.fecha)}). Valor anterior: "${previous}". Nuevo valor: "${value}".`);
      showToast('Cambio guardado automáticamente.');
    }, field === 'facturaObservacion' || field === 'facturaNumero' ? 850 : 150);
    state.timers.set(key, timer);
  };

  const exportExcel = async () => {
    const rows = state.filtered.map(row => ({
      Fecha: C.formatDate(row.fecha),
      'Nombre empresa': row.empresa,
      'Cantidad de personas': row.personas,
      'Medio de pago': row.pago,
      'Estado factura': row.facturaEstado || 'Pendiente',
      'N.° factura': row.facturaNumero || '',
      'Fecha radicada': row.facturaFechaRadicada ? C.formatDate(row.facturaFechaRadicada) : '',
      'Observación factura': row.facturaObservacion || ''
    }));
    C.downloadWorkbook(`eventos_para_facturar_${new Date().toISOString().slice(0,10)}.xlsx`, { Facturas: rows });
    await C.auditLog('EXPORTACIÓN', 'Eventos para facturar', `Descarga de eventos para facturar. Registros exportados: ${rows.length}.`);
    showToast('Archivo descargado.');
  };

  const resetFilters = () => {
    ['filterSearch', 'filterFrom', 'filterTo', 'filterPayment', 'filterInvoice'].forEach(id => { $(id).value = ''; });
    applyFilters();
  };

  const init = async () => {
    showLoader(true);
    loadRows();
    showLoader(false);
    await C.auditLog('ACCESO', 'Eventos para facturar', `Ingreso al módulo. Eventos disponibles desde fuente principal: ${state.rows.length}.`);
  };

  $('btnInicio').addEventListener('click', () => { location.href = 'index.html'; });
  $('btnExport').addEventListener('click', exportExcel);
  $('btnReset').addEventListener('click', resetFilters);
  ['filterSearch', 'filterFrom', 'filterTo', 'filterPayment', 'filterInvoice'].forEach(id => {
    $(id).addEventListener('input', applyFilters);
    $(id).addEventListener('change', applyFilters);
  });

  $('invoiceTbody').addEventListener('input', event => {
    const field = event.target.dataset.field;
    const tr = event.target.closest('tr[data-id]');
    if (!field || !tr) return;
    autosave(tr.dataset.id, field, event.target.value);
  });

  $('invoiceTbody').addEventListener('change', event => {
    const field = event.target.dataset.field;
    const tr = event.target.closest('tr[data-id]');
    if (!field || !tr) return;
    if (field === 'facturaEstado') event.target.dataset.status = event.target.value;
    autosave(tr.dataset.id, field, event.target.value);
    applyFilters();
  });

  C.onDataChange(() => {
    const active = document.activeElement;
    if (active && active.dataset && active.dataset.field) return;
    loadRows();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
