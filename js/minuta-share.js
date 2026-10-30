import { rasterizeMinute } from './minuta-raster.js';

let busy = false;
let activePreview;

function isEditable(event) {
  return event.isComposing || event.composedPath().some(node => node instanceof Element && (node.isContentEditable || node.matches('input,textarea,select,[role="textbox"],[role="combobox"]') || node.closest('form')));
}

function notify(message, error = false) { window.RPTMinuteExport?.notify(message, error ? 'error' : 'ok'); }

function minuteText(snapshot){
 const content=node=>[...node.childNodes].map(child=>child.nodeType===Node.TEXT_NODE?child.textContent:child.nodeName==='BR'?'\n':content(child)+(/^(DIV|P|LI)$/.test(child.nodeName)?'\n':'')).join('').trim();
 const sections=[];for(const[id,title]of [['listaSegundo','SEGUNDO PISO'],['listaTercero','TERCER PISO'],['tbodyCoworking','COWORKING']]){const source=snapshot.node.querySelector('#'+id);if(!source)continue;const rows=[...source.querySelectorAll('tr')];sections.push(title+'\n'+(rows.length?rows.map(row=>[...row.querySelectorAll('th,td')].map(content).join(' | ')).join('\n'):'Sin registros.'));}return 'MINUTA · '+window.RPTMinuteTime.displayDate(snapshot.dateISO)+'\n\n'+sections.join('\n\n');
}
function fallback(){let link=document.getElementById('minuteShareFallback');if(!link){link=document.createElement('a');link.id='minuteShareFallback';link.target='rpt-minute-share';link.textContent='Abrir la vista para compartir la Minuta';link.className='minute-share-fallback';document.getElementById('printRoot').before(link);link.addEventListener('click',()=>{if(busy)return;prepareShare(link.hash.slice(1));});}link.href='./minuta_compartir.html#'+crypto.randomUUID();link.hidden=false;}

async function prepareShare(linkNonce='') {
  busy = true;
  const controller = new AbortController();
  let nonce,preview;
  const root = document.getElementById('printRoot');
  let receive;
  let timer;
  const leave = () => controller.abort();
  try {
    if (location.origin === 'null' || location.protocol === 'file:') throw new Error('Abre la Minuta mediante HTTPS o un servidor local para generar y compartir la imagen.');
    nonce = linkNonce || (crypto.randomUUID ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint8Array(18))].map(value => value.toString(16).padStart(2, '0')).join(''));
    const targetDate = window.RPTMinuteTime.tomorrowISO();
    preview = linkNonce ? null : window.open(`./minuta_compartir.html#${nonce}`, 'rpt-minute-share', 'popup,width=1050,height=850,resizable=yes,scrollbars=yes');
    if (!preview&&!linkNonce){fallback();throw new Error('El navegador bloqueó la apertura automática. Usa el enlace para abrir la vista y continuar.');}
    document.getElementById('minuteShareFallback')?.setAttribute('hidden','');
    activePreview = preview;
    window.addEventListener('pagehide', leave, { once: true });
    root.setAttribute('aria-busy', 'true');
    notify('Preparando la imagen de la Minuta de mañana…');
    const ready = new Promise((resolve, reject) => {
      receive = event => {
        if(event.origin!==location.origin||event.data?.nonce!==nonce)return;
        if(!preview&&linkNonce&&event.data.type==='RPT_MINUTE_READY'){try{if(!event.source.location.pathname.endsWith('/minuta_compartir.html'))return;preview=event.source;activePreview=preview;}catch(_){return;}}
        if(event.source!==preview)return;
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
    preview.postMessage({ type: 'RPT_MINUTE_RESULT', nonce, dateISO: targetDate, eventCount: snapshot.eventCount, coworkRows: snapshot.coworkRows, text:minuteText(snapshot), images: result.images.map(({ blob, name, width, height }) => ({ blob, name, width, height })) }, location.origin);
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
