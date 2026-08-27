# Validación 3.4.0

## Resultado

- 15 páginas HTML revisadas.
- 0 referencias locales faltantes en HTML.
- 0 IDs duplicados detectados.
- Todos los archivos JavaScript y `sw.js` pasan `node --check`.
- Todos los CSS pasan comprobación de llaves balanceadas.
- `manifest.webmanifest`, `agenda.webmanifest` y `PROTECTED_MODULES.json` son JSON válidos.
- Los hashes SHA-256 de Eventos y Minuta coinciden exactamente con `PROTECTED_MODULES.json`.
- Caché PWA actualizada a `rpt-shell-3.4.0`.
- Iconos PWA generados en 180x180, 192x192 y 512x512.

## Prueba de navegador automatizada

El Chromium headless disponible en el contenedor no completó el arranque por limitaciones DBus/zygote del entorno. Por ese motivo esa prueba no se marca como superada. Las validaciones estáticas, integridad de recursos y sintaxis sí finalizaron correctamente.
