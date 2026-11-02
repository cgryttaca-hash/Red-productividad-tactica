# Gestión de Eventos 4.9.2 — Ctrl + A y servicios como en Excel

Entrega del 1 de noviembre de 2026 · America/Bogota.

## Uso

Desde Inicio/Centro Operativo, fuera de un campo de texto, pulsa **Ctrl + A** para abrir la Agenda existente de consulta y copia. **Ctrl + W deja de ser el acceso a esta función.** Ctrl + M mantiene su acceso, contraseña y apartados.

Dentro de un campo de búsqueda, contraseña o texto, y dentro de la propia página Agendas, Ctrl + A conserva «Seleccionar todo» para facilitar la edición y copia. No abre otra ventana mientras seleccionas texto.

## Servicios

La Agenda muestra las dos columnas **HORARIO AYB** y **DESCRIPCION ALIMENTACION**, como en la segunda imagen. Conserva el texto, orden, saltos de línea y repeticiones de ambos campos. No coloca todas las descripciones como si pertenecieran al café ni inventa asociaciones para completarlas.

Se conservan literalmente las dos líneas «12:30 AM - ALMUERZO CATERING» de tu referencia. No se convierten a PM ni se elimina una repetición.

«Copiar agenda» mantiene el texto completo. «Copiar con formato» incluye los horarios y las descripciones en una tabla de dos columnas. La Agenda de copia usa esta presentación; el comportamiento predeterminado del generador para otros consumidores se conserva y se compara con 4.9.1.

## Actualización con Excel

Continúa usando el mismo Archivo Maestro y su configuración habitual. La ventana Agendas recupera las fuentes ya configuradas con los controladores originales, incluso si cierras Inicio. No abre sus formularios de configuración ni solicita otro archivo. Cuando el lector original detecta el guardado, actualiza los datos compartidos y la Agenda abierta recibe el cambio mediante los listeners que ya existían. Al volver a copiar, se utiliza la información actualizada. No necesitas importar otra copia del Excel para esta vista.

Se probó guardando cambios en el mismo XLSX de ensayo: cambiar 9:30 AM a 10:00 AM y 18 a 20 medallones actualizó lista, Agenda abierta, copia con formato y el hash de publicación en el adaptador de prueba. El lector no alteró los bytes del libro. Se mantiene la frecuencia de los controladores existentes, sin crear un sondeo propio para esta vista.

## Aplicar la entrega

Publica el contenido de `Publicacion-Eventos-4.9.2.zip` en la raíz habitual de tu sitio, sin carpeta intermedia ni mezclar versiones. El proyecto completo está en `Eventos-4.9.2-Completo.zip`.

Utiliza el actualizador existente: **Ctrl + M → Actualizaciones → Comprobar ahora** y espera la versión instalada/verificada **4.9.2**. No cambies Firebase, reglas, manifiestos o credenciales y no borres el almacenamiento del navegador. Se verificó la migración local desde 4.9.1 con dos pestañas y conservación de datos/sesión.

Agenda de Eventos, Minuta, Agenda Móvil, lectura de Excel, Firebase, PWA y notificaciones conservan sus archivos operativos. Los únicos cambios funcionales están en el atajo, la presentación de servicios y la reutilización de sus fuentes configuradas desde la Agenda para copiar. La impresión de los otros módulos no se modifica.

Las capturas usan datos de ensayo reproducidos de tus imágenes. No se ha publicado automáticamente ni se ha probado el teclado físico en tu instalación. Informe, pruebas y relación de archivos en `entrega/v492`.
