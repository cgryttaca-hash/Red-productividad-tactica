const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const { getFunctions } = require('firebase-admin/functions');
const { FieldPath, getFirestore } = require('firebase-admin/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onTaskDispatched } = require('firebase-functions/v2/tasks');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const webPush = require('web-push');
const { createECDH, randomUUID } = require('node:crypto');
const { createHandler, failure, sendPublication } = require('./push-service');
const { createFoodCoordinator } = require('./food-coordinator');
const { createFoodStore, loadPublishedFeed } = require('./food-store');
const { createDeviceSender } = require('./push-provider');

initializeApp();
const privateKey = defineSecret('PUSH_VAPID_PRIVATE_KEY');
const publicKey = defineString('PUSH_VAPID_PUBLIC_KEY', { default: '' });
const contact = defineString('PUSH_CONTACT', { default: '' });
const origins = defineString('PUSH_ALLOWED_ORIGINS', { default: '' });
const COLLECTION = 'agenda_push_subscriptions';

function configuration(validate = true) {
  const value = { publicKey: publicKey.value(), privateKey: privateKey.value(), contact: contact.value(), origins: origins.value().split(',').map(origin => origin.trim()).filter(Boolean), projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '' };
  value.missing = [['PUSH_VAPID_PUBLIC_KEY', value.publicKey], ['PUSH_VAPID_PRIVATE_KEY', value.privateKey], ['PUSH_CONTACT', value.contact], ['PUSH_ALLOWED_ORIGINS', value.origins.length]].filter(([, configured]) => !configured).map(([name]) => name);
  if (validate && value.missing.length) throw failure(`Falta configurar: ${value.missing.join(', ')}.`, 503);
  if (!value.missing.length) {
    try {
      const key = createECDH('prime256v1'); key.setPrivateKey(Buffer.from(value.privateKey, 'base64url'));
      if (key.getPublicKey().toString('base64url') !== value.publicKey.replace(/=+$/, '')) throw new Error('mismatch');
    } catch (_) {
      value.configurationError = 'El par VAPID del servidor no es válido o sus claves no coinciden.';
      if (validate) throw failure(value.configurationError, 503);
    }
  }
  return value;
}

function store() {
  const database = getFirestore();
  const subscriptions = database.collection(COLLECTION);
  return {
    async get(id) { const snapshot = await subscriptions.doc(id).get(); return snapshot.exists ? snapshot.data() : null; },
    async save(id, value) {
      await database.runTransaction(async transaction => {
        const reference = subscriptions.doc(id);
        const snapshot = await transaction.get(reference);
        if (snapshot.exists && snapshot.data().uid !== value.uid) throw failure('La suscripción pertenece a otra sesión. Desactívala en el navegador y vuelve a registrarla.', 409);
        if (!snapshot.exists) {
          const registered = await transaction.get(subscriptions.where('uid', '==', value.uid).limit(20));
          if (registered.size >= 20) throw failure('Se alcanzó el límite de dispositivos de esta sesión.', 429);
        }
        const previous = snapshot.exists ? snapshot.data() : {};
        const changed = previous.transport !== value.transport || previous.fcmToken !== value.fcmToken || JSON.stringify(previous.subscription) !== JSON.stringify(value.subscription);
        transaction.set(reference, { ...value, createdAt: snapshot.exists ? previous.createdAt : Date.now(), ...(changed ? { lastTestStatus: 'not-tested', lastTestAt: 0, testClaim: '' } : {}) }, { merge: true });
      });
    },
    async remove(id, uid) {
      await database.runTransaction(async transaction => {
        const reference = subscriptions.doc(id);
        const snapshot = await transaction.get(reference);
        if (snapshot.exists && snapshot.data().uid !== uid) throw failure('La suscripción pertenece a otra sesión.', 403);
        if (snapshot.exists) transaction.delete(reference);
      });
    },
    async *batches() {
      let cursor;
      while (true) {
        let query = subscriptions.orderBy(FieldPath.documentId()).limit(100);
        if (cursor) query = query.startAfter(cursor);
        const snapshot = await query.get();
        if (snapshot.empty) return;
        yield snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
        cursor = snapshot.docs[snapshot.docs.length - 1];
      }
    },
    async delivered(id, hash) { await subscriptions.doc(id).update({ lastPublicationHash: hash, lastAcceptedAt: Date.now() }); },
    async claimTest(id, uid, timestamp) {
      return database.runTransaction(async transaction => {
        const reference = subscriptions.doc(id);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists || snapshot.data().uid !== uid) throw failure('La suscripción ya no pertenece a esta sesión.', 403);
        const record = snapshot.data();
        if (timestamp - Number(record.lastTestAt || 0) < 60000) {
          if (record.lastTestStatus === 'accepted') return { cached: true };
          throw failure('Espera un minuto antes de repetir la prueba de envío.', 429);
        }
        const claim = randomUUID();
        transaction.update(reference, { testClaim: claim, lastTestAt: timestamp, lastTestStatus: 'requested' });
        return { record: { id, ...record }, claim };
      });
    },
    async completeTest(id, claim, result) {
      await database.runTransaction(async transaction => {
        const reference = subscriptions.doc(id);
        const snapshot = await transaction.get(reference);
        if (snapshot.exists && snapshot.data().testClaim === claim) transaction.update(reference, { lastTestStatus: result.status, lastTestResultAt: result.at, lastTestProviderId: result.providerId || '', lastTestCode: result.code || '' });
      });
      await database.collection('agenda_push_logs').add({ kind: 'device-test', subscriptionId: id, ...result, expiresOn: new Date(Date.now() + 30 * 86400000) });
    },
    async expire(id) { await subscriptions.doc(id).delete(); }
  };
}

