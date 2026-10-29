const CSS_PROPERTIES = `display position left right top bottom box-sizing width min-width max-width height min-height max-height margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style border-bottom-style border-left-style border-top-color border-right-color border-bottom-color border-left-color border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius color background-color background-image background-size background-position background-repeat font-family font-size font-style font-weight font-stretch font-variant line-height letter-spacing word-spacing white-space text-align text-transform text-decoration text-indent overflow-wrap word-break vertical-align table-layout border-collapse border-spacing visibility opacity transform transform-origin grid-template-columns grid-template-rows grid-auto-flow gap row-gap column-gap align-items align-self justify-content flex-direction flex-wrap flex-grow flex-shrink flex-basis order float clear object-fit object-position`.split(' ');

function ensureActive(signal) { if (signal?.aborted) throw new DOMException('Generación cancelada.', 'AbortError'); }

function matchesPrint(query, view) {
  if (!query || query === 'all') return true;
  return query.split(',').some(branch => {
    const value = branch.trim();
    if (/^(?:only\s+)?screen\b|^not\s+print\b/i.test(value)) return false;
    if (/^not\s+screen\s*$/i.test(value)) return true;
    return view.matchMedia(value.replace(/^(?:only\s+)?print\b/i, 'all')).matches;
  });
}

function collectPrintCss(document, view) {
  const pageProperties = new Map();
  const page = { getPropertyValue: property => pageProperties.get(property) || '' };
  function rulesText(rules) {
    return [...rules].map(rule => {
      if (rule.type === 4) return matchesPrint(rule.conditionText || rule.media.mediaText, view) ? rulesText(rule.cssRules) : '';
      if (rule.type === 6) { for (const property of rule.style) pageProperties.set(property, rule.style.getPropertyValue(property)); return ''; }
      if (rule.type === 3) return sheetText(rule.styleSheet);
      return rule.cssText;
    }).join('\n');
  }
  function sheetText(sheet) {
    if (sheet.disabled || !matchesPrint(sheet.media?.mediaText || '', view)) return '';
    try { return rulesText(sheet.cssRules); }
    catch (_) { throw new Error('No fue posible leer un estilo de impresión. Abre la Minuta desde la misma dirección del sistema y vuelve a intentarlo.'); }
  }
  return { css: [...document.styleSheets].map(sheetText).join('\n'), page };
}

function cssPixels(value) {
  const match = String(value || '').trim().match(/^([\d.]+)(mm|cm|in|pt|px)?$/);
  if (!match) throw new Error('No se pudo interpretar el margen del formato de impresión.');
  return Number(match[1]) * ({ mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72, px: 1 }[match[2] || 'px']);
}

function geometry(page) {
  const size = page.getPropertyValue('size').trim().toLowerCase();
  let dimensions = /a4/.test(size) ? [210 * 96 / 25.4, 297 * 96 / 25.4] : [8.5 * 96, 11 * 96];
  if (/landscape/.test(size)) dimensions = dimensions.reverse();
  const margins = (page.getPropertyValue('margin') || '3mm').split(/\s+/).map(cssPixels);
  const top = margins[0], right = margins[1] ?? top, bottom = margins[2] ?? top, left = margins[3] ?? right;
  return { width: dimensions[0], height: dimensions[1], top, right, bottom, left, contentWidth: dimensions[0] - left - right };
}

function asDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo preparar la imagen.')); reader.readAsDataURL(blob);
  });
}

async function freezeTree(element, signal) {
  const assets = [];
  const view = element.ownerDocument.defaultView;
  function copy(source) {
    if (source.nodeType === Node.TEXT_NODE) return source.cloneNode();
    if (source.nodeType !== Node.ELEMENT_NODE || /^(SCRIPT|STYLE|LINK|IFRAME|OBJECT|EMBED)$/.test(source.tagName)) return null;
    const computed = view.getComputedStyle(source);
    if (computed.display === 'none' || computed.visibility === 'hidden') return null;
    const target = source.cloneNode(false);
    for (const attribute of [...target.attributes]) if (/^on/i.test(attribute.name)) target.removeAttribute(attribute.name);
    for (const property of CSS_PROPERTIES) target.style.setProperty(property, computed.getPropertyValue(property), 'important');
    if (source.tagName === 'IMG') {
      const url = source.currentSrc || source.src;
      assets.push(fetch(url, { signal }).then(response => { if (!response.ok) throw new Error('image'); return response.blob(); }).then(asDataUrl).then(data => { target.src = data; target.removeAttribute('srcset'); }));
    }
    if (/url\(/i.test(computed.backgroundImage)) {
      assets.push((async () => {
        let background = computed.backgroundImage;
        for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          const response = await fetch(new URL(match[1], source.ownerDocument.baseURI), { signal });
          if (!response.ok) throw new Error('background');
          background = background.replace(match[0], `url("${await asDataUrl(await response.blob())}")`);
        }
        target.style.setProperty('background-image', background, 'important');
      })());
    }
    for (const child of source.childNodes) { const copied = copy(child); if (copied) target.append(copied); }
    return target;
  }
  const frozen = copy(element);
  try { await Promise.all(assets); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('No se pudo incluir una imagen o logotipo del documento. No se generará una minuta incompleta.'); }
  ensureActive(signal);
  return new XMLSerializer().serializeToString(frozen);
}

