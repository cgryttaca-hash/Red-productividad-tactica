# Informe de entrega · Gestión de Eventos 4.0.0

Base real: `Red-productividad-tactica-main-Minuta-WhatsApp-v2.zip`. Fecha: 29 de octubre de 2026. Zona operativa: America/Bogota.

## Resultado

Se conservaron todos los archivos originales y se ejecutaron **71 grupos de comprobaciones**. Se entregan frontend y backend completos, una carpeta `dist/` para publicar, pruebas reproducibles de actualización/IA, workflows de revisión y publicación con aprobación, configuración sin secretos y restauración documentada.

La identidad premium se aplica en las quince páginas y la Agenda Móvil conserva su núcleo. Los datos, filtros, roles, impresión, fechas y controles originales se verificaron por comparación con la base. Ctrl + Q mantiene mañana en Colombia y **todas las filas de Coworking**. La impresión de Minuta con los mismos datos es idéntica por SHA-256 en las páginas rasterizadas a 180 dpi.

## Actualizaciones y recuperación

Se descargan y verifican 120 recursos locales con SHA-256 antes de ofrecer activación. Una descarga incompleta no sustituye la versión activa. Las pestañas coordinan una comprobación de edición, formularios, importación, publicación y generación de imágenes. Se conservan la versión activa y la anterior, y las pestañas antiguas mantienen su conjunto de recursos mientras lo necesitan. Se comprobó instalación, rechazo de un recurso corrupto, bloqueo por cambios pendientes, actualización real de dos pestañas y recuperación a la anterior sin borrar datos.

La primera migración desde v2 requiere guardar y cerrar las ventanas/pestañas antes de reabrir, porque el worker anterior no entiende el nuevo protocolo. No se pide reinstalar ni borrar datos. La recuperación local cambia archivos de este navegador; la restauración global del servidor y backend se realiza por el operador con una publicación revisada.

## Asistente e IA

La consulta local funciona con los registros reales disponibles y se identifica como sin IA. Incluye filtros, resúmenes, campos incompletos, posibles duplicados, mensajes y reportes copiados/descargables. La integración externa queda desactivada hasta configurar credenciales, modelo, dominio, identidades Firebase autorizadas y App Check.

La IA interpreta una solicitud en un esquema de filtros. Los hechos se construyen desde una publicación completa de Firebase, sin entregar filas al proveedor ni permitir modificaciones de eventos o código. Se envían la pregunta y los filtros que escribe el usuario, por lo que pueden contener información que este introduzca. Hay validación, límite diario por usuario y global, tope de salida, tiempos de espera y registros sin prompts, tokens o datos de clientes. Los errores no se presentan como respuestas reales de IA. Las cuotas cuentan intentos y no sustituyen un presupuesto del proveedor.

El proceso de mantenimiento asistido por IA está separado: propuesta en rama de ensayo, checks, comparación con estable, revisión humana, aprobación, publicación y restauración. Los workflows se entregan, pero las protecciones del repositorio y la ejecución remota requieren configuración del propietario.

## Rendimiento, dependencias y seguridad

Excel se unifica en 0.20.3 y los gráficos se fijan en Chart.js 4.6.1/etiquetas 2.2.0, con copias locales y licencias oficiales. Las copias se compararon contra las fuentes públicas y los archivos usados en pruebas. Un mismo XLSX se leyó en la base y en la nueva versión con resultado idéntico, incluidas fechas, PAX cero, hojas mensuales e identificadores. No se cambiaron nombres de columnas.

El mantenimiento actualiza sus contadores sin reconstruir la lista completa. Se corrigió su hora inicial para el campo local y se escaparon mensajes remotos. El informe de Laboratorio también escapa nombres de hojas y mensajes; un archivo XLSX con HTML en el nombre de hoja se comprobó sin ejecución de contenido. App Check evita inicializaciones duplicadas y permite reintentar un fallo inicial.

La autenticación local histórica y sus permisos se conservan por compatibilidad. Su administrador inicial es conocido y debe cambiarse con los controles existentes; localStorage no es una autorización segura de servidor. La IA exige una identidad Firebase real autorizada y rechaza anónimos. El frontend publicado no contiene una clave de IA ni una clave VAPID privada.

## Pruebas y límites

