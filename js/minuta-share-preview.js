const nonce = location.hash.slice(1);
const status = document.getElementById('shareStatus');
const nativeButton = document.getElementById('nativeShare');
const messageField = document.getElementById('shareMessage');
let payload;
let files = [];
let pending = false;
const urls = [];
let waiting;

function waitForResult() { clearTimeout(waiting); waiting = setTimeout(() => setStatus('No llegó una imagen preparada. Cierra esta vista, vuelve a Minuta y pulsa Ctrl + Q.', true), 30000); }

function setStatus(message, error = false) { status.textContent = message; status.classList.toggle('is-error', error); }
function refreshMessage() {
  if (!payload) return '';
  const text = window.RPTMinuteTime.message(payload.dateISO)+(payload.text?'\n\n'+payload.text:'');
  messageField.value = text;
  document.getElementById('openWhatsApp').href = text.length>12000?'https://web.whatsapp.com/':`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  return text;
}
function canShare(value) { try { return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare(value); } catch (_) { return false; } }

function display(result) {
  if (!window.RPTMinuteTime.parseCoworkDate(result.dateISO) || !Array.isArray(result.images) || !result.images.length || result.images.some(image => !(image.blob instanceof Blob) || image.blob.type !== 'image/png')) throw new Error('La imagen recibida no es válida. Vuelve a Minuta y utiliza Ctrl + Q.');
  payload = result;
  document.getElementById('shareDate').textContent = `${window.RPTMinuteTime.longDate(result.dateISO)} · ${result.eventCount} eventos · ${result.images.length} imagen${result.images.length === 1 ? '' : 'es'}`;
  files = result.images.map(image => new File([image.blob], image.name, { type: 'image/png' }));
  const text = refreshMessage();
  const together = canShare({ files, text, title: 'Minuta de eventos' });
  nativeButton.hidden = !together && !canShare({ files });
  nativeButton.textContent = together ? 'Compartir imágenes y texto' : 'Compartir imágenes';
  document.getElementById('shareHelp').textContent = nativeButton.hidden
    ? 'Descarga las imágenes en orden, copia el mensaje y abre WhatsApp Web. Adjunta los PNG antes de enviar; el enlace solo prepara el texto. Envíalos como documento o usa la opción de calidad alta para conservar nitidez.'
    : 'Elige WhatsApp en el menú del sistema y revisa el chat o grupo antes de confirmar. Algunas versiones separan imagen y texto: puedes copiar el mensaje y adjuntar los PNG descargados. Compartir desde aquí no confirma la recepción.';
  const images = document.getElementById('shareImages'); images.replaceChildren();
  result.images.forEach((image, index) => {
    const url = URL.createObjectURL(image.blob); urls.push(url);
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');
    const title = document.createElement('strong'); title.textContent = `Imagen ${index + 1} de ${result.images.length}`;
    const download = document.createElement('a'); download.href = url; download.download = image.name; download.textContent = `Descargar PNG · ${image.width} × ${image.height}`;
    caption.append(title, download);
    const preview = document.createElement('img'); preview.src = url; preview.alt = `Minuta del ${window.RPTMinuteTime.displayDate(result.dateISO)}, imagen ${index + 1} de ${result.images.length}`; preview.width = image.width; preview.height = image.height;
    figure.append(caption, preview); images.append(figure);
  });
  document.getElementById('shareControls').hidden = false;
  setStatus('Imágenes preparadas para revisar. No se han enviado mensajes automáticamente.');
}

nativeButton.addEventListener('click', async () => {
  if (pending || !files.length) return;
  const text = refreshMessage();
  const combined = { files, text, title: `Minuta ${window.RPTMinuteTime.displayDate(payload.dateISO)}` };
  const share = canShare(combined) ? combined : { files };
  pending = true; nativeButton.disabled = true;
  try { await navigator.share(share); setStatus('Se abrió el flujo del sistema para compartir. La recepción debe confirmarse en WhatsApp.'); }
  catch (error) { setStatus(error.name === 'AbortError' ? 'Se canceló el menú de compartir. Las imágenes siguen disponibles.' : 'El navegador no permitió compartir los archivos. Descarga los PNG y adjúntalos en WhatsApp.', error.name !== 'AbortError'); }
  finally { pending = false; nativeButton.disabled = false; }
});

document.getElementById('copyMessage').addEventListener('click', async () => {
  const text = refreshMessage();
  try { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(text); setStatus('Mensaje copiado. Puedes pegarlo en WhatsApp antes de enviar.'); }
  catch (_) { messageField.focus(); messageField.select(); setStatus('El navegador bloqueó la copia. El mensaje está seleccionado: utiliza Copiar o Ctrl + C.'); }
});
document.getElementById('openWhatsApp').addEventListener('click', () => { const text=refreshMessage();setStatus(text.length>12000?'WhatsApp Web se abrirá. Copia el mensaje completo con el botón disponible y pégalo en el chat; adjunta los PNG.':'Se abrirá WhatsApp Web con el texto preparado. Adjunta los PNG y confirma el envío en el chat elegido.'); });
document.getElementById('closeShare').addEventListener('click', () => window.close());
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMessage(); });
window.addEventListener('pagehide', () => {
  clearTimeout(waiting);
  for (const url of urls) URL.revokeObjectURL(url);
  window.opener?.postMessage({ type: 'RPT_MINUTE_CLOSED', nonce }, location.origin);
}, { once: true });

let trusted = false;
try { trusted = Boolean(nonce && window.opener && window.opener.location.origin === location.origin && window.opener.location.pathname.endsWith('/minuta.html')); } catch (_) { }
if (trusted) {
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.opener || event.data?.nonce !== nonce) return;
    if (event.data.type === 'RPT_MINUTE_PROGRESS') { waitForResult(); setStatus(`Preparando imagen ${event.data.index} de ${event.data.total}…`); }
    if (event.data.type === 'RPT_MINUTE_ERROR') { clearTimeout(waiting); setStatus(event.data.message || 'No se pudo generar la imagen.', true); }
    if (event.data.type === 'RPT_MINUTE_RESULT') { clearTimeout(waiting); try { display(event.data); } catch (error) { setStatus(error.message, true); } }
  });
  waitForResult();
  window.opener.postMessage({ type: 'RPT_MINUTE_READY', nonce }, location.origin);
} else setStatus('Abre Minuta de eventos y pulsa Ctrl + Q para preparar la imagen de mañana.');
