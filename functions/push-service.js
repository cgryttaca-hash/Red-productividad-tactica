const { createHash, ECDH } = require('node:crypto');

function failure(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function subscriptionId(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

function validateEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2500) throw failure('Endpoint de suscripción no válido.');
  let url;
  try { url = new URL(endpoint); } catch (_) { throw failure('Endpoint de suscripción no válido.'); }
  const trusted = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password || !trusted.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw failure('El proveedor push no está autorizado.');
  return endpoint;
}

function validateSubscription(value) {
  if (!value || typeof value !== 'object') throw failure('Falta la suscripción del navegador.');
  const endpoint = validateEndpoint(value.endpoint);
  const keys = value.keys || {};
  const decode = (key, length) => {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(key) || Buffer.from(key, 'base64url').length !== length) throw failure('Las claves de la suscripción no son válidas.');
    return key;
  };
  const p256dh = decode(keys.p256dh, 65);
  if (Buffer.from(p256dh, 'base64url')[0] !== 4) throw failure('La clave de cifrado no es válida.');
  try { ECDH.convertKey(Buffer.from(p256dh, 'base64url'), 'prime256v1'); } catch (_) { throw failure('La clave de cifrado no es válida.'); }
  return { endpoint, keys: { p256dh, auth: decode(keys.auth, 16) } };
}

function agendaUrl(scope, origin) {
  let url;
  try { url = new URL(scope); } catch (_) { throw failure('El ámbito de la aplicación no es válido.'); }
  if (url.origin !== origin || url.protocol !== 'https:' || !url.pathname.endsWith('/') || url.username || url.password || url.search || url.hash) throw failure('El ámbito no corresponde al sitio autorizado.');
  return new URL('agenda_movil.html', url).href;
}