function planSlices(root, paper, scale, maxPixels) {
  const height = Math.ceil(Math.max(root.scrollHeight, root.getBoundingClientRect().height));
  const origin = root.getBoundingClientRect().top;
  const rect = node => { const bounds = node.getBoundingClientRect(); return { top: bounds.top - origin, bottom: bounds.bottom - origin }; };
  const blocks = [...root.querySelectorAll('tr,.section-title,.empty-card,.minute-footer')].filter(node => node.getBoundingClientRect().height > 0).map(rect);
  root.querySelectorAll('.floor-section,.coworking-section').forEach(section => {
    const heading = section.querySelector('.section-title');
    const first = section.querySelector('tbody tr') || section.querySelector('.empty-card');
    if (heading && first) blocks.push({ top: rect(heading).top, bottom: rect(first).bottom });
  });
  const maxHeight = Math.min(8192 / scale, maxPixels / (paper.width * scale * scale)) - paper.top - paper.bottom - 1;
  if (blocks.some(block => block.bottom - block.top > maxHeight)) throw new Error('Un evento contiene demasiadas líneas para una imagen legible en este navegador. No se cortará el evento; utiliza la impresión o reduce el texto antes de compartir.');
  const boundaries = [...new Set([height, ...blocks.map(block => block.bottom)])].sort((first, second) => first - second);
  const slices = [];
  let start = 0;
  while (start < height - 0.1) {
    const limit = Math.min(height, start + maxHeight);
    const end = limit === height ? height : boundaries.filter(boundary => boundary > start + 1 && boundary <= limit && !blocks.some(block => boundary > block.top + 0.2 && boundary < block.bottom - 0.2)).pop();
    if (!end) throw new Error('No se pudo dividir la minuta sin cortar un evento. Utiliza la impresión para revisar el contenido.');
    slices.push({ start, end, imageHeight: Math.max(paper.height, end - start + paper.top + paper.bottom) });
    if (slices.length > 40) throw new Error('La minuta supera el límite de imágenes seguras. Divide el contenido antes de compartirlo.');
    start = end;
  }
  return { height, slices };
}

async function renderSlice(markup, slice, paper, scale, fullHeight, label, signal) {
  ensureActive(signal);
  const width = Math.ceil(paper.width * scale), height = Math.ceil(slice.imageHeight * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}" height="${slice.imageHeight}" viewBox="0 0 ${paper.width} ${slice.imageHeight}"><rect width="100%" height="100%" fill="white"/><foreignObject x="${paper.left}" y="${paper.top - slice.start}" width="${paper.contentWidth}" height="${fullHeight}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${paper.contentWidth}px;height:${fullHeight}px;overflow:visible;background:white">${markup}</div></foreignObject></svg>`;
  const image = new Image();
  image.src = await asDataUrl(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await image.decode(); ensureActive(signal);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo reservar memoria para la imagen.');
    try {
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
      if (label) { context.fillStyle = '#334155'; context.font = `${Math.round(8 * scale)}px Arial`; context.textAlign = 'right'; context.fillText(label, width - paper.right * scale, height - 3 * scale); }
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo guardar la imagen PNG.')), 'image/png'));
      return { blob, width, height };
    } finally { canvas.width = 0; canvas.height = 0; }
  } finally { image.src = ''; }
}

export async function rasterizeMinute(snapshot, { signal, progress = () => {} } = {}) {
  ensureActive(signal);
  const frame = document.createElement('iframe'); frame.title = 'Preparación de copia de impresión'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1; frame.setAttribute('sandbox', 'allow-same-origin');
  Object.assign(frame.style, { position: 'fixed', left: '-20000px', top: '0', width: '1056px', height: '1000px', border: '0', pointerEvents: 'none' });
  document.body.append(frame);
  try {
    const target = frame.contentDocument;
    target.documentElement.lang = 'es';
    const base = target.createElement('base'); base.href = document.baseURI; target.head.append(base);
    const styles = collectPrintCss(document, frame.contentWindow);
    const paper = geometry(styles.page); frame.style.width = `${paper.contentWidth}px`;
    const style = target.createElement('style'); style.textContent = `${styles.css}\nhtml,body,#printRoot,.minute-page,.floor-section,.coworking-section,.events-list,.table-box{height:auto!important;max-height:none!important;overflow:visible!important}html,body{min-height:0!important}#printRoot{position:relative!important;left:0!important;top:0!important}`;
    target.head.append(style); target.body.className = snapshot.bodyClass;
    target.body.append(target.importNode(snapshot.node, true));
    if (target.fonts?.ready) await target.fonts.ready;
    ensureActive(signal);
    const root = target.getElementById('printRoot');
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const maxPixels = apple ? 5_000_000 : 12_000_000;
    let scale = apple ? 2 : 2.5;
    let plan;
    while (true) {
      try { plan = planSlices(root, paper, scale, maxPixels); break; }
      catch (error) { if (scale <= 1.5) throw error; scale -= 0.5; }
    }
    const markup = await freezeTree(root, signal);
    const images = [];
    for (const [index, slice] of plan.slices.entries()) {
      ensureActive(signal); progress(index + 1, plan.slices.length);
      const label = plan.slices.length > 1 ? `Minuta ${snapshot.dateISO} · ${index + 1}/${plan.slices.length}` : '';
      const result = await renderSlice(markup, slice, paper, scale, plan.height, label, signal);
      const suffix = plan.slices.length > 1 ? `-${String(index + 1).padStart(2, '0')}-de-${String(plan.slices.length).padStart(2, '0')}` : '';
      images.push({ ...result, name: `Minuta-${snapshot.dateISO}${suffix}.png`, start: slice.start, end: slice.end });
    }
    return { images, scale, paper, contentHeight: plan.height, text: root.textContent };
  } finally { frame.remove(); }
}
