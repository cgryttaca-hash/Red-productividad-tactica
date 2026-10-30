# Firebase, FCM y alimentación · instrucciones de esta versión

## Estado de entrega

Código implementado y probado localmente. No hay despliegue efectivo, clave VAPID real ni recepción física verificada en esta sesión. No había Firebase CLI, sesión administrativa ni claves VAPID accesibles. `js/push-config.js` conserva su endpoint vacío y `js/firebase-config.js` conserva la conexión pública original al proyecto `red-productividad-tactica`. No introduzcas credenciales privadas en estos archivos.

## 1. Preparar el proyecto existente

Usa una cuenta con acceso al proyecto real y Node.js 22. Instala Firebase CLI en el equipo de despliegue, inicia sesión y confirma explícitamente el proyecto `red-productividad-tactica`. Conserva Authentication, Firestore y su publicador de Excel. Habilita las API de Cloud Functions, Cloud Run, Eventarc, Cloud Build, Secret Manager, Cloud Tasks, Cloud Scheduler, Firebase Cloud Messaging y FCM Registration si faltan. El administrador debe confirmar la facturación y los permisos correspondientes.

No se crea otro proyecto ni otra colección de eventos. Las nuevas colecciones son técnicas y las administra el backend: `agenda_food_alerts`, `agenda_food_deliveries`, `agenda_food_control` y `agenda_push_logs`, además de la colección previa `agenda_push_subscriptions`. Las reglas suministradas ya cierran el acceso del navegador a colecciones no autorizadas; verifica que esas reglas originales estén publicadas.

## 2. Vincular el par VAPID real

