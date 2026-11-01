# Gestión de Eventos 4.8 — Informe de correcciones

Fecha: 1 de noviembre de 2026 · America/Bogota. Base: 4.7.0. Se trabajó en una copia independiente; los 689 archivos de referencia auditados de 4.7 conservan sus huellas originales.

## Alcance confirmado

Esta entrega aplica el último adjunto de corrección prioritaria: persistencia de autorización de equipos validada en Firebase, recuperación del Archivo Maestro ya vinculado, preloaders e iconos. El usuario eligió autorizar el primer equipo desde la consola de Firebase y gestionar después los demás desde Ctrl + M. Esa instrucción es posterior al alcance local de 4.7; por ello ahora se incluyen reglas de autorización del registro. No se reconstruye el sistema ni se modifican las cuentas locales.

## Modificaciones y motivo

1. **Identidad y autorización persistentes:** `device-registry.js` usa el UID de Firebase Auth persistido en la aplicación secundaria existente. Cada UID consulta su documento `equipos_autorizados/UID`, se registra pendiente si falta y no puede cambiar sus campos de aprobación. El Auth de la cuenta propietaria permanece separado en la aplicación predeterminada. Los registros anteriores se conservan sin interpretarlos como aprobaciones. No se crean contraseñas operativas.
2. **Bloqueo antes de los servicios:** `device-access.js` y `device-access.css` se incorporan a las 16 páginas. Los scripts operativos existentes conservan su URL y tipo y se inician en orden después de aprobar el equipo y validar el acceso local. Antes de eso no se cargan los controladores de Excel/publicación ni se abren sus formularios. Un listener consulta cambios de estado, sin duplicarse. `device-approval-store.js` conserva la última decisión del servidor por UID para la caché sin conexión. La recepción de una revocación recarga en estado bloqueado para detener la página activa.
3. **Control desde Administración:** `device-admin.js`, `technical-center.js` y `administracion.html` agregan la sección solicitada Dispositivos. Usa la validación local actual y la cuenta propietaria de Firebase existente para aprobar/revocar. Muestra nombre, identificador, estado, registro y último acceso. No eleva roles ni incorpora otra contraseña de acceso.
4. **Reglas del registro:** `firestore.rules` modifica exclusivamente el bloque `equipos_autorizados`. La creación propia solo admite pendiente con UID y fechas de servidor válidas; el equipo solo puede actualizar su actividad/metadatos permitidos. La cuenta propietaria conserva la facultad de aprobar y revocar. Las reglas de lectura/publicación de eventos y las credenciales se conservan. Hay pruebas con emulador real que rechazan la autoaprobación y la suplantación de otra identidad.
5. **Mismo Archivo Maestro:** `excel-sync.js` recupera el handle existente de IndexedDB, consulta el permiso y lee con las funciones anteriores. Expone disponibilidad real y recuperación de permiso de lectura mediante un gesto explícito. `eventos.js` consulta ese estado antes de mostrar el mensaje genérico de activación. La recuperación válida termina sin selector ni advertencia. Se distinguen permiso perdido, referencia ausente y archivo no disponible. `firebase-sync.js` conserva sus transformaciones y publicación y verifica la autorización antes de iniciar la operación.
6. **Carga e iconos:** `page-start.js` y `loading.js` esperan a que termine la preparación autorizada; mantienen estados de trabajo, errores y reintento sin tiempos artificiales. Se corrige la codificación de tildes de sus mensajes. `interaction-polish.css` completa iconos de encabezados y secciones, de la familia SVG local y solo en pantalla. Los cambios de inicialización en `eventos.js` y `minuta.js` permiten conservar sus callbacks cuando los scripts se cargan después de DOMContentLoaded. La navegación, contenido e impresión se preservan.
7. **Versión y pruebas:** metadatos, release, worker generado y `dist` se reconstruyen para 4.8.0. Los comandos de pruebas apuntan a los ensayos de esta versión. Se incluyen fuentes reproducibles de las pruebas con emuladores; no se incluyen sus dependencias, Java ni perfiles temporales en la publicación.