function createHandler({ store, verifyToken, getConfig, sendDevice, now = Date.now }) {
  return async (request, response) => {
    response.set('Cache-Control', 'no-store');
    response.set('Vary', 'Origin');
    try {
      const configuration = getConfig();
      const origin = request.get('Origin') || '';
      if (!configuration.origins.includes(origin)) throw failure('Origen no autorizado.', 403);
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
      if (configuration.missing?.length) throw failure(`El administrador debe configurar: ${configuration.missing.join(', ')}.`, 503);
      if (configuration.configurationError) throw failure(configuration.configurationError, 503);
      const route = request.path.replace(/\/$/, '') || '/';
      if (request.method === 'GET' && route === '/config') { response.json({ publicKey: configuration.publicKey, fcmEnabled: true, timeZone: 'America/Bogota', foodLeadMinutes: 15, service: 'agenda-push', projectId: configuration.projectId }); return; }
      if (!['POST', 'DELETE'].includes(request.method) || !['/subscriptions', '/status', '/test'].includes(route)) throw failure('Ruta no disponible.', 404);
      if (!String(request.get('Content-Type') || '').startsWith('application/json')) throw failure('Se requiere contenido JSON.', 415);
      if (JSON.stringify(request.body || {}).length > 8000) throw failure('La solicitud es demasiado grande.', 413);
      const bearer = /^Bearer ([^\s]+)$/.exec(request.get('Authorization') || '');
      if (!bearer) throw failure('Se requiere una sesión válida.', 401);
      let identity;
      try { identity = await verifyToken(bearer[1]); } catch (_) { throw failure('La sesión no es válida o ha caducado.', 401); }
      if (!identity?.uid) throw failure('La sesión no es válida.', 401);
      const body = request.body || {};
      if (route === '/status') {
        if (request.method !== 'POST') throw failure('Método no permitido.', 405);
        const record = await store.get(subscriptionId(validateEndpoint(body.endpoint)));
        const registered = Boolean(record && record.uid === identity.uid && record.origin === origin);
        response.json({ registered, sendVerified: Boolean(registered && record.lastTestStatus === 'accepted') });
        return;
      }
      if (route === '/test') {
        if (request.method !== 'POST') throw failure('Método no permitido.', 405);
        const id = subscriptionId(validateEndpoint(body.endpoint));
        const stored = await store.get(id);
        if (!stored || stored.uid !== identity.uid || stored.origin !== origin) throw failure('Este dispositivo no está registrado en la sesión actual.', 403);
        if (!sendDevice || !store.claimTest) throw failure('Actualiza el backend para verificar los envíos.', 503);
        const attempt = await store.claimTest(id, identity.uid, now());
        if (attempt.cached) { response.json({ accepted: true, cached: true }); return; }
        try {
          const result = await sendDevice(attempt.record, { kind: 'technical', title: 'Prueba de Agenda Móvil', body: 'El servicio aceptó esta prueba. Si puedes leerla en tu dispositivo, has comprobado su recepción.', tag: 'rpt-push-test', url: attempt.record.agendaUrl }, { urgency: 'normal', ttl: 60 });
          const providerId = String(result?.messageId || result?.statusCode || 'accepted');
          await store.completeTest(id, attempt.claim, { status: 'accepted', providerId, at: now() });
          response.json({ accepted: true, providerId });
        } catch (error) {
          await store.completeTest(id, attempt.claim, { status: 'failed', code: error.code || String(error.statusCode || 'unconfirmed'), at: now() });
          if ([404, 410].includes(error.statusCode) || ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) await store.expire(id);
          throw failure('El proveedor no confirmó el envío. Revisa los registros del backend y vuelve a comprobar el dispositivo.', 502);
        }
        return;
      }
      if (request.method === 'DELETE') {
        await store.remove(subscriptionId(validateEndpoint(body.endpoint)), identity.uid);
        response.json({ registered: false });
        return;
      }
      const subscription = validateSubscription(body.subscription);
      const transport = body.transport === 'fcm' ? 'fcm' : 'webpush';
      const fcmToken = transport === 'fcm' ? body.fcmToken : '';
      if (transport === 'fcm' && (typeof fcmToken !== 'string' || fcmToken.length < 30 || fcmToken.length > 4096 || !/^[A-Za-z0-9_:\-]+$/.test(fcmToken))) throw failure('El token FCM no es válido.');
      await store.save(subscriptionId(subscription.endpoint), { uid: identity.uid, origin, agendaUrl: agendaUrl(body.scope, origin), subscription, transport, fcmToken, updatedAt: Date.now() });
      const saved = await store.get(subscriptionId(subscription.endpoint));
      response.json({ registered: true, transport, sendVerified: saved?.lastTestStatus === 'accepted' });
    } catch (error) {
      response.status(error.status || 503).json({ error: error.status ? error.message : 'El servicio de avisos no está disponible. Reintenta más tarde.' });
    }
  };
}

async function sendPublication({ publication, previous, current, store, send, sendDevice }) {
  const fingerprint = value => String(value?.dataHash || value?.clientPublishedAt || '');
  const hash = fingerprint(publication);
  if (!hash || hash === fingerprint(previous) || hash !== fingerprint(current)) return { sent: 0, skipped: true };
  let sent = 0;
  let failed = 0;
  for await (const batch of store.batches()) {
    for (const record of batch) {
      if (record.lastPublicationHash === hash) continue;
      try {
        const payload = { title: 'Agenda Móvil actualizada', body: `${Number(publication.count) || 0} eventos disponibles. Abre la agenda para consultar la información actual.`, kind: 'technical', tag: 'rpt-publication', url: record.agendaUrl };
        if (sendDevice) await sendDevice(record, payload);
        else await send(record.subscription, JSON.stringify(payload));
        await store.delivered(record.id, hash);
        sent++;
      } catch (error) {
        if ([400, 404, 410].includes(error.statusCode) || ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) await store.expire(record.id);
        else failed++;
      }
    }
  }
  if (failed) throw new Error('Hay entregas push pendientes de reintento.');
  return { sent, skipped: false };
}

module.exports = { agendaUrl, createHandler, failure, sendPublication, subscriptionId, validateEndpoint, validateSubscription };
