import { showNotification } from './notifications.js';
import { planFoodAlerts, foodNotification, isFoodAlertDue } from './food-alerts-core.js';

const requested = new Set();
let source;
let planned = [];

async function checkFoodAlerts() {
  const freshness = window.__RPT_AGENDA_FRESHNESS__;
  if (document.hidden || !navigator.onLine || window.__RPT_PUSH_STATUS__?.state === 'active' || !freshness?.live || Date.now() - freshness.checkedAt > 120000) return;
  const published = window.__RPT_AGENDA_ALERT_EVENTS__ || [];
  if (published !== source) { source = published; planned = planFoodAlerts(published).alerts; }
  for (const alert of planned) {
    if (requested.has(alert.id) || !isFoodAlertDue(alert, Date.now())) continue;
    requested.add(alert.id);
    const payload = foodNotification(alert);
    const queued = await showNotification(payload.title, payload.body, { tag: payload.tag, data: payload });
    if (!queued) requested.delete(alert.id);
  }
}

window.addEventListener('rptAgendaDataReady', checkFoodAlerts);
window.addEventListener('rptPushStateChanged', checkFoodAlerts);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkFoodAlerts(); });
const timer = setInterval(checkFoodAlerts, 1000);
window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