## Hallazgos comprobados

- En 4.7 el aviso genérico estaba en las entradas manuales de carga de Eventos. No se reprodujo una apertura automática de ese aviso al iniciar; se evita atribuir una causa no demostrada. Ahora se comprueba y recupera la vinculación válida antes de recurrir a la configuración.
- El registro previo de equipos permitía autorregistro de metadatos; `revoked: false` no era una aprobación explícita. Se conserva ese historial y se exige aprobación del documento nuevo por UID.
- Durante las pruebas, la carga diferida podía exponer el formulario de inicio antes de enlazar sus acciones. Se corrigió manteniendo el contenido inerte hasta que todos sus scripts existentes terminan de cargar.
- La recuperación de permiso debía sobrevivir al repintado del estado de lectura; se incorporó el botón al propio estado del aviso y se probó su acción sobre el mismo archivo.
- Se comprobó que una confirmación de autorización no retire el bloqueo de seguridad de una actualización en curso. Se conserva el núcleo de verificación/activación anterior.
- Se encontraron tildes mal codificadas en los mensajes de los preloaders y se corrigieron. Las capturas muestran los textos correctos.

## Conservación comprobada

32 archivos críticos permanecen idénticos por SHA-256 a 4.7: alimentación, consultas compartidas, usuarios/autenticación local, configuración Firebase, manifiestos, Push, backend y núcleo PWA/actualizaciones, entre otros. Seis bloques completos de lectura/normalización/guardado Excel, transformación/publicación Firebase, filtros/representación de Eventos y lógica de Minuta coinciden con la base. El cambio de enganche de inicialización se compara por separado del contenido de esos bloques.

Se compararon filtros, fechas, consultas, vista previa, contenido y geometría de impresión de Eventos y Minuta, y edición/persistencia de Coworking. No se eliminó ningún archivo de la base. No se añade ni modifica funcionalidad de mensajería; sus módulos preexistentes permanecen idénticos y se conservan sus dependencias.

La alimentación indicada por el usuario se verifica literalmente en los perfiles móviles: «7:00 AM ESTACION DE CAFÉ ESTACION DE CAFÉ SENCILLA» y «9:30 AM - REFRIGERIO AM PASTEL POLLO Y JUGO». No se normalizan sus repeticiones ni se asignan descripciones a horarios supuestos.

## Pruebas y evidencia

Resultado local: PASS, 16 conjuntos y 187 comprobaciones registradas. Incluyen 80 revisiones de páginas y 25 de secciones en cinco anchos; carga de las 16 páginas con un recurso realmente pendiente; equipo nuevo, bloqueo, aprobación, revocación, no elevación de rol y no aprobación por indicadores locales; Chrome cerrado/reabierto con Auth real en emulador; mismo XLSX/handle recuperado y actualizado; recuperación de permiso simulado; persistencia del propietario Firebase; cinco perfiles móviles Chrome/WebKit; PWA sin red; migración 4.7 → 4.8 con dos pestañas y espera existente; detección automática y rechazo de cinco clases de recursos dañados, reintento y conservación de datos.

La comprobación estructural registra 93 scripts/backend, 16 páginas y dos manifiestos. Los 181 recursos, el worker y las copias publicables se verifican contra sus huellas. `PRUEBAS.json` enumera cada conjunto y su resultado. `CONSERVACION.json` registra los archivos y bloques comparados. Los ensayos que simulan Firebase se identifican como tales; las reglas de Firestore y la persistencia Auth se prueban con emuladores reales separados.

## Archivos modificados de la base, fuera de dist

- `PROTECTED_MODULES.json`
- `VALIDACION_FINAL.json`
- `VERSION.txt`
- `administracion.html`
- `agenda_movil.html`
- `agendas.html`
- `asistente.html`
- `configuracion.html`
- `css/interaction-polish.css`
- `eventos.html`
- `firestore.rules`
- `index.html`
- `js/auth-guard.js`
- `js/device-heartbeat.js`
- `js/device-registry.js`
- `js/eventos.js`
- `js/excel-sync.js`
- `js/firebase-sync.js`
- `js/loading.js`
- `js/minuta.js`
- `js/page-start.js`
- `js/release-info.js`
- `js/system-version.js`
- `js/technical-center.js`
- `laboratorio.html`
- `login.html`
- `mantenimiento.html`
- `minuta.html`
- `minuta_compartir.html`
- `offline.html`
- `package.json`
- `recuperacion.html`
- `release.json`
- `sw.js`
- `usuarios.html`
- `validacion.html`

