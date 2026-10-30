# Informe de auditoría y corrección — 4.2.1

Fecha: 30 de octubre de 2026, America/Bogota. Base: entrega 4.2.0, 535 archivos inventariados y contrastados por SHA-256. Antes de intervenir se verificó y copió íntegramente el ZIP 4.2.0 de recuperación. Se trabajó en una carpeta independiente; sources y los proyectos anteriores se conservaron.

## Hallazgos y causa del rechazo

El worker anterior rechazaba correctamente una descarga inválida, pero generaba errores sin recurso ni contexto. Al quedar redundante, la página sustituía el error por «La descarga no superó la verificación. Se conserva la versión activa». Ese mensaje no permitía distinguir archivo ausente, respuesta HTML del alojamiento, redirección, contenido truncado o bytes de otra publicación.

Se reprodujo el mensaje con los archivos reales de 4.2.0 y un servidor local que devolvía css/assistant.css de una publicación anterior. La descarga se rechazó sin identificar el recurso. Es una reproducción controlada; sin la URL del sitio del usuario no es posible atribuirle ese archivo o esa causa exactos a producción.

También se reprodujo una causa de alteración de bytes con Git real: al preparar y extraer la publicación con core.autocrlf=true y sin protección, 76 de sus recursos dejaron de coincidir con el manifiesto. Con .gitattributes, los 129 hashes se conservaron. No se afirma que el alojamiento del usuario utilice esa configuración.

Otro riesgo era importar la implementación del worker desde una URL compartida sin fijarla a su descriptor. Si el alojamiento servía publicaciones distintas durante el despliegue, el worker podía ejecutar una implementación diferente de la que acompañaba al manifiesto. La construcción ahora incorpora su implementación dentro de sw.js.

## Correcciones del actualizador

- Se conserva SHA-256 estricto para cada recurso. Las respuestas HTTP inválidas, redirecciones y HTML devuelto en lugar de otro recurso se rechazan. Un archivo truncado o modificado nunca se instala.
- Cada descarga lleva el digest de su publicación en la URL, manteniendo la clave canónica de caché. Esto separa la solicitud de una URL antigua que el servidor o intermediario pueda conservar; la integridad sigue siendo obligatoria. No se puede compensar un alojamiento que ignore los parámetros y siga sirviendo bytes incorrectos: en ese caso se informa el recurso y se conserva la versión activa.
- sw.js incorpora su implementación de la misma construcción, sin depender de importScripts para release-worker.js. El verificador comprueba que la fuente, el worker y release.json correspondan a la misma entrega.
- .gitattributes conserva los bytes de los archivos al extraer con Git. .nojekyll evita procesamiento innecesario en publicaciones estáticas compatibles.
- Las descargas tienen tiempo máximo y un solo reintento para fallos transitorios de red, tiempo o ciertos HTTP. Los errores permanentes se informan sin repetir indefinidamente.
- Ante un fallo se espera a que terminen las descargas concurrentes antes de retirar únicamente la caché candidata incompleta. Se conservan la versión activa, la anterior y los datos del usuario.
- El diagnóstico guarda etapa, recurso, causa y hora en un registro técnico del ámbito de la aplicación. Los hashes esperados/recibidos permanecen en el diagnóstico y consola; el usuario ve una explicación breve, sin contenido de respuestas ni credenciales.
- El diagnóstico persiste al recargar y se limpia tras una preparación correcta. El mismo manifiesto que falló puede reintentarse una vez reparado su recurso.

La herramienta tools/audit-publication.cjs permite revisar por HTTP una carpeta publicada: contrasta release.json, el descriptor del worker y los 129 recursos. Solo lee; no publica ni modifica el servidor. Se probó con la publicación dist real y con un CSS alterado.

## Página, tiempos y activación

La página existente de Actualizaciones conserva su diseño compacto, versión instalada, disponible y anterior, conexión, comprobación, progreso, inicio, fin y duración. Incorpora la fase Verificando integridad y muestra el archivo y la causa del fallo. El botón existente cambia a Reintentar actualización; se deshabilita durante el proceso. No se agregan ventanas, botones ni módulos operativos.

Los recursos verificados se cuentan realmente. Las fases sin porcentaje medible siguen siendo indeterminadas. El inicio de descarga observado y su final/error se registran con el reloj real; los tiempos dejan de avanzar al finalizar. La activación mantiene su cuenta mínima de 00:10 a 00:00 después de verificar el candidato, y la aplicación solo recarga con la versión preparada. La transición de dos pestañas, la protección de edición, la recuperación y la aplicación automática se probaron nuevamente.

Se probó además el salto local desde los archivos originales 4.2.0 a los archivos finales 4.2.1 en dos pestañas: versión nueva confirmada, espera mínima de diez segundos y dato local intacto. Esto no sustituye una prueba del alojamiento real. Los clientes anteriores a 4.2 conservan su protocolo de transición heredado hasta cargar el código nuevo.

