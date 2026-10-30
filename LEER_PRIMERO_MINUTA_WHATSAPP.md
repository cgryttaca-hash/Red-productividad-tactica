# Minuta de mañana por WhatsApp · revisión 2 · 29 de octubre de 2026

Esta actualización se aplica sobre `Red-productividad-tactica-main-PWA-Corregida-Premium.zip`. El proyecto completo incluye los cambios anteriores de diseño, PWA, Agenda Móvil y Firebase. Esta entrega añade únicamente la función de Minuta y la fecha inicial del Coworking.

Los paquetes **v2** sustituyen a la primera entrega de Minuta por WhatsApp e incluyen todas las filas de Coworking según la preferencia confirmada. El ZIP de reemplazos v2 también puede aplicarse sobre esa primera entrega.

## Instalación

- El ZIP completo contiene todo el proyecto en la carpeta `Red-productividad-tactica-main`.
- El ZIP de reemplazos contiene archivos completos con las mismas rutas. Copia su contenido sobre la raíz de la versión indicada, aceptando reemplazar los archivos coincidentes. No hace falta borrar datos ni ejecutar una migración.
- Publica todos los archivos del paquete a la vez en el servidor habitual. Usa HTTPS, o un servidor local para las pruebas; abrir el HTML con doble clic no permite esta función.
- Si tienes la aplicación abierta, guarda tu trabajo y usa el aviso «Actualizar» cuando aparezca, o cierra y vuelve a abrir la aplicación. El nuevo worker actualiza su caché sin borrar eventos, usuarios ni Coworking.
- Esta entrega no publica el proyecto ni cambia las credenciales o la configuración existente de Firebase.

## Uso

1. Entra a **Minuta de eventos**, con tus eventos sincronizados.
2. Termina de editar la celda o formulario: haz clic fuera del campo.
3. Pulsa **Ctrl + Q**. Siempre prepara **mañana según America/Bogota**, aunque estés consultando otra fecha en la pantalla. No cambia esa selección.
4. Se abre «Revisar y compartir» con la imagen a color y el mensaje. Si hay varias imágenes, aparecen numeradas y con nombres que indican el orden.
5. Si aparece **Compartir imágenes y texto**, púlsalo y elige WhatsApp en el menú del dispositivo. Si el dispositivo solo admite archivos, aparecerá **Compartir imágenes** y podrás copiar el texto aparte.
6. Si no aparece la opción nativa, descarga los PNG en orden, pulsa **Copiar mensaje** y **Abrir WhatsApp con el texto**. Adjunta los PNG descargados, selecciona el chat o grupo y confirma tú el envío. El enlace de WhatsApp prepara texto; no adjunta imágenes.

Para conservar la nitidez en WhatsApp, puedes adjuntar los PNG como documento o usar su opción de calidad alta cuando esté disponible. Para generar otra copia con datos actualizados, cierra la revisión y vuelve a pulsar Ctrl + Q.

No se añadió un botón de compartir a la pantalla de Minuta. El atajo se ignora mientras se escribe, en formularios o áreas editables, y las pulsaciones repetidas no abren varias generaciones. Fuera de Minuta conserva el comportamiento del navegador.

## Fechas y contenido

- El mensaje incluye la fecha completa de la imagen. Saludo de Colombia: **05:00–11:59**, buenos días; **12:00–18:59**, buenas tardes; **19:00–04:59**, buenas noches.
- El saludo se actualiza al compartir o copiar. Si dejas una revisión abierta hasta después de medianoche, el texto sigue refiriéndose a la fecha de esa imagen, sin llamar «mañana» a un día que ya pasó.
- Se usa la misma normalización, selección por fecha, exclusión de cancelados, orden y construcción de tablas de la impresión actual. La imagen usa sus estilos de impresión, colores y formato carta horizontal; conserva los saltos de línea.
- La impresión actual no muestra un logotipo dentro del documento. La exportación reproduce ese documento, sin agregar uno nuevo.
- La copia compartida incluye **todas las filas de Coworking, igual que la impresión actual**, también las de otras fechas o sin fecha. Mantiene sus valores y el orden original, sin filtrar por la fecha de los eventos. La revisión muestra este criterio. La impresión habitual conserva el mismo comportamiento.
- La generación se hace sobre una copia temporal; no modifica los eventos, las filas guardadas ni la fecha seleccionada en la pantalla.

## Coworking y navegación

La primera fila nueva y las filas agregadas muestran mañana en Colombia como fecha inicial. La fecha sigue siendo una celda editable. Las filas ya guardadas conservan su fecha, incluso si está vacía; agregar filas, navegar entre días o recargar no reemplaza una fecha manual. Al eliminar la última fila se limpia como antes y su fecha vuelve al valor inicial de mañana.

Se conserva la clave `minutaCoworkingRows` y sus siete campos, sin migración. También se conservan **Día siguiente**, **Día anterior**, **Próximos eventos** y **Imprimir**. En esta versión del proyecto no había un botón llamado «Siguiente evento»: los dos primeros controles avanzan o retroceden fechas y «Próximos eventos» abre su lista original.

## Compatibilidad

La revisión requiere un clic adicional para abrir el menú nativo: compartir archivos exige una interacción reciente del usuario, y la generación de la imagen es asíncrona. El destino depende de las aplicaciones instaladas y del navegador. El sistema no puede forzar WhatsApp, elegir un destinatario, garantizar que WhatsApp conserve el texto junto a los archivos ni confirmar la recepción.

El navegador debe entregar el atajo a la página. Algunos sistemas o navegadores reservan Ctrl + Q para otras acciones. En un teléfono sin teclado no hay un botón táctil nuevo que sustituya este atajo.

El PNG habitual mide **2640 × 2040**; en el perfil Apple móvil se reduce a **2112 × 1632** para controlar memoria. Los documentos largos producen una imagen más alta o varias consecutivas sin dividir filas. Si una sola fila excede los límites seguros, se muestra un error en vez de entregar una copia recortada. No se añaden bibliotecas externas para generar las imágenes. Tras una primera carga completa, la preparación también funciona sin conexión; enviar por WhatsApp necesita conexión.

Se probaron PNG reales en Chrome 155 y WebKit local, incluida pantalla móvil simulada. El menú nativo, el portapapeles y WhatsApp se comprobaron con alternativas controladas; **no se probó un teléfono físico ni se envió ningún mensaje real**.

Consulta [el informe y la lista de cambios](entrega/minuta-whatsapp/INFORME.md), [los resultados](entrega/minuta-whatsapp/pruebas.json) y [el inventario de archivos](entrega/minuta-whatsapp/archivos.json). Las imágenes de ejemplo usan datos ficticios y una fecha fija de prueba; la aplicación calcula la fecha real al utilizarla.

Documentación utilizada: [Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [detección de archivos compartibles](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare) y [click to chat de WhatsApp](https://faq.whatsapp.com/5913398998672934).
