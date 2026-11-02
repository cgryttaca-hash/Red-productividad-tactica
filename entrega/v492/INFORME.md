# Gestión de Eventos 4.9.2 — Corrección limitada a la Agenda de copia

Fecha: 1 de noviembre de 2026 · America/Bogota. Base 4.9.1 intacta.

## Problema y causa

La primera imagen mostraba todas las descripciones debajo de la estación de café y las otras filas con guiones. La Agenda estaba representando una proyección que trataba de agrupar servicios, mientras el Excel de la segunda imagen contiene dos celdas con cuatro líneas originales en cada una. Para esta vista de consulta/copia se retira esa interpretación visual y se muestran ambos campos originales uno junto al otro. No se toca el algoritmo compartido de alimentación ni se corrige su interpretación en otros módulos fuera del alcance.

## Cambios aplicados

1. **`js/admin-shortcut.js`:** cambia únicamente el acceso de la Agenda de Ctrl + W a Ctrl + A. Mantiene el bloque original de Ctrl + M. En campos de texto y en la propia Agendas conserva la selección estándar de Ctrl + A.
2. **`js/agenda-dialog.js`:** en el modo de Agenda para copiar muestra una fila con las dos celdas originales `HORARIO AYB` y `DESCRIPCION ALIMENTACION`, conservando cada bloque multilínea. El modo de consulta anterior mantiene su representación. Continúa leyendo el mismo registro y usando los listeners existentes; no añade una fuente ni un sincronizador.
3. **`js/agenda-content.js`:** agrega una opción visual explícita para que «Copiar con formato» incluya esas dos columnas. El texto plano y los datos/secciones no se alteran. Sin esa opción, el resultado completo se compara exactamente con 4.9.1. No cambian identidades, aliases, cálculos, lectura ni reglas de negocio.
4. **`js/agendas.js`:** reanuda el lector y publicador existentes cuando detecta su configuración previa. Los carga una sola vez por ventana y en modo de fondo, sin controles o configuraciones automáticas. La Agenda puede continuar leyendo y publicando los datos actualizados con Inicio cerrado. No modifica los archivos de esos motores ni crea otro almacén.
5. **`css/agenda-dialog.css`:** el estilo se limita a la tabla de servicios de Agendas. Conserva las columnas legibles y permite desplazamiento local en pantallas estrechas, sin desbordar la página ni cambiar el diseño de los módulos protegidos.

La vista conserva los cuatro horarios y las cuatro descripciones de las imágenes. Las dos líneas de «12:30 AM» no se deduplican ni se reinterpretan como PM. No se traslada la descripción de otro evento ni se rellenan datos por suposición.

La exportación HTML de esta Agenda contiene la tabla de dos columnas y se reutiliza por su impresión/PDF existente. No se cambia el mecanismo de impresión ni la impresión de Eventos o Minuta.

## Trabajo conjunto y pruebas

4 conjuntos, 13 comprobaciones locales aprobadas. Se vincula un XLSX real de ensayo con el selector original y un handle persistente en OPFS. Se abre la Agenda con Ctrl + A y se comparan sus dos celdas con los textos de las imágenes, incluidas las repeticiones. Se verifica copia normal, copia HTML, aislamiento del segundo evento y ausencia de escritura en el origen durante copia.

Después se guarda una modificación en el mismo libro y se activa su comprobación original al recuperar foco. La lista, detalle abierto y copia se actualizan automáticamente con 10:00 AM y 20 medallones, con Inicio cerrado, sin recarga ni reimportación manual. También cambia el hash de publicación del adaptador existente. Se confirma que el lector conserva los bytes del XLSX tras ese guardado de ensayo.

Se comparan los resultados predeterminados del generador con la base; se comprueba Ctrl + A para seleccionar texto dentro de campos, Ctrl + M con cuenta/sesión/apartados intactos, cinco anchos entre 360 y 1440 píxeles, ventana Chrome standalone y migración 4.9.1 → 4.9.2 con dos pestañas. Las teclas se envían por CDP; no se presenta como una prueba física en el equipo del usuario.

## Conservación

170 de los 177 recursos de ejecución son idénticos por SHA-256 a 4.9.1. Incluyen todos los HTML, los controladores y estilos de Agenda de Eventos, Minuta y Agenda Móvil, el lector Excel, la sincronización/publicación Firebase, alimentación compartida, usuarios, credenciales, permisos, PWA y notificaciones. Reglas y backend operativo también se comparan sin cambios.

Los otros siete recursos corresponden a los cinco archivos indicados y dos archivos generados de versión. Se regeneran únicamente los descriptores/worker de publicación y metadatos para distribuir 4.9.2; el núcleo del worker y Push permanecen intactos. No se elimina ningún archivo de la base.

## Archivos modificados fuera de dist

- `VALIDACION_FINAL.json`
- `VERSION.txt`
- `css/agenda-dialog.css`
- `js/admin-shortcut.js`
- `js/agenda-content.js`
- `js/agenda-dialog.js`
- `js/agendas.js`
- `js/release-info.js`
- `js/system-version.js`
- `package.json`
- `release.json`
- `sw.js`

Se añaden pruebas, capturas e informe/guía. `ARCHIVOS.csv` incluye todas las huellas anterior/actual y las copias publicables. `CONSERVACION.json` enumera los 170 recursos intactos. La base 4.9.1 no se modifica.

## Alcance de verificación y pasos manuales

- No se publico ni se modifico GitHub, Firebase, credenciales, reglas o Excel operativo del usuario.
- El libro y handle XLSX son reales en OPFS de un perfil temporal. Los datos de referencia se reprodujeron de las imagenes; un segundo evento ficticio se usa solo para comprobar que no se mezclen servicios.
- La lectura/sincronizacion usa el lector original; se dispara su comprobacion existente al recuperar foco y se verifica la actualizacion de la Agenda abierta, copia y hash de publicacion. Firestore usa un adaptador en memoria.
- La ventana Chrome de ensayo confirmo modo standalone y uso teclado automatizado por CDP. No se prueba el teclado fisico o la PWA personal del usuario.
- Se conserva la frecuencia y disponibilidad de la comprobacion original de Excel. No se instala un monitor de archivos ni se prometen notificaciones instantaneas del sistema operativo.
- No se modifica la fuente ni se deducen asociaciones nuevas entre horarios y descripciones. Se muestran las dos columnas completas con sus lineas originales.

Publica el ZIP estático en la ubicación existente y aplica 4.9.2 con el gestor habitual. No se requiere configurar otra fuente, cambiar Firebase o sustituir el Archivo Maestro. No se ha publicado ni modificado producción en esta sesión.

Versión 4.9.2 · 177 recursos · digest `b05ecd9fe1d7f3249429d71ea793a1371844fb959b85b33290e76971305bc86d`. Los ZIP se verifican por CRC y cada entrada se compara con su archivo fuente.
