# Publicación de la corrección 4.2.2

Sitio auditado: https://cgryttaca-hash.github.io/Red-productividad-tactica/recuperacion.html

La versión publicada 4.2.0 tiene 30 recursos transformados de CRLF a LF con huellas antiguas. El informe vigente entrega/v422/INFORME.md documenta la causa confirmada. Los documentos anteriores son históricos.

## Aplicar la entrega

1. Conservar una copia del repositorio y los datos de trabajo. No borrar datos del sitio ni de Firebase.
2. Para la publicación estática actual, extraer Publicacion-Eventos-4.2.2.zip y actualizar los archivos de la carpeta que sirve Pages con TODO su contenido, incluidos .gitattributes y .nojekyll. Los HTML, css/, js/, assets/, sw.js y release.json van en la misma raíz de publicación; no añadir una carpeta extra entre esa raíz y los archivos.
3. Si se trabaja con el flujo de construcción del repositorio, usar el proyecto completo 4.2.2, conservar sus herramientas/configuración nuevas, generar dist con pnpm build y publicar el contenido de dist mediante el flujo existente. No publicar la carpeta completa de fuentes como sustituto de dist. Los archivos de backend e informes no forman parte del paquete público.
4. Publicar el conjunto completo y coherente, preferentemente en una operación atómica; en una copia manual subir sw.js al final. No reutilizar el manifiesto antiguo ni editar archivos después de generar la publicación. Si se cambia un archivo, reconstruir y verificar otra vez.
5. Después del despliegue, abrir Actualizaciones, guardar cualquier trabajo pendiente y comprobar. Confirmar Versión instalada 4.2.2. La comprobación posterior debe verificar 129 de 129 recursos. La actualización entre pestañas mantiene el mínimo de diez segundos y protege los datos en edición.

El paquete de publicación ya usa LF antes de calcular SHA-256. Mantener .gitattributes evita conversiones contrarias al extraer con Git. Se conserva la verificación estricta; no es necesario limpiar almacenamiento para aplicar este arreglo.

## Verificar y recuperar

Desde el proyecto completo, node tools/audit-publication.cjs https://cgryttaca-hash.github.io/Red-productividad-tactica/ informe.json revisa la publicación real sin modificarla. pnpm build y pnpm check construyen y validan la entrega local. Las pruebas test:integrity y test:publication cubren los fallos y la conservación de hashes.

La página conserva la recuperación a una versión completa anterior si existe en ese navegador. La copia 4.2.1 se conserva como respaldo del proyecto. Volver a publicar un manifiesto antiguo con archivos transformados reproduce el problema, por lo que cualquier recuperación por servidor también debe mantener coherentes sus bytes y huellas.

Esta intervención leyó el sitio y el repositorio públicos. No se modificó GitHub ni se desplegó la corrección. Las observaciones siguen siendo locales y Firebase/Push de producción conservan sus configuraciones y límites.