exports.agendaPush = onRequest({ region: 'us-central1', secrets: [privateKey], maxInstances: 3, timeoutSeconds: 30, cors: false }, (request, response) => createHandler({ store: store(), verifyToken: token => getAuth().verifyIdToken(token, true), getConfig: () => configuration(false), sendDevice: (device, payload, options) => createDeviceSender({ messaging: getMessaging(), webPush, settings: configuration() })(device, payload, options) })(request, response));

function coordinator() {
  const database = getFirestore();
  return createFoodCoordinator({ repository: createFoodStore(database, FieldPath), queue: getFunctions().taskQueue('locations/us-central1/functions/dispatchFoodAlert'), loadFeed: () => loadPublishedFeed(database), subscribers: store(), sendDevice: createDeviceSender({ messaging: getMessaging(), webPush, settings: configuration() }), timeZone: 'America/Bogota' });
}

exports.dispatchFoodAlert = onTaskDispatched({ region: 'us-central1', secrets: [privateKey], maxInstances: 5, concurrency: 1, timeoutSeconds: 90, retryConfig: { maxAttempts: 4, minBackoffSeconds: 5, maxBackoffSeconds: 10 }, rateLimits: { maxConcurrentDispatches: 5 } }, async request => {
  const { alertId, generation } = request.data || {};
  if (typeof alertId !== 'string' || alertId.length > 1200 || !Number.isInteger(generation)) throw new Error('Invalid food task.');
  return coordinator().dispatch(alertId, generation);
});

exports.reconcileFoodAlerts = onSchedule({ schedule: '* * * * *', timeZone: 'America/Bogota', region: 'us-central1', secrets: [privateKey], timeoutSeconds: 300, maxInstances: 1, retryCount: 1 }, () => coordinator().sweep());

exports.notifyAgendaPublication = onDocumentWritten({ document: 'eventos_meta/publicacion', region: 'us-central1', secrets: [privateKey], maxInstances: 1, concurrency: 1, timeoutSeconds: 300, retry: true }, async event => {
  await coordinator().reconcile();
  if (!event.data?.after.exists) return;
  const after = event.data.after.data();
  const before = event.data.before.exists ? event.data.before.data() : null;
  const snapshot = await getFirestore().doc('eventos_meta/publicacion').get();
  const settings = configuration();
  const result = await sendPublication({ publication: after, previous: before, current: snapshot.data(), store: store(), sendDevice: createDeviceSender({ messaging: getMessaging(), webPush, settings }) });
  await createFoodStore(getFirestore(), FieldPath).audit({ kind: 'publication-provider-result', accepted: result.sent, skipped: result.skipped, at: Date.now() });
  return result;
});
