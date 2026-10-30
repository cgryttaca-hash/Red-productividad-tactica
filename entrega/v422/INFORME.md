# Causa confirmada en el sitio y corrección — 4.2.2

Se revisó https://cgryttaca-hash.github.io/Red-productividad-tactica/ a partir de la dirección de Actualizaciones indicada por el usuario, el 30 de octubre de 2026. La hora exacta UTC de las solicitudes está en CAUSA_CONFIRMADA.json. La intervención fue de lectura; no se publicó ni se modificó el repositorio remoto.

## Diagnóstico del sitio real

La publicación informa versión 4.2.0. Su release.json coincide exactamente con el manifiesto de la entrega 4.2.0 original. El descriptor de sw.js y el manifiesto corresponden entre sí. De 129 recursos descargados directamente por HTTP, 99 cumplen la huella y 30 no la cumplen. Los recursos fallidos responden HTTP 200; no faltan ni son páginas de error.

Se comparó cada uno de los 30 recursos con el archivo original: los 30 coinciden exactamente al convertir únicamente CRLF a LF. No hay otras diferencias de contenido en ellos. Por ejemplo, agenda_movil.html tenía 119 saltos CRLF al generar el manifiesto y el publicado tiene cero. La huella esperada es 03364223443265beece03a4aecceac17a7721ac37d15bda42a67831872c0a239; la publicada es af1f4db8ed6872c707e1b2a57adbf967fca7ffa5e346bae513f5e9f87d8ccf50.

También se leyeron los 30 archivos desde la rama main del repositorio público: todos ya tienen LF y coinciden con lo servido por Pages. Por tanto, la transformación está presente en el repositorio antes de servir la página. No se identificó qué programa o acción de carga convirtió los archivos; no se atribuye sin pruebas a una herramienta específica. En el momento de la revisión no había .gitattributes en la raíz pública del repositorio.

La causa demostrada es publicar archivos cuyos bytes cambiaron después de calcular sus huellas. La protección SHA-256 detecta ese cambio y rechaza correctamente la actualización. El mensaje anterior era insuficiente para identificarlo. No se desactivó ni flexibilizó la verificación.

Todos los archivos y sus huellas esperada/publicada se enumeran en ARCHIVOS_RECHAZADOS.csv y CAUSA_CONFIRMADA.json. Entre ellos están agenda_movil.html, index.html, eventos.html, js/agenda-movil.js, js/food-alerts-core.js, js/pwa-release.js y js/release-worker.js. No se trata de un único archivo: cualquiera de los treinta impide instalar el conjunto completo. El primero que encuentre el navegador puede variar por el orden de las descargas concurrentes.

## Corrección aplicada

La versión 4.2.2 normaliza a LF los archivos de texto de ejecución ANTES de calcular los hashes y generar el descriptor del worker y release.json. Se aplican la misma normalización al contenido fuente y al publicado, de modo que ambos sean coherentes. Las imágenes y los datos operativos quedan intactos. Los archivos compartidos del backend conservan la misma lógica y su correspondencia con el navegador.

.gitattributes establece LF para texto y preserva binarios; también se incluye en el paquete público. El verificador rechaza cualquier recurso de texto que vuelva a incluir CRLF. Se comprobó que convertir CRLF a LF sobre los 129 recursos finales no modifica ninguna huella, porque su formato ya es canónico.

Se conservan las mejoras 4.2.1: diagnóstico por archivo/etapa/causa, registro persistente, reintento seguro, worker autocontenido, solicitudes identificadas por digest, descarga y caché completas, protección de pestañas, cuenta mínima de diez segundos y recuperación. No se añadieron botones, páginas operativas ni dependencias.

## Conservación de funciones

Todos los recursos web de ejecución, salvo los dos metadatos de versión, son idénticos a 4.2.1 o difieren exclusivamente por CRLF a LF. No se cambió su lógica. La comprobación está automatizada en la preparación de esta entrega y sus listas están en PRUEBAS.json. Firebase, sus reglas, sus conexiones, los datos publicados y la lógica del backend se conservaron; no se modificaron credenciales, perfiles o roles.

Agenda Móvil, alimentación, Minuta, Coworking, generación, impresión, observaciones, login y navegación conservan su funcionamiento. Las observaciones siguen siendo una copia local explícita y las notificaciones con aplicación cerrada requieren el servicio existente. No se afirma haber probado recepción física o servicios de producción.

## Pruebas ejecutadas en 4.2.2

- Auditoría HTTP de la publicación dist: 129 recursos íntegros; un CSS alterado se identifica y rechaza.
- Comprobación de formato: pasar CRLF a LF de nuevo no cambia ninguna huella final. Un archivo modificado realmente sigue siendo rechazado.
- Git local real con autocrlf: los 129 hashes se conservan con la configuración LF incluida.
- Ocho escenarios de integridad: HTTP 404, HTML en lugar del recurso, truncado, cambio a CRLF, redirección, misma versión reparada, URL obsoleta y HTTP 503 transitorio. Se comprobaron rechazo, diagnóstico, conservación y reintento.
- Migración local de los archivos originales 4.2.0 a los finales 4.2.2: dos pestañas, mínimo diez segundos, versión confirmada y dato local conservado.
- Diez grupos funcionales: Inicio original, Eventos, plantilla, descripción multilínea, observación, preferencia/retorno, credenciales y ámbito móvil, caducidad, alimentación exclusiva y renovación de publicación.
- Instalación y uso sin conexión con worker real; agenda móvil, observación local y PNG Ctrl+Q; notificaciones interceptadas para no enviar avisos físicos.
- Verificación estática: 68 scripts, 15 páginas, dos manifiestos y 129 recursos. Integridad del ZIP y comparación de cada archivo con la entrega.

Los informes de pruebas anteriores se conservan como historial; las 75 combinaciones responsive, Excel comparativo, impresión y reapertura documentadas en 4.2/4.2.1 no se presentan como ejecuciones nuevas de este ajuste de formato.

## Publicación pendiente

La causa en producción está confirmada y la corrección está preparada y probada localmente. El sitio real seguirá en su estado anterior hasta publicar los archivos nuevos. Se entrega un ZIP público con el contenido de dist en su raíz y otro con el proyecto completo. No se hizo un despliegue sin acceso ni autorización expresa para modificar GitHub. Tras publicar, comprobar versión 4.2.2 y repetir la auditoría HTTP para confirmar 129 de 129 recursos.

No es necesario borrar datos del navegador ni de Firebase. Conservar el trabajo pendiente y permitir que el actualizador aplique una versión completa cuando las pestañas estén seguras. La copia 4.2.1 anterior se mantuvo verificada antes de intervenir. Los archivos nuevos/modificados se enumeran en ARCHIVOS_MODIFICADOS.csv.
