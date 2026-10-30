# Informe de entrega — Gestión de Eventos 4.3.0

Se aplicó el complemento 091a131c-3017-4415-b332-97c0f1f14178 sobre el proyecto completo 4.2.2. Se verificó el ZIP anterior, se creó un respaldo íntegro y se inventariaron sus 562 archivos antes de intervenir. Se trabajó en una copia independiente. No se modificó sources ni se reconstruyó la aplicación.

## Acceso público de Agenda Móvil

Agenda Móvil permite la entrada directa desde su dirección y el inicio de la PWA, sin usuario ni contraseña. Conserva el acceso de lectura de la agenda y el mecanismo anónimo de Firebase que ya existía; no solicita ni crea credenciales locales para la consulta pública.

La pestaña móvil utiliza un ámbito público sin sesión administrativa. Al intentar Inicio, Usuarios, Configuración, Login o Actualizaciones privadas vuelve a Agenda Móvil. Los accesos internos a autenticación/usuarios, importación Excel y publicación Firebase comprueban ese ámbito. Las actualizaciones automáticas de archivos siguen funcionando en la PWA pública; la recuperación manual de versiones corresponde al área privada.

No se borran ni convierten las sesiones existentes. Se probó que la sesión de escritorio y sus usuarios, hashes y roles permanecen intactos al abrir Agenda Móvil en otra pestaña. Los demás módulos conservan sus formularios y autenticación.

El control del navegador se complementa con las reglas originales de Firebase, que mantienen la escritura restringida a su propietario. Las páginas estáticas y el almacenamiento de un mismo origen no constituyen una barrera criptográfica frente a alguien que controle el propio navegador; no se presenta este ajuste como una nueva autenticación de servidor. No se cambiaron las reglas ni Firebase Authentication.

## Campos internos y persistencia de la plantilla

Ejecutivo, Correo y Teléfono son campos de entrada. Cuando no hay información quedan vacíos; se retira el texto predeterminado «No registrado» de esos tres campos. Los datos originales disponibles pueden servir como valor inicial; la edición guardada tiene prioridad, incluidos los vacíos que el usuario deje intencionalmente.

Se amplía la estructura local existente rptEventNotesV1 con los contactos internos de cada evento. No se crea otra base de datos ni se escriben estos cambios en Excel o la publicación Firebase. Se conservan las observaciones anteriores y los identificadores existentes del evento. Para persistir una edición al cambiar los datos del evento se utiliza su identificador estable de importación o su hoja/fila de origen; no se inventan correspondencias entre registros ambiguos sin identidad.

El guardado automático se activa al escribir, usa el bloqueo de escritura existente, confirma la lectura posterior y protege conflictos entre ventanas. Si llegan más caracteres durante un guardado, se guarda también la edición posterior. Copiar y cerrar el modal esperan a que termine el guardado. Un error conserva el texto en pantalla e impide cerrarlo silenciosamente; Guardar ahora permite reintentar.

Las observaciones internas guardadas ya no se sustituyen por el texto de Excel si cambia el origen. La empresa, horario y demás datos originales sí se actualizan. Las autorizaciones existentes para observaciones se conservan: administrador para editarlas; los contactos internos se pueden editar desde una sesión privada autorizada. La consulta pública móvil no accede a estas ediciones privadas.

Se comprobó el cierre/reapertura del modal, recarga y cierre real del proceso de Chrome: los contactos y observaciones guardados reaparecen. La persistencia es de este navegador; no se promete sincronización de esos campos entre dispositivos. No hay escritura de vuelta en la fuente Excel/Firebase.

## Orden y actualización operativa

La vista Agendas presenta primero Segundo piso y después Tercer piso. Reconoce los salones 1, 2, 3, 2+3, completo y combinaciones identificadas por el escenario; los números 301 en adelante se reconocen como tercer piso. Los escenarios no identificables se muestran aparte, sin inventar un piso.

En Segundo piso se ordena por fecha y hora de inicio, conservando el orden de origen en empates. En Tercer piso se utiliza fecha, número real de salón y hora de inicio. Se prueban 301, 302 y 305: el orden no depende de comparar cadenas alfabéticamente. La vista muestra inicio y finalización separados, servicios y estado operativo, además de fecha, empresa, escenario y estado original.

Agenda Móvil aplica la misma comparación en sus grupos de fecha y piso. Los indicadores Próximo a iniciar, En desarrollo y Finalizado se calculan con la fecha/horario del evento en Bogotá; los cancelados se identifican como tales. Una hora incompleta se muestra por confirmar. Los indicadores se revisan mientras la página está visible y sus temporizadores se liberan al salir.

