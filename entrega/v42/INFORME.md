# Informe de corrección y depuración — 4.2.0

Se trabajó sobre la entrega 4.1.0, con 528 archivos inventariados y huellas SHA-256 previas. Se comparó el Inicio con la copia más antigua disponible en work/base/Red-productividad-tactica-main/index.html: tres accesos principales. Se conserva la arquitectura HTML/CSS/JavaScript, sus bibliotecas y el modelo de datos. Los informes de versiones anteriores se mantienen como historial; este es el vigente.

## Retiradas y recuperación de estructura

- Retirados Avisos, el acceso de campana, su buzón, administración, paneles y confirmaciones de Excel/publicación. No se borraron las claves locales históricas del navegador.
- Retirada la ventana generacion_agenda.html y sus accesos. Agendas conserva su página y la plantilla: se abre al seleccionar una fila o usar Enter. No se crea otra ventana ni otro generador.
- Eliminados de Eventos los botones individuales Información / Generar agenda añadidos en versiones anteriores. Sus filtros, búsquedas, datos y vista de impresión se conservan.
- Inicio recupera Agenda de eventos, Minuta y Agenda Móvil con sus nombres y funciones. Agendas permanece en la navegación existente. Se retiran Inicio duplicado, el menú adicional y los accesos nuevos de la pantalla principal. Los archivos del asistente anterior se conservan sin agregarle otro acceso al Inicio.
- Se retiraron las preferencias de avisos de Excel, publicación y mantenimiento de Configuración, y el botón separado de enviar aviso de prueba. La verificación técnica del proveedor se integra en Comprobar estado, sin notificación visible.

Los seis archivos públicos retirados son avisos.html, generacion_agenda.html, js/notice-center.js, js/notices-page.js, js/notices-store.js y css/notices.css. Sus copias de dist/ se excluyen. Las pruebas de navegador v4.1 que dependían de esos módulos se sustituyen por las pruebas vigentes v4.2; sus resultados históricos continúan en entrega/v41. El informe de archivos relaciona también esas retiradas de pruebas.

## Presentación y plantilla

Se reducen botones, iconos, títulos y rellenos en los estilos compartidos existentes. Inicio usa tres accesos compactos; el resumen de registros/archivo/publicación es una franja secundaria y las conexiones y herramientas administrativas se despliegan en apartados pequeños. Los controles de sincronización mantienen sus identificadores y conexiones.

La plantilla conserva su encabezado, copia e impresión y presenta información general con los contactos del ejecutivo, programación de servicios y observación. Los datos del ejecutivo se obtienen exclusivamente del registro seleccionado; los faltantes indican No registrado.

El emparejamiento prioriza las etiquetas reales del horario: por ejemplo, un horario que contiene REFRIGERIO busca su descripción por ese nombre, aunque las descripciones estén en otro orden. Si no hay etiquetas y las celdas contienen igual número de líneas, se conserva la correspondencia de esas líneas paralelas. El caso de un único servicio conserva toda su descripción multilínea; una descripción compartida se mantiene compartida. Si no existe correspondencia clara, no se asigna una descripción arbitrariamente: el texto pendiente se muestra explícitamente como detalle del origen. Se conserva el orden de los horarios.

Se inspeccionaron los campos HORARIO AYB y DESCRIPCION ALIMENTACION y el importador que conserva los encabezados adicionales del libro. No se recibió un libro nuevo de la operación con otra estructura; no se afirma haber validado un archivo que no se adjuntó. Se generaron XLSX reales únicamente para pruebas de compatibilidad. La función original buildAgenda se conserva sin cambios, así como la impresión original de Eventos y Minuta.

Las observaciones siguen editándose mediante la copia local explícita que ya existía en 4.1: guardado confirmado, saltos de línea, rol y comparación de versión/origen. No se anuncia escritura en Excel ni Firebase, cuya integración de escritura sigue pendiente.

## Alimentación

El navegador y el worker permiten solamente notificaciones visibles de alimentación. Se retiran avisos de Excel, publicación, actualización de agenda, fin, próximos eventos y prueba. El backend de verificación conserva su comprobación de aceptación del proveedor, pero el worker no muestra su mensaje de prueba.

