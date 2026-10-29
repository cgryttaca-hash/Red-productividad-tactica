# Conectar, desplegar y verificar los avisos

## Estado real

El código actualizado está preparado para instalar la PWA, registrar dispositivos y solicitar al backend una notificación de prueba. Esta sesión no dispone de acceso administrativo a Firebase, una URL confirmada del backend ni el par VAPID real. No se ha desplegado ni enviado una notificación de producción.

Se conserva el proyecto público Firebase `red-productividad-tactica`, su SDK web 12.16.0 y sus fuentes actuales de datos. No cambies esas conexiones para resolver el aviso Push.

## Datos externos que faltan

| Dato o recurso | Dónde se configura |
| --- | --- |
| URL HTTPS real de la función `agendaPush` desplegada | `PUSH_CONFIG.apiBaseUrl`, en `js/push-config.js`. Usa la URL base devuelta por Firebase, sin añadir `/config`. |
| Clave pública VAPID real asociada a ese proyecto FCM | `PUSH_VAPID_PUBLIC_KEY`, en el entorno del backend. El cliente la obtiene desde `/config`. |
| Clave privada correspondiente al mismo par | Secreto `PUSH_VAPID_PRIVATE_KEY` de Secret Manager. El backend conserva la alternativa Web Push; no incluyas esta clave en el cliente. |
| Contacto válido del responsable | `PUSH_CONTACT`, con esquema `mailto:` o URL HTTPS. |
| Orígenes HTTPS autorizados | `PUSH_ALLOWED_ORIGINS`, separados por comas, sin rutas y sin `*`. |
| Servicios, cuenta y permisos efectivos | Functions, Firestore, Authentication, FCM/FCM Registration, Cloud Tasks, Scheduler y Secret Manager del mismo proyecto. |

El campo histórico `FIREBASE_VAPID_KEY` permanece vacío y no es la fuente del cliente actual. Completarlo por sí solo no conecta esta implementación. No se añaden claves de ejemplo utilizables ni una URL supuesta.

