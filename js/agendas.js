import { buildAgenda, displayDate, eventIdentity, field, resolveEvent } from './agenda-content.js';

const records = () => {
  try {
    const value = JSON.parse(localStorage.getItem('eventData') || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) { return []; }
};
let selectedIdentity = '';
let currentAgenda = null;
let previousFocus = null;
let modal;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function message(text, error = false) {
  const target = document.getElementById('agendaCopyMessage');
  target.textContent = text;
  target.classList.toggle('is-error', error);
}

function refreshSelected() {
  currentAgenda = buildAgenda(resolveEvent(records(), selectedIdentity));
  document.getElementById('agendaSelectedCompany').textContent = currentAgenda.company || 'Empresa pendiente de confirmar';
  document.getElementById('agendaSelectedMeta').textContent = [currentAgenda.date || 'Fecha pendiente', currentAgenda.room || 'Lugar pendiente'].join(' · ');
  const content = document.getElementById('generatedAgendaContent');
  content.replaceChildren();
  currentAgenda.sections.forEach((section, index) => {
    const block = element('section', undefined, 'generated-agenda-section');
    block.append(element('h3', `${String(index + 1).padStart(2, '0')}  ${section.title}`));
    const list = element('dl');
    for (const entry of section.entries) list.append(element('dt', entry.label), element('dd', entry.value));
    block.append(list);
    content.append(block);
  });
  document.getElementById('agendaPlainText').value = currentAgenda.text;
  return currentAgenda;
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('event-agenda-open');
  previousFocus?.focus();
}

function selectText() {
  const textarea = document.getElementById('agendaPlainText');
  textarea.hidden = false;
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  return textarea;
}

async function copyAgenda(rich = false, compatible = false) {
  try {
    const agenda = refreshSelected();
    if (!compatible && rich && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined' && (!ClipboardItem.supports || ClipboardItem.supports('text/html'))) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([agenda.text], { type: 'text/plain' }), 'text/html': new Blob([agenda.html], { type: 'text/html' }) })]);
        message('Agenda copiada con formato y una versión en texto plano.');
        return;
      } catch (_) { }
    }
    if (!compatible && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(agenda.text); message('Agenda copiada en texto limpio.'); return; } catch (_) { }
    }
    selectText();
    let copied = false;
    try { copied = typeof document.execCommand === 'function' && document.execCommand('copy'); } catch (_) { }
    message(copied ? 'Agenda copiada. Puedes pegarla en la herramienta de destino.' : 'El navegador no permitió copiar. El texto está seleccionado: usa Copiar o Ctrl+C / ⌘C.', !copied);
  } catch (error) { message(error.message, true); }
}

function printAgenda() {
  try {
    const agenda = refreshSelected();
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) throw new Error('Permite la ventana de impresión para guardar la agenda como PDF.');
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Agenda del evento</title><style>body{max-width:900px;margin:30px auto;padding:0 24px;font:14px/1.6 Arial,sans-serif;color:#183446}h1{font-size:23px}h2{font-size:16px;color:#24566e;border-bottom:1px solid #d4e0e8;padding-bottom:5px}dl{display:grid;grid-template-columns:180px 1fr;gap:6px 18px}dt{font-weight:bold}dd{margin:0;white-space:normal;overflow-wrap:anywhere}section{break-inside:avoid}@page{margin:18mm}@media(max-width:600px){dl{grid-template-columns:1fr}}</style></head><body>${agenda.html}</body></html>`);
    printWindow.document.close();
    printWindow.addEventListener('load', () => { printWindow.focus(); printWindow.print(); }, { once: true });
  } catch (error) { message(error.message, true); }
}

