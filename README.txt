GESTIÓN DE EVENTOS — VERSIÓN 3.0.0
======================================

MÓDULOS OPERATIVOS PROTEGIDOS
-----------------------------
- eventos.html
- js/eventos.js
- css/eventos.css
- minuta.html
- js/minuta.js
- css/minuta.css

No fueron modificados en esta actualización.

PÁGINAS PRINCIPALES
-------------------
index.html          Panel operativo y sincronización.
eventos.html        Módulo de Eventos.
minuta.html         Minuta.
agenda_movil.html   Agenda en tiempo real.
login.html          Acceso local por equipo.
usuarios.html       Usuarios locales.
configuracion.html  Mantenimiento, avisos y PWA.

HERRAMIENTAS NUEVAS
-------------------
diagnostico.html    Estado de Excel, Firebase, almacenamiento y PWA.
validacion.html     Informe de calidad del Excel.
respaldos.html      Copias automáticas, descarga y restauración.
auditoria.html      Historial de cambios y exportación CSV/PDF.
equipos.html        Registro y revocación de dispositivos.
laboratorio.html    Prueba un Excel sin modificar producción.

FUNCIONES
---------
- Comprobación automática del Excel.
- Publicación incremental en Firebase.
- Agenda Móvil en tiempo real y offline.
- Últimas cinco importaciones válidas en IndexedDB.
- Validación de fechas, empresas, escenarios, duplicados y alimentación.
- Auditoría por hoja, fila y celda.
- PWA instalable.
- Mantenimiento programable.
- Métricas de rendimiento.
- Registro de equipos.
- Notificaciones mientras la aplicación está abierta o instalada.

INSTALACIÓN
-----------
1. Sube todos los archivos a la raíz del repositorio.
2. Publica firestore.rules en Firebase Console.
3. Abre el Index y presiona Ctrl + F5 una sola vez.
4. Ejecuta diagnostico.html.
5. Vincula el Excel si el navegador solicita autorización.

SEGURIDAD
---------
Los usuarios del sistema son locales a cada navegador y usan PBKDF2.
Las contraseñas no se envían a Firebase.
Consulta CONFIGURACION_SEGURIDAD_AVANZADA.txt para App Check, FCM y
centralización mediante backend.
