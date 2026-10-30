# Archivos de la actualización premium

Base: Red-productividad-tactica-main-Agendas-PWA.zip. Comparación de archivos de aplicación, excluyendo informes históricos y dependencias instaladas.

**13 modificados, 27 nuevos, 93 idénticos y 0 eliminados.** Los ocho archivos de los cuatro módulos retirados ya estaban ausentes en la base y continúan ausentes.

## Modificados

| Archivo | Cambio |
| --- | --- |
| `README.txt` | Enlace a documentación vigente; historial conservado. |
| `agenda.webmanifest` | Iconos estándar y adaptables; paleta nueva, identidad y ámbito conservados. |
| `agenda_movil.html` | Logotipo, favicon, icono Apple y hoja visual aislada; controles y rutas conservados. |
| `firebase.json` | Despliegue de los índices técnicos; mismo código de funciones y alojamiento. |
| `functions/index.js` | FCM, tarea fechada, reconciliación por publicación y barrido de recuperación. |
| `functions/push-service.js` | Registro FCM autenticado, transporte y configuración pública; Web Push conservado. |
| `js/agenda-movil.js` | Lecturas compartidas, bloques reutilizados, caché identificada, ciclos de listener y datos originales para alertas. |
| `js/agenda-reminders.js` | Solo alimentación; datos recientes, sin duplicar envío remoto ni avisar vencido. |
| `js/agenda-requirements.js` | Texto de permisos actualizado; flujo de acceso conservado. |
| `js/notifications.js` | Datos opcionales para alimentación en el mismo worker; llamadas anteriores compatibles. |
| `js/push-client.js` | Token FCM con el worker existente, renovación, estado y eliminación. |
| `js/push-ui.js` | Estado de registro separado de recepción y señal para evitar doble aviso local. |
| `sw.js` | Nueva caché, identidad, recepción estándar/FCM, caducidad y reservas persistentes. |

## Nuevos

- `LEER_PRIMERO_AGENDA_PREMIUM.md`
- `assets/agenda-brand/apple-touch-icon.png`
- `assets/agenda-brand/badge-96.png`
- `assets/agenda-brand/favicon.ico`
- `assets/agenda-brand/favicon.svg`
- `assets/agenda-brand/icon-192.png`
- `assets/agenda-brand/icon-512.png`
- `assets/agenda-brand/icon-96.png`
- `assets/agenda-brand/icon-maskable-192.png`
- `assets/agenda-brand/icon-maskable-512.png`
- `assets/agenda-brand/logo-full-dark.png`
- `assets/agenda-brand/logo-full-dark.svg`
- `assets/agenda-brand/logo-full-light.png`
- `assets/agenda-brand/logo-full-light.svg`
- `assets/agenda-brand/logo-full-mono.png`
- `assets/agenda-brand/logo-full-mono.svg`
- `assets/agenda-brand/logo-small.svg`
- `assets/agenda-brand/logo-symbol-dark.svg`
- `assets/agenda-brand/logo-symbol-light.svg`
- `assets/agenda-brand/logo-symbol-mono.svg`
- `css/agenda-premium.css`
- `firestore.indexes.json`
- `functions/food-alerts-core.mjs`
- `functions/food-coordinator.js`
- `functions/food-store.js`
- `functions/push-provider.js`
- `js/food-alerts-core.js`

La carpeta entrega/premium añade documentación, inventario, resultados, scripts y evidencias. No contiene código necesario para el navegador. Las huellas completas de aplicación están en INVENTARIO_SHA256.json. Minuta, Eventos, Agendas, Excel, Firebase de datos, autenticación, validación y mantenimiento conservan sus archivos operativos salvo los cambios móviles y de avisos enumerados. La hoja css/agenda-movil.css original también permanece idéntica: el tema nuevo se aplica con css/agenda-premium.css, cargado exclusivamente en Agenda Móvil.