## Funciones e interfaz conservadas

Las retiradas de Avisos y generación independiente ya estaban implementadas en 4.2.0. Se mantiene Inicio con sus tres accesos originales, Eventos sin acciones añadidas por registro y sincronización/administración compactas. No se añaden funciones de trabajo.

Se conservaron byte por byte los archivos críticos de Agenda Móvil, alimentación, modal, generación original, observaciones, login, sesiones, Excel, Minuta, sincronización y Firebase relacionados en PRUEBAS.json. Los usuarios, contraseñas, perfiles y roles no se cambiaron. Se repitieron las pruebas funcionales de esas rutas, permisos y caducidad, además de la compatibilidad de lectura de un XLSX real generado para pruebas.

El modal mantiene el emparejamiento por etiquetas y las líneas paralelas cuando corresponden; conserva descripciones multilínea y no inventa asignaciones ambiguas. Las observaciones continúan con guardado local explícito, verificación y manejo de conflictos. No se escribe de vuelta en Excel/Firebase.

Agenda Móvil conserva únicamente avisos de alimentación, fecha y horario reales menos quince minutos en Bogotá, sin cancelados, horas inválidas ni duplicados. La recepción con la aplicación cerrada depende del backend y compatibilidad existentes; la referencia continúa sin URL Push configurada. No se envió ninguna notificación física.

## Pruebas ejecutadas

- Ocho escenarios de integridad: HTTP 404, HTML erróneo, truncado, conversión de saltos de línea, redirección, mismo candidato reparado, URL antigua con contenido obsoleto y HTTP 503 transitorio. Se comprueban archivo/causa, persistencia del diagnóstico, conservación de datos y activación real. Las versiones 8.x son identificadores del servidor de prueba; la entrega es 4.2.1.
- Nueve escenarios del actualizador: instalación verificada, rechazo de mezcla, corrupción, edición pendiente en una/dos pestañas, cuenta real mínima de diez segundos, recarga coordinada, recuperación y actualización automática sin bucles. Las versiones 4.0.x de esa suite pertenecen al servidor de prueba.
- Migración local de la entrega 4.2.0 a 4.2.1 en dos pestañas.
- Auditoría HTTP de dist; rechazo del CSS alterado; Git real con y sin protección de bytes.
- Diez grupos funcionales de Inicio, Eventos, modal, observación, retorno/preferencia, credenciales, sesiones, caducidad y alimentación.
- 75 revisiones responsive y cinco modales; inspección visual de la página real con error a 390 px.
- Worker real con visualización de notificaciones interceptada, uso sin red de la agenda, guardado local y PNG Ctrl+Q; páginas retiradas responden 410.
- Cierre del proceso Chrome de prueba y reapertura: persistencia de datos y sesiones separadas.
- XLSX generado: mismos registros y encabezados al leer con 4.2.0 y 4.2.1, varias hojas, fecha bisiesta, serial, PAX cero y texto multilínea.
- Rendimiento local: mil eventos, 25 filas renderizadas, cero reconstrucciones por veinte señales idénticas. El tiempo medido es orientativo y se incluye en PRUEBAS.json.
- Verificación estática: 68 scripts, 15 páginas, dos manifiestos, archivos protegidos y 129 recursos íntegros. Inventario completo y ZIP contrastados con los archivos entregados.

Las suites que ensayan corrupción generan intencionadamente errores del worker y respuestas HTTP fallidas. Los resultados válidos distinguen esos rechazos esperados de errores de página nuevos. Los informes 4.2 de impresión, Coworking, proveedores y otros contratos se conservan como históricos; no se presentan como ejecuciones nuevas de esta revisión.

## Pendientes y límites reales

No se recibió la URL del alojamiento real ni un Excel nuevo de operación. No se puede identificar el archivo concreto que causa el mensaje en ese sitio sin examinarlo. La entrega corrige problemas reproducidos y aporta diagnóstico para localizar cualquier fallo restante.

No se desplegó ni se realizaron escrituras en Firebase, modificaciones de Auth, envíos Push/WhatsApp reales ni pruebas físicas iOS/Android. Se conserva la configuración de producción. Las observaciones siguen siendo locales. La validación local de rutas no convierte una publicación pública en contenido privado del servidor.

La guía explica publicar todos los archivos de dist juntos y sin transformarlos, generar nuevamente el manifiesto si cambia un archivo, conservar datos y recuperar 4.2.0. El listado de archivos nuevos/modificados está en ARCHIVOS_MODIFICADOS.csv y CAMBIOS.json; el inventario de integridad está en MANIFIESTO_SHA256.json.
