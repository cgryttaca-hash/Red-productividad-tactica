# Pruebas limitadas a Agenda y sus atajos

Con Node 22 o superior y Playwright instalado, configura `ORIGINAL_PROJECT_PATH` con una copia intacta de 4.9.0. Opcionalmente utiliza `PLAYWRIGHT_PATH` para la ruta al paquete y `CHROME_PATH` para Chrome.

- `node tests/v491/agenda.cjs`: conservación de recursos, Ctrl + W cuando se entrega a la página, copia/selección, actualizaciones entre ventanas, no modificación del origen, reutilización de ventana y Ctrl + M.
- `node tests/v491/app-window.cjs`: ventana Chrome `--app` de ensayo que debe indicar `display-mode: standalone`, con entrada de teclado por CDP. No instala ni modifica la PWA del usuario.
- `node tests/v491/migration.cjs`: instalación local 4.9 → 4.9.1, dos pestañas, sesión/datos conservados y carga del nuevo manejador por el actualizador existente.
- `npm run check`: sintaxis e integridad de la entrega.

Los datos son de ensayo. No se utiliza el perfil personal ni se escribe en producción. Los resultados ejecutados están en `entrega/v491/pruebas`.

`native-host.cjs` es un soporte de prueba manual opcional para ventanas temporales. No acredita por sí solo un resultado físico. En esta sesión la autorización de control nativo agotó su tiempo, por lo que las pruebas declaradas usan teclado automatizado por CDP. No se afirma haber pulsado el atajo físico en la PWA instalada del usuario.
