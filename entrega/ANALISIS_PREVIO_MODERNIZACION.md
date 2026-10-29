# Análisis previo - 28 de octubre de 2026

Base: ZIP actualizado entregado el 27 de octubre. Se conserva una extracción completa e independiente en `work/base` antes de modificar la copia de trabajo.

El sistema es una aplicación estática HTML/CSS/JavaScript. `index.html` es el centro operativo; `eventos.html` usa `js/eventos.js`, `js/excel-sync.js` y Chart.js/SheetJS; `minuta.html` consulta el mismo `localStorage.eventData`. Excel normaliza las hojas mensuales y mantiene identificadores `__EVENT_ID`, hoja y fila de origen. No se añadirá almacenamiento de eventos para Agendas.

El acceso administrativo se comprueba en `auth-guard.js` y `local-auth.js`. La Agenda Móvil es pública y utiliza autenticación anónima Firebase, `eventos_meta/publicacion` y bloques de eventos. `agenda-movil.js`, sus filtros, ordenación, fechas y caché IndexedDB quedarán intactos. También se conservarán Minuta, el lector Excel y sus cálculos.

La presentación administrativa está aislada mediante `data-ui="corporate"`. Agenda Móvil utiliza su propio CSS verde/arena y su propio manifest. Solo se añadirán metadatos Apple, áreas seguras, instrucciones y un estado específico de suscripción push, sin sustituir su diseño.

Existe un único service worker `sw.js`. La caché anterior almacena rutas sin las consultas de versión utilizadas por los HTML; no asegura una instalación atómica y activa versiones inmediatamente. La guardia de mantenimiento depende de Firebase antes de hacer visible la página. Se ajustarán la coincidencia de recursos versionados, actualización controlada y arranque offline con las reglas de mantenimiento en caché conservadas.

Las notificaciones actuales se originan con eventos de la página y recordatorios de una aplicación abierta. No existe manejador `push`, suscripción PushManager ni backend de envío. Se conservarán esos avisos locales y se añadirá Web Push estándar con funciones Firebase separadas. Las suscripciones se guardarán en una colección técnica nueva, sin duplicar eventos. La clave privada VAPID permanecerá en Secret Manager. Sin backend y clave pública válidos la interfaz indicará que push no está configurado.

La nueva acción de Eventos se integrará mediante un único evento de interfaz después de representar la tabla; no cambiará selección, filtros ni datos. Agendas resolverá el registro actual por su identificador original y rechazará selecciones ambiguas. Su modal, copia e impresión estarán aislados. Los archivos de Minuta y sus formatos permanecerán idénticos.

Respaldos, Diagnóstico, Equipos y Auditoría seguirán sin páginas ni accesos. Sus servicios internos compartidos se conservan por sus consumidores existentes. No se modificará ningún archivo de `sources/`.
