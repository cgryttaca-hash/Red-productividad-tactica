# Modernización de Gestión de Eventos

Entrega: 28 de octubre de 2026. Base: ZIP actualizado entregado el 27 de octubre, conservado íntegro como recuperación.

Se reorganizó el inicio, se añadió **Agendas** y se amplió la PWA con compatibilidad Apple, reapertura offline y un flujo Web Push con backend separado. El código de datos de Agenda Móvil, el lector Excel y los archivos de Minuta permanecen idénticos a la base.

**El envío push de producción todavía requiere configuración y despliegue.** No se incluyeron claves privadas ni se afirma recepción real en teléfonos. El frontend distingue permiso, suscripción y registro confirmado; con la configuración vacía muestra que el servicio está pendiente, manteniendo los avisos locales anteriores.

## Cambios realizados

- Menú principal con cuatro tareas, iconos uniformes y tarjetas compactas: Eventos, Minuta, Agendas y Agenda Móvil. Los accesos administrativos quedan en su propia navegación; se retiraron duplicados.
- Agendas consulta exclusivamente `eventData`. No crea otra base de eventos, no cambia estados y no guarda versiones duplicadas.
- La acción **Generar agenda** se añade a cada fila de Eventos. No sustituye un clic o filtro anterior. Un único evento de interfaz, al terminar la representación de la tabla, permite integrar la acción sin cambiar las reglas de negocio.
- Modal con empresa, fecha, ubicación, secciones operativas, desplazamiento interno, foco de teclado, cierre, copia en texto/HTML, alternativa manual e impresión independiente.
- Se recupera el registro actual mediante su identificador existente, o su hoja/fila de origen. Una selección eliminada o ambigua se rechaza; no se elige otro registro por aproximación.
- La generación utiliza campos operativos conocidos, conserva horarios y saltos de línea, omite metadatos internos y no inventa actividades o servicios. Los datos necesarios ausentes se indican como pendientes.
- PWA con identidades estables, metadatos Apple, áreas seguras y ajustes táctiles aislados. Se corrigió un desbordamiento de filtros en el perfil de iPhone horizontal mediante reglas exclusivas de compatibilidad Apple.
- Un único service worker precarga una versión completa, reconoce los recursos con consulta de versión y ofrece actualización voluntaria. Los datos públicos JSON mantienen lectura de red con respaldo de caché.
- La guardia de mantenimiento permite arrancar offline con la configuración guardada, respetando un mantenimiento vigente. La consulta móvil recupera su caché de eventos anterior.
- Web Push estándar: alta, reutilización, consulta y baja de suscripciones; recepción del mensaje y apertura de la agenda. El backend observa la publicación Firebase existente y guarda únicamente una colección técnica de suscripciones.

## Archivos de aplicación

Frente a la entrega anterior: **18 archivos modificados, 15 nuevos, 73 idénticos y ninguna eliminación adicional**. Los informes y evidencias añadidos se contabilizan por separado de estos 106 archivos de aplicación.

| Archivos modificados | Alcance |
| --- | --- |
| `index.html`, `css/corporate-ui.css` | Organización del menú y acceso a Agendas. |
| `eventos.html` | Carga del módulo y estilos aislados de Agendas. |
| `js/eventos.js` | Una señal de interfaz después de representar la tabla; el resto del código se comparó con la base. |
| `configuracion.html`, `js/configuracion.js` | Agendas se incorpora a las opciones de mantenimiento. |
| `agenda_movil.html` | Metadatos Apple, instrucciones y panel de estado push. |
| `js/agenda-requirements.js` | Instrucciones por contexto, reconocimiento de iPad y mensajes precisos sobre avisos. Conserva el requisito original de instalación y permiso. |
| `js/notifications.js` | Detección segura y alternativa compatible; conserva los avisos locales existentes. |
| `js/pwa.js` | Registro único, comprobación de versiones y aceptación de actualizaciones. |
| `js/maintenance-guard.js` | Arranque offline y tiempo de espera de visibilidad, sin omitir un mantenimiento guardado activo. |
| `js/mantenimiento.js` | Etiqueta Agendas y retirada de etiquetas residuales de módulos ya eliminados. |
| `sw.js` | Caché coherente, recursos versionados, recepción push y navegación de notificaciones dentro del ámbito. |
| `agenda.webmanifest`, `manifest.webmanifest` | Identidad explícita equivalente al inicio existente; mantiene nombres, colores e iconos. |
| `PROTECTED_MODULES.json`, `js/system-version.js` | Huellas actuales de los archivos de Eventos modificados. |
| `README.txt` | Uso, documentación y límites de la entrega actual. |

Archivos nuevos:

- `agendas.html`, `css/agendas.css`, `js/agenda-content.js`, `js/agendas.js`.
- `css/pwa-compat.css`, `js/push-config.js`, `js/push-client.js`, `js/push-ui.js`.
- `firebase.json` y `functions/index.js`, `functions/push-service.js`, `functions/package.json`, `functions/package-lock.json`, `functions/.env.example`, `functions/.gitignore`.

No se añadieron dependencias al frontend. Las tres dependencias nuevas pertenecen exclusivamente al backend push, con versiones fijadas y archivo de instalación npm.

## Funciones conservadas

Permanecen iguales por huella de archivo `minuta.html`, `js/minuta.js`, `css/minuta.css`, `js/agenda-movil.js`, `css/agenda-movil.css`, `js/agenda-reminders.js`, `js/excel-sync.js`, `js/firebase-sync.js`, `js/firebase-config.js`, la autenticación original, las reglas Firestore y los datos incluidos. Se conservan sus campos, cálculos, fechas, filtros, asignaciones, estados y procesos de impresión.

