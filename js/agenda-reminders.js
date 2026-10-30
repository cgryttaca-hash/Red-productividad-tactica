import { showNotification } from './notifications.js';
import { planFoodAlerts, foodNotification, isFoodAlertDue } from './food-alerts-core.js';
import { addSystemNotice, reconcileFoodNotices } from './notices-store.js';

const requested = new Set();
let source;
let planned = [];
const recorded = new Set();
let timer, checking = false, pending = false;

async function checkFoodAlerts() {
  clearTimeout(timer);
  if (document.hidden) return;
  if (checking) { pending = true; return; }
  checking = true;
  try {
  const freshness = window.__RPT_AGENDA_FRESHNESS__;
  const nativeReady = navigator.onLine && window.__RPT_PUSH_STATUS__?.state !== 'active' && freshness?.live && Date.now() - freshness.checkedAt <= 120000;
  const published = window.__RPT_AGENDA_ALERT_EVENTS__ || [];
  if (published !== source) { source = published; planned = planFoodAlerts(published).alerts; const signatures = new Set(planned.map(alert => alert.signature)); for (const signature of recorded) if (!signatures.has(signature)) recorded.delete(signature); try { await reconcileFoodNotices(planned); } catch(error) { window.dispatchEvent(new CustomEvent('rptInternalNoticeError',{detail:{message:error.message}})); } }
  for (const alert of planned) {
    if (!recorded.has(alert.signature) && Date.now() >= alert.alertAt && Date.now() < alert.foodAt) {
      try { const payload = foodNotification(alert); const result = await addSystemNotice(payload.title, payload.body, { id: alert.id, category: 'food', expiresAt: new Date(alert.foodAt).toISOString() }); if (result !== false) recorded.add(alert.signature); }
      catch (error) { window.dispatchEvent(new CustomEvent('rptInternalNoticeError', { detail: { message: error.message } })); }
    }
    if (!nativeReady || requested.has(alert.id) || !isFoodAlertDue(alert, Date.now())) continue;
    requested.add(alert.id);
    const payload = foodNotification(alert);
    const queued = await showNotification(payload.title, payload.body, { tag: payload.tag, data: payload });
    if (!queued) requested.delete(alert.id);
  }
  } finally { checking = false; const next = planned.map(alert => alert.alertAt).filter(time => time > Date.now()); if (pending) { pending = false; timer = setTimeout(checkFoodAlerts, 0); } else if (next.length) timer = setTimeout(checkFoodAlerts, Math.min(Math.max(20, Math.min(...next) - Date.now()), 2147483647)); }
}

window.addEventListener('rptAgendaDataReady', checkFoodAlerts);
window.addEventListener('rptPushStateChanged', checkFoodAlerts);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkFoodAlerts(); });
window.addEventListener('online', checkFoodAlerts);
window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
