# Gestión de Eventos 4.1.0

Proyecto completo sobre la versión estable 4.0.0. No se eliminó ningún archivo de esa referencia. Los informes anteriores se conservan como historial; el informe vigente es **entrega/v41/INFORME.md**.

## Uso

- **Inicio → Herramientas → Generar agenda** abre la generación independiente. Eventos conserva la consulta y la impresión; su botón Información abre el detalle.
- **Agendas** consulta los mismos datos de `eventData`, con categorías reales compartidas con Eventos y páginas de 25. Actuales conserva la regla existente: hoy o después, sin inventar un período distinto. Segundo piso conserva la regla histórica de salón que no dice tercer piso.
- **Avisos** en el encabezado abre el buzón local. El administrador puede crear borradores, editar, publicar, retirar, eliminar y definir vigencia. Cada usuario local tiene sus marcas de leído y cerrado. Historial incluye cerrados, vencidos y retirados; Todos / Administración incluye borradores y programados para el administrador.
- **Guardar en este navegador** en la observación persiste una copia local del texto. Conserva saltos de línea y detecta cambios del origen o de otra ventana. El texto original del Excel y la publicación Firebase permanecen como fuentes de referencia. La generación usa la observación local válida; Minuta y Agenda Móvil siguen leyendo su fuente habitual.
- Alimentación interna: requiere una sesión local autorizada y Agenda Móvil abierta. Usa la hora del servicio menos 15 minutos en America/Bogota. Si se reabre durante esos quince minutos, registra el aviso con la hora real de registro. No promete entrega puntual con la app cerrada. Cancelaciones retiran el aviso vigente; reactivaciones lo publican sin duplicarlo.

## Alcance del almacenamiento

Avisos y observaciones se guardan únicamente en el origen, perfil y navegador actuales. No se envían entre dispositivos. Se añaden las claves `rptInternalNoticesV1`, `rptNoticeReceiptsV1:<usuario>` y `rptEventNotesV1`; no se cambian hojas, encabezados, identificadores, reglas o colecciones Firebase. El guardado utiliza Web Locks y exige HTTPS o localhost. Si el navegador no puede guardar de forma segura, la consulta sigue disponible y se informa la limitación. El propietario del perfil conserva el control sobre su almacenamiento local, como en la autenticación heredada.

El botón Exportar historial descarga los avisos visibles del navegador. No es una herramienta de importación. Las copias automáticas heredadas no incluyen estas nuevas claves; no se anuncia lo contrario. No borres los datos del sitio para actualizar. Para guardar observaciones en el Excel real o sincronizarlas entre dispositivos hace falta definir una escritura autorizada y resolución de conflictos sobre esa fuente. Esa integración no se ha simulado.

## Avisos externos

Son opcionales y conservan el proveedor existente. Si `PUSH_CONFIG.apiBaseUrl` está vacío, se muestran como desactivados sin error obligatorio ni petición de permisos o suscripción. Esto no impide consultar la agenda ni usar los avisos internos. Para recepción con la app cerrada siguen siendo necesarios el servicio, credenciales y pruebas físicas descritos en la documentación Push existente. La IA opcional permanece desactivada y conserva sus permisos del servidor.

## Publicar y actualizar

Publica **el contenido de dist/** mediante el alojamiento actual, manteniendo el mismo origen y la misma ruta. No publiques la carpeta fuente completa: contiene informes y código del servidor. `firebase.json`, índices, reglas y configuraciones existentes están conservados. Para reconstruir después de editar: `pnpm build`, y luego `pnpm check`. Node 22 o posterior; dependencias declaradas y bloqueo conservado. No se desplegó en producción durante este trabajo.

La PWA descarga recursos completos, comprueba SHA-256 y ofrece aplicar la versión. Guarda los cambios de todas las pestañas antes de aceptarla. No se fuerza una recarga con formularios pendientes. Se mantiene una versión anterior verificada y la ventana Actualizaciones permite restaurarla. La protección de páginas nuevas actúa desde el worker 4.1; un worker 4.0 existente no puede recibir retroactivamente esa lógica. Para migrar, abre una ruta conocida como Inicio y aplica primero la actualización. No entres por una página nueva mientras siga activa la versión anterior.

Para reversión global, vuelve a publicar el contenido de `dist/` de **Version-estable-anterior-v4.zip**, conservando la ruta. La restauración cambia archivos de la app; no borra datos locales ni revierte Firebase o el Excel. Conserva también el ZIP 4.1 por si necesitas regresar a él.

## Pruebas

Consulta entrega/v41/PRUEBAS.json: contiene solo pruebas ejecutadas, resultados y límites. Se usaron datos de prueba y servicios Firebase/proveedores controlados en perfiles aislados, sin tocar producción. No equivalen a probar un teléfono físico ni recepción real Push/WhatsApp.

Pruebas reproducibles incluidas: `pnpm test`, `pnpm test:updates`, `pnpm test:v41`, `pnpm test:responsive`, `pnpm test:offline` y `pnpm test:performance`. Tras instalar las dependencias declaradas, instala el navegador con `pnpm exec playwright install chromium`. En un equipo con Chrome propio puedes indicar `CHROME_PATH`; los perfiles son temporales. La prueba comparativa adicional `node tests/v41/tests-regression.cjs` requiere `ORIGINAL_PROJECT_PATH` apuntando al proyecto 4.0 extraído de la copia estable. Las capturas de ejemplo del informe usan datos de prueba, no datos añadidos al proyecto.
