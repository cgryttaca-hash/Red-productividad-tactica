export function isInstalledContext() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
