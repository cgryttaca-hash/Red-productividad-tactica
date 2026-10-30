GESTIÓN DE EVENTOS — VERSIÓN 4.0.0
GUÍA VIGENTE: LEER_PRIMERO_V4.md y docs/.
Actualizaciones verificadas, recuperación y asistente operativo.
Publica el contenido de dist/; el backend y los secretos no son archivos públicos.
La consulta local funciona. IA externa y Push requieren la configuración
descrita en la guía; las pruebas físicas y el despliegue real siguen pendientes.
La documentación que continúa se conserva como historial de versiones.

Actualización vigente: LEER_PRIMERO_AGENDA_PREMIUM.md
Informe y despliegue: entrega/premium/
La documentación que sigue corresponde a la entrega anterior conservada
como historial. La versión premium amplía FCM, programación de alimentación
y diseño móvil; su despliegue real requiere completar la guía vigente.

GESTIÓN DE EVENTOS — AGENDAS Y PWA MULTIPLATAFORMA
Entrega: 28 de octubre de 2026

El proyecto conserva su arquitectura HTML/CSS/JavaScript, sus datos y sus
bibliotecas originales. El rediseño se activa exclusivamente en las páginas
administrativas mediante data-ui="corporate" y css/corporate-ui.css.
Esta hoja solo se aplica en pantalla; la impresión conserva sus estilos.
Agendas genera documentos desde eventData sin duplicar ni editar eventos.
La ampliación PWA conserva la consulta móvil y añade compatibilidad Apple,
caché versionada y Web Push con backend separado, pendiente de configurar.

PÁGINAS DISPONIBLES
------------------
index.html          Centro operativo, módulos y sincronización.
eventos.html        Agenda de eventos, filtros, búsquedas y vista previa.
minuta.html         Minuta diaria, próximos eventos, coworking e impresión.
agendas.html        Generación, copia e impresión de agendas operativas.
agenda_movil.html   Agenda Móvil con instalación Android/iOS y estado push.
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
El CSS, JavaScript de datos y recordatorios originales de Agenda Móvil
permanecen intactos. Los ajustes de compatibilidad están en pwa-compat.css.
El único service worker integra caché atómica, actualización voluntaria y
recepción push; reconoce las versiones de los recursos y conserva datos
en desconexión. El mantenimiento en caché vigente continúa respetándose.
Los archivos de Minuta y los CSS originales de impresión no se modifican.
Eventos añade únicamente una señal de interfaz al terminar de representar
la tabla, utilizada por el nuevo botón Generar agenda.

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
Consulta entrega/INFORME_MODERNIZACION.md para cambios, pruebas y límites.
Consulta entrega/GUIA_AGENDAS_PWA.md para uso e instalación Android/iPhone.
Consulta entrega/DESPLIEGUE_PUSH.md para configurar las funciones Firebase,
VAPID y HTTPS. Push no se declara activo sin una suscripción confirmada.
La interfaz funciona sin configurar ese backend y conserva sus avisos
locales; las notificaciones reales de fondo requieren completar la guía.
PROTECTED_MODULES.json y js/system-version.js reflejan las huellas actuales.
Los informes y documentos anteriores se conservan como historial fechado.
Se entrega por separado el ZIP de la versión anterior como recuperación.