En Firebase Console, abre la configuración de Cloud Messaging y sus certificados Web Push. Verifica la clave pública del proyecto. Esta implementación conserva el envío Web Push anterior como alternativa, por lo que su secreto debe corresponder al mismo par real utilizado por FCM. Si el administrador posee un par ya utilizado, puede importarlo en Firebase con acceso de propietario. Si falta su clave privada, resuélvelo con el responsable del proyecto; no reemplaces ni rotes claves de producción a ciegas. Firebase documenta la generación/importación y el uso de claves públicas en [Configuración Web de FCM](https://firebase.google.com/docs/cloud-messaging/web/get-started).

Desde la carpeta `functions`, instala lo fijado en el archivo de dependencias:

```powershell
npm ci --ignore-scripts
```

Crea `functions/.env` copiando `.env.example` y completa con valores reales:

| Parámetro | Contenido |
| --- | --- |
| `PUSH_VAPID_PUBLIC_KEY` | Clave pública del par asociado a este proyecto FCM. |
| `PUSH_CONTACT` | Contacto real del responsable, con esquema `mailto:` o URL HTTPS. |
| `PUSH_ALLOWED_ORIGINS` | Orígenes HTTPS exactos separados por comas, sin rutas y sin comodines. |

Desde la raíz, introduce la clave privada mediante el diálogo seguro de Firebase CLI:

```powershell
firebase functions:secrets:set PUSH_VAPID_PRIVATE_KEY --project red-productividad-tactica
```

Mantén la clave en Secret Manager. La clave privada no se usa para el envío Admin FCM; se conserva protegida para la alternativa Web Push. El cliente obtiene solo la pública por `/config`. El campo histórico `FIREBASE_VAPID_KEY` no es la fuente utilizada por este nuevo cliente: no dupliques configuraciones.

## 3. Desplegar índices y funciones

```powershell
firebase deploy --only firestore:indexes --project red-productividad-tactica
firebase deploy --only functions:agenda-push --project red-productividad-tactica
```

Espera a que ambos índices de `agenda_food_alerts` estén listos. Si existen otros índices en producción, consérvalos cuando la CLI consulte por recursos que no figuren en el archivo; este archivo añade únicamente los necesarios para las alertas.

Las funciones son `agendaPush`, `notifyAgendaPublication`, `dispatchFoodAlert` y `reconcileFoodAlerts`, todas en `us-central1`. La función de tareas debe conservar acceso autenticado. Comprueba las cuentas de servicio efectivas del proyecto, su acceso a Firestore/Secret Manager/FCM y sus permisos para crear y eliminar tareas, consultar la función destino, actuar como la identidad de la tarea e invocar su servicio de Cloud Run. No supongas el nombre de una cuenta por defecto. La cola se crea al desplegar la función de tareas; `scheduleTime` se establece por alerta. [Cloud Tasks y permisos de funciones](https://firebase.google.com/docs/functions/task-functions).

El despliegue de `reconcileFoodAlerts` crea su programación de un minuto en Cloud Scheduler con zona `America/Bogota`. El envío principal usa la tarea fechada; el barrido periódico recupera y reconcilia trabajo pendiente. No crees un segundo programador manual para la misma función. [Funciones programadas de Firebase](https://firebase.google.com/docs/functions/schedule-functions).

Configura, si procede, limpieza TTL de `expiresOn` en `agenda_push_logs` y `agenda_food_deliveries`; el código guarda fechas a 30 días, pero no activa políticas de retención automáticamente. Los registros de programación conservan el estado y la huella sin copiar los eventos completos. Activa los registros de la cola durante la validación y revisa sus errores e índices pendientes.

## 4. Publicar el cliente

Copia la URL HTTPS real devuelta para `agendaPush` en `PUSH_CONFIG.apiBaseUrl`, en `js/push-config.js`, sin añadir `/config` al final. Publica todos los archivos estáticos juntos en la misma ruta. Excluye `functions/`, secretos y documentos privados del hosting público. `firebase.json` no cambia el alojamiento actual.

No añadas `firebase-messaging-sw.js`: el cliente pasa su registro de `sw.js` a `getToken` del SDK 12.16.0 existente. Se solicitan permisos tras un clic. Al volver a la aplicación o comprobar el estado, el cliente renueva el token y su registro. Desactivar elimina el registro y llama a `deleteToken`. FCM usa mensajes de datos; nuestro único worker interpreta el contenido, aplica caducidad y deduplicación y solicita su visualización, sin un segundo manejador que duplique avisos. Se conserva Web Push para contextos no admitidos por el SDK. [Recepción de mensajes Web](https://firebase.google.com/docs/cloud-messaging/web/receive-messages).

El menú de actualización solicita aceptar la nueva versión. No borres los datos del sitio: contienen sesiones, Excel vinculado y configuración local. Un icono ya instalado puede requerir actualización del sistema o reinstalar el acceso; no se garantiza una pantalla de inicio idéntica en cada dispositivo.

## 5. Programación de alimentación

El origen es la publicación actual de `eventos_meta/publicacion` y sus `agenda_chunk_*`, verificados por versión, huella y cantidad. No se utiliza una copia alternativa de eventos. Una publicación incompleta se rechaza y se reintenta; no se envía con bloques mezclados.

- Se exige identificador estable, empresa real, descripción de alimentación y fecha/hora válidas en `horarioAyB`. Nunca se usa `horarioEvento` para deducir la alimentación.
- Identificadores duplicados con datos contradictorios se rechazan para no avisar por la empresa equivocada. Los campos muy extensos se abrevian con puntos suspensivos en la notificación; la hora se conserva y el detalle completo sigue en la agenda.
- Se interpreta `HH:mm` de 24 horas o con AM/PM. Cada línea, punto y coma, barra o coma seguida por otra hora puede registrar un servicio. En un rango se usa su inicio; su final no se convierte en otra alimentación. Horarios sin interpretación válida se registran para corregir en el Excel.
- La tarea se fija en hora de alimentación menos 15 minutos, `America/Bogota`. Cada servicio a distinta hora tiene su alerta. Servicios simultáneos del mismo evento se agrupan y se conservan sus descripciones reales.
- Se programan tareas con un horizonte de 28 días; las fechas posteriores permanecen pendientes hasta entrar en ese horizonte. Cada nueva publicación reconcilia, sustituye o cancela trabajo. El despacho vuelve a validar el evento, su estado, generación y versión publicada.
- La ventana de envío/visualización termina a los 45 segundos de la hora prevista de alerta. Una tarea retrasada no envía un aviso viejo. El texto siempre muestra la hora real; evita prometer «en 15 minutos» cuando hubo demora. Esta decisión favorece puntualidad frente a avisos tardíos.
- Una reserva transaccional por alerta/dispositivo evita solicitudes duplicadas, incluso con tareas simultáneas. Un rechazo explícito de cuota puede reintentarse dentro de la ventana. Un resultado de red desconocido queda como `unknown`; no se reenvía a ciegas. Si un proceso se interrumpe tras reservar, puede perderse ese aviso antes que duplicarlo.
- El worker comparte recibos persistentes con la alternativa local. Si no puede comprobar esos recibos, descarta el aviso de alimentación. El respaldo local solo opera con la agenda visible, datos confirmados recientes y sin registro remoto activo; no sustituye la programación de fondo.

Las notificaciones de finalización y de agenda del día siguiente se retiraron del código móvil. No había funciones de ese tipo en el backend incluido. No se inspeccionaron tareas de un despliegue externo; el administrador debe revisar cualquier automatización ajena a este ZIP antes de publicar.

## 6. Aceptación en dispositivos reales

En el entorno de pruebas, publica un evento de ensayo identificado con empresa y servicio de prueba, con alimentación al menos 20 minutos en el futuro. No alteres eventos reales para simular resultados.

1. En Android instala desde Chrome/menú del navegador; en iPhone/iPad compatible abre Safari → Compartir → Añadir a Inicio, y abre la aplicación instalada. Web Push en Apple requiere una app de Inicio y iOS/iPadOS 16.4 o posterior. [WebKit: Web Push para apps de Inicio](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
2. Comprueba logo, icono, filtros, detalle, actualización, rotación, regreso desde segundo plano y consulta sin red.
3. Concede permiso mediante el botón y activa avisos. Comprueba el registro `transport: fcm` y el token en el backend sin publicarlos en capturas.
4. Confirma en la cola la hora exacta de la tarea: alimentación menos 15 minutos en Bogotá. Prueba con la app cerrada y con el teléfono bloqueado.
5. Revisa `agenda_food_deliveries`: `requested` es un intento reservado; `accepted` indica aceptación del proveedor, con su identificador. Ninguno demuestra recepción. Anota por separado la recepción física y su hora observada.
6. Prueba cambio de horario, cancelación, retirada de alimentación, dos servicios, pérdida de red, token revocado y reapertura desde el aviso. Una solicitud ya aceptada no puede retirarse del dispositivo; conectividad y sistema operativo pueden retrasar o impedir la recepción.
7. Confirma que no llegan avisos de finalización o próximos eventos y que no hay duplicados. Conserva evidencias por dispositivo y versión de sistema.

Estas pruebas físicas y el despliegue siguen pendientes; las evidencias incluidas corresponden a código y navegadores locales.
