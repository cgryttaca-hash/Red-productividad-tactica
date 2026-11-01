# Gestión de Eventos 4.9 — Recuperación del acceso y navegación

Fecha: 1 de noviembre de 2026 · America/Bogota. Intervención sobre una copia de 4.8, comparada con el funcionamiento de 4.6 y con los archivos 4.7 inmediatamente anteriores al bloqueo. Las dos referencias permanecen intactas; se verificaron sus huellas antes y después del trabajo.

## Causa del bloqueo

La intervención 4.8 incorporó `device-access.js` en las 16 páginas. Ocultaba e inhabilitaba el contenido y consultaba el registro de equipos de Firebase antes de cargar los scripts de cada módulo. Esos scripts se habían convertido en elementos inertes `application/x-rpt-protected`. Si no se confirmaba Firebase, no se resolvía la autorización: no se cargaban los módulos, los controles originales ni el gestor de actualización. El error informado por el usuario se reprodujo con una 4.8 instalada en la prueba local.

En 4.9 se retira esa dependencia completa. Se vuelven a cargar directamente los mismos recursos y a utilizar el acceso local anterior. No se sustituye el mensaje de error por otro ni se concede aprobación automática en Firebase.

## Restauración aplicada primero

- `js/auth-guard.js`: restaurado al control local anterior, sin esperar una promesa de autorización de equipo.
- `js/excel-sync.js`: restaurado al archivo previo al control nuevo. Se retiran las funciones de persistencia/recuperación incorporadas en 4.8 y sus condiciones por equipo. Conserva el handle, almacén IndexedDB, selector, lector y sincronización anteriores, con configuración manual mediante Ctrl + M.
- `js/firebase-sync.js`: restaurado a su archivo previo al control nuevo. No exige aprobación del equipo para publicar; conserva configuración, credenciales, conexión propietaria, transformaciones y publicación existentes. La configuración manual permanece en Administración.
- `js/eventos.js` y `js/minuta.js`: restaurados a la inicialización previa, sin depender de `RPTPageInit` del bloqueador. La lógica de datos se compara con 4.6.
- `js/device-registry.js` y `js/device-heartbeat.js`: conservados con su contenido previo al control nuevo; el heartbeat deja de cargarse en todas las rutas. No se inicia registro ni vigilancia remota de equipos para abrir los módulos.
- `firestore.rules`: restaurado exactamente a 4.6. La comparación demuestra que el único bloque que 4.8 había alterado era `equipos_autorizados`. Los demás bloques de eventos/publicación son iguales.
- Las 16 páginas dejan de referenciar `device-access.js` y su CSS y recuperan sus scripts normales. No se borran cuentas, sesiones, documentos o referencias al Excel.
- `js/page-start.js` y `js/loading.js` dejan de esperar clases/señales del control nuevo. Se conservan la presentación, mensajes y estados de carga existentes, sin introducir otro sistema de autorización.

Los cuatro archivos nuevos `js/device-access.js`, `js/device-approval-store.js`, `js/device-admin.js` y `css/device-access.css` se trasladan a `entrega/v49/codigo-retirado/v48` con sus bytes originales. Se conservan para trazabilidad y no están en los recursos del sitio estático. No se eliminó su información ni se modificó la copia de referencia 4.8. No se consultan sus decisiones guardadas ni se borra su almacenamiento para forzar el acceso.

`RESTAURADOS.json` detalla cada restauración, su versión de origen, huella y coincidencia con 4.6. Los archivos Excel/Firebase de 4.7 conservan los límites manuales de Ctrl + M anteriores al bloqueo; sus núcleos de lectura, guardado y publicación coinciden con 4.6. No se afirma que todos los archivos completos sean idénticos a 4.6: se mantienen los estilos y las señales de carga que ya existían antes de esta recuperación.

## Organización visual posterior

