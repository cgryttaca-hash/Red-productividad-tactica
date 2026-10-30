# Configuración, pruebas y publicación

## Preparar los archivos

Usa Node.js 22 o posterior y pnpm 10.11.0 o una versión compatible con el lockfile 9. La dependencia de pruebas está fijada y el backend mantiene su propio `functions/package-lock.json`.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm check
pnpm test
pnpm exec playwright install --with-deps chromium
pnpm test:updates
```

`build` lee la versión de `package.json`, actualiza las huellas de protección y genera `release.json`, el worker y `dist/`. Para otra versión:

```sh
node tools/build-release.cjs --version 4.0.1
node tools/check-project.cjs
node tools/verify-release.cjs
```

No vuelvas a utilizar una misma versión para contenidos distintos. El nombre de caché incluye también el digest, pero una versión inequívoca facilita el soporte. Publica siempre todos los archivos de `dist/` de una sola construcción. Si modificas HTML, CSS, JavaScript, iconos, manifiestos o configuración después, vuelve a construir. No edites el worker generado a mano.

Los hashes comprueban coherencia y descargas incompletas; la confianza en el publicador sigue dependiendo de HTTPS y de los permisos de publicación. El worker solo sirve recursos publicados por el operador. No ejecuta respuestas de IA.

Las bibliotecas de Excel y gráficos se entregan en `assets/vendor`, con versiones fijas y sus licencias. Excel se unifica en 0.20.3, que ya utilizaba el inicio; no se modifica el parser de columnas. Los hashes se compararon con los archivos oficiales. Firebase mantiene su SDK con versión explícita y requiere conexión para los servicios remotos.

`dist/` contiene únicamente recursos del frontend y el feed público que ya utilizaba el sistema. No contiene backend, secretos, pruebas, documentos ni flujos de GitHub. El feed público conserva su actualización por red y caché de respaldo; no forma parte del conjunto de código inmutable.

## Servir en pruebas

Puedes servir el contenido de `dist/` en localhost con el servidor HTTP de tu preferencia. Usa un proyecto Firebase de ensayo y sus propias identidades, dominios, App Check y variables; no copies contraseñas ni registros reales para generar pruebas. El proyecto de producción configurado en el código se conserva; no se creó ni conectó otro proyecto desde esta sesión.

Los scripts de la entrega incluyen pruebas de actualización reales en Chromium y pruebas de backend sin servicios externos. Los informes adicionales registran las regresiones completas ejecutadas localmente en Chrome y WebKit. Los workflows de GitHub se prepararon, pero no se ejecutaron en una cuenta remota.

## Firebase Hosting

`firebase.json` sirve `dist/`, con revalidación de recursos, `sw.js` y `release.json` sin caché HTTP, y encabezados de tipos y referencias. Se añade la ruta de reglas ya existente; no se amplían sus permisos.

```sh
firebase use TU_PROJECT_ID
firebase deploy --only hosting --project TU_PROJECT_ID
```

Si decides actualizar reglas o backend, revísalos por separado. No despliegues reglas o funciones por accidente al publicar solo la interfaz. Para publicar el backend Push conservado:

```sh
cd functions
npm ci
cd ..
firebase deploy --only functions:agendaPush,functions:dispatchFoodAlert,functions:reconcileFoodAlerts,functions:notifyAgendaPublication --project TU_PROJECT_ID
```

Se requieren las APIs y permisos de Functions, Cloud Tasks, Scheduler, Firestore y FCM, y un plan de facturación compatible. Habilita Firebase Auth según la configuración existente. No se realizó este despliegue desde la tarea.

## Push: variables pendientes

Configura `PUSH_VAPID_PUBLIC_KEY`, `PUSH_CONTACT` y `PUSH_ALLOWED_ORIGINS` en el entorno de Functions y `PUSH_VAPID_PRIVATE_KEY` en Secret Manager. El par VAPID debe corresponder y su clave privada nunca se publica. Configura la URL HTTPS real del backend en `js/push-config.js` y reconstruye la versión. No cambies un par VAPID ya utilizado sin planificar la renovación de suscripciones.

El backend conserva las tareas de alimentación a **hora real menos 15 minutos**, la exclusión de cancelados o servicios sin hora, la caducidad, la idempotencia, el registro de aceptación y la retirada de tokens inválidos. No hay avisos de fin o próximos eventos. FCM usa el mismo worker y mensajes de datos para evitar mostrar dos veces una notificación. El menú solo solicita permiso mediante una acción explícita desde la aplicación instalada.

Una suscripción registrada no equivale a una recepción comprobada. Ejecuta la prueba de envío desde la aplicación instalada después de configurar servicios y verifica el teléfono. El sistema operativo o el proveedor pueden retrasar una entrega; no se garantiza puntualidad absoluta ni se fabrican registros de recepción.

## GitHub Pages con aprobación

Los workflows están en `.github/workflows`:

- `verify.yml`: revisa una propuesta, construye, verifica recursos y ejecuta pruebas de asistente y actualizaciones en Chromium. No publica.
- `publish.yml`: solo se inicia manualmente, requiere marcar la autorización y repetir las pruebas antes de publicar el artefacto `dist/`.

En el repositorio actual, configura Pages con origen **GitHub Actions**, crea el entorno **production** con revisores obligatorios y restringe las ramas que pueden publicarlo. Protege la rama estable exigiendo una propuesta revisada y los checks. Configura también el entorno/proyecto de ensayo con credenciales separadas. Esas reglas requieren permisos de GitHub y **no se configuraron remotamente** durante esta tarea.

No entregues secretos de producción a una ejecución de una propuesta externa ni a un agente de IA. El workflow de publicación no despliega Functions ni lee la clave del proveedor.

## Instalar y actualizar

Android: abre la dirección HTTPS con un navegador compatible y elige **Instalar aplicación** cuando se ofrezca, o la opción de instalación del menú. iPhone/iPad: abre la misma dirección en Safari, usa **Compartir → Añadir a pantalla de inicio** y abre la aplicación desde el icono. La interfaz conserva la guía para Safari y diferencia navegador de aplicación instalada.

Se conservan nombre, ID y rutas de los dos manifiestos para no crear identidades nuevas. Los iconos Android, Apple y maskable tienen dimensiones reales comprobadas. Los controles PWA y el worker se comprobaron localmente; no equivale a una instalación física en todos los modelos de teléfono.

En la primera migración desde Minuta WhatsApp v2, guarda el trabajo, cierra todas las ventanas y pestañas del sistema y vuelve a abrirlo. No borres almacenamiento ni reinstales. En versiones siguientes, el gestor comprueba al recuperar conexión/foco y cada minuto mientras la página está visible; el navegador y el sistema pueden suspenderlo en segundo plano. No comprueba versiones cuando la aplicación está totalmente cerrada. La próxima apertura reanuda el ciclo.

La actualización se descarga con SHA-256 antes de ofrecerse. Todas las pestañas deben confirmar que están listas. La activación bloquea brevemente la edición, recarga las pestañas seguras y confirma la versión de los recursos activos. Una pestaña desconocida, con trabajo pendiente o con un proceso en curso impide la activación. Los formularios pueden descartarse con sus controles existentes o cerrando su pestaña tras guardar lo necesario.

Se conservan la versión activa y la anterior completas; una pestaña que sigue utilizando la versión previa mantiene sus recursos hasta poder recargar. La recuperación local y la global se explican en [Restauración](RESTAURACION.md).

Fuentes: [ciclo del Service Worker](https://developer.chrome.com/docs/workbox/service-worker-lifecycle?hl=en), [instalación PWA](https://web.dev/learn/pwa/installation/), [protección de despliegues en GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).
