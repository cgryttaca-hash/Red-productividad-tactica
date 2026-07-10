(function () {
  'use strict';

  const C = window.EventosCore;
  const state = { rows: [], filtered: [], charts: {}, visual: {} };
  const $ = id => document.getElementById(id);
  const palette = ['#1465c0', '#2dd4bf', '#7c3aed', '#f59e0b', '#12b76a', '#f04438', '#475467', '#0d2237', '#38bdf8', '#84cc16'];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('es-CO');
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

  const monthKey = date => {
    const iso = C.parseDateToISO(date);
    return /^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : 'Sin fecha';
  };

  const fillSelect = (id, values, firstLabel) => {
    const select = $(id);
    const current = select.value;
    const clean = C.unique(values.map(v => String(v || '').trim()).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'es'));
    select.innerHTML = `<option value="">${firstLabel}</option>` + clean.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    select.value = clean.includes(current) ? current : '';
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

  const populateFilters = () => {
    fillSelect('filterCompany', state.rows.map(row => row.empresa), 'Todas');
    fillSelect('filterScenario', state.rows.map(row => row.escenario), 'Todos');
    fillSelect('filterPayment', state.rows.map(row => row.pago), 'Todos');
    fillSelect('filterInvoice', state.rows.map(row => row.facturaEstado || 'Pendiente'), 'Todos');
  };

  const getFilters = () => ({
    search: $('filterSearch').value,
    from: $('filterFrom').value,
    to: $('filterTo').value,
    company: $('filterCompany').value,
    scenario: $('filterScenario').value,
    payment: $('filterPayment').value,
    invoice: $('filterInvoice').value
  });

  const rowMatchesVisual = row => {
    if (state.visual.month && monthKey(row.fecha) !== state.visual.month) return false;
    if (state.visual.company && row.empresa !== state.visual.company) return false;
    if (state.visual.scenario && row.escenario !== state.visual.scenario) return false;
    if (state.visual.payment && (row.pago || 'Sin pago') !== state.visual.payment) return false;
    if (state.visual.invoice && (row.facturaEstado || 'Pendiente') !== state.visual.invoice) return false;
    return true;
  };

  const applyFilters = () => {
    const f = getFilters();
    state.filtered = state.rows.filter(row => {
      if (!C.compareDates(row.fecha, f.from, f.to)) return false;
      if (f.company && row.empresa !== f.company) return false;
      if (f.scenario && row.escenario !== f.scenario) return false;
      if (f.payment && row.pago !== f.payment) return false;
      if (f.invoice && (row.facturaEstado || 'Pendiente') !== f.invoice) return false;
      if (!rowMatchesVisual(row)) return false;
      if (!C.includesText(row, f.search)) return false;
      return true;
    });
    renderAll();
  };

  const renderVisualFilters = () => {
    const labels = {
      month: 'Mes',
      company: 'Empresa',
      scenario: 'Salón',
      payment: 'Pago',
      invoice: 'Factura'
    };
    $('visualFilters').innerHTML = Object.entries(state.visual).map(([key, value]) => `
      <span class="filter-chip">${labels[key]}: ${escapeHtml(value)} <button type="button" data-clear-visual="${key}" aria-label="Quitar filtro">×</button></span>
    `).join('');
  };

  const setVisualFilter = async (key, value) => {
    if (!value) return;
    if (state.visual[key] === value) delete state.visual[key];
    else state.visual[key] = value;
    applyFilters();
    await C.auditLog('FILTRO VISUAL', 'Estadísticas', `Filtro aplicado desde gráfico: ${key} = ${value}.`);
  };

  const aggregateCount = (rows, getter) => Object.entries(C.groupBy(rows, getter)).sort((a, b) => b[1] - a[1]);

  const aggregatePaxByCompany = rows => {
    const map = {};
    rows.forEach(row => {
      const key = row.empresa || 'Sin empresa';
      map[key] = (map[key] || 0) + C.toNumber(row.personas);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const chartOptions = (filterKey, horizontal = false, legend = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: true },
    plugins: {
      legend: { display: legend, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, color: '#344054', font: { weight: 700 } } },
      tooltip: { backgroundColor: '#0b1320', padding: 12, titleFont: { weight: 'bold' }, bodyFont: { weight: 'bold' } }
    },
    scales: legend ? undefined : {
      x: horizontal ? { beginAtZero: true, ticks: { color: '#475467', precision: 0 }, grid: { color: 'rgba(148,163,184,.18)' } } : { ticks: { color: '#475467', maxRotation: 0, autoSkip: true }, grid: { display: false } },
      y: horizontal ? { ticks: { color: '#475467' }, grid: { display: false } } : { beginAtZero: true, ticks: { color: '#475467', precision: 0 }, grid: { color: 'rgba(148,163,184,.18)' } }
    },
    indexAxis: horizontal ? 'y' : 'x',
    onClick: (event, elements, chart) => {
      if (!filterKey || !elements.length) return;
      const index = elements[0].index;
      const label = chart.data.labels[index];
      setVisualFilter(filterKey, label);
    }
  });

  const showChartFallback = (id, title, labels, data) => {
    const canvas = $(id);
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.style.display = 'none';
    let fallback = parent.querySelector('.chart-fallback');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.className = 'chart-fallback';
      parent.appendChild(fallback);
    }
    const total = (data || []).reduce((acc, value) => acc + Number(value || 0), 0);
    fallback.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${fmt(total)} registros</span><small>Gráfico no disponible. Verifique conexión a internet para Chart.js.</small>`;
  };

  const makeChart = (id, type, labels, data, title, filterKey, extra = {}) => {
    if (!window.Chart) {
      showChartFallback(id, title, labels, data);
      return;
    }
    if (state.charts[id]) state.charts[id].destroy();
    const canvas = $(id);
    if (!canvas) return;
    canvas.style.display = '';
    const fallback = canvas.parentElement?.querySelector('.chart-fallback');
    if (fallback) fallback.remove();
    state.charts[id] = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          label: title,
          data,
          borderColor: extra.lineColor || '#1465c0',
          backgroundColor: extra.singleColor || labels.map((_, i) => palette[i % palette.length]),
          borderWidth: type === 'line' ? 3 : 1,
          tension: .35,
          fill: type === 'line',
          pointRadius: type === 'line' ? 4 : undefined,
          pointHoverRadius: type === 'line' ? 7 : undefined
        }]
      },
      options: chartOptions(filterKey, !!extra.horizontal, type === 'doughnut')
    });
  };

  const renderKpis = () => {
    const rows = state.filtered;
    const total = rows.length;
    const pax = C.sumBy(rows, row => row.personas);
    const uniqueCompanies = C.unique(rows.map(row => row.empresa)).length;
    const radicadas = rows.filter(row => (row.facturaEstado || 'Pendiente') === 'Radicada').length;
    const pendientes = rows.filter(row => (row.facturaEstado || 'Pendiente') !== 'Radicada').length;
    $('kpiEventos').textContent = fmt(total);
    $('kpiEventosSub').textContent = `${state.rows.length.toLocaleString('es-CO')} registros fuente`;
    $('kpiPax').textContent = fmt(pax);
    $('kpiPromedio').textContent = fmt(total ? Math.round(pax / total) : 0);
    $('kpiEmpresas').textContent = fmt(uniqueCompanies);
    $('kpiRadicadas').textContent = fmt(radicadas);
    $('kpiPendientes').textContent = fmt(pendientes);
  };

  const renderCharts = () => {
    const rows = state.filtered;
    const byMonth = Object.entries(C.groupBy(rows, row => monthKey(row.fecha))).sort((a, b) => a[0].localeCompare(b[0]));
    makeChart('chartMonth', 'line', byMonth.map(x => x[0]), byMonth.map(x => x[1]), 'Eventos', 'month', { singleColor: 'rgba(20,101,192,.15)', lineColor: '#1465c0' });

    const byInvoice = aggregateCount(rows, row => row.facturaEstado || 'Pendiente');
    makeChart('chartInvoice', 'doughnut', byInvoice.map(x => x[0]), byInvoice.map(x => x[1]), 'Facturas', 'invoice');

    const byScenario = aggregateCount(rows, row => row.escenario || 'Sin salón').slice(0, 10).reverse();
    makeChart('chartScenario', 'bar', byScenario.map(x => x[0]), byScenario.map(x => x[1]), 'Eventos', 'scenario', { horizontal: true });

    const byCompany = aggregateCount(rows, row => row.empresa || 'Sin empresa').slice(0, 10).reverse();
    makeChart('chartCompany', 'bar', byCompany.map(x => x[0]), byCompany.map(x => x[1]), 'Eventos', 'company', { horizontal: true });

    const byPax = aggregatePaxByCompany(rows).slice(0, 10).reverse();
    makeChart('chartPax', 'bar', byPax.map(x => x[0]), byPax.map(x => x[1]), 'PAX', 'company', { horizontal: true, singleColor: '#2dd4bf' });

    const byPayment = aggregateCount(rows, row => row.pago || 'Sin pago');
    makeChart('chartPayment', 'doughnut', byPayment.map(x => x[0]), byPayment.map(x => x[1]), 'Medio de pago', 'payment');
  };

  const renderInsight = () => {
    const rows = state.filtered;
    if (!rows.length) {
      $('insightTitle').textContent = 'Sin registros visibles';
      $('insightText').textContent = 'Ajuste los filtros o cargue el archivo únicamente desde el módulo Eventos.';
      return;
    }
    const pax = C.sumBy(rows, row => row.personas);
    const topCompany = aggregateCount(rows, row => row.empresa || 'Sin empresa')[0];
    const topScenario = aggregateCount(rows, row => row.escenario || 'Sin salón')[0];
    const pending = rows.filter(row => (row.facturaEstado || 'Pendiente') !== 'Radicada').length;
    $('insightTitle').textContent = `${fmt(rows.length)} eventos · ${fmt(pax)} personas atendidas`;
    $('insightText').textContent = `La empresa con mayor frecuencia es ${topCompany?.[0] || 'sin identificar'} con ${topCompany?.[1] || 0} evento(s). El salón con mayor uso es ${topScenario?.[0] || 'sin identificar'}. Hay ${fmt(pending)} evento(s) pendientes de gestión de factura.`;
  };

  const renderTable = () => {
    const rows = state.filtered;
    const stats = {};
    rows.forEach(row => {
      const key = row.empresa || 'Sin empresa';
      if (!stats[key]) stats[key] = { empresa: key, eventos: 0, pax: 0, radicadas: 0 };
      stats[key].eventos += 1;
      stats[key].pax += C.toNumber(row.personas);
      if ((row.facturaEstado || 'Pendiente') === 'Radicada') stats[key].radicadas += 1;
    });
    const top = Object.values(stats).sort((a, b) => b.eventos - a.eventos || b.pax - a.pax).slice(0, 12);
    $('tableCount').textContent = `${fmt(rows.length)} visibles`;
    $('topCompaniesBody').innerHTML = top.length ? top.map(row => `
      <tr><td>${escapeHtml(row.empresa)}</td><td>${fmt(row.eventos)}</td><td>${fmt(row.pax)}</td><td>${fmt(row.radicadas)}</td></tr>
    `).join('') : '<tr><td colspan="4">Sin registros para mostrar.</td></tr>';
  };

  const renderAll = () => {
    renderVisualFilters();
    renderKpis();
    renderCharts();
    renderInsight();
    renderTable();
  };

  const exportExcel = async () => {
    const detail = state.filtered.map(row => ({
      Fecha: C.formatDate(row.fecha),
      Empresa: row.empresa,
      Escenario: row.escenario,
      Personas: row.personas,
      'Medio de pago': row.pago,
      'Estado factura': row.facturaEstado || 'Pendiente',
      'N.° factura': row.facturaNumero || ''
    }));
    const resumen = [{
      Eventos: state.filtered.length,
      'Personas atendidas': C.sumBy(state.filtered, row => row.personas),
      'Promedio PAX': state.filtered.length ? Math.round(C.sumBy(state.filtered, row => row.personas) / state.filtered.length) : 0,
      Empresas: C.unique(state.filtered.map(row => row.empresa)).length,
      'Facturas radicadas': state.filtered.filter(row => (row.facturaEstado || 'Pendiente') === 'Radicada').length,
      'Facturas pendientes': state.filtered.filter(row => (row.facturaEstado || 'Pendiente') !== 'Radicada').length
    }];
    C.downloadWorkbook(`estadisticas_eventos_${new Date().toISOString().slice(0,10)}.xlsx`, { Resumen: resumen, Eventos: detail });
    await C.auditLog('EXPORTACIÓN', 'Estadísticas', `Descarga del dashboard ejecutivo. Registros exportados: ${detail.length}.`);
    showToast('Reporte ejecutivo descargado.');
  };

  const resetFilters = () => {
    ['filterSearch', 'filterFrom', 'filterTo', 'filterCompany', 'filterScenario', 'filterPayment', 'filterInvoice'].forEach(id => { $(id).value = ''; });
    state.visual = {};
    applyFilters();
  };

  const loadRows = () => {
    state.rows = C.mergeInvoices(C.getEvents());
    populateFilters();
    applyFilters();
    setSourceStatus();
  };

  const init = async () => {
    showLoader(true);
    try {
      loadRows();
    } catch (error) {
      console.error('Error inicializando Estadísticas:', error);
      showToast('La página abrió, pero algunos gráficos no pudieron prepararse.');
    } finally {
      showLoader(false);
      if (C.hideLoaders) C.hideLoaders();
    }
    C.auditLog('ACCESO', 'Estadísticas', `Ingreso al dashboard ejecutivo. Registros disponibles desde Eventos: ${state.rows.length}.`).catch(console.warn);

    if (!window.Chart) {
      let tries = 0;
      const retryCharts = setInterval(() => {
        tries += 1;
        if (window.Chart) {
          clearInterval(retryCharts);
          applyFilters();
        }
        if (tries > 12) clearInterval(retryCharts);
      }, 500);
    }
  };

  $('btnInicio').addEventListener('click', () => { location.href = 'index.html'; });
  $('btnExport').addEventListener('click', exportExcel);
  $('btnReset').addEventListener('click', resetFilters);
  ['filterSearch', 'filterFrom', 'filterTo', 'filterCompany', 'filterScenario', 'filterPayment', 'filterInvoice'].forEach(id => {
    $(id).addEventListener('input', applyFilters);
    $(id).addEventListener('change', applyFilters);
  });

  $('visualFilters').addEventListener('click', event => {
    const key = event.target.dataset.clearVisual;
    if (!key) return;
    delete state.visual[key];
    applyFilters();
  });

  C.onDataChange(() => loadRows());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
