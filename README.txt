AGENDA OPERATIVA DE EVENTOS

Módulos activos:
- index.html: panel principal con navegación superior, indicadores y agenda del día.
- eventos.html: carga del archivo principal, búsqueda y filtros por rango de fechas.
- minuta.html: minuta operativa con selección libre de fecha, día anterior y día siguiente.
- agenda_movil.html: consulta móvil complementaria.

Archivos principales:
- css/index.css, css/eventos.css, css/minuta.css
- js/index.js, js/eventos.js, js/minuta.js

Cambios de esta versión:
- Se retiraron los módulos Facturas, Auditoría y Estadísticas con sus archivos HTML, CSS y JS.
- Se retiraron del menú los accesos a Usuarios y Configuración.
- El antiguo menú lateral del inicio fue reemplazado por una barra superior adaptable.
- El rango de fechas de Eventos permite consultar fechas anteriores y futuras.
- Minuta permite seleccionar cualquier fecha y actualizar automáticamente sus tablas.

La información de Eventos se conserva en localStorage bajo la clave eventData y es utilizada por Inicio y Minuta.

SINCRONIZACIÓN AUTOMÁTICA DEL EXCEL (GITHUB PAGES)
--------------------------------------------------
1. Publica el repositorio mediante GitHub Pages con HTTPS.
2. Abre el sistema preferiblemente en Google Chrome o Microsoft Edge.
3. La primera vez, pulsa "Seleccionar Excel" y elige el archivo maestro.
4. El navegador guardará la referencia del archivo solo en ese equipo y navegador.
5. El sistema revisa cambios al abrir, al regresar a la pestaña y cada 30 segundos.
6. Cuando el Excel cambie y se guarde, se actualizan Inicio, Eventos y Minuta.
7. Si el navegador solicita permiso otra vez, pulsa "Autorizar acceso".
8. Si el archivo fue movido o renombrado, usa "Cambiar archivo".

La referencia se almacena en IndexedDB. Los datos procesados siguen guardándose en
localStorage con las claves eventData, eventDataSheets y eventDataUpdatedAt.
El archivo Excel no se sube al repositorio ni se envía a internet.

FIREBASE / AGENDA MÓVIL
-----------------------
Esta versión incluye publicación de Eventos en Cloud Firestore y agenda_movil.html
de solo lectura con actualización en tiempo real. Antes de usarla, sigue el archivo
CONFIGURAR_FIREBASE.txt.
