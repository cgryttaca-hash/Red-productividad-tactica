const { createHash, randomUUID } = require('node:crypto');
const digest = value => createHash('sha256').update(value).digest('hex');
const publicationHash = value => String(value?.dataHash || value?.clientPublishedAt || '');

async function loadPublishedFeed(database) {
  const reference = database.doc('eventos_meta/publicacion');
  const snapshot = await reference.get();
  if (!snapshot.exists) return { hash: '', events: [] };
  const metadata = snapshot.data();
  const count = Number(metadata.chunkCount || 0);
  const hash = publicationHash(metadata);
  if (!hash || !Number.isInteger(count) || count < 0 || count > 2000) throw new Error('Invalid publication metadata.');
  if (!count && Number(metadata.count) > 0) throw new Error('The publication has no canonical data blocks.');
  const references = Array.from({ length: count }, (_, index) => database.doc(`eventos_meta/agenda_chunk_${String(index).padStart(4, '0')}`));
  const blocks = [];
  for (let index = 0; index < references.length; index += 100) blocks.push(...await database.getAll(...references.slice(index, index + 100)));
  const events = [];
  blocks.forEach((block, index) => {
    const value = block.data();
    if (!block.exists || value.dataHash !== hash || !Array.isArray(value.events) || (metadata.chunkHashes?.[index] && metadata.chunkHashes[index] !== value.chunkHash)) throw new Error('Publication changed while reading its blocks.');
    events.push(...value.events);
  });
  const latest = await reference.get();
  if (!latest.exists || publicationHash(latest.data()) !== hash || events.length !== Number(metadata.count || 0)) throw new Error('Incomplete or obsolete publication.');
  return { hash, events, metadata };
}

function createFoodStore(database, fieldPath) {
  const alerts = database.collection('agenda_food_alerts');
  const deliveries = database.collection('agenda_food_deliveries');
  const control = database.doc('agenda_food_control/current');
  const metadata = database.doc('eventos_meta/publicacion');
  const fresh = (snapshot, hash) => publicationHash(snapshot.exists ? snapshot.data() : null) === hash;
  const audit = value => database.collection('agenda_push_logs').add({ ...value, expiresOn: new Date(Date.now() + 30 * 86400000) });
  async function mutate(id, generation, update) {
    return database.runTransaction(async transaction => {
      const reference = alerts.doc(id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists || snapshot.data().generation !== generation) return false;
      const changes = update(snapshot.data());
      if (!changes) return false;
      transaction.update(reference, changes);
      return true;
    });
  }
  async function* pages(query) {
    let cursor;
    while (true) {
      const snapshot = await (cursor ? query.startAfter(cursor) : query).limit(100).get();
      if (snapshot.empty) return;
      yield snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
  }
  return {
    audit,
    async needsReconciliation(revision) { const snapshot = await control.get(); return !snapshot.exists || snapshot.data().revision !== revision; },
    async reconcile(planned, { sourceHash, revision, now, transitionAlert }) {
      const expected = new Map(planned.map(alert => [alert.id, alert]));
      const cancelled = [];
      const existing = await alerts.where('state', 'in', ['pending', 'dispatching']).get();
      const ids = new Set([...expected.keys(), ...existing.docs.filter(document => ['pending', 'dispatching'].includes(document.data().state)).map(document => document.id)]);
      for (const id of ids) {
        await database.runTransaction(async transaction => {
          const reference = alerts.doc(id);
          const [source, snapshot] = await Promise.all([transaction.get(metadata), transaction.get(reference)]);
          if (!fresh(source, sourceHash)) throw new Error('Publication superseded during reconciliation.');
          const current = snapshot.exists ? snapshot.data() : null;
          const alert = expected.get(id);
          if (!alert) {
            if (current && ['pending', 'dispatching'].includes(current.state)) {
              transaction.update(reference, { state: 'cancelled', reason: 'event-cancelled-or-food-removed', changedAt: now });
              if (current.taskId) cancelled.push({ id, taskId: current.taskId });
            }
            return;
          }
          const next = transitionAlert(current, alert, sourceHash, now);
          if (!next) return;
          const { changed, ...record } = next;
          if (changed || current?.sourceHash !== sourceHash) transaction.set(reference, { ...record, changedAt: now });
          if (changed && current?.taskId) cancelled.push({ id, taskId: current.taskId });
        });
      }
      await database.runTransaction(async transaction => {
        const source = await transaction.get(metadata);
        if (!fresh(source, sourceHash)) throw new Error('Publication superseded before completion.');
        transaction.set(control, { revision, sourceHash, reconciledAt: now });
      });
      return { cancelled };
    },
    unqueued(horizon) { return pages(alerts.where('state', '==', 'pending').where('queued', '==', false).where('alertAt', '<=', horizon).orderBy('alertAt').orderBy(fieldPath.documentId())); },
    due(now) { return pages(alerts.where('state', '==', 'pending').where('alertAt', '<=', now).orderBy('alertAt').orderBy(fieldPath.documentId())); },
    markQueued(id, generation, taskId) { return mutate(id, generation, current => current.state === 'pending' ? { queued: true, taskId } : null); },
    expire(id, generation) { return mutate(id, generation, current => ['pending', 'dispatching'].includes(current.state) ? { state: 'expired', changedAt: Date.now() } : null); },
    cancel(id, generation, reason) { return mutate(id, generation, current => ['pending', 'dispatching'].includes(current.state) ? { state: 'cancelled', reason, changedAt: Date.now() } : null); },
    async claimAlert(id, generation, sourceHash, fingerprint, now) {
      return database.runTransaction(async transaction => {
        const reference = alerts.doc(id);
        const [snapshot, source] = await Promise.all([transaction.get(reference), transaction.get(metadata)]);
        if (!fresh(source, sourceHash)) throw new Error('Publication changed before claiming the alert.');
        if (!snapshot.exists) return null;
        const current = snapshot.data();
        if (current.generation !== generation || current.sourceHash !== sourceHash || current.fingerprint !== fingerprint || current.state !== 'pending' || now < current.alertAt || now > current.expiresAt) return null;
        const claim = randomUUID();
        transaction.update(reference, { state: 'dispatching', claim, requestedAt: now });
        return claim;
      });
    },
    async claimRecipient({ alertId, generation, subscriptionId, sourceHash, now }) {
      const attempt = digest(`${alertId}:${subscriptionId}`);
      return database.runTransaction(async transaction => {
        const reference = deliveries.doc(attempt);
        const [delivery, alert, source] = await Promise.all([transaction.get(reference), transaction.get(alerts.doc(alertId)), transaction.get(metadata)]);
        if (!fresh(source, sourceHash)) return 'publication-changed';
        if (!alert.exists || alert.data().state !== 'dispatching' || alert.data().generation !== generation || alert.data().sourceHash !== sourceHash || now > alert.data().expiresAt) return null;
        if (delivery.exists && delivery.data().status !== 'retryable') return null;
        transaction.set(reference, { alertId, subscriptionId, generation, status: 'requested', requestedAt: now, attempts: Number(delivery.data()?.attempts || 0) + 1, expiresOn: new Date(now + 30 * 86400000) });
        return attempt;
      });
    },
    recordRecipient(attempt, value) { return deliveries.doc(attempt).update(value); },
    finishAlert(id, generation, claim, result, retryable) { return mutate(id, generation, current => current.state === 'dispatching' && current.claim === claim ? { state: retryable ? 'pending' : 'completed', result, finishedAt: Date.now() } : null); }
  };
}

module.exports = { createFoodStore, loadPublishedFeed, publicationHash };
