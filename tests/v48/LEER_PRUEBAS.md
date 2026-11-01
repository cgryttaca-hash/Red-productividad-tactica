# Pruebas locales de la entrega 4.8

Los resultados ejecutados están en `entrega/v48/pruebas`. Las pruebas no publican el sitio ni usan cuentas de producción. Utilizan datos y libros de ensayo.

Con Node 22 o superior, instala las dependencias de desarrollo de la raíz. Playwright necesita Chrome o sus navegadores instalados. Opcionalmente configura `PLAYWRIGHT_PATH` con la ruta absoluta al paquete Playwright, `CHROME_PATH` con el ejecutable de Chrome y `PLAYWRIGHT_BROWSERS_PATH` con la caché de navegadores. WebKit es necesario para las pruebas iPhone/iPad. Esas variables no forman parte del producto publicado.

Para las comparaciones y migración, extrae el ZIP anterior 4.7 sin modificarlo y configura `ORIGINAL_PROJECT_PATH` con la ruta absoluta a su carpeta del proyecto. `test:core`, `test:preservation` y `test:migration` usan esa referencia. Los demás ensayos se ejecutan sobre este proyecto.

Ejecuta los comandos de `package.json`: `test:devices`, `test:loading`, `test:responsive`, `test:icons`, `test:background`, `test:mobile`, `test:food-display`, `test:installed`, `test:migration`, `test:automatic`, `test:integrity`, `test:core` y `test:preservation`. `npm run check` revisa sintaxis y huellas de publicación. Los adaptadores de Firebase de estos ensayos bloquean servicios ajenos al servidor local.

## Reapertura con Auth real y reglas en emulador

Se conservan las fuentes reproducibles en `emulator/`. Instala sus dependencias en esa carpeta de pruebas y utiliza Java 21 o superior, requerido por la versión del emulador utilizada. Ejecuta `npm test` desde esa carpeta. Prepara una copia exacta de las reglas actuales, compila el SDK de ensayo, inicia Auth en `127.0.0.1:9098` y Firestore en `127.0.0.1:8089`, y ejecuta ambas pruebas. Usa exclusivamente el proyecto ficticio `demo-rpt-devices`.

`rules.cjs` prueba las reglas reales de Firestore. `reopen-real.cjs` utiliza el SDK Auth 12.16.0 y Auth Emulator reales, cierra Chrome y reabre el mismo perfil temporal. El XLSX y su referencia persistida son reales; el registro/publicación de Firestore y la pérdida de permiso se adaptan en el ensayo. Los datos de cuenta incluidos son ficticios y solo existen en Auth Emulator. No son credenciales operativas.

La primera ejecución puede descargar herramientas de emulación. Estas dependencias, Java, perfiles de prueba y el SDK compilado no se incluyen en la publicación estática. Los resultados distinguen lo probado en emulador de lo simulado y de lo pendiente de verificar en la instalación real.
