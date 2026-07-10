/* =========================================================
   SEGURO ANTI-BLOQUEO DE CARGA
   Evita que cualquier página quede atrapada en el preloader
   si un script externo tarda, falla o no hay datos todavía.
   ========================================================= */
(function () {
  'use strict';

  function hideElement(el) {
    if (!el) return;
    el.classList.add('is-hidden', 'hidden', 'loaded');
    el.setAttribute('aria-hidden', 'true');
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    setTimeout(function () {
      if (el && (el.id === 'pageLoader' || el.id === 'agendaPreloader' || el.id === 'loader' || el.classList.contains('page-loader') || el.classList.contains('agenda-preloader') || el.classList.contains('loader'))) {
        el.style.display = 'none';
      }
    }, 350);
  }

  function hideLoaders() {
    var selectors = [
      '#pageLoader',
      '#agendaPreloader',
      '#loader',
      '.page-loader',
      '.agenda-preloader',
      'body > .loader'
    ];
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(hideElement);
    });
  }

  window.EventosHideLoaders = hideLoaders;

  window.addEventListener('load', function () {
    setTimeout(hideLoaders, 650);
  });

  window.addEventListener('error', function () {
    setTimeout(hideLoaders, 300);
  });

  window.addEventListener('unhandledrejection', function () {
    setTimeout(hideLoaders, 300);
  });

  setTimeout(hideLoaders, 2500);
})();
