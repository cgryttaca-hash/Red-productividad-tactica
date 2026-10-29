import { rasterizeMinute } from './minuta-raster.js';

let busy = false;
let activePreview;

function isEditable(event) {
  return event.isComposing || event.composedPath().some(node => node instanceof Element && (node.isContentEditable || node.matches('input,textarea,select,[role="textbox"],[role="combobox"]') || node.closest('form')));
}

function notify(message, error = false) { window.RPTMinuteExport?.notify(message, error ? 'error' : 'ok'); }

async function prepareShare() {
  busy = true;
  const controller = new AbortController();
  let nonce;
  const root = document.getElementById('printRoot');
  let receive;
  let timer;
  const leave = () => controller.abort();
  try {
    if (location.origin === 'null' || location.protocol === 'file:') throw new Error('Abre la Minuta mediante HTTPS o un servidor local para generar y compartir la imagen.');
    nonce = crypto.randomUUID ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint8Array(18))].map(value => value.toString(16).padStart(2, '0')).join('');
    const targetDate = window.RPTMinuteTime.tomorrowISO();
    const preview = window.open(`./minuta_compartir.html#${nonce}`, 'rpt-minute-share', 'popup,width=1050,height=850,resizable=yes,scrollbars=yes');
    if (!preview) throw new Error('El navegador bloqueó la vista para compartir. Permite ventanas emergentes para este sitio y vuelve a pulsar Ctrl + Q.');
    activePreview = preview;
    window.addEventListener('pagehide', leave, { once: true });
    root.setAttribute('aria-busy', 'true');
    notify('Preparando la imagen de la Minuta de mañana…');
    const ready = new Promise((resolve, reject) => {
      receive = event => {
        if (event.origin !== location.origin || event.source !== preview || event.data?.nonce !== nonce) return;
        if (event.data.type === 'RPT_MINUTE_READY') { clearTimeout(timer); resolve(); }
        if (event.data.type === 'RPT_MINUTE_CLOSED') { controller.abort(); reject(new DOMException('Vista cerrada.', 'AbortError')); }
      };
      window.addEventListener('message', receive);
      timer = setTimeout(() => reject(new Error('La vista para compartir no pudo iniciarse. Ciérrala, comprueba la conexión y vuelve a pulsar Ctrl + Q.')), 15000);
    });
    await ready;
    const snapshot = window.RPTMinuteExport.snapshot(targetDate);
    const result = await rasterizeMinute(snapshot, { signal: controller.signal, progress: (index, total) => {
      if (preview.closed) { controller.abort(); return; }
      preview.postMessage({ type: 'RPT_MINUTE_PROGRESS', nonce, index, total }, location.origin);
    } });
    if (preview.closed) throw new DOMException('Vista cerrada.', 'AbortError');
    preview.postMessage({ type: 'RPT_MINUTE_RESULT', nonce, dateISO: targetDate, eventCount: snapshot.eventCount, coworkRows: snapshot.coworkRows, images: result.images.map(({ blob, name, width, height }) => ({ blob, name, width, height })) }, location.origin);
    notify('Minuta preparada. Revisa la imagen y el mensaje en la vista para compartir.');
    preview.focus();
  } catch (error) {
    if (error.name === 'AbortError') {
      notify('Preparación cancelada. No se enviaron archivos desde el sistema.');
      if (activePreview && !activePreview.closed) activePreview.postMessage({ type: 'RPT_MINUTE_ERROR', nonce, message: 'Se canceló la preparación. Vuelve a Minuta y pulsa Ctrl + Q.' }, location.origin);
    }
    else {
      notify(error.message || 'No fue posible preparar la imagen.', true);
      if (activePreview && !activePreview.closed) activePreview.postMessage({ type: 'RPT_MINUTE_ERROR', nonce, message: error.message || 'No fue posible generar la imagen.' }, location.origin);
    }
  } finally {
    clearTimeout(timer); if (receive) window.removeEventListener('message', receive);
    window.removeEventListener('pagehide', leave);
    root?.removeAttribute('aria-busy'); busy = false;
  }
}

if (document.documentElement.dataset.maintenancePage === 'minuta' && document.getElementById('printRoot')) {
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || !event.ctrlKey || event.altKey || event.shiftKey || event.metaKey || event.key.toLowerCase() !== 'q' || isEditable(event)) return;
    event.preventDefault();
    if (event.repeat || busy) return;
    if (activePreview && !activePreview.closed) { activePreview.focus(); notify('La Minuta ya está preparada. Cierra esa vista para generar una nueva.'); return; }
    prepareShare();
  });
}
