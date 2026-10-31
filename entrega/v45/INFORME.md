# Informe de entrega — Gestión de Eventos 4.5.0

30 de octubre de 2026 · America/Bogota.

Se aplicó el último prompt adjunto sobre el proyecto real 4.4.0. Se inventariaron y verificaron sus 628 archivos y dependencias, se creó una copia independiente y se conservó el ZIP previo íntegro. No se modificó `sources`. Se respetó la instrucción posterior: **no modificar Minuta ni Agenda de Eventos**. Se mantuvo la cuenta administradora local actual para Ctrl + M.

## 1. Alimentación: causa y corrección

El recorrido real es: importación Excel existente → registros de `eventData` → publicación Firebase con `foodGroups` y campos originales → normalización/caché móvil → presentación. No se cambiaron columnas, hojas, lector Excel, publicador Firebase, colecciones ni datos del evento.

Se reprodujo un error en la asociación anterior: cuando la primera descripción comenzaba por el nombre del primer servicio, la función `pairFoodServices` absorbía las siguientes líneas sin nombre coincidente como continuación de ese primer servicio. Con dos horarios y dos descripciones paralelas, «PASTEL POLLO Y JUGO» terminaba bajo el café de las 7:00 y el refrigerio de las 9:30 quedaba sin esa descripción. Además, el `span` móvil no preservaba visualmente los saltos de línea, por lo que varias líneas aparecían concatenadas.

La corrección añade `presentFoodServices`, una proyección de lectura usada por el renderizado móvil. Respeta filas paralelas cuando su correspondencia no contradice una hora o nombre explícito. Los bloques con correspondencia inequívoca conservan cantidades y descripciones multilínea. El texto sin asociación segura sigue visible como información del origen sin horario asociado; no se inventa una hora ni se absorbe bajo el primer servicio. Si las líneas ya vienen completas en una sola celda, se muestran completas. Se evita repetir por concatenación una descripción que ya está íntegra al final de la misma línea, sin eliminar palabras repetidas dentro del texto original.

La referencia confirmada por el usuario se muestra y copia así:

```text
7:00 AM ESTACION DE CAFÉ ESTACION DE CAFÉ SENCILLA
9:30 AM - REFRIGERIO AM PASTEL POLLO Y JUGO
```

Estas cadenas solo son una referencia de prueba/documentación, no datos fijos incorporados a la agenda. No se ha convertido «ESTACION DE CAFÉ ESTACION DE CAFÉ SENCILLA» en otro nombre ni se han completado menús supuestos. El caso se verificó tanto con las dos líneas completas como con su estructura paralela de horario y descripción, y con la forma publicada `foodGroups`.

Para respetar Minuta/Eventos, **no se sustituyeron ni alteraron** `eventFoodServices`, `pairFoodServices`, `foodFields` o `parseFoodTimes`. Se comprobó igualdad de sus funciones y resultados frente a 4.4. La nueva presentación es independiente de sus contratos existentes. Los avisos toman el texto de la proyección correspondiente al horario ya calculado; se conservaron los identificadores, fechas, horas, vencimientos y regla exacta de −15 minutos en Bogotá. No se agregaron categorías de avisos ni notificaciones de cierre o próximos eventos. La cancelación, deduplicación, colas y proveedor existentes no cambiaron.

**Límite del contraste:** el usuario suministró las dos líneas esperadas, pero no un libro operativo nuevo con todas sus filas. Se verificó ese caso y otros casos estructurales aislados. No se afirma haber leído un Excel de producción que no estaba disponible. El archivo público incluido conserva su lista vacía original.

## 2. Conservación explícita de Minuta y Agenda de Eventos

Los HTML `eventos.html`, `minuta.html` y `minuta_compartir.html`, sus controladores y estilos, los módulos de impresión/imagen/compartir y los contratos de alimentación que consumen permanecen idénticos a 4.4. La nueva hoja de estilos no se carga en esas páginas. `index.html` también permanece idéntico y conserva únicamente los tres módulos operativos.

Una comparación de ambas versiones en el mismo navegador obtuvo resultados idénticos para filtros, empresa, pago, fechas, alimentación, vista previa, impresión de Eventos, fecha/navegación de Minuta, Coworking editable/persistente y estilos/geometría de impresión. Ctrl + Q conserva PNG a color, texto completo, saludo horario y todas las filas de Coworking. Se probaron navegador y PWA emulada, WhatsApp Web y alternativa cuando se bloquea la apertura de la ventana; no se enviaron mensajes.