Verifica en Firebase Console → configuración → Cloud Messaging los certificados Web Push. Si el responsable ya conserva un par utilizado por esta aplicación, puede importarlo en FCM con permisos de propietario. No rotes claves de producción sin revisar las suscripciones existentes. La documentación de Firebase describe la [asociación de VAPID y el registro Web](https://firebase.google.com/docs/cloud-messaging/web/get-started).

## Despliegue

Usa Node.js 22 y Firebase CLI con la cuenta autorizada. Instala las dependencias fijadas dentro de `functions/`:

```powershell
npm ci --ignore-scripts
```

Copia `functions/.env.example` a `functions/.env` y completa únicamente los valores públicos de entorno enumerados. Introduce la clave privada mediante el diálogo de Firebase, desde la raíz:

```powershell
firebase functions:secrets:set PUSH_VAPID_PRIVATE_KEY --project red-productividad-tactica
firebase deploy --only firestore:indexes --project red-productividad-tactica
firebase deploy --only functions:agenda-push --project red-productividad-tactica
```

Conserva los demás índices existentes cuando la CLI consulte por recursos ajenos a este archivo. Espera a que los índices necesarios estén listos. Verifica las reglas originales que cierran al navegador las colecciones técnicas.

Se mantienen las cuatro funciones `agendaPush`, `notifyAgendaPublication`, `dispatchFoodAlert` y `reconcileFoodAlerts`, en `us-central1`. La tarea debe ser invocada con identidad autenticada; revisa la cuenta efectiva y sus permisos de creación/eliminación de tareas, acceso a datos, secretos, FCM e invocación del destino. No supongas nombres de cuentas por defecto. Consulta [Cloud Tasks para funciones Firebase](https://firebase.google.com/docs/functions/task-functions).

Cloud Scheduler se crea con el despliegue de la función programada; reconcilia cada minuto en Bogotá. Cloud Tasks conserva la hora calculada para cada alimentación. No crees otro programador que repita el mismo trabajo. La [programación de funciones](https://firebase.google.com/docs/functions/schedule-functions) se administra con el despliegue existente.

Publica los archivos estáticos juntos en su misma ruta HTTPS. Excluye `functions/`, archivos de entorno y credenciales del alojamiento público. No publiques secretos. Coloca la URL real obtenida en `js/push-config.js` y verifica `/config` desde un origen permitido.

## Comprobación de configuración

La API `/config` devuelve únicamente información pública. Comprueba `service: agenda-push`, el proyecto correcto y la clave pública. La API informa los nombres de variables faltantes y rechaza un par VAPID incorrecto. CORS solo admite los orígenes configurados; una URL, un origen o unos permisos incorrectos pueden impedir la solicitud. Revisa también los registros del servidor.

El cliente valida la clave antes de habilitar la activación. Un backend que devuelve HTML o una configuración de otro proyecto se muestra como pendiente de corregir. La ausencia de configuración deja el botón de activación deshabilitado; la consulta de la agenda continúa disponible.

## Instalación y autorización

En Android usa el mecanismo «Instalar aplicación» o «Añadir a pantalla de inicio» del navegador. El botón propio se muestra solo cuando el navegador ofrece el evento de instalación. En iPhone/iPad, abre Safari → Compartir → Añadir a pantalla de inicio y después abre el icono. No se ofrece un botón Android ficticio para Safari. El manifiesto, las rutas y el entorno seguro forman parte de los [requisitos de instalación de una PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

Desde el navegador se puede consultar sin conceder permisos. Dentro de la aplicación instalada, pulsa «Activar notificaciones». El permiso se solicita directamente durante ese clic; después se obtiene el token y se registra el dispositivo. La solicitud necesita la [acción del usuario](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static). Instalar la aplicación no concede el permiso automáticamente.

Web Push en iPhone/iPad requiere una aplicación añadida a Inicio y iOS/iPadOS 16.4 o posterior. Si el permiso está bloqueado, habilítalo en los ajustes del sistema/navegador y vuelve a abrir la aplicación. La disponibilidad depende del dispositivo y del contexto; consulta [WebKit: notificaciones para apps de Inicio](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Registro y prueba de envío

La activación confirma el registro y solicita una prueba al backend autenticado `/test`. Esta ruta verifica sesión, origen y propiedad de la suscripción, reserva el intento transaccionalmente y limita repeticiones rápidas a un minuto. Usa FCM de datos o la alternativa Web Push del registro. No se envía una prueba por cada carga o regreso a la app.

- `registered`: el backend guardó el dispositivo; falta verificar el envío.
- `requested`: se reservó un intento de prueba.
- `accepted`: el proveedor aceptó la solicitud, con su identificador. Se puede indicar el registro y envío verificados.
- `failed`: el proveedor no confirmó el envío. Se mantiene un estado pendiente de verificación y se permite reintentar con el botón de prueba.

Un token cambiado invalida la verificación anterior. Al desactivar se elimina el registro y el token correspondiente. Los datos de aceptación no demuestran que un teléfono haya mostrado la notificación: confirma su llegada visualmente. Usa el botón «Enviar aviso de prueba» cuando sea necesario, sin crear publicaciones ficticias ni modificar eventos reales.

## Alimentación

Las reglas del cálculo y la programación anteriores permanecen idénticas: `HORARIO AYB` / `horarioAyB`, 15 minutos antes, `America/Bogota`, empresa/servicio reales, reconciliación y cancelación, reservas por dispositivo y caducidad. No se usa el horario general como sustituto. Las alertas de finalización y del día siguiente continúan retiradas. El filtro «Próximos» sigue disponible.

La ventana de 45 segundos de la versión anterior descarta avisos de alimentación antiguos. El backend programa el intento; el sistema operativo o la red pueden retrasar o impedir la recepción. No se garantiza puntualidad física exacta. Los detalles de generación, estados y recuperación se conservan en `../premium/DESPLIEGUE_FIREBASE.md`.

## Actualización

Hay un único registro de `sw.js`. El nuevo worker precarga los recursos antes de estar listo. La actualización espera la aceptación del usuario y recarga esa página después del cambio de controlador. Las otras ventanas conservan su trabajo. No borres los datos del sitio.

`js/push-config.js` utiliza red primero, con copia de respaldo sin conexión, para que una configuración publicada no quede retenida indefinidamente en la caché. Vuelve a abrir la aplicación después de publicar esa configuración. Los demás recursos de interfaz mantienen la versión coherente del worker.

## Prueba física pendiente

1. Instala en un Android y un iPhone compatibles. Abre desde su icono, verifica los iconos, las rutas y el tema.
2. Activa y confirma la prueba en el teléfono, tanto abierto como bloqueado. Anota dispositivo, versión, hora de solicitud, aceptación del proveedor y hora de recepción observada.
3. Prueba una alimentación identificada como ensayo, al menos 20 minutos en el futuro, dentro de un entorno de pruebas. Comprueba la tarea a −15 minutos y la empresa/servicio correctos.
4. Cambia la hora, cancela el evento y retira alimentación en ensayos separados. Comprueba ausencia de duplicados y de avisos antiguos, de finalización o de próximos eventos.
5. Verifica regreso desde segundo plano, red lenta, pérdida de conexión, apertura desde la notificación y actualización del worker. Contrasta Minuta, Eventos, Excel y formatos de impresión.

Estas pruebas físicas y de despliegue todavía no se han ejecutado. Los resultados incluidos corresponden al código y a navegadores locales con servicios externos controlados.