Se conserva la lectura de eventData y los eventos de cambio/almacenamiento del sistema. Una modificación de programación actualiza y reordena la vista sin reconstruir manualmente la agenda ni acumular registros. Agenda Móvil conserva su suscripción existente de Firebase. Se corrigió además que un detalle móvil abierto conservaba datos anteriores: ahora se actualiza con el evento recibido o se cierra si el registro deja de existir.

## Alimentación completa

Se centralizó la lectura de las variantes de horarios y descripción de alimentación: espacios, acentos, A&B/A/B/A Y B y grupos numerados. El importador conserva grupos numerados y concatena celdas repetidas relacionadas en lugar de reemplazar una por otra. Los cambios afectan únicamente esa lectura; no se escribe el libro ni se modifican otras hojas, encabezados, fórmulas o estructuras del archivo.

Los horarios se relacionan por nombre de servicio, hora explícita o grupos de columnas. Se conservan cantidades y líneas complementarias de cada descripción. Las líneas paralelas sin etiquetas conservan la convención original cuando las dos celdas tienen igual número de líneas y no existe otra correspondencia explícita. Una relación ambigua se mantiene visible como texto de origen sin asignarla arbitrariamente a una hora. La ausencia de una hora no hace desaparecer la descripción ni genera una notificación con un horario inventado.

Para que una publicación de varias columnas conserve esa relación, se mantienen horarioAyB y descripcionAlimentacion y se añade el campo opcional foodGroups dentro de los eventos publicados existentes. No se crean colecciones. Los lectores nuevos aceptan también publicaciones antiguas sin ese campo. La lógica compartida de alimentación del navegador y functions/food-alerts-core.mjs sigue siendo idéntica.

Se conservan las notificaciones exclusivas de alimentación a menos quince minutos en America/Bogota, las exclusiones de cancelados y los controles de duplicación. Se repitieron las pruebas de coordinación/proveedores con servicios controlados; no se enviaron avisos físicos ni se garantiza recepción con la aplicación cerrada sin el backend configurado.

## Plantilla y copia

Se conservan la plantilla, la apertura desde la fila y las acciones originales de copiar/imprimir. El texto generado contiene fecha, empresa, escenario, horario, personas, horarios AYB, descripción completa, acomodación, pago, observaciones y estado. Incorpora los contactos internos guardados. El contenido se escapa al generar HTML y conserva los saltos de línea en texto plano. No se agregan botones de generación por evento ni páginas nuevas.

## Actualizaciones reales

El worker compara el manifiesto candidato con los recursos de la versión instalada. Las versiones nuevas guardan su manifiesto verificado con la caché completa. Si una versión anterior no dispone de ese registro, se calculan las huellas de sus recursos guardados para obtener una comparación real.

La página existente de Actualizaciones muestra la detección, archivos añadidos/modificados/retirados, cantidades descargadas y verificadas, etapas, recurso en proceso y actividad con horas reales. Las listas se construyen con el resultado del worker y se conservan tras recargar. Los contadores dejan de avanzar al finalizar; no hay porcentajes inventados. Las diferencias describen archivos, no inferencias sobre cambios funcionales que el manifiesto no documenta.

La comprobación automática continúa en todas las páginas, con sondeo de un minuto mientras están visibles y comprobaciones al volver/conectar. La preferencia existente se conserva; está habilitada por defecto. Si fue deshabilitada expresamente, se respeta su configuración. Con actualización automática habilitada no hay que entrar a la página de Actualizaciones ni pulsar Aplicar.

Cuando hay una edición u operación pendiente, se conserva el trabajo. Al terminarla, las señales de guardado/salida de campo permiten reanudar automáticamente. Una versión completa y verificada se aplica con cuenta de 00:10 a 00:00, coordinación de pestañas y confirmación después de recargar. Se mantienen el rechazo de archivos inválidos, diagnóstico, reintento, versión anterior, formato LF antes de SHA-256 y construcción reproducible.

Se probó el temporizador real de sesenta segundos sin pulsar comprobar/aplicar: detectó un candidato desde una página normal de prueba, respetó una edición y activó después ambas pestañas. Se ensayaron expresamente un archivo añadido, uno retirado y uno modificado. Las versiones 7.x y 8.x de esas pruebas son identificadores del servidor controlado, no versiones publicadas al usuario.

## Ctrl+Q y WhatsApp

Ctrl+Q conserva la generación de la Minuta de mañana de Bogotá y la imagen completa con todas las filas de Coworking, incluidas otras fechas o sin fecha. Se añade al mensaje el texto de la propia copia de impresión, con sus saltos de línea, eventos y Coworking.