Respaldos, Diagnóstico, Equipos y Auditoría siguen sin páginas ni accesos. No se eliminó otro módulo. Sus servicios internos compartidos se mantienen por las dependencias de Excel y acceso, como en la entrega anterior.

## Pruebas realizadas

Se completaron **24 grupos de comprobación automática**: 12 de contenido/backend/PWA, 8 de navegador e integración y 4 de compatibilidad. También se verificaron 40 combinaciones de pantalla, cinco tamaños de modal y la impresión comparativa.

| Prueba | Resultado y alcance |
| --- | --- |
| Datos de Eventos | Resultados iguales a la base para todos los eventos, pisos, empresa, pago, fechas y alimentación. |
| Minuta | Fechas, próximos eventos, exclusión de cancelados y edición/persistencia de coworking iguales a la base. |
| Agenda Móvil | Vistas, pisos, alimentación, búsqueda y detalle iguales a la base; lógica y CSS originales sin modificaciones. |
| XLSX real | Importación de cinco registros de prueba, hoja mensual y cinco identificadores únicos; generación del evento correcto después de importar. |
| Selección y contenido | Registro correcto, información actual al copiar, rechazo de selección ambigua/eliminada, fechas sin desplazamiento y datos internos excluidos. |
| Portapapeles | Copia real en Chrome de texto plano y HTML, con saltos de línea. Alternativa manual verificada al bloquear la API. WebKit también completó su flujo de copia. |
| Modal e impresión nueva | Apertura, cierre, búsqueda, fecha y documento independiente del evento correcto. |
| Impresión anterior | Los PDF de Eventos y Minuta se renderizaron a PNG a 110 ppp: coinciden píxel a píxel con la base. |
| Presentación | Ocho pantallas en anchos 1440, 1024, 768, 390 y 360, más el modal en esos tamaños, sin desbordamiento de página. |
| WebKit | Perfiles iPhone e iPad con identificación de escritorio; instrucciones, modo instalado simulado, consulta, detalle, modal y orientación horizontal de iPhone. No equivale a un dispositivo físico. |
| Instalación PWA | Manifiestos e iconos comprobados. Service worker realmente instalado en Chrome local; precarga completa y recursos versionados disponibles. La instalación desde el menú nativo del teléfono no se probó. |
| Offline | Reapertura real con conexiones externas bloqueadas: agenda visible, datos guardados recuperados y mantenimiento vigente respetado. |
| Actualizaciones | Preparación completa, espera cuando existe versión activa, aceptación explícita y limpieza limitada a las cachés del sistema, mediante pruebas controladas del worker. |
| Cliente push | Con PushManager y API controlados: permiso tras clic real, una sola suscripción, alta/estado/baja y errores sin falso estado activo. No acredita recepción física. |
| Backend push | API probada con identidades y almacén controlados; validación de endpoints/claves/ámbito, CORS, aislamiento por sesión y registro idempotente. Cifrado real `aes128gcm` y autenticación VAPID construidos sin enviar a un proveedor. |
| Publicación y recepción | Se omiten publicaciones antiguas/entregadas y se eliminan suscripciones expiradas; el worker muestra el mensaje y limita su destino al ámbito. |
| Código y consola | 42 JavaScript de aplicación/backend con sintaxis válida. Prueba principal conectada: cero excepciones, cero errores de consola y cero recursos locales inexistentes. Los errores de red de la prueba offline son esperados. |

Entorno: Windows, Chrome 155, WebKit 26.5 de Playwright y Node.js 24 para las pruebas locales. El backend se configura para Node.js 22, compatible con las versiones declaradas; no se ejecutó un despliegue en ese runtime. Los datos de prueba son sintéticos y no se incorporaron a los archivos de datos entregados.

La captura del flujo push controlado pertenece al entorno de prueba. Su estado activo no demuestra una suscripción de producción ni una entrega a APNs/FCM.

## Uso e instalación

Consulta `GUIA_AGENDAS_PWA.md` para generar, copiar e imprimir agendas e instalar la PWA en Android, iPhone e iPad. Consulta `DESPLIEGUE_PUSH.md` para el servicio de fondo, HTTPS y secretos.

Al actualizar el sitio, conserva la misma raíz y los datos del navegador. La carpeta `functions/` corresponde al backend; la aplicación estática no necesita Node.js para funcionar. Si publicas sobre una instalación antigua que todavía tenga los cuatro módulos retirados, elimina sus ocho archivos HTML/JavaScript indicados en el README anterior; copiar sobre ellos no los borra.

La colección nueva `agenda_push_subscriptions` está justificada exclusivamente por Web Push; no duplica eventos. La clave privada VAPID pertenece a Secret Manager. Solo se publica la dirección de la función en `js/push-config.js`.

## Pendiente externo y límites

- Configurar VAPID, contacto real, orígenes autorizados y URL HTTPS; desplegar las dos funciones y comprobar Authentication/reglas efectivos. No se tocó producción.
- Verificar instalación física y recepción de fondo en Android, iPhone e iPad. No se dispone de esos teléfonos en esta prueba.
- Comprobar persistencia, entrega después de reiniciar, permisos del sistema y comportamiento con la aplicación cerrada en los dispositivos de trabajo.
- Los recordatorios horarios anteriores siguen siendo locales. El backend nuevo envía cambios de publicación, no una planificación de esos recordatorios.
- Probar el Excel maestro real, su permiso persistente y volúmenes de impresión mayores. El ZIP no incluía ese archivo ni una impresora física.

El informe, las guías, las huellas y los resultados actuales están en `entrega/`. Los informes fechados el 27 de octubre se conservan como historial y no sustituyen este informe. Se entrega un ZIP recuperable íntegro de esa versión anterior.
