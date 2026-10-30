# Configurar el servicio Web Push

El proyecto está preparado para registrar suscripciones reales y recibir mensajes push. **El envío de producción permanece sin activar**: no se incluyen ni se inventaron claves privadas, credenciales o direcciones de servicio.

La aplicación estática y sus avisos locales siguen funcionando sin este backend. No se necesita reconstruir los módulos existentes.

## Componentes incluidos

- `js/push-client.js`: permiso explícito, suscripción PushManager, reutilización de la sesión Firebase existente, registro, estado y baja.
- `js/push-ui.js`: estado diferenciado de permiso, suscripción y confirmación del servidor.
- `sw.js`: único service worker; muestra las notificaciones push y abre la Agenda dentro del ámbito autorizado.
- `functions/`: backend para Cloud Functions de Firebase, con las dependencias `firebase-admin`, `firebase-functions` y `web-push` fijadas por versión.
- `firebase.json`: código de funciones aislado llamado `agenda-push`; no cambia el hosting ni las reglas de datos existentes.

La función HTTPS `agendaPush` expone `/config`, `/subscriptions` y `/status`. La función `notifyAgendaPublication` observa el documento ya existente `eventos_meta/publicacion` y envía el aviso después de una publicación nueva. No crea una colección de eventos alternativa.

La única colección técnica nueva es `agenda_push_subscriptions`. Guarda los datos de suscripción necesarios para cifrar el envío, su sesión, el ámbito de la agenda y el último aviso entregado. Los eventos siguen en las fuentes anteriores. El archivo `firestore.rules` original ya deniega por defecto colecciones no autorizadas; verifica que esa protección esté publicada. El frontend no necesita acceso directo a la colección de suscripciones.

## Requisitos externos

- El proyecto Firebase correspondiente, con permisos para desplegar Functions y usar Firestore, Authentication y Secret Manager.
- Node.js 22 para el backend y Firebase CLI en el equipo de despliegue.
- Un plan y servicios de Google Cloud que permitan Cloud Functions y sus costes asociados; comprueba la configuración del proyecto antes de desplegar. [Inicio de Cloud Functions](https://firebase.google.com/docs/functions/get-started?gen=2nd).
- Autenticación anónima habilitada para la agenda pública, conforme al uso existente del proyecto.
- Aplicación publicada mediante HTTPS, con los archivos originales en su mismo ámbito.
- Un par VAPID generado para este servicio y un contacto real del administrador.

No se ha iniciado un despliegue ni se han modificado servicios de producción.

## Preparación

Desde la carpeta `functions`, instala las dependencias:

```powershell
npm ci --ignore-scripts
```

Genera un par VAPID con una herramienta criptográfica real. Este comando muestra el par generado en tu terminal; conserva la clave privada fuera del repositorio y del frontend:

```powershell
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

No se proporciona un par de ejemplo utilizable. No reutilices una clave privada de otro servicio. Este flujo utiliza Web Push estándar; no depende de que el campo anterior `FIREBASE_VAPID_KEY` de FCM esté rellenado.

Crea `functions/.env` a partir de `.env.example` y configura:

| Parámetro | Valor que debe proporcionar el administrador |
| --- | --- |
| `PUSH_VAPID_PUBLIC_KEY` | Clave pública del par recién generado. |
| `PUSH_CONTACT` | Contacto válido, por ejemplo el esquema `mailto:` seguido del correo real del responsable. |
| `PUSH_ALLOWED_ORIGINS` | Orígenes HTTPS exactos, separados por comas, sin ruta final; por ejemplo el origen real de tu GitHub Pages. No utilices `*`. |

Guarda la clave privada en Secret Manager mediante Firebase CLI, desde la raíz del proyecto:

```powershell
firebase functions:secrets:set PUSH_VAPID_PRIVATE_KEY --project red-productividad-tactica
```

El comando solicita la clave. No la escribas en `push-config.js`, `.env`, HTML, Firestore ni archivos de distribución. Las funciones declaran el secreto explícitamente para usarlo en ejecución. [Variables y secretos de Firebase](https://firebase.google.com/docs/functions/config-env).

## Despliegue y conexión del frontend

1. Revisa la región `us-central1` en `functions/index.js` frente al entorno Firebase existente y ajusta ambos exports si corresponde.
2. Desde la raíz, despliega exclusivamente el código de funciones incluido:

```powershell
firebase deploy --only functions:agenda-push --project red-productividad-tactica
```

3. Copia la URL HTTPS que Firebase devuelva para `agendaPush`; no la deduzcas ni inventes.
4. En `js/push-config.js`, rellena únicamente `apiBaseUrl` con esa URL, sin `/config`, `/status` ni `/subscriptions` al final.
5. Publica ese archivo junto con la actualización del service worker. Al cambiar configuración o archivos precacheados después de esta entrega, cambia también la constante `CACHE` para preparar una versión coherente.
6. Abre la PWA instalada y activa sus avisos desde el botón correspondiente.
7. Publica un cambio real mediante el flujo de Excel/Firebase existente y verifica la recepción en los dispositivos.

Se conserva la configuración Firebase del frontend original. El backend valida los ID tokens con Firebase Admin; no acepta una identidad enviada en el cuerpo de la solicitud. [Verificación de ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## Comportamiento y protección

El backend valida el origen, la sesión, el tamaño de la solicitud, el ámbito y las claves de suscripción. Solo admite endpoints HTTPS de proveedores push conocidos; no permite destinos internos arbitrarios. La identidad del documento es un SHA-256 del endpoint, por lo que repetir el alta actualiza el mismo registro. La baja y consulta se limitan a su sesión.

Al recibir una publicación se comprueba que siga siendo la versión actual. Se omiten las suscripciones que ya tienen esa huella entregada; los errores permanentes 400/404/410 eliminan registros inutilizables y los fallos transitorios se reintentan. Las notificaciones usan una etiqueta estable para evitar acumular avisos repetidos. Firestore puede entregar un evento más de una vez y no garantiza el orden; el control de versión contempla ese comportamiento, sin prometer entrega exactamente una vez ante fallos de red. [Eventos de Firestore](https://firebase.google.com/docs/functions/firestore-events).

La librería cifra el contenido con Web Push y autentica el envío mediante VAPID. Debe permitirse la salida HTTPS hacia los proveedores, incluido `*.push.apple.com` para dispositivos Apple. No se sustituye el push por alertas de JavaScript. [Biblioteca Web Push](https://github.com/web-push-libs/web-push), [requisitos de WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Si una suscripción caduca, el navegador la informa como ausente o el proveedor la rechaza. La interfaz permite volver a activarla y comprueba su estado al regresar. No solicita permisos automáticamente. Si se borró la sesión del navegador pero quedó una suscripción antigua, revoca la suscripción desde los ajustes del navegador y vuelve a registrarla; el servidor no permite que otra sesión se apropie de ella.

## Verificación pendiente en producción

Faltan la URL real desplegada, las claves VAPID del administrador y su contacto/orígenes autorizados. Se probaron el flujo del cliente, la API con identidades y almacén controlados, el cifrado real del mensaje y el manejador de recepción del worker. No se ha enviado a APNs/FCM ni se ha comprobado la entrega con la aplicación cerrada en Android, iPhone o iPad.

También deben comprobarse la configuración efectiva de Authentication y Firestore, las cuotas del servicio y la recepción después de cambiar permisos, cerrar la aplicación y reiniciar el dispositivo. Los recordatorios horarios anteriores continúan siendo locales; el nuevo trigger envía avisos de publicación, no inventa una planificación de recordatorios en segundo plano.