El enlace existente abre directamente WhatsApp Web y deja de pasar por wa.me, que podía llevar a instalar la aplicación. La opción nativa existente se mantiene cuando el navegador permite compartir archivos con las aplicaciones instaladas. No exige WhatsApp Desktop. Un mensaje muy largo se conserva completo para copiar; el enlace abre Web sin incluir un texto excesivo en la dirección.

Si se bloquea window.open, se muestra un enlace manual que continúa en la misma vista de compartir ya existente. Se probó ese recorrido desde navegador y PWA emulada. El usuario elige el chat, adjunta los PNG cuando corresponda y confirma el envío en WhatsApp. Abrir el destino o el menú nativo no se anuncia como un mensaje enviado.

## Matriz de comprobación del complemento

| Punto | Resultado y evidencia |
|---|---|
| 1. Agenda Móvil sin credenciales | Pasó en contexto limpio, sin crear usuarios ni sesiones locales. |
| 2. Bloqueo de Inicio y rutas privadas | Pasó para Inicio, Usuarios, Configuración, Login y Actualizaciones desde el ámbito público; funciones privadas bloqueadas. |
| 3. Navegador y PWA | Pasó navegador, modo standalone emulado y worker real; instalación física no comprobada. |
| 4. Contactos vacíos y editables | Pasó; sin texto predeterminado cuando faltan datos. |
| 5. Persistencia al cerrar/abrir | Pasó modal, recarga y reinicio real de Chrome con perfil aislado. |
| 6. Segundo piso antes del tercero | Pasó en Agendas y Agenda Móvil. |
| 7. Orden numérico desde 301 | Pasó 301/302/305 y agrupación por salón. |
| 8. Orden horario | Pasó cronología, inicio/final y actualización del orden. |
| 9. Estado operativo | Pasó finalizado, en desarrollo y próximo a iniciar con un reloj de prueba controlado. |
| 10. Alimentación original completa | Pasó nombres variantes, grupos numerados, descripción invertida y texto multilínea; XLSX real generado sin cambiar bytes del libro ni su hoja auxiliar. No se recibió un Excel nuevo de operación. |
| 11. Plantilla completa | Pasó copia con todos los campos requeridos y contactos guardados. |
| 12. Persistencia de ediciones | Pasó guardado automático, vacíos intencionales, conservación ante cambio de origen y recuperación de error. |
| 13. Actualización automática de agenda | Pasó eventData y adaptador de publicación en memoria con red deshabilitada; también actualiza el detalle móvil abierto, sin duplicar filas. |
| 14. Ctrl+Q | Pasó navegador/PWA emulada, texto/PNG/Coworking y alternativa a popup bloqueado. WhatsApp interceptado, sin envío real. |
| 15. Detección/instalación automática | Pasó el temporizador real de un minuto y reanudación tras editar, sin botones de actualización. |
| 16. Diez segundos verificados | Pasó cuenta y espera mínima después de preparar/verificar el candidato. |
| 17. Versión nueva y páginas | Pasó activación de dos pestañas, migración local desde la entrega anterior y verificación del conjunto completo de 130 recursos. |

Además pasaron 75 combinaciones responsive (15 páginas y cinco anchos), cinco modales, uso sin conexión, ocho escenarios de fallo/reintento de integridad, nueve de coordinación/recuperación y las pruebas de alimentación. Con mil registros se renderizan 25 filas; veinte señales idénticas no reconstruyen el DOM. La medición local es orientativa y está en PRUEBAS.json. Se inspeccionaron las capturas de móvil y de Actualizaciones con el reloj real.

Los dos tests antiguos que exigían login móvil se retiraron y sustituyeron por las pruebas de acceso público. Los demás tests aplicables se adaptaron a las funciones expresamente solicitadas. Las suites y límites completos están en PRUEBAS.json; el listado exacto de archivos nuevos, modificados y retirados está en ARCHIVOS_MODIFICADOS.csv y CAMBIOS.json.

## Pendientes y alcance real

No se desplegó esta versión ni se modificaron GitHub, Firebase, cuentas, datos de producción o WhatsApp. Las pruebas de publicación utilizan servidores locales y adaptadores controlados; en la prueba de actualización de datos en vivo se deshabilitó además la red. No hubo escrituras remotas. La prueba física de una PWA instalada en iOS/Android y la recepción real de Push/WhatsApp siguen sin ejecutarse.

El guardado de campos internos es local al navegador. El libro de operación nuevo no fue adjuntado. Publicar esta entrega y comprobarla con los datos y dispositivos del usuario sigue siendo el paso de operación pendiente. La guía explica el despliegue completo, el archivo opcional compartido del backend y la recuperación sin borrar datos.
