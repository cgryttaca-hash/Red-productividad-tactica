# Gestión de Eventos 4.7 — Informe de las intervenciones

Fecha: 1 de noviembre de 2026 · America/Bogota. Base: 4.6.0. Se trabajó sobre una copia; la versión anterior permanece intacta.

## Alcance de seguridad aclarado por el usuario

Se conserva la seguridad y el acceso actuales, según la aclaración posterior del usuario. La activación o sustitución manual de Excel/Firebase queda dentro de la sesión administrativa validada con Ctrl+M, sin controles ni modales técnicos al inicio. Las fuentes previamente vinculadas conservan la sincronización automática. No se añade autorización remota de dispositivos ni se cambia el acceso público/sin conexión de Agenda Móvil.

El adjunto original proponía autorización de dispositivos con servidor. Se identificó que el registro actual permite autorregistro y que las lecturas existentes no exigen una aprobación por dispositivo. Antes de tocar esa arquitectura se explicó el riesgo para el acceso público/PWA; la aclaración posterior limitó la intervención a la activación administrativa y a conservar la seguridad actual. Por ello no se afirma haber implantado autorización remota, revocación completa de cachés o un bloqueo resistente a modificar JavaScript.

## Las cinco intervenciones, con ese alcance

1. **Preloaders:** estado independiente por página y proceso; señales de preparación en los puntos existentes de carga, mensajes específicos, iconos locales, error/reintento y espera ligada al estado real. Se retiran las esperas decorativas de los preloaders de Eventos/Minuta. Las señales no cambian las consultas ni el procesamiento de datos.
2. **Activación administrativa:** Excel/Firebase no crean controles ni abren modales técnicos al iniciar o consultar Eventos. La selección, importación, reconexión y desvinculación manuales comprueban la validación administrativa actual. Se conserva la sincronización automática de fuentes vinculadas y la lectura pública móvil. No se cambian cuentas, roles, credenciales, reglas Firebase o el registro actual de dispositivos.
3. **Unificación visual:** encabezados, formularios, botones, estados y modales existentes reciben estilos corporativos de pantalla. La navegación de 4.6 se conserva y no se añaden módulos.
4. **Iconos:** las 16 páginas usan iconos SVG representativos de la misma familia, con iconos para acciones y controles existentes; se sustituyen los glifos decorativos de nube. No se instala una librería ni se modifican los manifiestos/identidad PWA. No existe una página independiente de Facturación en el proyecto; se representa el medio de pago existente sin inventar un módulo.
5. **Detección de actualizaciones:** sondeo visible cada 30 segundos, reanudación tras historial, observación del worker ya instalado/en instalación y registro de listeners una sola vez. Se conserva el núcleo de verificación, la espera mínima, la recuperación y la protección de trabajo pendiente.

## Causa comprobada de la actualización detenida

En 4.6, `pagehide` eliminaba el intervalo y no existía una reanudación en `pageshow` al restaurar la página del historial. Se reprodujo el fallo: después de restaurar no se solicitaba `sw.js` al adelantar el reloj. Además, el observador de `updatefound` se instalaba después de resolver `register()` sin revisar siempre un worker que ya estuviera instalándose.

La prueba de 4.7 publica una versión distinta mientras la página sigue abierta: el sondeo la detecta, se conserva el formulario pendiente y no hay navegación hasta que la operación existente puede activarla. Se confirma la versión activa y una publicación posterior dañada se rechaza sin recarga manual. No se llama a `check()` ni se pulsa el botón de comprobación para provocar la detección. La activación sí recarga automáticamente cuando corresponde, como parte del mecanismo original.

## Conservación comprobada

34 archivos críticos permanecen idénticos por SHA-256. Seis bloques completos de lectura/normalización/guardado Excel, transformación/publicación Firebase, filtros y representación de Eventos, y lógica de Minuta permanecen idénticos. Los cambios de esos controladores se limitan a señales de carga o al acceso manual administrativo identificado.

Filtros, consultas, Coworking, vista previa, contenido y geometría de impresión de Eventos/Minuta se compararon contra 4.6. La alimentación exacta, sus repeticiones y la correspondencia de horarios se conservaron en Chrome/WebKit y perfiles móviles. Reglas Firebase, cuentas locales, manifiestos, backend Push y cálculos de alimentación no se modifican.

