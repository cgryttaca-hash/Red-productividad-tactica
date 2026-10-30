# Informe de intervención 4.1.0

Entrega sobre el proyecto real 4.0.0, con referencia inmutable de 482 archivos y huellas iniciales. Se conserva la arquitectura HTML/CSS/JavaScript, el almacenamiento heredado, el importador Excel, Firebase y los proveedores opcionales. No se eliminó ningún archivo de la referencia ni se reinstalaron librerías.

## Errores y causas

1. Avisos: el panel existente mostraba únicamente la disponibilidad del proveedor Push y exigía su URL; no había un buzón interno administrable. Se separó el buzón local del proveedor externo y se evita preparar suscripciones cuando falta configuración opcional.
2. Agendas: la lista no compartía los cuatro criterios de Eventos ni limitaba las filas visibles. El controlador también inyectaba generación dentro de la consulta. Se extrajeron las reglas originales a un módulo común y la generación a su propia página; la función que construye el documento conserva su cuerpo original.
3. Detalle: faltaban contactos específicos del ejecutivo y una escritura verificable de observaciones. El origen Excel funciona como lectura y Firebase publica su derivación; no existe un contrato autorizado de escritura de esa observación. Se permite una copia local explícita, con bloqueo de escrituras y comparación de versión y origen antes de guardar. No se simula modificar la fuente.
4. Inicio: los controles de conexión y administración aparecían simultáneamente con los accesos. Se agruparon en secciones desplegables y un menú; los identificadores y funciones administrativas permanecen disponibles para el mismo rol.
5. PWA: el mecanismo 4.0 ya verificaba recursos, protegía edición y coordinaba pestañas. Se encontró un caso de mezcla posible: una navegación a un HTML nuevo inexistente en la caché podía tomar HTML de red y JavaScript antiguo. El worker 4.1 presenta una respuesta controlada 409 y solicita abrir Inicio para actualizar. Las rutas conocidas y sus recursos siguen desde la versión completa seleccionada. No se sustituyó el gestor ni se vaciaron almacenes.
6. Alimentación: la comprobación local recorría alertas cada segundo. Ahora reutiliza el planificador real, conserva la política externa y programa el siguiente instante pertinente, además de reaccionar a datos/visibilidad/conexión. El buzón registra avisos sin permiso de navegador, con sesión local y Agenda abierta; cancelación/retirada y reactivación cambian el estado sin duplicados.

## Cambios y conservación

Nuevos módulos públicos: avisos.html y generacion_agenda.html; almacenamiento local de registros con bloqueo; buzón y administración; detalle compartido; reglas de filtrado comunes. Se amplían los estilos compartidos existentes y se añaden estilos exclusivos para el detalle y los avisos. No se añaden bibliotecas de ejecución ni capas de backend.

Las claves locales nuevas son rptInternalNoticesV1, rptNoticeReceiptsV1:<usuario> y rptEventNotesV1. El permiso de escritura se consulta en cada operación con el usuario local actual. Se comprueba confirmación de almacenamiento; texto corrupto, cuota o conflictos producen error y conservan la edición. El HTML procedente de datos se trata como texto. No se escriben eventos de prueba en el JSON distribuido ni se cambia eventData al guardar observaciones.

Conservados: filtros y columnas de Eventos; importación y encabezados Excel; generación y copia del documento; búsquedas, estados, alimentación, montaje; impresión de Eventos y Minuta; Coworking con sus siete campos; Ctrl+Q con mañana de Bogotá y TODAS las filas manuales; consulta de Agenda Móvil, publicación, caché y mantenimiento; configuración, usuarios, autenticación y permisos; reglas e índices Firebase; backend Push y asistente. Los cuatro módulos retirados en entregas previas no se reintroducen.

La interfaz mantiene azul marino, azul corporativo y dorado, variables compartidas y el logotipo existente. Se verificaron 85 combinaciones de página y ancho (360, 390, 768, 1024 y 1440 px), diez modales y capturas de Inicio, detalle y Avisos. Las tablas conservan información mediante desplazamiento horizontal controlado.