Archivos nuevos de ejecución: `js/device-access.js`, `js/device-approval-store.js`, `js/device-admin.js` y `css/device-access.css`. Se añaden además pruebas, sus instrucciones y documentación de entrega. `ARCHIVOS.csv` enumera cada archivo modificado o añadido con sus huellas anterior y actual, incluidas las copias en `dist`. `MANIFIESTO_SHA256.json` cubre el proyecto final salvo su propia entrada.

## Configuración necesaria y límites

La guía contiene los pasos completos: publicar primero las reglas del registro en el proyecto existente, verificar el proveedor Anónimo, publicar el ZIP estático y autorizar en consola el documento pendiente del primer equipo con `status: approved`, `authorized: true`, `revoked: false`. Después se usa la cuenta local actual, Ctrl + M y la conexión propietaria existente para gestionar los demás equipos. El ZIP de publicación por sí solo no despliega reglas.

- No se publicó la aplicación ni se desplegaron reglas o funciones; no se accedió a Firebase ni a cuentas operativas de producción.
- La decisión de autorización del registro se protege mediante reglas de Firestore. El sitio continúa siendo estático; no convierte los archivos públicos ni los datos ya descargados en recursos privados de servidor. Las reglas preexistentes de lectura/publicación de eventos se conservan.
- Sin conexión se conserva la última decisión confirmada para el mismo UID Firebase. Una primera autorización necesita conexión; una revocación posterior solo puede recibirse al reconectar. Una revocación ya recibida permanece bloqueada sin red.
- El acceso con otra instalación de navegador, modo incógnito, origen diferente o almacenamiento borrado genera otra identidad. No se elimina almacenamiento durante la actualización.
- La aprobación del equipo y el permiso de lectura del archivo son independientes. El navegador puede exigir un gesto explícito para recuperar permiso; el botón recupera la lectura del mismo handle sin elegir otro archivo.
- Chrome se cerró y reabrió realmente con perfil persistente, SDK Auth 12.16.0 y Auth Emulator reales. El XLSX y su handle en OPFS son reales; la pérdida de permiso se simuló y Firestore de esa prueba usa un adaptador en memoria. Las reglas se probaron separadamente con Firestore Emulator real.
- Los ensayos de interfaz y publicación usan adaptadores que bloquean servicios externos. Los escenarios de actualización usan HTTP local, Service Workers y cachés reales, sin publicar en el alojamiento operativo.
- Android, iPhone e iPad se probaron en perfiles Chrome/WebKit, incluida PWA emulada. No hubo instalación física, diálogo del sistema operativo para un archivo externo ni entrega real de Push en teléfonos.
- Los registros, cuentas y cifras de las capturas son de ensayo y no se incorporan al feed vacío que se publica. No se abrió ni modificó un Excel operativo del usuario.
- Se conservan las funciones preexistentes ajenas a esta intervención. No se añade ni modifica una integración de mensajería; no se modifican los proveedores de IA ni la configuración de sus servicios.

## Integridad

Versión 4.8.0 · 181 recursos · digest `b8fd54c882d7625bfcec755a063d41513972ae4fc8952f9650234eb7b4cf845c`. Cada entrada de los ZIP se compara con su fuente y se comprueba por CRC. El código 4.7 se entrega intacto como recuperación. No sustituye un respaldo de los datos del navegador ni de los archivos operativos.

Referencias técnicas: [identidad anónima Firebase](https://firebase.google.com/docs/auth/web/anonymous-auth), [restricción de campos en reglas de Firestore](https://firebase.google.com/docs/firestore/security/rules-fields), [persistencia y permisos de archivos locales](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) y [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth).