## Archivos modificados de la base, fuera de dist

- `PROTECTED_MODULES.json`
- `VALIDACION_FINAL.json`
- `VERSION.txt`
- `administracion.html`
- `agenda_movil.html`
- `agendas.html`
- `asistente.html`
- `configuracion.html`
- `eventos.html`
- `index.html`
- `js/agenda-movil.js`
- `js/eventos.js`
- `js/excel-sync.js`
- `js/firebase-sync.js`
- `js/loader-guard.js`
- `js/loading.js`
- `js/login.js`
- `js/minuta.js`
- `js/operating-center.js`
- `js/pwa-release.js`
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

`ARCHIVOS.csv` enumera los archivos modificados/añadidos y las copias de publicación. `MANIFIESTO_SHA256.json` cubre el proyecto final. Sus propias huellas se verifican mediante los archivos de entrega. No se elimina ningún archivo de la base.

## Pruebas

Resultado local: PASS. 19 conjuntos y 165 comprobaciones registradas, incluyendo 80 revisiones de páginas y 20 de secciones administrativas en cinco anchos. 90 scripts/backend, 16 páginas, dos manifiestos y 177 recursos superaron la comprobación estructural e integridad.

Se comprobaron administración y usuario de consulta, ausencia de selectores técnicos sin validación, errores/reintento de carga, sincronización de un XLSX real de ensayo, Ctrl + Q y todas las filas de Coworking, carga móvil, instalación/offline, migración 4.6 → 4.7 con dos pestañas y cierre/reapertura de un navegador con perfil persistente. Los ensayos de rechazo de recursos y reintento de la misma versión siguen pasando.

## Límites y validación de producción

- Se conserva la seguridad y el acceso actuales, según la aclaración posterior del usuario. La activación o sustitución manual de Excel/Firebase queda dentro de la sesión administrativa validada con Ctrl+M, sin controles ni modales técnicos al inicio. Las fuentes previamente vinculadas conservan la sincronización automática. No se añade autorización remota de dispositivos ni se cambia el acceso público/sin conexión de Agenda Móvil.
- Los controles técnicos se basan en la autenticación local existente. No se presentan como una barrera de servidor frente a un usuario que controla el JavaScript o el almacenamiento del navegador.
- Firebase/Auth/App Check, publicación y proveedores se interceptaron o bloquearon. No se cambiaron reglas ni credenciales, no se desplegaron funciones ni se leyó/escribió producción.
- Las pruebas utilizaron perfiles y libros de ensayo. Los nombres, cifras y registros de las capturas no se incorporan a la publicación ni al Excel operativo del usuario.
- Se ejecutaron Chrome y WebKit con perfiles Android/iPhone/iPad, incluida PWA emulada. No hubo instalación física ni recepción real de Push en teléfonos.
- La migración, caché y reapertura usaron Service Workers y un perfil persistente reales en HTTP local. Se conservaron usuarios, sesión e identificador del perfil de ensayo.
- La prueba automática publica versiones en el servidor local mientras la página permanece abierta; no invoca check(), el botón Comprobar ni una recarga manual. Se adelantan los temporizadores de la página para probar el sondeo; la activación sigue usando el protocolo real del worker.
- El navegador puede limitar temporizadores en segundo plano. Una pestaña antigua 4.6 cuyo sondeo ya está detenido puede necesitar reabrirse una vez para instalar esta corrección; las siguientes comprobaciones de 4.7 se reanudan automáticamente.
- El sitio no se publicó automáticamente. La IA externa sigue desactivada; WhatsApp no recibió mensajes reales. La operación física y los servicios de producción requieren revisión después de publicar.

## Integridad de publicación

Versión 4.7.0 · 177 recursos · digest `f3922d12c1b8c187c80c180dd45c634eddccfa435c8591c1926a07e086fc1429`. Los ZIP se validan por CRC y cada entrada se compara con el archivo fuente. La configuración de Firebase/servidor no requiere una intervención nueva para el alcance confirmado.

Referencias técnicas consultadas: [comprobación del Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update), [restauración mediante pageshow](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event) y [reglas de seguridad Firebase](https://firebase.google.com/docs/rules/basics).