Rendimiento: las fechas, identidad y búsqueda de Agendas se preparan cuando cambia la fuente; búsqueda con espera breve, 25 filas por página y firma de versión/filtro para evitar reconstrucciones idénticas. Una carga local de 1000 registros mostró 25 filas, menos de 1000 nodos y cero mutaciones de filas ante veinte señales repetidas. La medida exacta de esa ejecución está en PRUEBAS.json; no representa un equipo físico de bajos recursos ni el tiempo de Firebase en producción.

## Pruebas ejecutadas

PRUEBAS.json contiene las suites completas y sus límites; MATRIZ_PRUEBAS.md distingue cada estado. Se ejecutaron importaciones XLSX reales, comparación de consultas con 4.0, copia real al portapapeles, PDFs, persistencia y conflictos en dos ventanas, falta de espacio, roles, avisos sin Notification API, lectura por usuario, historial y eliminación, alimentación sin red, cancelación/reactivación, consulta offline y generación PNG. La impresión de Eventos y Minuta produjo imágenes idénticas a la referencia al rasterizar los PDFs a 120 dpi.

Se probaron un service worker local real, instalación y caché, candidato corrupto rechazado, protección de edición en una y dos pestañas, activación coordinada, regreso a versión previa y conservación de datos. Chrome y WebKit ejecutaron los flujos indicados. Backend Push/IA se probó con proveedores y Firebase controlados: estas pruebas verifican lógica y contratos, no servicios de producción. Ninguna prueba envió WhatsApp a personas, pagó una llamada IA ni escribió Firebase de producción.

## Estado y límites

CORREGIDO Y VERIFICADO: consulta, chips/paginación, generación independiente, contactos del mismo registro, observaciones locales, avisos internos, permisos de sus operaciones, errores de almacenamiento, Inicio compacto, responsive, caso de HTML de otra versión y regresión de datos/impresión. Ver matriz para el alcance exacto.

IMPLEMENTADO, PERO NO VERIFICADO: instalación física y recepción nativa en dispositivos reales, migración en el alojamiento del usuario y ejecución remota de los flujos GitHub existentes. Se conserva el código, sin afirmar esas comprobaciones.

PENDIENTE: escritura de observaciones en el Excel/Firebase original y sincronización entre dispositivos de estos avisos locales. Requieren definir la fuente compartida y permisos de escritura; no se anuncian como funciones disponibles. Las copias automáticas heredadas no incluyen las claves locales nuevas. La guía explica su alcance y el buzón permite exportar su historial.

DEPENDENCIA EXTERNA: entrega Push con la app cerrada, Firebase real e IA opcional, sujetos a las credenciales/servicios ya documentados. No son requisitos para usar el buzón local. Las alertas internas requieren sesión y Agenda Móvil abierta; no pueden ejecutar procesos con el navegador cerrado.

## Entrega y recuperación

El ZIP principal incluye fuentes, configuración, recursos, dist/ completo, documentación y pruebas reproducibles. Publica el contenido de dist/ conservando el origen y ruta. La guía vigente es LEER_PRIMERO_V41.md; el resto de informes de versiones se conserva como historial. Los archivos modificados/nuevos, tamaños y SHA-256 están en CAMBIOS.json y ARCHIVOS_MODIFICADOS.csv. MANIFIESTO_SHA256.json relaciona todos los archivos excepto el propio manifiesto.

La copia estable anterior se entrega como Version-estable-anterior-v4.zip. La PWA conserva la versión previa verificada para restaurar archivos locales; el administrador puede volver a publicar dist/ de la copia estable para una reversión global. No se borran datos locales ni se revierten Excel/Firebase. Un worker 4.0 ya instalado necesita abrir una ruta conocida y aplicar la actualización antes de entrar directamente por una página nueva: la protección nueva no puede cambiar un worker antiguo retroactivamente.