function ensureModal() {
  modal = element('div', undefined, 'event-agenda-modal');
  modal.id = 'eventAgendaModal';
  modal.hidden = true;
  modal.innerHTML = `<div class="event-agenda-dialog" role="dialog" aria-modal="true" aria-labelledby="eventAgendaTitle"><header class="event-agenda-heading"><div><span>DOCUMENTO OPERATIVO</span><h2 id="eventAgendaTitle">Agenda del evento</h2><strong id="agendaSelectedCompany"></strong><p id="agendaSelectedMeta"></p></div><button id="closeEventAgenda" type="button" aria-label="Cerrar agenda">×</button></header><div id="generatedAgendaContent" class="generated-agenda-content"></div><textarea id="agendaPlainText" class="agenda-plain-text" aria-label="Agenda en texto plano para copiar manualmente" readonly hidden></textarea><p id="agendaCopyMessage" class="agenda-copy-message" role="status" aria-live="polite"></p><footer class="event-agenda-actions"><button id="copyEventAgenda" type="button" class="agenda-action primary">Copiar agenda</button><button id="copyRichEventAgenda" type="button" class="agenda-action">Copiar con formato</button><button id="selectEventAgenda" type="button" class="agenda-action">Seleccionar y copiar</button><button id="printEventAgenda" type="button" class="agenda-action">Imprimir / PDF</button></footer></div>`;
  document.body.append(modal);
  document.getElementById('closeEventAgenda').addEventListener('click', closeModal);
  document.getElementById('copyEventAgenda').addEventListener('click', () => copyAgenda());
  document.getElementById('copyRichEventAgenda').addEventListener('click', () => copyAgenda(true));
  document.getElementById('selectEventAgenda').addEventListener('click', () => copyAgenda(false, true));
  document.getElementById('printEventAgenda').addEventListener('click', printAgenda);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeModal(); }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button,textarea')].filter(node => !node.hidden && !node.disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

function openAgenda(identity) {
  selectedIdentity = identity;
  previousFocus = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('event-agenda-open');
  document.getElementById('agendaPlainText').hidden = true;
  message('');
  try { refreshSelected(); }
  catch (error) { currentAgenda = null; document.getElementById('generatedAgendaContent').replaceChildren(); document.getElementById('agendaSelectedCompany').textContent = 'Evento no disponible'; document.getElementById('agendaSelectedMeta').textContent = ''; message(error.message, true); }
  document.getElementById('closeEventAgenda').focus();
}

function addEventActions(rows) {
  const rendered = document.querySelectorAll('#dataTable tbody > tr');
  rows.forEach((record, index) => {
    const cell = rendered[index]?.querySelector('.company-cell');
    if (!cell) return;
    cell.querySelector('.agenda-generate-action')?.remove();
    const button = element('button', 'Generar agenda', 'agenda-generate-action');
    button.type = 'button';
    button.dataset.agendaIdentity = eventIdentity(record);
    button.setAttribute('aria-label', `Generar agenda de ${field(record, ['NOMBRE DE LA EMPRESA']) || 'este evento'}`);
    cell.append(button);
  });
}

function renderList() {
  const target = document.getElementById('agendasEventList');
  if (!target) return;
  const search = document.getElementById('agendasSearch').value.trim().toLocaleLowerCase('es');
  const date = document.getElementById('agendasDate').value;
  const available = records().filter(record => {
    const rawDate = field(record, ['FECHA']);
    const dateMatch = !date || rawDate.slice(0, 10) === date || displayDate(rawDate) === date.split('-').reverse().join('/');
    return dateMatch && (!search || [field(record, ['NOMBRE DE LA EMPRESA']), field(record, ['ESCENARIO ASIGNADO'])].some(value => value.toLocaleLowerCase('es').includes(search)));
  });
  target.replaceChildren();
  document.getElementById('agendasEmpty').hidden = available.length > 0;
  available.forEach(record => {
    const row = element('tr');
    for (const value of [displayDate(field(record, ['FECHA'])) || 'No registrado', field(record, ['NOMBRE DE LA EMPRESA']) || 'No registrado', field(record, ['ESCENARIO ASIGNADO']) || 'No registrado', field(record, ['HORARIO DEL EVENTO']) || 'No registrado', field(record, ['ESTADO']) || 'No registrado']) row.append(element('td', value));
    const action = element('td');
    const button = element('button', 'Generar agenda', 'agenda-action primary');
    button.type = 'button';
    button.dataset.agendaIdentity = eventIdentity(record);
    action.append(button);
    row.append(action);
    target.append(row);
  });
}

ensureModal();
window.addEventListener('rptEventRowsRendered', event => addEventActions(event.detail.rows));
document.addEventListener('click', event => {
  const action = event.target.closest('[data-agenda-identity]');
  if (action && !action.closest('#previewModal')) openAgenda(action.dataset.agendaIdentity);
});
for (const id of ['agendasSearch', 'agendasDate']) document.getElementById(id)?.addEventListener('input', renderList);
document.getElementById('agendasRefresh')?.addEventListener('click', renderList);
window.addEventListener('eventDataUpdated', renderList);
window.addEventListener('storage', event => { if (event.key === 'eventData') renderList(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderList(); });
renderList();
