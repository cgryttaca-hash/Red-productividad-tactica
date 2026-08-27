# Validación 3.3.0

- 15 archivos HTML revisados: sin IDs duplicados y sin referencias locales faltantes.
- 38 archivos JavaScript revisados con `node --check`: sin errores de sintaxis.
- CSS revisado por balance de llaves: correcto.
- `eventos.html`, `minuta.html`, `css/eventos.css`, `css/minuta.css`, `js/eventos.js` y `js/minuta.js`: hashes SHA-256 idénticos a la versión 3.2.0 recibida.
- `index.html` y `agenda_movil.html`: todos los IDs usados por sus JavaScript existen en el HTML.
- Servidor HTTP local: los archivos principales responden correctamente.
- La captura automatizada con Chromium no pudo completarse en este contenedor por errores DBus/zygote del navegador del entorno; no se considera una prueba aprobada.

## Notificaciones de Agenda
La Agenda muestra avisos visuales en tiempo real y puede emitir notificaciones del sistema cuando el navegador concede permiso y la Agenda está abierta o ejecutándose como PWA. Para notificaciones push con la aplicación completamente cerrada se requiere configurar Firebase Cloud Messaging/VAPID y un emisor de push; `FIREBASE_VAPID_KEY` permanece vacío y no se inventó una clave.
