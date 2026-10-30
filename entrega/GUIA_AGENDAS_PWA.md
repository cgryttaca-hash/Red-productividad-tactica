# Uso de Agendas e instalación móvil

Entrega del 28 de octubre de 2026.

## Generar una agenda

1. Abre **Eventos** y utiliza los filtros y búsquedas habituales.
2. En la empresa del evento seleccionado, pulsa **Generar agenda**. La acción es independiente de las funciones anteriores de la tabla.
3. Revisa la ventana **Agenda del evento**, con empresa, fecha, ubicación y secciones operativas.
4. Pulsa **Copiar agenda** para obtener texto limpio. **Copiar con formato** incluye también HTML cuando el navegador lo admite; conserva una versión de texto plano.
5. Si el navegador bloquea el portapapeles, utiliza **Seleccionar y copiar**. El texto queda disponible para Copiar, Ctrl+C o ⌘C.
6. **Imprimir / PDF** abre un documento independiente del evento. Utiliza «Guardar como PDF» en el diálogo del navegador. Los formatos de impresión de Eventos y Minuta no se sustituyen.

También puedes entrar desde la tarjeta **Agendas** del inicio, buscar una empresa o salón y seleccionar una fecha. Esta lista utiliza los mismos registros locales del sistema. Si no hay información, vincula el Excel desde Inicio.

Abrir, copiar o imprimir una agenda no guarda registros nuevos, no modifica el evento y no cambia su estado. Cada apertura y cada copia recuperan el registro actual por su identificador original. Si fue eliminado o la selección es ambigua, se informa del problema y no se genera otro evento por aproximación.

Los campos faltantes necesarios se indican como «Pendiente de confirmar». Los apartados opcionales sin información se omiten. Solo se incluyen campos operativos conocidos; identificadores internos, claves y metadatos técnicos no se comparten.

## Instalar en Android

1. Abre `agenda_movil.html` desde la dirección HTTPS de tu sistema.
2. Usa **Instalar Agenda Móvil** cuando el navegador lo ofrezca, o «Instalar aplicación» / «Añadir a pantalla de inicio» en su menú.
3. Abre **Agenda** desde el icono instalado.
4. Pulsa **Activar notificaciones** para conceder el permiso. El permiso se solicita después de esta acción, nunca al cargar la página.

Los recordatorios locales de alimentación y finalización conservan su lógica: se ejecutan con la agenda abierta. Conceder el permiso no implica, por sí solo, recibir avisos en segundo plano.

## Instalar en iPhone o iPad

1. Abre la misma dirección HTTPS en **Safari**.
2. Pulsa **Compartir** y **Añadir a pantalla de inicio**. Si aparece la opción **Abrir como app web**, actívala.
3. Confirma el nombre y abre **Agenda** desde su icono.
4. Dentro de la aplicación instalada, pulsa el botón de notificaciones y acepta el permiso si el dispositivo lo ofrece.

Web Push requiere capacidades reales del navegador y del dispositivo. En iPhone y iPad está disponible para aplicaciones añadidas a Inicio desde iOS/iPadOS 16.4; el permiso debe seguir una acción del usuario. La aplicación comprueba estas capacidades y también reconoce el modo independiente y los iPad que se identifican como un Mac. [Documentación de WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

No se exige descargar una aplicación de una tienda. Una pestaña normal de Safari y una aplicación abierta desde Inicio no tienen necesariamente las mismas capacidades o almacenamiento.

## Activar los avisos en segundo plano

1. El administrador debe completar `DESPLIEGUE_PUSH.md` y publicar la configuración.
2. Abre la sección **Instalación y avisos** de Agenda Móvil.
3. Pulsa **Activar avisos push**.
4. El estado solo pasa a activo cuando existe una suscripción del navegador y el servicio de envío confirma su registro.
5. **Comprobar estado** vuelve a consultar y sincronizar esa suscripción. **Desactivar avisos push** la elimina del servidor y del navegador.

Un permiso bloqueado se cambia desde los ajustes del sitio o de la aplicación; no se repite automáticamente la solicitud. Si el backend aún no está configurado o no responde, el estado lo indica y no presenta el servicio como activo.

El nuevo backend envía avisos al publicarse una versión nueva de la agenda en Firebase. Los recordatorios horarios anteriores continúan siendo locales; esta entrega no los presenta como recordatorios programados en un servidor.

## Sin conexión y actualizaciones

Después de abrir la aplicación con conexión, sus recursos y la última agenda consultada pueden recuperarse desde las cachés existentes. La pantalla informa de los problemas de conexión. Sin una consulta previa no se inventan eventos ni se descarga información nueva sin red.

El mantenimiento vigente guardado en el dispositivo se sigue respetando en desconexión. El permiso de instalación y notificaciones se mantiene como requisito de acceso original; un dispositivo sin esas capacidades no se muestra como compatible.

Las versiones nuevas se preparan en una caché completa. Si aparece **Hay una actualización disponible**, guarda el trabajo y pulsa **Actualizar**. No borres los datos del sitio: contienen usuarios, vinculación del Excel y datos locales. Para la primera actualización desde versiones antiguas, cierra y vuelve a abrir la aplicación si el navegador mantiene una pestaña anterior.

Se probaron Chrome y WebKit de escritorio con perfiles de iPhone/iPad. No se ha probado instalación física ni recepción real de push en un teléfono; esas comprobaciones deben completarse en los dispositivos de trabajo.