El Centro Operativo conserva sus tres accesos existentes, sin barra lateral: Agenda de Eventos, Minuta y Agenda Móvil. En Super Administrador se ajustan `administracion.html`, `js/technical-center.js` y `css/technical-workspace.css` para mostrar exclusivamente **Archivos y conexiones**, **Actualizaciones** y **Log interno**, con pestañas compactas y presentación adaptable.

Firebase y Excel conservan sus controles anteriores dentro del primer apartado; Actualizaciones conserva el gestor existente; Log interno muestra las entradas existentes de solo lectura. Se retiran del menú los accesos adicionales, sin borrar sus archivos, procesos o datos. Mantenimiento conserva su controlador/panel interno y sus reglas de funcionamiento, sin una opción adicional en el menú solicitado. No se crean secciones, indicadores, estadísticas ni datos ficticios.

## Conservación verificada

32 archivos críticos permanecen idénticos por SHA-256 a 4.6, incluidos usuarios/autenticación local, permisos administrativos, alimentación, consultas, configuración Firebase, impresión base, manifiestos, Push, backend y núcleo de integridad. Seis bloques completos de lectura/normalización/guardado Excel, transformación/publicación Firebase, filtros/representación de Eventos y lógica de Minuta coinciden con 4.6.

Se compararon filtros, fechas, consultas, vista previa, contenido y geometría de impresión de Eventos y Minuta, y la edición/persistencia de Coworking. La alimentación indicada por el usuario se conserva literalmente en los perfiles móviles, incluidos los textos repetidos originales. Las funciones preexistentes ajenas al alcance conservan sus archivos y dependencias. No se modifican las credenciales ni se incorporan integraciones nuevas.

## Pruebas ejecutadas

Resultado local: PASS, 18 conjuntos y 158 comprobaciones registradas. Incluyen dos perfiles Chrome aislados, uno con el SDK Firebase inaccesible; los tres módulos principales; Ctrl + M con contraseña válida e inválida; usuario de consulta sin elevación de rol; tres apartados administrativos y log de solo lectura; 80 revisiones de páginas y 15 de secciones en cinco anchos; Excel XLSX real de ensayo y publicación simulada; reapertura real de Chrome y persistencia Auth 12.16.0 en emulador; reconexión mediante el control Excel anterior; cinco perfiles móviles Chrome/WebKit; PWA sin red; migración real local 4.6 → 4.9 con dos pestañas; recuperación de una PWA 4.8 bloqueada; actualización automática y rechazo de recursos dañados.

La prueba de recuperación reproduce «No se pudo confirmar con Firebase», verifica que el gestor 4.8 no se carga, obtiene directamente 4.9, fuerza la comprobación original y confirma el worker activo 4.9. Después abre normalmente la aplicación con sus datos conservados y comprueba Ctrl + M. No se borra almacenamiento para superar la prueba. Durante la validación se comprobó que obtener archivos 4.9 por sí solo no garantiza que la versión instalada haya cambiado: por ello la guía exige comprobar **Versión instalada y verificada: 4.9.0** antes de reabrir normalmente.

La revisión estructural comprueba 90 scripts/backend, 16 páginas, dos manifiestos y 177 recursos con sus huellas. `PRUEBAS.json` y sus evidencias distinguen adaptadores, emuladores y pruebas reales de navegador. `CONSERVACION.json` contiene las huellas y los bloques comparados.

## Archivos modificados de la base, fuera de dist

- `PROTECTED_MODULES.json`
- `VALIDACION_FINAL.json`
- `VERSION.txt`
- `administracion.html`
- `agenda_movil.html`
- `agendas.html`
- `asistente.html`
- `configuracion.html`
- `css/technical-workspace.css`
- `eventos.html`
- `firestore.rules`
- `index.html`
- `js/auth-guard.js`
- `js/device-heartbeat.js`
- `js/device-registry.js`
- `js/eventos.js`
- `js/excel-sync.js`
- `js/firebase-sync.js`
- `js/loading.js`
- `js/minuta.js`
- `js/page-start.js`
- `js/release-info.js`
- `js/system-version.js`
- `js/technical-center.js`
- `laboratorio.html`
- `login.html`
- `mantenimiento.html`
- `minuta.html`
- `minuta_compartir.html`
- `offline.html`
- `package.json`
- `recuperacion.html`
- `release.json`
- `sw.js`
- `usuarios.html`
- `validacion.html`