Se conservó la lógica existente de orden por piso/horario/número de salón, estado operativo, contactos en blanco cuando faltan y guardado automático local. Los contactos y observaciones continúan en el almacenamiento local anterior; no se añadió escritura al Excel ni a Firebase. El lector de Excel y el publicador Firebase están íntegramente conservados por SHA-256.

## 3. Centro de control bajo demanda

`administracion.html` ahora presenta **SUPER ADMINISTRADOR — CENTRO DE CONTROL**, con las siete secciones solicitadas. Las secciones se montan una sola vez y solo una es visible. Las consultas de análisis usan la fuente local existente, con caché del JSON y de su normalización; no crean una base de datos alternativa.

| Sección | Comportamiento |
|---|---|
| Resumen | Eventos de hoy, próximos desde mañana, PAX registrado, servicios con horario, distribución por piso/estado y próximos registros disponibles. Los estados originales se conservan. |
| Estadísticas | Hoy, semana de lunes a domingo, mes, año y rango personalizado en Bogotá; eventos por fecha/mes/estado, PAX/promedio/evolución, empresas, espacios y servicios/horarios reales. Se renderiza solo la categoría elegida. |
| Asistente IA | Reutiliza el asistente original, con acciones rápidas para resumen, consultas, datos incompletos, duplicados, estadísticas y preparación de mensajes. No se presenta la consulta local como una respuesta de IA. |
| Calidad de datos | Revisa campos importantes, PAX válido, alimentación incompleta y duplicados por fecha/empresa/horario/escenario. Pagina 50 revisiones para evitar pantallas pesadas; nunca corrige o elimina automáticamente. |
| Informes | Diario, semanal, mensual, por empresa, salón, servicios y operativo. Texto/CSV descargables y copia; cifras calculadas, criterios y fuente visibles. Se separa claramente la redacción de IA. |
| Sistema | Paneles originales de Excel/Firebase, actividad y página de actualizaciones. Versión instalada obtenida del worker realmente verificado. |
| Administración | Usuarios, Configuración, Validación Excel y Laboratorio originales. No se reintrodujeron las páginas retiradas anteriormente. |

PAX se presenta como personas registradas/programadas, porque la fuente no acredita asistencia real. Cero PAX se conserva como cero; ausencia, cantidades ambiguas o no válidas se indican como no disponibles. No se calcula una tasa de ocupación sin capacidad/disponibilidad reales. Los posibles duplicados se mantienen en los conteos, claramente indicados como registros para revisión. Los horarios de alimentación se agrupan por su hora/minuto real, sin redondearlos a una hora inexistente. Con un único período se muestra la cifra compacta y se informa que no puede evaluarse una tendencia.

Las secciones administrativas verifican autorización antes de leer/exportar. La ruta `asistente.html` se conserva y ahora requiere la misma revalidación del área administrativa. No se crean credenciales ni roles. La contraseña introducida se comprueba mediante el PBKDF2 local existente, sin guardarla en claro ni registrarla. Se mantienen revocación, cierre de sesión y vigencia del permiso original de la pestaña. La protección conserva el alcance de una autenticación local; no es una validación nueva de servidor contra quien controle su propio navegador.

## 4. Sincronización y rendimiento

Sin fuente vinculada, Inicio y Resumen no cargan motores, gráficos o IA innecesarios. Si ya existe una fuente vinculada, el centro mantiene **los motores originales** de Excel/Firebase trabajando en segundo plano, con sus controles dentro de Sistema y ocultos en Resumen. Al abrir Sistema se reutilizan esos mismos motores y controles; no se reimportan scripts ni se duplican listeners. Los detalles de actividad se refrescan únicamente cuando Sistema está visible.

Se verificó un XLSX real de ensayo con un handle persistente del almacenamiento privado del navegador. Tras volver a Resumen, modificar ese libro y activar el foco, el lector existente actualizó los datos y las cifras automáticamente; el publicador existente actualizó el adaptador Firebase en memoria. No se abrió Sistema ni se importó manualmente para recibir ese cambio. Después se confirmó que los controles aparecían una sola vez y que leer no había alterado los bytes del libro. También se generaron veinte avisos repetidos de fuente vinculada sin duplicar scripts.

Comparación local frente a 4.4: Inicio mantuvo **95 nodos** y pasó de **74.086 a 74.120 bytes** de subrecursos del documento: 34 bytes por incluir Asistente en los controles de ruta protegida. No se añadió una dependencia de gráficos o IA a Inicio. Es una medición sin fuente vinculada, con caché/contexto nuevos y sin contar HTML, tráfico de producción o precarga del Service Worker. El instalador PWA conserva la verificación completa de los 149 recursos para uso offline; los módulos diferidos no se ejecutan ni renderizan en Inicio aunque se almacenen durante la instalación.

