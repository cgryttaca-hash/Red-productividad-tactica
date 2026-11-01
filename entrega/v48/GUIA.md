# Gestión de Eventos 4.8 — Activación y actualización

Entrega del 1 de noviembre de 2026 · America/Bogota. Continúa sobre 4.7 sin reconstruir el sistema. Esta guía define el alcance actual; las de entregas anteriores quedan como historial.

## Antes de publicar: autorizar el primer equipo

La opción confirmada por el usuario es autorizar el primer equipo desde la consola de Firebase. Después se gestionan los demás desde Ctrl + M. La aprobación remota de dispositivos es una incorporación solicitada en esta entrega: los registros antiguos no se aprueban automáticamente por tener `revoked: false`.

1. En el mismo proyecto Firebase existente, publica primero las reglas incluidas en `firestore.rules`. Desde la carpeta del proyecto puede utilizarse `firebase deploy --only firestore:rules --project ID_DEL_PROYECTO_EXISTENTE`. Sustituye el identificador por el real de la configuración existente; no crees otro proyecto ni cambies credenciales. Revisa que Firebase Authentication tenga habilitado el proveedor Anónimo utilizado para la identidad de los equipos y que el dominio actual esté autorizado.
2. Publica el contenido de `Publicacion-Eventos-4.8.zip` en la misma dirección del sitio, sin carpeta intermedia y sin mezclar archivos de versiones. Conserva `.gitattributes` y `.nojekyll`. No borres datos del navegador.
3. Abre el sitio 4.8 en el navegador que será el primer equipo administrador. Aparecerá «ACCESO NO AUTORIZADO», con un identificador y estado pendiente. No debe abrir Excel ni pedir configuración de publicación.
4. En Firestore abre el documento pendiente existente de `equipos_autorizados/IDENTIFICADOR_MOSTRADO`. Conserva `schema: 2`, `authUid` y `deviceId` iguales al identificador del documento. Cambia únicamente `status` a `approved` (texto), `authorized` a `true` (booleano) y `revoked` a `false` (booleano). No modifiques la colección de usuarios ni crees otra cuenta local. No uses un registro antiguo cuyo identificador empiece por `device_`.
5. Vuelve al sitio. El listener recibe la aprobación; también puedes pulsar «Comprobar autorización». Inicia sesión con tu cuenta local actual. La autorización del equipo no concede un rol administrador.
6. Con esa cuenta administradora, pulsa Ctrl + M e introduce su contraseña actual. En Conexiones, reutiliza la cuenta propietaria de Firebase ya existente cuando haga falta. Luego abre Dispositivos para autorizar o revocar las solicitudes de otros equipos. Para modificar estados en Firebase se necesita esa conexión propietaria, además de la validación local.

Si el primer equipo ya está vinculado al Archivo Maestro, el mismo origen y perfil conservarán su referencia. Si el estado muestra un error de validación, revisa conexión, proveedor Anónimo, reglas y configuración del proyecto; no lo soluciones borrando datos del navegador. Los otros equipos deben generar su propia solicitud pendiente al abrir el sitio.

## Excel y Firebase ya configurados

El sistema recupera la referencia persistida al mismo Archivo Maestro y consulta su permiso de lectura sin abrir un selector. Continúa con la lectura y sincronización existentes. No sustituye el Excel de la PC por una copia en Firebase. La cuenta propietaria de Firebase conserva su persistencia habitual y no abre su formulario al iniciar.

Cuando falta el permiso de lectura, el aviso «Recuperar permiso» solicita al navegador acceso al mismo archivo. No cambia la vinculación ni la autorización del equipo. Si el archivo fue eliminado/movido o falta la referencia guardada, se informa el problema real; revisa la vinculación desde Ctrl + M. La selección, sustitución y configuración manual permanecen dentro de Administración.

## Sin conexión y revocación

Un perfil que ya recibió aprobación puede usar la caché existente sin red, con su última decisión confirmada para ese UID. Una identidad nueva no puede tomar la aprobación de otra. Al recibir una revocación se detiene la página y se vuelve al bloqueo; ese estado queda conservado también sin red. Sin conexión no puede conocerse una revocación emitida posteriormente por el servidor: se comprobará al reconectar.

Usar otro navegador, modo incógnito, otro dominio o borrar almacenamiento crea otro equipo. Las reglas del registro impiden autoaprobarse. La publicación continúa siendo un sitio estático con las reglas de eventos existentes; esta intervención no vuelve privados los archivos ya publicados ni elimina datos descargados anteriormente.

## Presentación y conservación

Los preloaders de las 16 páginas siguen la preparación efectiva, muestran iconos de la misma familia y permiten reintentar los errores. Excel, Firebase y validación de acceso conservan estados de proceso. No se añaden pausas decorativas ni porcentajes supuestos. Los iconos de encabezados y módulos cambian solo en pantalla.

Se conservan usuarios, contraseñas, roles, procesamiento Excel, alimentación, horarios, filtros, Minuta, impresión, Coworking, Agenda Móvil, notificaciones y el núcleo de actualización. No se crea un módulo de Facturación inexistente; se conserva el medio de pago actual.

## Archivos de la entrega

- `Eventos-4.8-Completo.zip`: proyecto completo, reglas, herramientas, pruebas, backend anterior y documentación.
- `Publicacion-Eventos-4.8.zip`: únicamente los archivos estáticos preparados. No despliega las reglas por sí solo.
- `Recuperacion-Eventos-4.7.zip`: ZIP anterior intacto, para recuperar el código. No reemplaza un respaldo de datos del navegador.
- Informe, archivos modificados, pruebas y capturas en `entrega/v48`.

Versión esperada: 4.8.0, 181 recursos verificados. Los ZIP se comparan byte por byte con sus fuentes y se verifican por CRC. No edites recursos después de generar sus huellas.

No se ha publicado automáticamente ni se han desplegado reglas. Tras aplicar los pasos anteriores, comprueba la autorización del primer equipo, acceso a los demás, lectura/guardado del Excel real, impresión y uso móvil en la instalación operativa.
