# Informe de Minuta y Coworking

Fecha: 29 de octubre de 2026, revisión 2. Base: `Red-productividad-tactica-main-PWA-Corregida-Premium.zip`.

## Resultado

Ctrl + Q prepara mañana en America/Bogota como PNG a color, con los estilos de impresión existentes, y abre una revisión con texto y opciones de compartir. La fecha inicial de las filas nuevas de Coworking pasa a mañana y sigue siendo editable. Las fechas guardadas, los datos y los controles existentes se conservan.

La imagen se construye a partir de una copia completa del documento, no de una captura de la pantalla. Se reutilizan las funciones que seleccionan y ordenan eventos y construyen sus tablas. Las reglas de impresión se leen al generar la copia. Se calculan cortes en los límites de filas si el documento supera el tamaño seguro del lienzo; los archivos y sus pies indican el orden.

La copia compartida incluye **todas las filas de Coworking, igual que la impresión actual**, según la preferencia confirmada por el usuario. Incluye fechas anteriores, posteriores y vacías, conservando orden y contenido. Los eventos siguen correspondiendo a mañana en Colombia. La revisión explica este criterio y los registros originales no se alteran.

## Archivos de funcionamiento modificados

| Archivo | Cambio |
|---|---|
| `minuta.html` | Carga la utilidad de fechas, el atajo y el gestor PWA existente para recibir las actualizaciones. No agrega controles al diseño de Minuta. |
| `js/minuta.js` | Reutiliza el filtro de eventos y la densidad de impresión; añade la copia exportable con todas las filas de Coworking y su fecha inicial editable. |
| `sw.js` | Cambia el nombre de la caché y añade los seis recursos nuevos. La lógica de Push y notificaciones no cambia. |
| `PROTECTED_MODULES.json` | Actualiza las huellas de los dos archivos de Minuta autorizados en esta tarea. |
| `js/system-version.js` | Actualiza esas mismas huellas, manteniendo las demás constantes. |

## Archivos nuevos de funcionamiento

| Archivo | Función |
|---|---|
| `js/minuta-time.js` | Mañana, validación de fechas y saludo explícitos en America/Bogota. |
| `js/minuta-raster.js` | Estilos de impresión, copia temporal y PNG completos o divididos por filas, sin nuevas dependencias externas. |
| `js/minuta-share.js` | Ctrl + Q limitado a Minuta, protección contra repetición, ventana de revisión y errores. |
| `minuta_compartir.html` | Revisión accesible con imagen, texto y opciones posteriores al atajo. |
| `js/minuta-share-preview.js` | Detección de Web Share, archivos, descarga, copia de texto y enlace oficial de WhatsApp. |
| `css/minuta-share.css` | Diseño adaptable de la revisión; no interviene en la impresión de Minuta. |

La documentación nueva comprende `LEER_PRIMERO_MINUTA_WHATSAPP.md` y esta carpeta: `INFORME.md`, `pruebas.json`, `archivos.json`, `ejemplo-minuta.png` y `revision-compartir.png`. Los informes anteriores del proyecto se conservan como antecedentes; los resultados de esta actualización son los de esta carpeta.

## Pruebas realizadas

- Fecha de Colombia independiente de la zona del equipo, medianoche, mes, año y año bisiesto; límites de los tres saludos y revisión abierta después de medianoche.
- Primera fecha de Coworking, filas nuevas, edición, almacenamiento de siete campos, recarga, fechas guardadas vacías y conservación al navegar. Cambio 31 de diciembre a 1 de enero en los controles existentes.
- Teclado real en Chrome: Ctrl + Q dentro de Minuta, ignorado al editar y sin efecto desde Inicio, Eventos, Agendas o Agenda Móvil. Pulsaciones dobles y revisión ya abierta no duplican el trabajo.
- Tres eventos de mañana en ambos pisos y zona social, cancelados y eventos de otras fechas excluidos. Todas las filas de Coworking incluidas: mañana, fecha anterior, posterior y vacía, con los siete campos y el orden idénticos al original. Datos y selector de la pantalla sin cambios durante la exportación.
- Descarga de un PNG real de 2640 × 2040, firma PNG y archivos entregados a la API de compartir con una interacción real. Rutas controladas de texto con archivos, solo archivos, API ausente, permiso denegado, cancelación y copia manual.
- Enlace de WhatsApp interceptado: texto codificado correcto, sin destinatario y abierto solo por clic. No hubo envío real.
- 180 eventos en Chrome: cuatro PNG consecutivos y cobertura completa. La última fila se verificó en los píxeles del último archivo.
- WebKit local: orientación, escala y contenido real de los PNG en escritorio y perfil móvil. Ochenta eventos en perfil Apple móvil: tres partes, todas dentro de cinco millones de píxeles, con la última fila comprobada.
- Impresión habitual de Minuta antes y después, con los mismos datos guardados: las páginas rasterizadas dieron exactamente el mismo SHA-256.
- Comparación con la base: filtros de Eventos, fechas y Coworking de Minuta y filtros, vistas y detalle de Agenda Móvil conservan los mismos resultados. Pruebas de Agendas, copia con formato, importación XLSX y 40 combinaciones de página/ancho sin desbordamiento.
- Worker real, caché y recarga sin conexión de Agenda Móvil y Minuta. Los seis recursos nuevos quedan disponibles offline. Mantenimiento vigente continúa respetándose.
- Errores de datos inválidos y una fila que supera los límites: mensajes claros, sin PNG incompletos, eliminación del marco temporal y liberación del indicador. Abrir la revisión sin Ctrl + Q no expone datos.
- Auditoría de archivos: ningún archivo original eliminado; solo los cinco archivos indicados modificados. Agenda Móvil, sus dependencias, backend y configuración conservan sus bytes. Sintaxis de JavaScript y recursos locales verificados.

Los detalles y límites están registrados en `pruebas.json`. Las imágenes de ejemplo contienen datos ficticios. Los fallos de red registrados durante la fase offline son deliberados al desconectar los servicios externos; la prueba principal no registra excepciones, errores de consola ni recursos locales faltantes.

## Límites y entrega

No se realizó publicación, acceso a Firebase de producción, envío de WhatsApp ni prueba física en Android o iPhone. WebKit en Windows y un perfil móvil son comprobaciones locales, no certificación de Safari en un dispositivo real. La API nativa y el portapapeles se simularon para comprobar todas las alternativas; la generación, descarga, píxeles, teclado y worker se ejecutaron realmente.

WhatsApp puede separar imagen y texto. El enlace de click to chat solo prepara el texto y necesita que el usuario adjunte los PNG. La página ofrece instrucciones claras y no presenta la apertura del menú como prueba de envío o recepción. El usuario elige el destino y confirma siempre. [Documentación de Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare), [WhatsApp](https://faq.whatsapp.com/5913398998672934).

El paquete completo conserva las funciones anteriores; el paquete incremental contiene archivos completos para reemplazar sobre la base indicada. Ambos incluyen la guía y este informe. Las huellas del inventario permiten comprobar cada archivo de funcionamiento entregado.