Una prueba aislada normalizó, calculó estadísticas y revisó **20.000 registros en aproximadamente 2,04 segundos** en el equipo de prueba, sin consultas ni listeners nuevos de Firebase. Se agruparon PAX y duplicados con recorridos acotados para evitar trabajo cuadrático. No se guardó ese conjunto de carga como datos operativos y no se garantiza el mismo tiempo en otro equipo.

No se añadieron bibliotecas de diseño, gráficos, imágenes pesadas, vídeos ni animaciones. Los gráficos usan SVG/HTML accesibles con cifras consultables y descarga de sus datos. Se mantiene el mecanismo de versiones atómicas, SHA-256, finales de línea LF, protección de ediciones, sondeo automático, espera mínima de diez segundos y reversión existente.

## 5. Interfaz y compatibilidad

Agenda Móvil recibió una hoja visual propia: azul marino/corporativo, superficies blancas, divisiones suaves, acento dorado discreto, filas compactas, contraste legible y saltos de línea preservados en alimentación. Su consulta pública, navegación, filtros, caché, PWA, permisos y sincronización no se reemplazaron. Se mantuvieron tamaños táctiles y opción de texto mayor.

Las otras páginas permitidas reciben un ajuste visual acotado por atributo propio. **Minuta, compartir Minuta y Agenda de Eventos quedan excluidas**, conforme a la instrucción posterior del usuario. Inicio ya tenía el diseño operativo pedido y no se alteró. No se copiaron funciones a pantallas de demostración ni se añadieron botones operativos por evento.

Se revisaron las 16 páginas en 1440, 1024, 768, 390 y 360 px: 80 recorridos sin desbordamiento del documento, más 35 vistas de las siete secciones y el modal de Ctrl + M en cinco tamaños. También se ejecutaron Chrome/Android, Chrome/PWA emulada, WebKit/iPhone, WebKit/PWA emulada e iPad. Las dos líneas del usuario se comprobaron tanto visualmente como en el texto copiado. Las capturas incluidas pertenecen a perfiles de ensayo, no a la operación real.

## 6. Resultados de los 23 puntos obligatorios

| Punto | Resultado |
|---|---|
| 1. Comparar origen y móvil | PASS del caso textual confirmado y de ambas formas del registro. Un Excel operativo completo nuevo no estaba disponible. |
| 2. No duplicar textos | PASS: se evita concatenación duplicada; se conserva la repetición real de café. |
| 3. Horarios correctos | PASS: parseo/identificadores/fechas/horas de avisos idénticos; 7:00 y 9:30 conservados. |
| 4. Descripción correcta | PASS: pastel/jugo a las 9:30; asociaciones ambiguas visibles sin hora supuesta. |
| 5. Varios eventos | PASS: líneas paralelas, completas, bloques, cantidades, grupos y horas numéricas de Excel en ensayos aislados. |
| 6. Agenda de Eventos | PASS: resultados e impresión comparados contra 4.4; archivos idénticos. |
| 7. Minuta | PASS: fecha, navegación, Coworking, impresión y compartir conservados. |
| 8. Agenda Móvil | PASS: consulta pública, filtros, detalle, copia, actualización y orden. |
| 9. Agendas | PASS: orden por piso, contactos, observación y actualización del origen. |
| 10. Guardado | PASS: persistencia local, vacíos intencionales y fallo de escritura sin falso éxito. |
| 11. Sincronización | PASS local: XLSX vinculado y publicación simulada, incluso desde Resumen. Producción no contactada. |
| 12. Ctrl + Q | PASS en navegador y PWA emulada, con todas las filas Coworking y límites reales de WhatsApp. |
| 13. Ctrl + M | PASS: contraseña oculta, errores discretos y no activación al escribir. |
| 14. Acceso protegido | PASS: siete rutas, lectura/exportación administrativa, revocación y cuenta operativa sin elevación. |
| 15. Estadísticas | PASS: cálculos contra los registros del perfil de prueba, cero legítimo y ausencia explícita. |
| 16. Fechas | PASS: hoy/semana/mes/año/rango, año calendario, semana Bogotá y rechazo de rango invertido. |
| 17. Gráficos | PASS: cifras derivadas de la fuente, categoría activa, sin datos precargados de ejemplo. |
| 18. IA sin inventar | PASS del contrato simulado: filtros estrictos, cálculo desde la publicación, ausencia explícita y rechazo de campos inventados. Proveedor real pendiente. |
| 19. Consola | PASS: cero excepciones JavaScript de página y recursos locales faltantes en los recorridos. Las advertencias de Node o Service Worker bloqueado pertenecen al entorno de prueba. |
| 20. Consultas | PASS: análisis local sin nuevas lecturas Firebase; motores vinculados conservan sus consultas operativas. |
| 21. Listeners | PASS: cargas únicas y veinte avisos repetidos de fuente, sin duplicación de controles. |
| 22. Carga inicial | PASS: mismos nodos de Inicio, 34 bytes de autorización adicionales y módulos nuevos fuera de su ejecución inicial. |
| 23. Rendimiento | PASS local: análisis bajo demanda y carga de 20.000 filas; módulos operativos comparados sin alteración. |