Cada aviso utiliza la fecha y hora del servicio menos 900000 ms, en America/Bogota; excluye cancelados, falta de empresa/alimentación y horas inválidas. Se admite 12:00 M y 12 M como mediodía. La descripción del servicio usa la misma correspondencia del modal. Se conserva la deduplicación por evento/servicio y el recibo del worker. El planificador no es un recordatorio recurrente cada quince minutos.

Se detectó además un caso real: la comprobación de una publicación sin cambios renovaba su frescura, pero no volvía a revisar un aviso pendiente si los eventos no habían cambiado. Se añadió un evento de frescura de esa comprobación, consumido por el recordatorio existente; no se duplican consultas ni se modifica la publicación. Se probó que un aviso bloqueado por datos antiguos se vuelve a evaluar al renovar la comprobación.

Se mantiene el mecanismo de notificaciones nativas y el backend Push ya existente. Con la aplicación abierta exige el permiso/contexto y una publicación reciente; con la aplicación cerrada depende del servicio real y de la compatibilidad del dispositivo. La URL Push sigue sin configurarse en esta entrega de referencia; no se promete recepción con la app cerrada ni se añade infraestructura. Para usar la mejora de correspondencia en el proveedor existente, actualizar también functions/food-alerts-core.mjs junto con su despliegue habitual.

## Actualizaciones reales y navegación de retorno

La base 4.1 ya disponía de descarga completa, SHA-256, versiones anterior/activa, coordinación de pestañas y protección de edición. Se conserva ese mecanismo. La causa de que no se aplicara automáticamente era que solo ofrecía el candidato para aplicación manual; tampoco publicaba progreso/tiempos ni tenía una preferencia persistente y retorno seguro de la página de versiones.

4.2 permite aplicación automática por defecto cuando todas las pestañas están seguras. Si existe texto o una operación pendiente, mantiene el trabajo y avisa. La página de Actualizaciones muestra versión activa, candidato, conexión, última comprobación, archivos efectivamente verificados y marcas reales de inicio/finalización/duración. Se presenta progreso determinado solo para el conteo medido de archivos; las fases no medibles son indeterminadas.

La aplicación de la versión con clientes 4.2 coordina los votos, protege las pestañas, muestra una cuenta desde 00:10 hasta 00:00 y espera al menos diez segundos. La activación y recarga solo continúan con una versión completa. Un conjunto de pestañas que cambia durante la preparación cancela la transición. Fallos de recursos no invalidan la versión estable, y los trabajos de descarga dejan de anunciar progreso tras un error. Sin red se recupera el registro activo existente y sus recursos guardados.

Guardar y regresar persiste y confirma la preferencia automática y vuelve a una página permitida del mismo sistema. Se descartan orígenes externos, rutas desconocidas, login y la propia página de versiones; el destino de respaldo respeta el ámbito móvil o de escritorio. No se borran almacenes para actualizar. Se conserva la reversión a una versión completa anterior.

Limitación de migración: un cliente 4.1 que ya está abierto no puede ejecutar retroactivamente el contador nuevo. El primer salto mantiene el protocolo compatible anterior; después de cargar 4.2, las transiciones siguientes sí muestran los diez segundos. La migración en el alojamiento del usuario y la pantalla de un cliente antiguo físico no se comprobaron en producción. La guía indica comenzar en una ruta conocida y conservar el trabajo; no propone borrar datos del sitio.

## Login, sesiones y seguridad de navegación

Se corrigió la aceptación directa del parámetro return del login: ahora solo admite rutas conocidas del sistema, compatibles con rol y ámbito. El login es centrado, con usuario, contraseña, mostrar/ocultar, mensaje breve y carga real durante la validación. Desaparece la espera artificial de bienvenida. Se conservaron PBKDF2, hashes, sal, usuarios, contraseñas y roles; las pruebas comprobaron que no cambiaron.

