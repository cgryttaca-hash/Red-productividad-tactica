# Informe — Centro Operativo y administración protegida, 4.4.0

Se aplicó el último prompt adjunto sobre la entrega real 4.3.0, en una copia independiente. Se verificaron sus 579 archivos contra el inventario inicial y se conservó el ZIP anterior íntegro. No se editaron las referencias de `sources`. La elección confirmada por el usuario fue **usar la cuenta administradora local actual**.

## Resultado

Inicio contiene únicamente tres módulos operativos: Agenda de Eventos (`eventos.html`), Minuta (`minuta.html`) y Agenda Móvil (`agenda_movil.html`). Se conservaron sus rutas. La interfaz utiliza navegación lateral azul marino, tarjetas compactas, iconos SVG existentes, blanco/gris y acentos discretos. En celular la navegación pasa a la parte superior. Se mantuvieron fecha, hora y salida de sesión.

Usuarios, Configuración, metadatos del Excel, cantidades, actividad y paneles de sincronización se trasladaron a `administracion.html`. Se reutilizaron los identificadores y funciones originales. Las herramientas siguen en sus rutas originales. No se eliminaron funciones ni archivos de la base. No se agregaron librerías de diseño, vídeos ni animaciones pesadas. La imagen mencionada en el prompt no estaba disponible en este adjunto; se siguieron los requisitos escritos y la identidad existente.

## Acceso solicitado

Ctrl + M carga el formulario de validación bajo demanda. No actúa mientras se escribe, durante composición de texto ni en Agenda Móvil. El campo es de contraseña; se limpia tras el intento y al cancelar. No se escribe la contraseña introducida en consola, registros ni almacenamiento. No se añade una credencial de Super Administrador al código público. Se conserva el algoritmo PBKDF2 original y se valida la contraseña contra el usuario local activo con rol administrador; no se crean usuarios ni roles ni se modifica la sesión de acceso normal.

Las seis rutas administrativas exigen esa revalidación además de la sesión: Administración, Usuarios, Configuración, Validación, Laboratorio y Recuperación. Una dirección escrita directamente vuelve a Inicio cuando falta el permiso. Las operaciones de usuarios, cambio/restablecimiento de contraseña, publicación manual desde el fondo de Inicio, preferencia de actualización y reversión manual comprueban el permiso que les corresponde. Las actualizaciones automáticas y la sincronización ya autorizada siguen funcionando sin abrir el panel.

El comprobante se guarda en `sessionStorage`, asociado a usuario, dispositivo, inicio de sesión y fecha de cambio de contraseña; no contiene la contraseña. Se revoca al volver a una página operativa, salir, cambiar contraseña/rol o perder la sesión. La navegación entre páginas administrativas conserva el permiso. No se impuso una caducidad ajena a la política de sesión existente.

**Alcance real de la protección:** se conserva la autenticación local elegida por el usuario. El código y almacenamiento del navegador están bajo control de quien maneje ese navegador; esta barrera no equivale a validación de servidor ni sustituye las reglas de Firebase. La arquitectura de alta inicial local que ya existía no se reemplazó. No se configuró Firebase Authentication como nueva contraseña de este panel.

## Carga y dependencias

Inicio ya no carga el HTML de paneles ni el código de administración. XLSX, Excel y el módulo de publicación Firebase se cargan de forma diferida únicamente cuando existen indicadores de una fuente vinculada; conservan la sincronización de fondo y no insertan sus paneles allí. Al abrir administración, los paneles originales se cargan con sus controles. La importación Firebase se adaptó a la nueva ruta, porque antes aceptaba solamente Inicio. Se mantiene un único intento en curso por motor para evitar cargas simultáneas repetidas.

