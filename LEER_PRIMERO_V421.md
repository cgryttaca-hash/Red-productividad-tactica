# Gestión de Eventos 4.2.1 — publicación y recuperación

Esta entrega corrige el diagnóstico y la preparación de actualizaciones. El informe vigente es entrega/v421/INFORME.md; los informes anteriores son históricos.

## Publicar

1. Conservar el ZIP de recuperación 4.2.0 y los datos actuales. No borrar datos del sitio, sesiones, localStorage, IndexedDB ni Firebase.
2. Publicar TODOS los archivos dentro de dist/ en la misma carpeta y origen del sistema actual. Evitar que un optimizador cambie HTML/CSS/JS después de calcular los hashes. Usar un despliegue atómico si el alojamiento lo soporta; en una copia manual, subir sw.js al final y no mezclar entregas. Durante una publicación parcial, la verificación puede rechazar el candidato y conservar correctamente la versión activa.
3. Si se cambia cualquier archivo de ejecución, generar nuevamente la publicación con pnpm build y comprobar pnpm check antes de subirla. No reutilizar un sw.js/release.json antiguo con archivos editados. Mantener .gitattributes en el repositorio y .nojekyll en publicaciones GitHub Pages que lo admitan.
4. Guardar el trabajo abierto. Una pestaña con edición o una operación pendiente bloquea la aplicación de la nueva versión. Desde Actualizaciones, Comprobar actualización detecta y prepara; Reintentar actualización permite repetir tras corregir un archivo. La preferencia automática y el retorno a la página de origen se conservan.
5. Confirmar Versión instalada 4.2.1. El salto desde 4.2 se probó localmente en dos pestañas, con diez segundos y conservación de datos; verificar también en el alojamiento real.

Si el alojamiento no retira archivos antiguos automáticamente, conservar la retirada de avisos.html, generacion_agenda.html, js/notice-center.js, js/notices-page.js, js/notices-store.js y css/notices.css de versiones anteriores. La publicación nueva no contiene esos archivos.

## Si falla la verificación

La página indica etapa, recurso y causa. HTTP 404 exige subir el archivo faltante; HTML inesperado requiere corregir la ruta/rewrite del alojamiento; una redirección requiere servir el recurso en su ruta original. Una integridad distinta exige publicar exactamente los bytes de dist o reconstruir todos los metadatos después de editar. No resolver el error desactivando SHA-256.

La consola y el registro técnico del worker conservan las huellas necesarias para diagnóstico. Se reintentan automáticamente una sola vez ciertos errores transitorios; los errores permanentes requieren corregir el servidor y repetir la comprobación. Solo se elimina la caché candidata incompleta.

Para auditar el alojamiento sin modificarlo: node tools/audit-publication.cjs https://tu-sitio/ruta/ informe.json (sustituir por la URL real y terminar la carpeta con /). Contrasta manifiesto, worker y recursos. No se ejecutó contra el sitio del usuario porque no se recibió su URL.

## Probar y recuperar

Node >=22 y las dependencias declaradas: pnpm install --frozen-lockfile; pnpm exec playwright install chromium. Pruebas: pnpm check, pnpm test:updates, pnpm test:integrity, pnpm test:publication, pnpm test:v42, pnpm test:offline, pnpm test:responsive, pnpm test:reopen. CHROME_PATH permite usar un Chrome instalado. La prueba opcional node tests/migration.cjs requiere ORIGINAL_PROJECT_PATH con 4.2.0 extraído. No se añadieron dependencias de ejecución.

La página de Actualizaciones conserva Volver a la versión anterior cuando existe una caché completa verificada. Para recuperación global, publicar el dist/ de Recuperacion-Eventos-4.2.zip. La recuperación cambia archivos de aplicación; no restaura ni borra datos de trabajo. Publicar una versión anterior restaura también su comportamiento anterior y sus límites.

Agenda Móvil mantiene su ámbito de sesión, credenciales y avisos de alimentación. Las observaciones se guardan localmente. Firebase/Push de producción, dispositivos físicos y el alojamiento real requieren sus pruebas de operación; esta intervención no los modificó ni desplegó.
