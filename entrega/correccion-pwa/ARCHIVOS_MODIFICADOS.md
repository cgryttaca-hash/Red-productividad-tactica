# Archivos modificados · corrección PWA

Base: Red-productividad-tactica-main-Agenda-Premium-FCM.zip. Se comparan los archivos de aplicación; entrega/ se conserva como historial y añade esta documentación.

**25 modificados, 4 nuevos, 108 idénticos, 0 eliminados.**

| Archivo | Cambio |
| --- | --- |
| `PROTECTED_MODULES.json` | Actualiza las huellas de los HTML de Eventos/Minuta por sus metadatos y estilo de pantalla. |
| `README.txt` | Señala la documentación vigente y conserva el historial. |
| `agenda_movil.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `agendas.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `configuracion.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `eventos.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `functions/index.js` | Validación del par VAPID, variables faltantes, reserva/verificación de prueba y registro de resultados. |
| `functions/push-service.js` | Ruta autenticada /test, estado de envío verificado, errores específicos y protección por sesión/origen. |
| `index.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `js/agenda-requirements.js` | Guía de instalación sin bloqueo de consulta ni solicitud de permiso. |
| `js/configuracion.js` | Conserva mantenimiento y preferencias; protege el acceso a Notification y refleja el contexto instalado. |
| `js/notifications.js` | Permisos y notificaciones solo dentro de la aplicación instalada. |
| `js/push-client.js` | Guardas de contexto instalado, validación previa, permiso explícito, token, renovación, baja y prueba de envío. |
| `js/push-ui.js` | Estados claros y diferenciados; acciones de Push solo en contexto instalado. |
| `js/pwa.js` | Un registro, un responsable del botón de instalación y actualización controlada sin solicitudes repetidas al enfocar. |
| `js/system-version.js` | Sin cambiar versión ni funciones, sincroniza esas huellas. |
| `laboratorio.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `login.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `manifest.webmanifest` | Iconos premium estándar/adaptables y colores comunes; identidad, entrada y ámbito conservados. |
| `mantenimiento.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `minuta.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `offline.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `sw.js` | Precarga de nuevos recursos, versión de caché y red primero para la configuración pública Push. |
| `usuarios.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |
| `validacion.html` | Metadatos Apple/tema/iconos, hoja compartida de pantalla y URL única de módulos ES; cuerpos operativos y rutas conservados. |

## Nuevos archivos de aplicación

- `LEER_PRIMERO_CORRECCION_PWA.md`
- `css/agenda-compact.css`
- `css/premium-system.css`
- `js/pwa-context.js`

La carpeta entrega/correccion-pwa/ añade informe, guía, inventario, resultados, pruebas y capturas. Las hojas de estilo anteriores se conservan idénticas. Las nuevas hojas se aplican exclusivamente a pantalla; no modifican estilos de impresión. El JavaScript de Agenda Móvil, Eventos, Minuta, Excel, datos, autenticación, mantenimiento y generación de Agendas se conserva, salvo los cambios de flujo de notificaciones y presentación de Configuración detallados arriba. Los módulos de cálculo y programación de alimentación permanecen idénticos.

Los cuatro módulos retirados continúan ausentes. No se alteraron los archivos sincronizados del proyecto ni se publicaron eventos de ensayo. Las huellas completas están en INVENTARIO_SHA256.json.
