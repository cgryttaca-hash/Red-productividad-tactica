# Validación 3.2.0

- JavaScript: todos los archivos `js/*.js` pasan `node --check`.
- HTML principal: sin IDs duplicados y sin referencias locales faltantes.
- PWA: `manifest.webmanifest`, `agenda.webmanifest` y `sw.js` presentes; caché `rpt-shell-3.2.0`.
- Agenda Móvil: manifiesto independiente con `start_url` en `agenda_movil.html`.
- Eventos y Minuta: hashes SHA-256 idénticos al proyecto original y a `PROTECTED_MODULES.json`.
- La prueba de render headless de Chromium no se pudo usar en este contenedor por fallos del bus DBus del entorno; las validaciones estáticas y de sintaxis sí se completaron.
