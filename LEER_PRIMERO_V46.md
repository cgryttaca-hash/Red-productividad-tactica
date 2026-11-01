# Gestión de Eventos 4.6 — Guía de uso y publicación

Entrega del 1 de noviembre de 2026 · America/Bogota. Parte de la versión 4.5 existente.

## Uso

Inicio conserva Agenda de Eventos, Minuta y Agenda Móvil, ahora como accesos compactos y sin menú lateral. Eventos, Minuta y Agenda Móvil conservan su HTML y lógica operativa; las mejoras visuales se limitan a estilos de pantalla. La impresión no cambia.

Para entrar a Administración, inicia sesión con la cuenta administradora local actual, pulsa Ctrl + M fuera de un campo de texto e introduce la contraseña actual. No se creó una cuenta ni contraseña nueva. El centro contiene Conexiones, Actividad, Actualizaciones y Mantenimiento. Al volver a la operación se cierra la autorización administrativa de esa pestaña como antes.

Conexiones utiliza los controles originales de Excel y Firebase. Las fuentes vinculadas siguen trabajando al cambiar de sección. Actividad muestra las entradas reales guardadas en este navegador, con las más recientes primero; no tiene controles de edición ni borrado.

Actualizaciones diferencia la versión de los archivos de la versión instalada y verificada por el gestor. La detección automática existente se conserva, aunque se desactive la activación automática. La aplicación sigue esperando a que no haya ediciones pendientes en todas las pestañas y mantiene la espera mínima de diez segundos. «Ver cambios y progreso» abre la página existente de recuperación.

## Mantenimiento

Abre Ctrl + M → Mantenimiento. La escritura utiliza la cuenta propietaria de Firebase ya autorizada en el sistema; la contraseña local por sí sola no otorga permiso para modificar el servidor. No envíes credenciales por el chat.

1. Selecciona el módulo y «Programar», «Activar ahora» o «Desactivar».
2. Indica el inicio y, opcionalmente, la finalización estimada. Todos los campos se interpretan en America/Bogota, incluso si el equipo usa otra zona horaria.
3. Selecciona un mensaje predeterminado o escribe uno personalizado y guarda.
4. Comprueba que se confirme el estado con Firebase. Un error de conexión no se presenta como cambio guardado.
5. Cuando el módulo esté listo, utiliza «Finalizar» o guarda «Desactivar». Los otros módulos continúan disponibles.

La fecha final es una estimación: al llegar a cero se vuelve a consultar el servidor y se conserva el bloqueo si el mantenimiento sigue activo. No hay porcentajes de trabajo simulados. Las programaciones anteriores conservan su vencimiento original para evitar activar mantenimientos históricos ya terminados. Esta guía sustituye las instrucciones históricas sobre finalización automática para las programaciones nuevas de 4.6.

Un equipo sin conexión no puede recibir un cambio nuevo de Firebase. La página muestra esta limitación y conserva el último estado disponible, sin afirmar una finalización no confirmada.

## Publicación

`Eventos-4.6-Completo.zip` contiene proyecto, backend existente, herramientas, pruebas y documentación. `Publicacion-Eventos-4.6.zip` contiene exclusivamente el sitio estático preparado. `Recuperacion-Eventos-4.5.zip` conserva el ZIP anterior íntegro y no sustituye un respaldo de los datos del navegador.

Publica el contenido del paquete de publicación en la ubicación actual del sitio, sin añadir una carpeta intermedia. `index.html`, `release.json` y `sw.js` deben quedar junto a `css`, `js`, `assets` y `data`. Incluye `.gitattributes` y `.nojekyll`. No mezcles archivos de distintas versiones ni edites recursos después de calcular sus huellas. No borres el almacenamiento del navegador ni los datos existentes.

La versión esperada es 4.6.0, con 156 recursos. Publicar el sitio estático no despliega Firebase Functions. Esta entrega no modifica el backend operativo, las reglas o las credenciales existentes ni habilita la IA externa.

Tras publicar, comprueba las agendas con tus datos reales, la impresión, Ctrl + Q, la lectura y publicación de Excel, el mantenimiento de un módulo autorizado y la actualización en dos pestañas. La entrega no se ha publicado automáticamente. Revisa `entrega/v46/PRUEBAS.json` para conocer los límites de las pruebas.