En una comparación local con el mismo navegador, sin fuente vinculada, los subrecursos de Inicio pasaron de **1.169.003 a 74.086 bytes** (aproximadamente 93,7 % menos) y de **283 a 95 nodos**. La navegación medida fue 126,5 ms frente a 67,3 ms; son muestras locales orientativas. Los bytes corresponden a subrecursos locales medidos por el navegador, no al HTML ni a tráfico real de Firebase. Con 20 avisos repetidos de vinculación se cargó un solo script XLSX y uno Excel, sin paneles administrativos en Inicio y sin duplicar el listener de mantenimiento. No se promete igual reducción con una fuente activa o en otra red.

La versión instalada se obtiene del estado real del worker verificado; no se utiliza la versión del archivo como sustituto. La página original de Actualizaciones conserva diferencias de manifiesto, archivos, progreso, verificación, espera mínima de diez segundos, coordinación de pestañas, protección de ediciones, reintento y reversión. Se preservan los ajustes previos de integridad y finales de línea LF.

## Conservación y pruebas

`CONSERVACION.json` demuestra igualdad byte a byte de los archivos críticos enumerados, incluyendo página/script móvil, manifiestos, lógica de Minuta y Ctrl + Q, impresión/imagen, lógica de eventos, notas, datos públicos, reglas/configuración Firebase, backend de alimentación y coordinador original de actualizaciones. Los HTML de escritorio recibieron las dependencias de acceso necesarias; los módulos de negocio de Eventos y Minuta no cambiaron. Los adaptadores Excel/Firebase solo recibieron integración de pantalla y autorización, conservando sus mecanismos y formatos.

Las pruebas se ejecutaron en perfiles temporales y servidores HTTP locales. Los intentos correctos/incorrectos, cambio de contraseña y creación de usuario operativo se hicieron exclusivamente en perfiles de prueba. Se comprobó la reapertura real de Chrome sin perder contactos ni observaciones. Firebase y WhatsApp se interceptaron para evitar cambios o envíos reales. La migración usó los archivos reales de las versiones 4.3 y 4.4 con dos pestañas y confirmó datos, usuarios y hashes conservados.

### Matriz de los 25 puntos del prompt

| Punto | Resultado y evidencia |
|---|---|
| 1 | PASS: Inicio solo muestra los tres módulos; `pruebas-centro.json`. |
| 2 | PASS: no hay Usuarios/Configuración en la navegación normal; misma prueba. |
| 3 | PASS: no hay Administración/Herramientas visibles en la operación. |
| 4 | PASS: actividad/conexiones fuera del DOM de Inicio. |
| 5 | PASS: registros y archivo solo en administración; valores reales de prueba. |
| 6 | PASS de revisión visual: Inicio, modal y centro en escritorio/móvil; capturas incluidas. La valoración estética final corresponde al usuario. |
| 7 | PASS medido: recursos y nodos reducidos; `pruebas-rendimiento.json`. |
| 8 | PASS local: ruta, filtros, orden, detalles y persistencia; `pruebas-funcionales.json`. |
| 9 | PASS local: generación, PNG, texto, impresión y Ctrl + Q; `pruebas-whatsapp-excel.json`. |
| 10 | PASS local: acceso móvil público, aislamiento, orden, PWA emulada y scripts conservados. |
| 11 | PASS de integración simulada: actualización de publicación, datos y listeners. Firebase de producción pendiente. |
| 12 | PASS: libro XLSX real generado, encabezados variantes, grupos numerados y hoja auxiliar intacta. |
| 13 | PASS: cero errores JavaScript de página y cero recursos locales faltantes en los recorridos responsive. |
| 14 | PASS: Ctrl + M muestra modal con caracteres ocultos. |
| 15 | PASS: contraseña incorrecta rechazada; sin comprobante ni texto almacenado. |
| 16 | PASS: cuenta local administradora válida abre las funciones originales. |
| 17 | PASS: seis rutas y funciones protegidas rechazan acceso sin revalidación, incluido un admin con sesión normal. |
| 18 | PASS: cantidades/archivo locales y versión instalada real; `pruebas-instaladas.json`. |
| 19 | PASS: modal y administración diferidos; motores de fuentes solo bajo demanda. |
| 20 | PASS emulado: 1440 y 1024 px, 16 páginas. |
| 21 | PASS emulado: 768 px, 16 páginas. |
| 22 | PASS emulado: 390 y 360 px, 16 páginas. |
| 23 | PASS: 80 recorridos sin desbordamiento horizontal y modal en cinco tamaños. |
| 24 | PASS en comparación local: menos bytes/nodos y mejor muestra de navegación; no garantía de red. |
| 25 | PASS local: activaciones repetidas sin duplicar cargas/listeners; proveedores en memoria. |

