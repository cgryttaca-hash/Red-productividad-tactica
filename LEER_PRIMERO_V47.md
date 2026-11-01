# Gestión de Eventos 4.7 — Guía de la actualización controlada

Entrega del 1 de noviembre de 2026 · America/Bogota. Continúa desde la versión 4.6 existente.

## Alcance confirmado

Se conserva la seguridad y el acceso actuales, según la aclaración posterior del usuario. La activación o sustitución manual de Excel/Firebase queda dentro de la sesión administrativa validada con Ctrl+M, sin controles ni modales técnicos al inicio. Las fuentes previamente vinculadas conservan la sincronización automática. No se añade autorización remota de dispositivos ni se cambia el acceso público/sin conexión de Agenda Móvil.

No se requiere crear cuentas, cambiar contraseñas, modificar reglas de Firebase ni habilitar un servidor nuevo para esta entrega. El registro de dispositivos anterior se conserva. No se incorporan bloqueo de dispositivos nuevos, pantalla de 60 segundos o nuevas facultades administrativas.

## Activar o cambiar el Archivo Maestro y Firebase

1. Inicia sesión con tu cuenta administradora local actual.
2. Fuera de un campo de texto, pulsa Ctrl + M e introduce su contraseña actual.
3. Abre Conexiones. Los controles de Excel y Firebase permanecen cerrados hasta que los pulses.
4. Vincula o cambia el Archivo Maestro mediante su control original. La lectura y sincronización conservan su funcionamiento anterior.
5. Conecta Firebase mediante la cuenta propietaria existente cuando sea necesario.

Inicio no muestra estos controles ni abre formularios automáticamente. El botón de vinculación que ya existe en Eventos indica que la operación se realiza en Super Administrador; conserva el resto de las acciones de esa página. Las fuentes ya conectadas siguen comprobando cambios automáticamente.

## Carga, estilos e iconos

Cada página dispone de un estado de preparación y un icono propio de una familia SVG local. Los procesos muestran mensajes específicos, incluidos «Validando acceso», «Cargando Agenda de Eventos», «Cargando Minuta», «Cargando Agenda Móvil», «Estableciendo conexión» y «Preparando Archivo Maestro de Eventos».

El preloader se retira al completarse la preparación de la página y sus controles existentes de acceso/mantenimiento. No se añade una espera mínima decorativa. Los procesos que exponen una carga real mantienen su aviso mientras están ocupados. Un fallo de preparación permite reintentar; no se representan porcentajes inventados. Los estilos se aplican en pantalla y conservan la impresión.

## Actualizaciones sin recarga manual

La versión 4.7 comprueba el worker cada 30 segundos mientras la página está visible y tiene conexión, y reactiva la comprobación al regresar del historial. También observa instalaciones que ya estaban iniciadas cuando terminó el registro del worker. No crea otro Service Worker.

Cuando encuentra una versión íntegra, muestra el aviso existente. La activación conserva las preferencias actuales, la protección de formularios/Excel/publicación y la coordinación entre pestañas. Se mantienen los diez segundos mínimos del protocolo de activación y la versión anterior recuperable.

Una pestaña 4.6 cuyo temporizador ya quedó detenido puede necesitar reabrirse una vez para instalar la corrección. No es posible sustituir retroactivamente el código que ya está ejecutando esa pestaña. Desde 4.7, el sondeo se reanuda sin esa recarga manual. El navegador puede limitar la frecuencia de las comprobaciones en segundo plano.

## Publicación

`Eventos-4.7-Completo.zip` incluye proyecto, herramientas, pruebas, backend anterior y documentación. `Publicacion-Eventos-4.7.zip` contiene únicamente el sitio estático preparado. `Recuperacion-Eventos-4.6.zip` conserva íntegramente el ZIP anterior; no sustituye un respaldo de los datos del navegador.

Publica el contenido del ZIP de publicación en la ubicación actual del sitio, sin una carpeta intermedia. Conserva juntos `index.html`, `sw.js`, `release.json`, `css`, `js`, `assets` y `data`, e incluye `.gitattributes` y `.nojekyll`. No mezcles versiones ni edites recursos después de generar sus huellas. No borres el almacenamiento del navegador.

La versión esperada es 4.7.0 con 177 recursos verificados. No se ha publicado automáticamente ni se han desplegado servicios. Tras publicar, revisa tus agendas reales, Ctrl + Q, impresión, el acceso a los controles mediante Ctrl + M y la detección de una publicación posterior dejando una página abierta.

El informe y las pruebas están en `entrega/v47`. Los documentos de versiones anteriores se conservan como historial; esta guía define el alcance de 4.7.
