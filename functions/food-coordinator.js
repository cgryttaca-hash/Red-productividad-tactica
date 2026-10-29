const { createHash } = require('node:crypto');
const digest = value => createHash('sha256').update(value).digest('hex');
const QUEUE_HORIZON_MS = 28 * 86400000;

function transitionAlert(current, alert, sourceHash, now) {
  const fingerprint = digest(alert.signature);
  if (current && ['completed', 'expired'].includes(current.state)) return null;
  if (current && now > alert.expiresAt) return { ...current, state: 'expired', sourceHash, changed: true };
  if (current && current.fingerprint === fingerprint && ['pending', 'dispatching'].includes(current.state)) return { ...current, sourceHash, changed: false };
  return { id: alert.id, eventId: alert.eventId, foodAt: alert.foodAt, alertAt: alert.alertAt, expiresAt: alert.expiresAt, fingerprint, sourceHash, timeZone: alert.timeZone, generation: Number(current?.generation || 0) + 1, state: now > alert.expiresAt ? 'expired' : 'pending', queued: false, changed: true };
}

function createFoodCoordinator({ repository, queue, loadFeed, subscribers, sendDevice, now = Date.now, timeZone = 'America/Bogota' }) {
  const core = import('./food-alerts-core.mjs');
  let reconciliation;

  async function enqueueDue() {
    const timestamp = now();
    for await (const jobs of repository.unqueued(timestamp + QUEUE_HORIZON_MS)) {
      for (const job of jobs) {
        if (now() > job.expiresAt) { await repository.expire(job.id, job.generation); continue; }
        const taskId = digest(`${job.id}:${job.generation}`);
        try {
          await queue.enqueue({ alertId: job.id, generation: job.generation }, { id: taskId, scheduleTime: new Date(Math.max(job.alertAt, now())), dispatchDeadlineSeconds: 90 });
          await repository.markQueued(job.id, job.generation, taskId);
        } catch (error) {
          if (error.code === 'functions/task-already-exists') await repository.markQueued(job.id, job.generation, taskId);
          else { await repository.audit({ kind: 'queue-rejected', alertId: job.id, code: error.code || 'enqueue-failed', at: now() }); throw error; }
        }
      }
    }
  }

  async function reconcile(providedFeed) {
    if (reconciliation) return reconciliation;
    reconciliation = (async () => {
      const feed = providedFeed || await loadFeed();
      if (!feed) return;
      const { planFoodAlerts, FOOD_RULE_VERSION } = await core;
      const plan = planFoodAlerts(feed.events, { timeZone });
      const revision = `${feed.hash}:${timeZone}:${FOOD_RULE_VERSION}`;
      if (await repository.needsReconciliation(revision)) {
        const changes = await repository.reconcile(plan.alerts, { sourceHash: feed.hash, revision, now: now(), transitionAlert });
        for (const cancelled of changes.cancelled) {
          if (!cancelled.taskId) continue;
          try { await queue.delete(cancelled.taskId); } catch (error) { if (!['functions/task-not-found', 'functions/not-found'].includes(error.code)) await repository.audit({ kind: 'queue-cancel-failed', alertId: cancelled.id, code: error.code || 'cancel-failed', at: now() }); }
        }
        await repository.audit({ kind: 'reconciled', sourceHash: feed.hash, planned: plan.alerts.length, invalidCount: plan.issues.length, invalid: plan.issues.slice(0,50), at: now() });
      }
      await enqueueDue();
    })().finally(() => { reconciliation = null; });
    return reconciliation;
  }

  async function dispatch(alertId, generation) {
    const timestamp = now();
    const feed = await loadFeed();
    if (!feed) return { skipped: 'no-publication' };
    const { planFoodAlerts, isFoodAlertDue, foodNotification } = await core;
    const alert = planFoodAlerts(feed.events, { timeZone }).alerts.find(candidate => candidate.id === alertId);
    if (!alert) { await repository.cancel(alertId, generation, 'event-cancelled-or-food-removed'); return { skipped: 'cancelled' }; }
    if (timestamp > alert.expiresAt) { await repository.expire(alertId, generation); return { skipped: 'expired' }; }
    if (!isFoodAlertDue(alert, timestamp)) return { skipped: 'not-due' };
    await reconcile(feed);
    const claim = await repository.claimAlert(alertId, generation, feed.hash, digest(alert.signature), timestamp);
    if (!claim) return { skipped: 'already-claimed-or-stale' };
    const result = { accepted: 0, rejected: 0, unknown: 0, skipped: 0 };
    let retryable = false;
    for await (const batch of subscribers.batches()) {
      for (let index = 0; index < batch.length; index += 5) {
        await Promise.all(batch.slice(index, index + 5).map(async device => {
          if (!isFoodAlertDue(alert, now())) { result.skipped++; return; }
          const attempt = await repository.claimRecipient({ alertId, generation, subscriptionId: device.id, sourceHash: feed.hash, now: now() });
          if (attempt === 'publication-changed') { retryable = true; result.skipped++; return; }
          if (!attempt) { result.skipped++; return; }
          const payload = { ...foodNotification(alert), url: device.agendaUrl };
          try {
            const response = await sendDevice(device, payload, { urgency: 'high', ttl: Math.max(1, Math.floor((alert.expiresAt - now()) / 1000)) });
            await repository.recordRecipient(attempt, { status: 'accepted', providerId: String(response?.messageId || response?.statusCode || 'accepted'), at: now() });
            result.accepted++;
          } catch (error) {
            const invalid = [400, 404, 410].includes(error.statusCode) || ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code);
            const canRetry = error.statusCode === 429 || ['messaging/quota-exceeded', 'messaging/server-unavailable'].includes(error.code);
            const status = invalid ? 'rejected' : canRetry ? 'retryable' : 'unknown';
            await repository.recordRecipient(attempt, { status, code: error.code || String(error.statusCode || 'unconfirmed-network-result'), at: now() });
            if (invalid) await subscribers.expire(device.id);
            if (canRetry && now() < alert.expiresAt) retryable = true;
            if (status === 'unknown') result.unknown++; else result.rejected++;
          }
        }));
      }
    }
    await repository.finishAlert(alertId, generation, claim, result, retryable && now() < alert.expiresAt);
    if (retryable && now() < alert.expiresAt) throw new Error('Food alert rejected by provider; retry within its delivery window.');
    return result;
  }

  async function sweep() {
    await reconcile();
    for await (const jobs of repository.due(now())) for (const job of jobs) await dispatch(job.id, job.generation);
  }

  return { reconcile, dispatch, sweep };
}

module.exports = { createFoodCoordinator, transitionAlert, QUEUE_HORIZON_MS };
