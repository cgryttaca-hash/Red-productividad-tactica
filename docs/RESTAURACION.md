# Volver a una versión estable

## Recuperación en un navegador

Abre **Actualizaciones** desde Inicio o `recuperacion.html`. Se muestran la versión activa y la anterior verificada de este navegador. Guarda o descarta el trabajo en todas las pestañas y pulsa **Volver a la versión anterior**. Todas las pestañas deben responder que están listas. El gestor cambia la selección de recursos y recarga; la versión anterior queda activa sin borrar localStorage, Excel vinculado, usuarios, Coworking ni la publicación de Firebase.

La página de recuperación no exige una sesión local para poder recuperar una interfaz con errores de acceso. Solo cambia la caché de este navegador; no permite administrar usuarios, datos, backend ni el servidor. Si no aparece una versión anterior, todavía no se ha completado una actualización con este gestor o el sistema operativo eliminó su caché.

Se probó una secuencia real de instalación, actualización, dos pestañas y reversión en Chromium. La recuperación depende de que el worker y esa página puedan ejecutarse y de que la caché anterior siga disponible. No se promete recuperar cualquier corrupción de almacenamiento o un error incompatible del propio gestor.

## Recuperación global

1. Guarda los cambios operativos y conserva el estado de los datos. Identifica el artefacto y commit estables anteriores. La base de esta entrega es `Red-productividad-tactica-main-Minuta-WhatsApp-v2.zip`, cuyo SHA-256 está registrado en el inventario.
2. Para versiones 4.x compatibles con este protocolo, restaura los archivos fuente estables en una rama revisada, **asigna una versión nueva**, reconstruye `dist/` y ejecuta los checks. No cambies únicamente un número de versión sobre recursos mezclados.
3. Publica el artefacto estable reconstruido mediante el mismo proceso de aprobación. Los navegadores recibirán la versión de recuperación como una actualización normal. Si un navegador eligió una recuperación local, la nueva publicación tendrá otro worker/digest y podrá ofrecerse nuevamente.
4. Si necesitas restaurar directamente el ZIP anterior a este gestor, vuelve a publicar sus archivos íntegros mediante el procedimiento de esa versión. Los usuarios deben guardar su trabajo, cerrar todas las pestañas y ventanas del sistema y volver a abrirlo: el protocolo anterior no comprende los mensajes de activación 4.x. No se debe solicitar desinstalar la PWA ni borrar datos del sitio.
5. La restauración de frontend no revierte Functions, variables, reglas, tareas ya programadas ni documentos de Firebase. Si el incidente afecta al backend, restaura su commit y configuración por separado. Los registros del proveedor y Cloud Tasks deben revisarse antes de reactivar avisos para evitar duplicados.

No se realizó una restauración ni una publicación en producción durante esta tarea. Se conserva una copia de los 314 archivos originales, verificada contra las huellas de la auditoría inicial, y se entrega como `Version-estable-anterior-v2.zip`.
