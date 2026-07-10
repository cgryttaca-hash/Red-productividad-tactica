(function () {
  'use strict';

  const C = window.EventosCore;
  const state = { rows: [], filtered: [] };
  const $ = id => document.getElementById(id);

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const showLoader = visible => {
    const loader = $('pageLoader');
    if (!loader) return;
    loader.classList.toggle('is-hidden', !visible);
    if (!visible) {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
      loader.style.pointerEvents = 'none';
      setTimeout(() => { loader.style.display = 'none'; }, 350);
    } else {
      loader.style.display = 'flex';
      loader.style.opacity = '';
      loader.style.visibility = '';
      loader.style.pointerEvents = '';
    }
  };
  const showToast = message => {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  };

  const badgeClass = action => {
    const a = C.normalizeKey(action);
    if (a.includes('ACCESO')) return 'access';
    if (a.includes('MODIFIC') || a.includes('ACTUALIZ')) return 'change';
    if (a.includes('EXPORT') || a.includes('DESCARG')) return 'export';
    if (a.includes('LIMPIAR') || a.includes('ELIMIN') || a.includes('ANUL')) return 'danger';
    return 'access';
  };

  const fillSelect = (id, values, firstLabel) => {
    const select = $(id);
    const current = select.value;
    const clean = C.unique(values.map(v => String(v || '').trim()).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'es'));
    select.innerHTML = `<option value="">${firstLabel}</option>` + clean.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    select.value = clean.includes(current) ? current : '';
  };

  const populateFilters = () => {
    fillSelect('filterModule', state.rows.map(row => row.modulo), 'Todos');
    fillSelect('filterAction', state.rows.map(row => row.accion), 'Todas');
  };

  const getFilters = () => ({
    search: $('filterSearch').value,
    from: $('filterFrom').value,
    to: $('filterTo').value,
    module: $('filterModule').value,
    action: $('filterAction').value
  });

  const applyFilters = () => {
    const f = getFilters();
    state.filtered = state.rows.filter(row => {
      if (!C.compareDates(row.fecha, f.from, f.to)) return false;
      if (f.module && row.modulo !== f.module) return false;
      if (f.action && row.accion !== f.action) return false;
      if (!C.includesText(row, f.search)) return false;
      return true;
    });
    render();
  };

  const render = () => {
    const tbody = $('auditTbody');
    $('resultCount').textContent = `${state.filtered.length.toLocaleString('es-CO')} registros visibles`;
    if (!state.filtered.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="11">No hay registros de auditoría para mostrar.</td></tr>';
      return;
    }
    tbody.innerHTML = state.filtered.map(row => `
      <tr>
        <td>${escapeHtml(row.id)}</td>
        <td>${escapeHtml(C.formatDate(row.fecha))}</td>
        <td>${escapeHtml(row.hora)}</td>
        <td>${escapeHtml(row.usuario)}</td>
        <td>${escapeHtml(row.modulo)}</td>
        <td><span class="badge ${badgeClass(row.accion)}">${escapeHtml(row.accion)}</span></td>
        <td class="detail-cell">${escapeHtml(row.detalle)}</td>
        <td>${escapeHtml(row.ip)}</td>
        <td>${escapeHtml(row.navegador)}</td>
        <td>${escapeHtml(row.plataforma)}</td>
        <td>${escapeHtml(row.url)}</td>
      </tr>
    `).join('');
  };

  const reload = () => {
    state.rows = C.getAudit();
    populateFilters();
    applyFilters();
  };

  const exportExcel = async () => {
    const rows = state.filtered.map(row => ({
      ID: row.id,
      Fecha: C.formatDate(row.fecha),
      Hora: row.hora,
      Usuario: row.usuario,
      Módulo: row.modulo,
      Acción: row.accion,
      Detalle: row.detalle,
      IP: row.ip,
      Navegador: row.navegador,
      Plataforma: row.plataforma,
      URL: row.url,
      'User Agent': row.userAgent
    }));
    C.downloadWorkbook(`auditoria_sistema_${new Date().toISOString().slice(0,10)}.xlsx`, { Auditoria: rows });
    await C.auditLog('EXPORTACIÓN', 'Auditoría', `Descarga de auditoría. Registros exportados: ${rows.length}.`);
    reload();
    showToast('Auditoría descargada.');
  };

  const resetFilters = () => {
    ['filterSearch', 'filterFrom', 'filterTo', 'filterModule', 'filterAction'].forEach(id => { $(id).value = ''; });
    applyFilters();
  };

  const init = async () => {
    showLoader(true);
    try {
      reload();
    } catch (error) {
      console.error('Error inicializando Auditoría:', error);
      showToast('La página abrió, pero no se pudo leer la auditoría local.');
    } finally {
      showLoader(false);
      if (C.hideLoaders) C.hideLoaders();
    }
    C.auditLog('ACCESO', 'Auditoría', 'Ingreso al módulo de auditoría.').then(reload).catch(console.warn);
  };

  $('btnInicio').addEventListener('click', () => { location.href = 'index.html'; });
  $('btnExport').addEventListener('click', exportExcel);
  $('btnReset').addEventListener('click', resetFilters);
  ['filterSearch', 'filterFrom', 'filterTo', 'filterModule', 'filterAction'].forEach(id => {
    $(id).addEventListener('input', applyFilters);
    $(id).addEventListener('change', applyFilters);
  });

  C.onDataChange(() => reload());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
