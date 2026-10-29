const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldPath, getFirestore } = require('firebase-admin/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret, defineString } = require('firebase-functions/params');
const webPush = require('web-push');
const { createHandler, failure, sendPublication } = require('./push-service');

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
    async delivered(id, hash) { await subscriptions.doc(id).update({ lastPublicationHash: hash, lastDeliveredAt: Date.now() }); },
    async expire(id) { await subscriptions.doc(id).delete(); }
  };
}

exports.agendaPush = onRequest({ region: 'us-central1', secrets: [privateKey], maxInstances: 3, timeoutSeconds: 30, cors: false }, (request, response) => createHandler({ store: store(), verifyToken: token => getAuth().verifyIdToken(token, true), getConfig: configuration })(request, response));

exports.notifyAgendaPublication = onDocumentWritten({ document: 'eventos_meta/publicacion', region: 'us-central1', secrets: [privateKey], maxInstances: 1, concurrency: 1, timeoutSeconds: 300, retry: true }, async event => {
  if (!event.data?.after.exists) return;
  const after = event.data.after.data();
  const before = event.data.before.exists ? event.data.before.data() : null;
  const snapshot = await getFirestore().doc('eventos_meta/publicacion').get();
  const settings = configuration();
  return sendPublication({ publication: after, previous: before, current: snapshot.data(), store: store(), send: (subscription, payload) => webPush.sendNotification(subscription, payload, { TTL: 3600, urgency: 'normal', timeout: 10000, vapidDetails: { subject: settings.contact, publicKey: settings.publicKey, privateKey: settings.privateKey } }) });
});
