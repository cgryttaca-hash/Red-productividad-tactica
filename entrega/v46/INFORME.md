# Gestión de Eventos 4.6 — Informe de cambios y pruebas

Fecha: 1 de noviembre de 2026 · America/Bogota. Evolución de la copia entregada 4.5.0. No se reconstruyó el sistema ni se publicó en producción.

## Resultado

- Inicio sin columna lateral, con cabecera compacta y tres accesos en filas: Agenda de Eventos, Minuta y Agenda Móvil.
- Administración simplificada a Conexiones, Actividad, Actualizaciones y Mantenimiento, con navegación superior. Estadísticas, calidad, informes, IA sin configurar y laboratorio dejan de ser módulos principales; sus servicios y rutas existentes se conservan para no eliminar funciones ajenas a la solicitud.
- Conexiones reutiliza los motores y controles originales. No se cambian el lector Excel, la publicación, los usuarios, las credenciales ni los permisos.
- Log local cronológico de solo lectura. Un observador registra las fases reales del actualizador sin intervenir en su protocolo. No se añade un sistema de auditoría.
- Actualizaciones muestra estados del gestor real, errores e integridad; conserva detección automática, recuperación, coordinación de pestañas y protección de trabajo pendiente.
- Mantenimiento por módulo con inicio/estimación de fin en Bogotá, mensajes predeterminados o personalizados, escritura parcial del documento existente y confirmación del servidor. Las nuevas programaciones necesitan finalización administrativa; una estimación vencida no acredita un trabajo terminado.
- Página especial de mantenimiento con identidad propia, estado y contador reales; se retiran el porcentaje calculado por tiempo y las etapas ficticias del diseño anterior.
- Eventos, Minuta y Agenda Móvil reciben estilos de pantalla diferenciados. Sus tres HTML, la lógica, el procesamiento de alimentación y los estilos originales de impresión permanecen idénticos.

## Conservación

Se comprobaron 43 archivos críticos idénticos mediante SHA-256. Se compararon también filtros, resultados, Coworking, vista previa y geometría de impresión de Eventos/Minuta contra 4.5.0 en el mismo navegador. La referencia de alimentación mantiene las dos líneas completas y sus repeticiones originales. La versión base permanece sin modificaciones.

## Archivos modificados de la base, fuera de dist

- `VALIDACION_FINAL.json`
- `VERSION.txt`
- `administracion.html`
- `configuracion.html`
- `css/enterprise-refinements.css`
- `css/mobile-operating.css`
- `index.html`
- `js/configuracion.js`
- `js/loading.js`
- `js/maintenance-guard.js`
- `js/mantenimiento.js`
- `js/operating-center.js`
- `js/release-info.js`
- `js/system-version.js`
- `laboratorio.html`
- `mantenimiento.html`
- `package.json`
- `release.json`
- `sw.js`
- `tests/v42/verify-helpers.cjs`
- `tools/build-release.cjs`
- `tools/check-project.cjs`
- `validacion.html`

`ARCHIVOS.csv` enumera exactamente los archivos modificados y añadidos, incluidas las copias de publicación, con SHA-256. `MANIFIESTO_SHA256.json` identifica los archivos finales del proyecto completo. No se elimina ningún archivo de la versión base.

## Pruebas

Resultado local: PASS. 15 conjuntos, 167 comprobaciones registradas, incluyendo 80 revisiones de páginas y 20 de secciones en cinco anchos. Se ejecutaron Chrome y WebKit con perfiles móviles. Los manifiestos, 156 recursos, 88 scripts/backend y 16 páginas superaron sus comprobaciones.

Se probaron la migración real local 4.5 → 4.6 en dos pestañas, instalación/caché/offline, contraseña local, escritura autorizada de mantenimiento, ausencia de permisos para cuentas anónimas, fechas de Bogotá desde otra zona horaria, bloqueo selectivo, estimación vencida, fallo de conexión y retorno tras confirmación. También se comprobaron Ctrl + Q, todas las filas de Coworking, lectura XLSX, sincronización en segundo plano y alimentación en Android/iPhone/iPad emulados.

El actualizador rechaza HTTP 404, HTML en lugar de CSS, archivos truncados, bytes alterados por CRLF y redirecciones; conserva la versión activa, reintenta la misma versión reparada y maneja un HTTP 503 transitorio. Una lectura prematura de la etiqueta del botón en el test se corrigió esperando su actualización asíncrona; no se modificó el protocolo de verificación. Las pruebas de rendimiento excluyen las comprobaciones originales de autorización del dispositivo, que continúan funcionando.

## Límites y validación pendiente

- Firebase/Auth/App Check, publicación, proveedor IA y notificaciones se probaron con adaptadores controlados o con las conexiones externas bloqueadas. No se leyó ni escribió producción.
- Se utilizaron perfiles temporales y libros de ensayo. No se abrió ni modificó un Excel operativo del usuario ni se añadieron eventos de muestra a la publicación.
- Las pruebas móviles usan Chrome y WebKit con perfiles de Android/iPhone/iPad, incluida PWA emulada; no hubo instalación física ni recepción de Push en teléfonos.
- La migración y las cachés sí usaron Service Workers reales en HTTP local, con dos pestañas y espera mínima de diez segundos. No son una publicación en el sitio real.
- El mantenimiento solo se distribuye mediante el documento existente de Firebase cuando la cuenta propietaria está conectada y el cambio se confirma. Sin conexión, los equipos solo conocen su último estado guardado.
- Las programaciones nuevas requieren finalización administrativa confirmada: el final estimado no libera una página. Las programaciones antiguas conservan su vencimiento anterior para no reactivar bloqueos históricos.
- El log es local, de solo lectura desde la interfaz, con hasta 120 entradas; no se presenta como auditoría de servidor ni como almacenamiento inalterable.
- La IA externa permanece desactivada y fuera de la navegación principal. Los servicios y rutas anteriores se conservan sin convertirse en módulos principales.
- Los paquetes se entregan sin publicar el sitio, desplegar funciones, habilitar cuentas, cambiar reglas Firebase ni enviar mensajes de WhatsApp.

## Publicación verificada localmente

Versión: 4.6.0. Recursos: 156. Digest: `ee4f62d61595803d745e3a34315e26e0ab603ff7ac218817944a3dc1ec82bcd0`. Los ZIP se comprueban por CRC y cada entrada se compara con su archivo fuente antes de entregarse. El historial de esta entrega está en `entrega/v46`; los informes anteriores se conservan como referencia histórica.

Referencias de la implementación de mantenimiento: [lectura de documentos Firebase](https://firebase.google.com/docs/firestore/query-data/get-data) y [estado de snapshots y caché](https://firebase.google.com/docs/firestore/query-data/listen). La lectura confirmada utiliza el servidor y evita tratar escrituras locales pendientes como una confirmación.
