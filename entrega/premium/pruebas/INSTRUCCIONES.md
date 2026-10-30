# Repetir las pruebas locales

Los resultados de esta entrega están en `../evidencias/`. Los datos de ensayo identifican empresas ficticias y no se publicaron en Firebase. Las pruebas de Firebase, Cloud Tasks, FCM, PushManager y permisos utilizan servicios controlados; no demuestran recepción en teléfonos. Chrome ejecuta un service worker e IndexedDB reales para comprobar caché y reservas de avisos.

Se usaron Node.js 24.22.1, Playwright 1.62.1, Sharp 0.35.5, Chrome 155 y WebKit 26.5 en Windows. El backend conserva Node.js 22 como destino. Sus dependencias se instalan con `npm ci --ignore-scripts` dentro de `functions/`.

Desde la raíz del proyecto, configura rutas absolutas para `ACTUAL_PROJECT_PATH` (esta carpeta), `ORIGINAL_PROJECT_PATH` (ZIP anterior extraído), `TEST_OUTPUT_PATH` (carpeta nueva para resultados) y `TEST_VENDOR_PATH`. Esta última debe contener los cuatro archivos indicados, con sus huellas, en `DEPENDENCIAS_PRUEBAS.json`.

Instala por separado `playwright@1.62.1` y `sharp@0.35.5`. Define `PLAYWRIGHT_PATH` y `SHARP_PATH` con las rutas de esos paquetes. Define `CHROME_PATH` con el navegador y `WEBKIT_PATH` con el ejecutable WebKit instalado por Playwright. Los valores por defecto que aparecen en los scripts corresponden exclusivamente al equipo de la entrega; las variables permiten ejecutar en otro equipo sin editar el proyecto.

Ejecuta:

```powershell
node entrega/premium/pruebas/tests-food.cjs
node entrega/premium/pruebas/tests-core.cjs
node entrega/premium/pruebas/tests-browser.cjs
node entrega/premium/pruebas/tests-compat.cjs
node entrega/premium/pruebas/tests-premium.cjs
```

`tests-food` usa el código de cálculo compartido, el coordinador y el repositorio real con un almacén transaccional controlado. Verifica horarios, cambios, cancelación, concurrencia, duplicados, reintentos, resultados desconocidos y expiración. `tests-core` carga las dependencias reales del backend, valida la API, construye cifrado Web Push y comprueba los handlers del worker. `tests-browser` compara los flujos con la versión base y prueba Excel, generación/copia/impresión, tamaños y modo offline. `tests-compat` usa perfiles de WebKit y el ciclo de permisos. `tests-premium` verifica iconos, lecturas, bloques reutilizados, FCM, respaldo local y reservas persistentes.

La base comparativa es `Red-productividad-tactica-main-Agendas-PWA.zip`. Las comparaciones no corresponden al ZIP inicial anterior a las mejoras administrativas, que se conserva en el historial. Los scripts necesitan un servidor local accesible para los navegadores. Las pruebas físicas y de infraestructura se realizan después del despliegue siguiendo `../DESPLIEGUE_FIREBASE.md`.