También pasaron instalación real de service worker con 137 recursos, acceso local sin red, migración 4.3→4.4, sondeo automático real de 60 segundos, dos pestañas, ediciones pendientes, activación coordinada, rechazo de archivos corruptos/404/HTML/truncados, reintento, reversión y publicación de todos los recursos tras un ciclo Git real con `autocrlf`. La comprobación estática validó 74 scripts, 16 páginas, 2 manifiestos y 6 archivos protegidos. El asistente existente permaneció deshabilitado y pasó su suite sin llamadas pagadas.

Las pruebas de actualizador e integridad usan una página de ensayo con permiso administrativo simulado para aislar el mecanismo de descarga; no prueban la autorización. La autorización real, la página protegida instalada y la migración se comprueban por separado a través del modal y la contraseña local de prueba. No se introdujo ese permiso simulado en el código de la aplicación.

## Entrega y límites

El proyecto completo incluye el informe actual en `entrega/v44`, pruebas originales seleccionadas, capturas y el detalle por archivo con SHA-256. Los informes previos se conservan como historial. El ZIP de publicación incluye únicamente el contenido estático generado de `dist`, con 142 archivos (137 recursos del manifiesto y cinco archivos de publicación/datos). No expone el backend ni informes internos. No hay cambios de rutas de negocio ni eliminaciones de la base.

La publicación real, Firebase/FCM de producción, el envío efectivo de WhatsApp y la instalación en teléfonos físicos **no se ejecutaron**. Las notificaciones de alimentación conservan la lógica y backend anteriores, verificados con simulaciones a −15 minutos en America/Bogota; no se garantiza entrega con la aplicación cerrada sin el despliegue y permisos correspondientes. Los contactos/observaciones mantienen su persistencia local anterior, sin escritura nueva al Excel ni a Firebase. No se actualizó el sitio remoto.

## Archivos intervenidos

El inventario exacto está en `ARCHIVOS.csv` y `CAMBIOS.json`, con huella anterior/nueva y categoría. La lista incluye fuentes, integración de seguridad, pruebas, documentación y sus copias generadas en `dist`. Los archivos añadidos para la aplicación son `administracion.html`, `css/operating-center.css`, `js/admin-access.js`, `js/admin-shortcut.js`, `js/admin-modal.js`, `js/operating-center.js` y `js/admin-center.js`. El resto de cambios integra esos archivos con la arquitectura existente. No se eliminan datos ni usuarios.

Las tres filas del propio inventario no contienen una huella final para evitar autorreferencias. `MANIFIESTO_SHA256.json` verifica todos los archivos del proyecto, incluyendo CSV y CAMBIOS; solo se excluye a sí mismo. Las huellas de los ZIP y del manifiesto se entregan por separado.

Para reproducir: usar Node 22 o posterior, instalar las dependencias fijadas y Chrome/Chromium para Playwright. Ejecutar `pnpm build`, `pnpm check`, `pnpm test:center`, `pnpm test:installed`, `pnpm test:responsive`, `pnpm test:v43`, `pnpm test:sharing`, `pnpm test:food`, `pnpm test:updates`, `pnpm test:integrity`, `pnpm test:automatic`, `pnpm test:publication` y `pnpm test:reopen`. Las pruebas de comparación/migración requieren `ORIGINAL_PROJECT_PATH` apuntando a una copia 4.3.0. El registro actual y sus limitaciones están en `PRUEBAS.json`.