También pasaron instalación real de Service Worker con 149 recursos, primera apertura diferida de todas las secciones sin red, migración de los archivos reales 4.4→4.5 en dos pestañas con datos/usuarios/sesión intactos, sondeo automático real de 60 segundos, integridad ante 404/HTML/truncado/corrupción/redirect/CRLF, reintento, reversión y ciclo Git real con `autocrlf`. La comprobación estática validó 83 scripts, 16 páginas, dos manifiestos y seis archivos protegidos.

Las suites de actualizador/integridad aíslan la descarga con una página de ensayo y autorización simulada; no demuestran la seguridad del acceso. La autorización real y la migración se prueban aparte mediante el modal de contraseña local. Esa simulación nunca se distribuye dentro del código de la aplicación.

## 7. Configuración externa y límites reales

La IA externa **permanece desactivada y sin URL**, como en los archivos recibidos. Se reutiliza el backend seguro existente: origen permitido, token Firebase, UID autorizado, App Check, cuotas y clave solo en servidor. Se añadió únicamente la acción de estadísticas de lectura; el servidor sigue calculando cifras desde su publicación real, sin enviar filas de eventos al proveedor. La cuenta local no autoriza consumo del proveedor. No se añadieron claves ni modelos inventados. Requiere configurar/desplegar el backend y habilitar la URL del cliente después de sus pruebas; ver `docs/CONFIGURACION_IA.md`.

El servidor de avisos, VAPID y App Check conservan sus campos de configuración recibidos, vacíos donde ya lo estaban. La lógica de avisos se verificó con adaptadores, pero recepción real con aplicación cerrada, permisos en teléfonos físicos y despliegue Push requieren su entorno configurado. No se alteró Firebase de producción, no se accedió a cuentas reales ni se enviaron mensajes. El sitio remoto no se publicó.

Si ya existe un backend desplegado, la corrección del texto de los avisos requiere desplegar también la versión actualizada que incluye `functions/food-alerts-core.mjs`. La acción nueva de estadísticas de IA requiere el backend actualizado de `eventAssistant`. El ZIP de publicación solo actualiza la parte estática; no despliega Firebase Functions. No se ejecutó ese despliegue remoto.

El nuevo CSV/JSON de cambios enumera todos los archivos intervenidos con sus huellas, sin eliminaciones de la base. Las tres filas de los propios inventarios omiten su huella final para evitar autorreferencias. `MANIFIESTO_SHA256.json` verifica todo el proyecto, incluidos CSV y CAMBIOS, excepto a sí mismo; las huellas externas de los ZIP y manifiesto se entregan aparte. Los informes antiguos se conservan como historial.

## 8. Reproducir y publicar

Usar Node 22 o posterior y las dependencias fijadas. Para navegador, instalar Chromium y WebKit de Playwright; alternativamente configurar las rutas del Chrome/WebKit disponibles. `ORIGINAL_PROJECT_PATH` debe apuntar a la copia 4.4 para comparación/migración. Las pruebas usan perfiles efímeros y adaptadores, no servicios de producción.

Comandos actuales: `pnpm build`, `pnpm check`, `pnpm test:food-display`, `pnpm test:food`, `pnpm test:ai-statistics`, `pnpm test`, `pnpm test:center`, `pnpm test:background`, `pnpm test:installed`, `pnpm test:responsive`, `pnpm test:mobile`, `pnpm test:preservation`, `pnpm test:home-performance`, `pnpm test:migration`, `pnpm test:v43`, `pnpm test:sharing`, `pnpm test:updates`, `pnpm test:integrity`, `pnpm test:automatic` y `pnpm test:publication`. La fecha de entrega se fijó mediante `SOURCE_DATE_EPOCH` al día 2026-10-30 de Colombia para esta construcción reproducible.

Publicar solo `dist` o el contenido del ZIP de publicación, manteniendo `.gitattributes` y `.nojekyll`. La guía de entrega describe la revisión posterior. Se entregan proyecto completo, ZIP público, respaldo anterior íntegro, informe, guía, pruebas y lista de archivos; no solo fragmentos.