`ARCHIVOS.csv` incluye modificaciones, añadidos y traslados con huellas. `RESTAURADOS.json` separa las restauraciones del ajuste visual y metadatos generados. Las únicas rutas ausentes de ejecución son los cuatro archivos de bloqueo conservados en el archivo de referencia; tampoco se publican sus copias de `dist`. Las copias 4.6 y 4.8 no se modifican.

## Configuraciones que requieren intervención

Publica el ZIP estático en la raíz correcta de GitHub Pages. Si una PWA sigue mostrando 4.8, consulta la sección de recuperación de la guía: descarga forzada inicial, Ctrl + M → Actualizaciones → Comprobar ahora y confirmación de la versión instalada. No requiere alta ni aprobación de equipos, otra colección o credenciales nuevas.

Solo si se desplegaron las reglas 4.8, restaura `firestore.rules` incluido, idéntico a 4.6, en el mismo proyecto Firebase. Si no se desplegaron, no cambies las reglas del servidor. La entrega no despliega reglas, funciones o el sitio automáticamente.

## Límites

- No se publico 4.9 ni se modifico el repositorio GitHub, reglas o cuentas de produccion. La publicacion del ZIP estatico y, solo si se desplegaron las reglas 4.8, su restauracion son pasos pendientes en la instalacion real.
- El ingreso desde otro computador se ensaya con dos perfiles aislados de Chrome. No se utilizaron dos computadores fisicos ni los perfiles personales del usuario.
- Auth 12.16.0 y su persistencia se probaron con SDK y Auth Emulator reales; Firestore/publicacion usa adaptadores en memoria. No se utiliza ninguna contrasena o cuenta operativa.
- El XLSX, sus cambios y su handle persistente en OPFS son reales. La perdida/concesion de permiso se simula en la prueba; no se abre un Excel operativo ni se prueba el dialogo fisico de un archivo externo del sistema operativo.
- La recuperacion desde 4.8 usa Service Workers y caches reales en HTTP local. La primera descarga que evita el worker viejo se controla con Network.setBypassServiceWorker de Chrome; no demuestra un atajo fisico en produccion. Despues se fuerza la comprobacion existente y se confirma el worker 4.9 antes de la reapertura normal.
- Agenda Movil se verifica en perfiles Chrome/WebKit Android, iPhone e iPad, incluida PWA emulada. No se instalo en telefonos fisicos ni se verifico una entrega real de Push.
- Los registros y cifras de las capturas son de ensayo. El feed publicado sigue vacio y no incorpora datos de esas pruebas.
- Se conserva el inicio local, sus usuarios, roles y contrasenas, y los permisos originales. El identificador local anterior que vincula una sesion con su perfil permanece porque pertenece al acceso original; no requiere una aprobacion en Firebase.
- Mantenimiento, usuarios, configuracion y otros modulos retirados de la navegacion conservan archivos, controladores y datos. El menu no agrega accesos alternativos ni modulos nuevos.
- La aplicacion sigue siendo el sitio estatico original. Retirar el control nuevo restaura su alcance anterior; no cambia credenciales, proveedores ni las reglas de lectura/publicacion de eventos.

## Integridad de entrega

Versión 4.9.0 · 177 recursos · digest `a6307c37f1815d5df7db9416124621fd09954bfe6ac225f1476350be2c82d561`. Los ZIP se verifican por CRC y sus entradas se comparan byte por byte con las fuentes. El ZIP 4.6 original se conserva como recuperación independiente. No sustituye un respaldo de datos del navegador ni del Excel operativo.
