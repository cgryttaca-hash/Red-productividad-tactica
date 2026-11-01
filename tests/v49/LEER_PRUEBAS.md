# Pruebas de recuperación 4.9

Los resultados ejecutados están en `entrega/v49/pruebas`. Se utilizan perfiles, datos y libros de ensayo. No se publica el sitio ni se utilizan credenciales operativas.

Se necesita Node 22 o superior y las dependencias de desarrollo de la raíz. Playwright usa sus navegadores instalados o `CHROME_PATH` para un ejecutable de Chrome. Las pruebas móviles iPhone/iPad utilizan WebKit. Opcionalmente pueden indicarse `PLAYWRIGHT_PATH` y `PLAYWRIGHT_BROWSERS_PATH` con las rutas correspondientes.

Para comparar con la versión funcional, configura `ORIGINAL_PROJECT_PATH` con una copia intacta de 4.6.0 extraída del ZIP original. Para reproducir el bloqueo anterior, configura además `BROKEN_PROJECT_PATH` con la carpeta de una copia intacta de 4.8.0. No se modifica ninguna de esas referencias.

En `package.json` se encuentran los ensayos de acceso, impresión/conservación, núcleos de datos, sincronización en segundo plano, carga, presentación, móvil, alimentación, PWA sin red, migración, actualización automática, integridad, reapertura y recuperación desde 4.8. `npm run check` comprueba sintaxis y huellas.

## Firebase y Excel con reapertura real de Chrome

Desde `emulator/`, instala sus dependencias de desarrollo y ejecuta `npm test`. El ensayo compila el SDK Auth 12.16.0 de prueba y usa únicamente Auth Emulator en `127.0.0.1:9098`, con el proyecto ficticio `demo-rpt-devices`. Sus datos de cuenta son ficticios y no son credenciales de producción. El XLSX y su handle persistido en OPFS son reales; Firestore/publicación y la pérdida del permiso de lectura se adaptan en memoria. No se abre ni se modifica el Excel del usuario.

## Recuperación de una PWA bloqueada en 4.8

`test:recovery-48` instala realmente el worker 4.8, reproduce la falta de confirmación de Firebase y ofrece 4.9 desde el servidor local. La descarga directa inicial se controla con `Network.setBypassServiceWorker` de Chrome. No se eliminan almacenamiento, cachés ni registros del perfil para provocar la recuperación. Se comprueba el acceso posterior con el worker normal y la conservación de datos. Los pasos necesarios para el usuario se documentan en la guía de entrega; el ensayo no equivale a una instalación física en producción.

Los ensayos históricos se conservan en sus carpetas de versiones anteriores; los comandos actuales corresponden a 4.9. Las dependencias de emulador, los perfiles temporales y el SDK de ensayo compilado no forman parte del sitio estático.
