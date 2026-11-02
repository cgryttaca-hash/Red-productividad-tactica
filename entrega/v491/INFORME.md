# Gestión de Eventos 4.9.1 — Recuperación limitada de Agenda

Fecha: 1 de noviembre de 2026 · America/Bogota. Base 4.9.0 intacta.

## Hallazgo y recuperación

La función solicitada sigue en `agendas.html`. `js/agenda-page.js` organiza los eventos usando la fuente `eventData` y las reglas actuales; `js/agenda-dialog.js` mantiene consulta, selección y copia de texto/formato; `js/agenda-content.js` genera su contenido. Estos archivos no se modifican ni se duplican. Sus lectores y listeners de cambio de datos se reutilizan tal como existen.

Se examinaron 374 contenidos únicos de JavaScript/HTML en las copias disponibles anteriores, buscando Ctrl + W, KeyW y código de tecla 87. No se encontró un manejador de ese atajo en las copias examinadas. Sí se encontró la página y el comportamiento de copia existentes. Se recupera el acceso a esa función agregando exclusivamente su entrada por teclado, sin crear otra lógica de eventos.

## Cambio funcional único

`js/admin-shortcut.js` conserva byte por byte el bloque original de Ctrl + M y añade un manejador independiente de Ctrl + W. Comprueba la sesión local existente y abre `agendas.html` en una ventana nombrada del mismo origen. No navega fuera del sistema, no escribe eventos y no invoca ninguna función de compartir. Reutiliza la ventana y evita aperturas repetidas por mantener la tecla presionada. Si ya se encuentra en Agendas, mantiene el foco en esa página.

No se modifica el código, diseño, filtros, consultas, datos, impresión o sincronización de Agenda de Eventos, Minuta ni Agenda Móvil. Tampoco se modifica la propia página Agendas ni sus filtros y servicios. Se mantienen sus categorías actuales; no se inventa otra clasificación de «programados».

## Atajos y funciones de compartir

Ctrl + M conserva su implementación, contraseña, permisos y apartados. Ctrl + W solo abre la página local Agendas. No había una asociación activa de Ctrl + W con WhatsApp en los archivos examinados, por lo que no se eliminan funciones ajenas para simular esa retirada. «Revisar y compartir» y los comandos preexistentes de Minuta conservan sus archivos y no se modifican.

## Compatibilidad confirmada y límite físico

El usuario confirmó el uso instalado (PWA). Se verificó una ventana Chrome iniciada como aplicación, que informó `display-mode: standalone`, y se probaron ambos atajos con entrada por CDP. En una pestaña normal Chrome reserva Ctrl + W para cerrarla; no se instala una extensión ni se modifica la PWA para alterar esa reserva. Véanse las [pruebas de comandos reservados de Chromium](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/ui/browser_command_controller_browsertest.cc).

La prueba con teclas físicas no se completó: venció la autorización de la herramienta de control nativo. Los resultados no la presentan como superada. Se documenta la diferencia entre teclado automatizado en ventana de aplicación y la comprobación pendiente en la PWA del usuario. No se añaden pantalla completa, Keyboard Lock ni permisos nuevos; la [documentación de Chrome](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock) explica sus requisitos.

## Pruebas realizadas

4 conjuntos y 13 comprobaciones locales: conservación de los recursos; apertura de la página independiente; organización y categorías originales; copia/selección del evento elegido sin cruzar servicios; actualización entre ventanas con los listeners existentes; no modificación de la fuente durante copia; no duplicación de ventanas; Ctrl + M sin cambio de cuenta o sesión; ausencia de solicitudes de mensajería por Ctrl + W; ventana standalone; y migración real local 4.9 → 4.9.1 con dos pestañas y el actualizador existente. La verificación estructural comprueba 90 scripts/backend, 16 páginas, dos manifiestos y 177 recursos.

Los eventos usados son de ensayo y no se distribuyen como registros operativos. La prueba cambia la fuente solamente desde su ventana de ensayo para comprobar que la ventana de Agenda se actualiza; la función de consulta/copia no cambia esos registros. No se abre ni modifica un Excel operativo, Firebase de producción o el perfil personal.

## Conservación exacta

174 de los 177 recursos de ejecución son idénticos por SHA-256 a 4.9, incluidos todos los HTML, CSS, lectores, datos, módulos protegidos, reglas locales de acceso y la lógica PWA/notificaciones. Los otros tres recursos son el acceso compartido `js/admin-shortcut.js` y dos archivos de versión generados: `js/release-info.js` y `js/system-version.js`. El código anterior de Ctrl + M permanece como prefijo idéntico del archivo compartido. No se eliminan archivos de la base.

`release.json`, `sw.js`, `VERSION.txt`, `package.json` y la validación final se actualizan únicamente como metadatos y herramientas de esta entrega. El worker se regenera con las nuevas huellas conservando intactos su núcleo y la lógica de notificaciones. Las copias en `dist` corresponden exactamente al sitio generado. No se cambian manifiestos, credenciales o reglas de Firebase.

## Archivos modificados fuera de dist

- `VALIDACION_FINAL.json`
- `VERSION.txt`
- `js/admin-shortcut.js`
- `js/release-info.js`
- `js/system-version.js`
- `package.json`
- `release.json`
- `sw.js`

Se añaden pruebas e informe/guía de la intervención. `ARCHIVOS.csv` enumera cada cambio o añadido con sus huellas; `CONSERVACION.json` identifica los 174 recursos intactos. `HISTORIAL_REVISADO.json` registra la búsqueda de implementaciones anteriores. El manifiesto cubre todos los archivos finales salvo su propia entrada.

## Intervención y publicación

Publica el ZIP estático en la ubicación habitual y aplica la actualización 4.9.1 desde el gestor existente. No se requiere configurar otra fuente, modificar Firebase, reinstalar la PWA ni sustituir el Excel. La única verificación pendiente específica es el uso del atajo físico en la instalación del usuario.

Esta sesión no ha publicado el sitio. Versión 4.9.1 · 177 recursos · digest `02802d902e11d060ef797efb8070c5300941c81b4edec0f753b59c2b0529d77a`. Los ZIP se verifican por CRC y cada entrada se compara con su fuente.