Agenda Móvil usa una sesión local separada rptMobileAuthSessionV1, validada con los usuarios y dispositivo existentes, y un contexto de pestaña. La sesión de escritorio conserva rptAuthSessionV1. Una pestaña móvil no hereda autorización administrativa por existir una sesión de escritorio: intentar una ruta administrativa lleva al login móvil y la autenticación vuelve a Agenda Móvil. No se modificó Firebase Authentication ni se crearon perfiles nuevos.

Se comprueban revocación, usuario activo, dispositivo y expiresAt cuando existe, al entrar y al reanudar. No se impuso un tiempo de caducidad inventado a las sesiones heredadas sin vencimiento. La prueba de expiración utiliza un vencimiento explícito. Se cerró y reabrió un proceso Chrome con perfil de prueba y se conservaron datos y ambas sesiones en sus ámbitos.

Las cuentas siguen siendo locales al navegador. La validación de rutas se realiza en la lógica, además de los controles visuales; no convierte la publicación pública de la agenda o los HTML estáticos en datos privados del servidor. Las reglas y permisos Firebase se conservan íntegros y siguen gobernando sus operaciones reales.

## Preloaders y conservación

Se reutilizan las esperas de los módulos y se unifica el indicador para carga inicial, login y operaciones que realmente están marcadas como ocupadas: lectura Excel, publicación, exportación de Minuta y guardado de observaciones. Las rutas de éxito/error liberan su estado. El bloqueo global se reserva para aplicar una actualización; no se agrega una demora artificial a cada acción.

Permanecen las conexiones de Excel/Firebase, las hojas/encabezados, reglas/índices, filtros, usuarios, configuración, validación, laboratorio, mantenimiento, caché, Minuta, Coworking y Ctrl+Q. El generador original se conserva. No se agregaron bibliotecas de ejecución.

## Pruebas y estado

CORREGIDO Y VERIFICADO: retiradas, tres accesos originales, filas de Eventos sin controles añadidos, correspondencia de servicios incluso en orden distinto, observación local, credenciales/roles, separación móvil y bloqueo de rutas, expiración explícita, retorno/preferencia, carga con error, alimentación exclusiva/deduplicada, renovación de frescura, actualizaciones manuales y automáticas reales, cuenta de diez segundos, dos pestañas, rechazo de corrupción, restauración, funcionamiento offline, reapertura real de Chrome y 75 combinaciones responsive (15 páginas, cinco anchos). La consulta de 1000 eventos utiliza 25 filas y no reconstruye la tabla ante veinte señales iguales. El valor temporal local es orientativo y está en PRUEBAS.json.

La comparación de Eventos, Minuta, Coworking y vistas/detalles de Agenda Móvil conserva los datos de la referencia. Las impresiones de Eventos y Minuta se rasterizaron a 120 dpi y sus píxeles coinciden exactamente por SHA-256. Ctrl+Q conserva mañana de Bogotá y TODAS las filas Coworking, incluidas fechas anteriores, posteriores y sin fecha; se verificaron PNG completos y escenarios de compartir/cancelar/error con destinos controlados.

IMPLEMENTADO, PERO NO VERIFICADO EN PRODUCCIÓN: migración desde un navegador instalado del usuario, instalación física iOS/Android y recepción Push/WhatsApp en un dispositivo real. PENDIENTE: escritura de observaciones en la fuente Excel/Firebase, que no se simula ni se solicita configurar para usar la consulta. DEPENDENCIA EXTERNA: Firebase real y backend Push con sus credenciales, URL y despliegue; se probaron contratos, errores y proveedores con servicios controlados. No se enviaron mensajes físicos ni se modificaron datos reales para probar.

Los resultados completos y sus límites están en PRUEBAS.json. CAMBIOS.json y ARCHIVOS_MODIFICADOS.csv enumeran archivos modificados/nuevos/retirados; MANIFIESTO_SHA256.json verifica el contenido completo salvo su propia huella. La guía vigente detalla publicación desde dist/, retirada de archivos en alojamientos que no eliminan ficheros antiguos y recuperación con el ZIP 4.1. El proyecto no se desplegó durante esta intervención.
