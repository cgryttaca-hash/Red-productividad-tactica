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

function configuration() {
  const value = { publicKey: publicKey.value(), privateKey: privateKey.value(), contact: contact.value(), origins: origins.value().split(',').map(origin => origin.trim()).filter(Boolean) };
  if (!value.publicKey || !value.privateKey || !value.contact || !value.origins.length) throw new Error('Falta configurar Web Push.');
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
        transaction.set(reference, { ...value, createdAt: snapshot.exists ? snapshot.data().createdAt : Date.now() }, { merge: true });
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
    async expire(id) { await subscriptions.doc(id).delete(); }
  };
}

exports.agendaPush = onRequest({ region: 'us-central1', secrets: [privateKey], maxInstances: 3, timeoutSeconds: 30, cors: false }, (request, response) => createHandler({ store: store(), verifyToken: token => getAuth().verifyIdToken(token, true), getConfig: configuration })(request, response));

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