Se ejecutaron regresiones de Eventos, Minuta/Coworking, Agendas y Agenda Móvil; importación XLSX; impresión; imagen larga de 180 eventos; Web Share y WhatsApp controlados; Chrome y WebKit; 75 revisiones visuales de quince páginas en cinco anchos, además de orientaciones móviles; permisos y estados Push; programación de alimentación a -15 minutos; caché y generación de Minuta sin conexión; seguridad y contrato de IA; activación y reversión de versiones.

El worker, cachés, descargas, imágenes, píxeles y portapapeles se ejecutaron realmente. Firebase, Cloud Tasks, FCM/Web Push y proveedor de IA se controlaron en las pruebas. **No hubo despliegue de producción, llamada pagada a IA, mensaje real de WhatsApp, envío Push real ni prueba física de Android/iPhone.** Los fallos de red durante los ensayos offline son deliberados; la prueba principal no registra excepciones JavaScript ni recursos locales inexistentes.

Falta configurar servicios externos: URL y claves VAPID/backend Push; cuenta/modelo/secreto de IA, UIDs y App Check; hosting HTTPS, entorno de ensayo y reglas de aprobación de GitHub. La instalación física y la recepción deben comprobarse después de configurar servicios. La llegada de Push puede retrasarse por el sistema operativo/proveedor. Las interpretaciones de IA deben revisarse aunque su formato sea válido.

## Archivos originales modificados

No se eliminó ningún archivo. Se modificaron 29 originales y 285 permanecen idénticos. La lista completa con hashes de archivos originales, nuevos y `dist/` está en `ARCHIVOS.json`.

| Archivo | Motivo |
|---|---|
| `CHANGELOG.md` | Historial de esta actualización. |
| `PROTECTED_MODULES.json` | Huellas de los archivos autorizados actualizadas. |
| `README.txt` | Acceso a la nueva guía y publicación segura. |
| `VALIDACION_FINAL.json` | Resultados vigentes y límites de las pruebas. |
| `VERSION.txt` | Versión vigente. |
| `agenda_movil.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `agendas.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `configuracion.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `eventos.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `firebase.json` | Publicación de dist con cabeceras y referencia a las reglas existentes. |
| `functions/.gitignore` | Permite distribuir el ejemplo de configuración de IA sin incluir secretos. |
| `functions/index.js` | Endpoint opcional de IA, sin cambiar las funciones Push. |
| `index.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `js/configuracion.js` | Texto escapado, hora local correcta, contadores selectivos y reconocimiento del guardado. |
| `js/excel-sync.js` | Indica las lecturas/importaciones en curso y las pospone durante la activación. |
| `js/firebase-app-check.js` | Inicialización compartida y recuperación tras un fallo de inicialización. |
| `js/firebase-sync.js` | Protege una publicación en curso y evita iniciarla durante la activación. |
| `js/laboratorio.js` | Escapa el contenido del informe de validación de Excel. |
| `js/pwa.js` | Carga el gestor único de instalación y actualización verificada. |
| `js/system-version.js` | Versión 4.0.0 y huellas actuales de protección. |
| `laboratorio.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `login.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `mantenimiento.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `minuta.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `minuta_compartir.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `offline.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `sw.js` | Manifiesto de recursos verificados, caché por versión, activación segura y recuperación; Push preservado. |
| `usuarios.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |
| `validacion.html` | Tema compartido, metadatos y gestor PWA; navegación o bibliotecas locales según el módulo. Se mantienen controles y reglas existentes. |

## Uso y configuración

Abre `LEER_PRIMERO_V4.md`. `docs/PUBLICACION_V4.md` contiene instalación Android/iPhone, variables, pruebas y publicación; `docs/CONFIGURACION_IA.md`, la integración; `docs/MANTENIMIENTO_IA.md`, el proceso con aprobación; y `docs/RESTAURACION.md`, la recuperación. Publica solo el contenido de `dist/`. Los informes anteriores se conservan como historial; los vigentes están en `entrega/v4` y en `VALIDACION_FINAL.json`.

SHA-256 registrado del ZIP estable de entrada: `1dc9538219293f8a21a6ea7d505cb58b5448ead42dee30451e30e889fa9396bb`. La auditoría inicial registra sus 314 archivos antes de cambios. Se entrega `Version-estable-anterior-v2.zip` reconstruido con esos archivos y verificado contra sus huellas. El archivo ZIP de origen ya no estaba en outputs al cerrar la entrega; la copia original de trabajo conserva todos sus bytes. No hay archivos Excel adjuntos dentro de esa base; se probaron libros XLSX reales generados con las estructuras del sistema. Las imágenes de ejemplo usan datos ficticios de prueba.
