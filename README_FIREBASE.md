# Agenda móvil con Firebase

Esta versión conecta el sistema propietario con una agenda móvil de solo lectura.

## Flujo

1. El propietario vincula el Excel local.
2. `excel-sync.js` actualiza `eventData`.
3. `firebase-owner-sync.js` normaliza y publica los eventos en Cloud Firestore.
4. `agenda_movil.html` escucha Firestore con `onSnapshot` y se actualiza en tiempo real.

## Archivos nuevos

- `js/firebase-config.js`
- `js/firebase-owner-sync.js`
- `js/agenda-movil-firebase.js`
- `css/firebase-sync.css`
- `css/agenda-movil.css`
- `firestore.rules`
- `CONFIGURAR_FIREBASE.txt`

## Seguridad

- El propietario inicia sesión con correo y contraseña.
- Los visualizadores móviles usan autenticación anónima automática.
- Firestore permite lectura a usuarios autenticados.
- Firestore permite escritura solo al UID propietario configurado en las reglas.
- La interfaz móvil no incluye acciones de edición.

Sigue `CONFIGURAR_FIREBASE.txt` antes de publicar en GitHub Pages.
