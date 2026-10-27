GESTIÓN DE EVENTOS — REDISEÑO CORPORATIVO
Entrega: 27 de octubre de 2026

El proyecto conserva su arquitectura HTML/CSS/JavaScript, sus datos y sus
bibliotecas originales. El rediseño se activa exclusivamente en las páginas
administrativas mediante data-ui="corporate" y css/corporate-ui.css.
Esta hoja solo se aplica en pantalla; la impresión conserva sus estilos.

PÁGINAS DISPONIBLES
------------------
index.html          Centro operativo, módulos y sincronización.
eventos.html        Agenda de eventos, filtros, búsquedas y vista previa.
minuta.html         Minuta diaria, próximos eventos, coworking e impresión.
agenda_movil.html   Agenda Móvil original, sin modificaciones.
login.html          Acceso local del sistema.
usuarios.html       Administración de usuarios locales.
configuracion.html  Mantenimiento, notificaciones e instalación.
validacion.html     Informe de calidad del Excel y exportación CSV.
laboratorio.html    Prueba de Excel sin sustituir los datos productivos.

MÓDULOS RETIRADOS
-----------------
Se retiraron Respaldos, Diagnóstico, Equipos y Auditoría, con sus páginas,
controladores exclusivos, accesos y opciones de mantenimiento.
Se conservaron audit-store.js, backup-store.js, device-registry.js y
device-heartbeat.js porque Excel, la sincronización y el acceso utilizan
estos servicios compartidos. No tienen acceso administrativo propio.

AGENDA MÓVIL E IMPRESIÓN
-----------------------
La Agenda Móvil, su manifest, iconos, CSS, JavaScript, requisitos de acceso,
recordatorios y dependencias compartidas permanecen idénticos al original.
También se conservan la página de mantenimiento y la pantalla offline que
pueden abrirse desde la Agenda. El service worker solo cambia su nombre de
caché y la lista de recursos para distribuir el diseño y retirar las rutas
eliminadas; su lógica de offline y notificaciones permanece idéntica.
Los JavaScript y CSS originales de Eventos y Minuta no se modificaron.

ACTUALIZACIÓN
-------------
1. Conserva una copia del despliegue y de los datos actuales del navegador.
2. Publica el contenido de la carpeta Red-productividad-tactica-main en la
   misma raíz utilizada actualmente. No cambies la configuración Firebase.
3. Si copias sobre una versión existente, elimina del servidor estos ocho
   archivos retirados: auditoria.html, diagnostico.html, equipos.html,
   respaldos.html, js/auditoria.js, js/diagnostico.js, js/equipos.js y
   js/respaldos.js. Sustituir la carpeta completa también los retira.
4. Abre index.html por HTTPS o mediante un servidor local. Recarga la página
   para que se actualice el service worker. No borres los datos del sitio:
   allí se conservan usuarios, vinculación del Excel y registros locales.
5. Comprueba la vinculación del Excel y la sesión propietaria de Firebase
   en el entorno real. Los accesos y las credenciales mantienen su lógica.

VERIFICACIÓN Y RECUPERACIÓN
--------------------------
Consulta entrega/INFORME_REDISENO.md para el inventario de cambios, pruebas,
resultados y límites de la verificación. Las evidencias se incluyen en esa
misma carpeta. PROTECTED_MODULES.json y js/system-version.js actualizan solo
las dos huellas HTML afectadas por el enlace al nuevo CSS.
Los documentos de actualizaciones anteriores se conservan como historial.
El ZIP original se entrega por separado como copia recuperable.
