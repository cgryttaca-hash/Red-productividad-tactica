# Pruebas de la corrección

Se usaron Node.js 24.22.1, Playwright 1.62.1, Sharp 0.35.5, Chrome 155 y WebKit 26.5 en Windows. El backend mantiene Node.js 22 como destino. Los datos de ensayo y claves efímeras se usan solo en pruebas locales; no se publican en Firebase.

Instala las dependencias del backend con `npm ci --ignore-scripts` en `functions/`. Para pruebas de navegador, instala Playwright por separado y su motor WebKit. Los cuatro archivos externos de ensayo se describen en `DEPENDENCIAS_PRUEBAS.json`, conservado desde la entrega anterior.

Define rutas absolutas mediante estas variables: `ACTUAL_PROJECT_PATH` para la carpeta del proyecto actual, `ORIGINAL_PROJECT_PATH` para el ZIP premium anterior extraído, `TEST_OUTPUT_PATH` para una carpeta nueva, `TEST_VENDOR_PATH` para las cuatro bibliotecas de ensayo, `PLAYWRIGHT_PATH`, `CHROME_PATH` y `WEBKIT_PATH` para sus paquetes y ejecutables. Los valores de respaldo de los scripts describen únicamente el equipo donde se ejecutó la entrega.

Desde la raíz:

```powershell
node entrega/correccion-pwa/pruebas/tests-food.cjs
node entrega/correccion-pwa/pruebas/tests-core.cjs
node entrega/correccion-pwa/pruebas/tests-backend.cjs
node entrega/correccion-pwa/pruebas/tests-browser.cjs
node entrega/correccion-pwa/pruebas/tests-flow.cjs
```

- `tests-food`: cálculo y coordinación de alimentación, cambios, cancelación, idempotencia y vencimientos.
- `tests-core`: cifrado real Web Push, API autenticada, handlers del worker, manifiestos y caché; Firebase se controla localmente.
- `tests-backend`: ejecuta el código real de la configuración, almacén, API y proveedor con Firestore/FCM controlados; prueba aceptación, fallos, concurrencia, renovación y VAPID incorrecto.
- `tests-browser`: compara la lógica operativa con la versión anterior, importa XLSX, prueba copia e impresión, tamaños y consulta offline.
- `tests-flow`: verifica ausencia de permisos/tokens antes de instalar, consentimiento explícito, estados, envío de prueba, doce páginas en cinco tamaños, WebKit y actualización real del worker sobre un servidor local con ambas versiones.

Los archivos de `evidencias/` y `RESULTADOS.json` contienen los resultados de esta entrega. Las capturas utilizan eventos ficticios identificados para prueba; los archivos de datos del sistema permanecen iguales. Las comparaciones de impresión rasterizan los PDF de Eventos/Minuta para comprobar igualdad de píxeles.

Las pruebas no usan el emulador ni infraestructura productiva de Firebase. Chrome ejecuta el registro, la actualización y la caché reales del service worker local. Los perfiles de WebKit simulan iPhone/iPad y la condición instalada; no demuestran una instalación o recepción en hardware físico. La aceptación física debe completarse siguiendo `../DESPLIEGUE_Y_PRUEBA.md`.
